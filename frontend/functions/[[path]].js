/**
 * Sampada — Cloudflare Pages Functions
 * Same-origin proxy for Better-Auth (/api/auth/* → oradb:4000).
 *
 * Better-Auth cookies are httpOnly + SameSite=lax and oradb has no HTTPS,
 * so a cross-origin call can't hold the session. This worker makes the
 * browser talk to /api/auth on ITS OWN origin (sampada.pages.dev) and
 * forwards Set-Cookie headers so the cookie sticks.
 */

const APP_NAME = 'sampada'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Fallbacks are plaintext HTTP origins only used for local/dev testing.
// They are NEVER reached in production: they require ALLOW_INSECURE_ORIGIN === 'true'
// (a flag that must not be set in the deployed Cloudflare Pages project). With the
// flag absent, a missing ORADB_URL / API_URL fails closed with a 502 instead of
// silently degrading the transport to plaintext HTTP over the public internet.
const ORADB_FALLBACK = 'http://acharylab.140.245.227.176.nip.io'
const API_FALLBACK = 'http://sampada.140.245.227.176.nip.io'

function originFor(env, primaryKey, fallback) {
  if (env[primaryKey]) return env[primaryKey]
  if (env.ALLOW_INSECURE_ORIGIN === 'true') return fallback
  return null
}

function misconfigured(rid, name) {
  return new Response(
    JSON.stringify({
      error: `${name} origin not configured`,
      meta: { request_id: rid, timestamp: new Date().toISOString() },
    }),
    {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...securityHeaders },
    },
  )
}

function cookiesFrom(res) {
  const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie')]
  return setCookies.filter(Boolean)
}

// Honeypot. The auth forms carry a `website` field hidden off-screen (see
// src/pages/Register.jsx); a human never sees it, a form-filling bot does.
// A filled value is swallowed here, server-side, with a response a bot can't
// distinguish from success — no account, no password attempt, no mail sent.
// Server-side is the only place it can be enforced: the browser has no secret
// to check against, and the worker is the single choke point both the form and
// any direct API caller must pass.
export const HONEYPOT_PATHS = [
  '/api/auth/sign-up/email',
  '/api/auth/sign-in/email',
  '/api/auth/request-password-reset',
]

export function honeypotTriggered(reqPath, bodyText) {
  if (!HONEYPOT_PATHS.includes(reqPath) || !bodyText) return false
  try {
    const parsed = JSON.parse(bodyText)
    return typeof parsed?.website === 'string' && parsed.website.trim() !== ''
  } catch {
    return false
  }
}

// Shaped per endpoint so a swallowed request is indistinguishable from the
// real success response.
const HONEYPOT_SUCCESS = {
  '/api/auth/sign-up/email': { user: null, session: null, token: null },
  '/api/auth/sign-in/email': { user: null, session: null, token: null },
  '/api/auth/request-password-reset': { status: true },
}

function honeypotResponse(reqPath, rid, allowOrigin) {
  return new Response(JSON.stringify(HONEYPOT_SUCCESS[reqPath] ?? { status: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Vary': 'Origin',
      'X-Request-Id': rid,
      ...securityHeaders,
    },
  })
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const reqPath = url.pathname
  const rid = crypto.randomUUID().slice(0, 8)

  const requestOrigin = request.headers.get('Origin')
  const allowOrigin =
    requestOrigin && requestOrigin !== 'null' ? requestOrigin : new URL(request.url).origin

  // OPTIONS preflight
  if (request.method === 'OPTIONS' && reqPath.startsWith('/api/auth/')) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
        ...securityHeaders,
      },
    })
  }

  // Honeypot, before anything is forwarded or any account is touched.
  let rawBody = null
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const jsonBody = HONEYPOT_PATHS.includes(reqPath) && (request.headers.get('content-type') ?? '').includes('json')
    rawBody = jsonBody ? await request.text() : await request.arrayBuffer()
  }
  if (honeypotTriggered(reqPath, rawBody)) return honeypotResponse(reqPath, rid, allowOrigin)

  // Better-Auth proxy
  if (reqPath.startsWith('/api/auth/')) {
    try {
      const ORADB = originFor(env, 'ORADB_URL', ORADB_FALLBACK)
      if (!ORADB) return misconfigured(rid, 'Auth')
      const proxyUrl = `${ORADB}${reqPath}${url.search}`

      const modifiedHeaders = new Headers(request.headers)
      modifiedHeaders.delete('host')

      const response = await fetch(proxyUrl, {
        method: request.method,
        headers: modifiedHeaders,
        body: rawBody,
        redirect: 'follow',
      })

      const setCookies = cookiesFrom(response)

      // App isolation: only accounts registered for sampada pass
      const appCheckPaths = ['/api/auth/sign-in/email', '/api/auth/session', '/api/auth/sign-up/email', '/api/auth/verify']
      if (
        appCheckPaths.some((p) => reqPath === p || reqPath.startsWith(p)) &&
        response.ok &&
        response.headers.get('content-type')?.includes('json')
      ) {
        const body = await response.json()
        const user = body?.user || body?.data?.user || null
        if (user && !user.app) user.app = APP_NAME
        if (user && user.app !== APP_NAME) {
          return new Response(
            JSON.stringify({ error: `Access denied: this account is not registered with ${APP_NAME}.` }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin, ...securityHeaders },
            },
          )
        }
        const headers = new Headers({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowOrigin,
          'Vary': 'Origin',
          'X-Request-Id': rid,
          ...securityHeaders,
        })
        setCookies.forEach((c) => headers.append('Set-Cookie', c))
        return new Response(JSON.stringify(body), { status: response.status, headers })
      }

      // Generic pass-through — rebuild headers so multi-value Set-Cookie survives
      const headers = new Headers(response.headers)
      headers.delete('set-cookie')
      headers.set('Access-Control-Allow-Origin', allowOrigin)
      headers.set('Vary', 'Origin')
      headers.set('X-Request-Id', rid)
      setCookies.forEach((c) => headers.append('Set-Cookie', c))

      // Force clear Better-Auth cookies on sign-out
      if (reqPath === '/api/auth/sign-out') {
        ;['better-auth.session_token', 'sampada-better-auth'].forEach((name) =>
          headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`),
        )
      }

      return new Response(response.body, { status: response.status, headers })
    } catch {
      return new Response(
        JSON.stringify({ error: 'Auth server unreachable', meta: { request_id: rid, timestamp: new Date().toISOString() } }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin, ...securityHeaders },
        },
      )
    }
  }

  // Rails API bridge — /api/v1/* → sampada Rails (oradb:3002)
  // Cookie-only frontend: extract better-auth.session_token from the cookie and
  // forward it as Bearer, since Rails verifies via Authorization header.
  if (reqPath.startsWith('/api/v1/')) {
    try {
      const API_ORIGIN = originFor(env, 'API_URL', API_FALLBACK)
      if (!API_ORIGIN) return misconfigured(rid, 'API')
      const proxyUrl = `${API_ORIGIN}${reqPath}${url.search}`

      const modifiedHeaders = new Headers(request.headers)
      modifiedHeaders.delete('host')
      // Better-Auth cookie is a signed token: <session-token>.<signature> (URL-encoded).
      // Rails verifies via /api/auth/verify which matches the short session token only.
      const cookieToken = request.headers.get('cookie')
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('better-auth.session_token='))
        ?.split('=').slice(1).join('=')
      if (cookieToken) {
        const decoded = decodeURIComponent(cookieToken)
        const sessionToken = decoded.split('.')[0]
        if (sessionToken) modifiedHeaders.set('Authorization', `Bearer ${sessionToken}`)
      }

      const response = await fetch(proxyUrl, {
        method: request.method,
        headers: modifiedHeaders,
        // Already buffered above — the request stream can only be read once.
        body: rawBody,
        redirect: 'follow',
      })

      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', allowOrigin)
      headers.set('Vary', 'Origin')
      headers.set('X-Request-Id', rid)
      const setCookies = cookiesFrom(response)
      setCookies.forEach((c) => headers.append('Set-Cookie', c))

      return new Response(response.body, { status: response.status, headers })
    } catch {
      return new Response(
        JSON.stringify({ error: 'API server unreachable', meta: { request_id: rid, timestamp: new Date().toISOString() } }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigin, ...securityHeaders },
        },
      )
    }
  }

  // Static assets from dist; unknown paths 404 via context.next()
  return context.next()
}
