/**
 * Sampada — Cloudflare Pages Functions
 * Same-origin proxy for Better-Auth (/auth/v2/* → oradb:4000).
 *
 * Better-Auth cookies are httpOnly + SameSite=lax and oradb has no HTTPS,
 * so a cross-origin call can't hold the session. This worker makes the
 * browser talk to /auth/v2 on ITS OWN origin (sampada.pages.dev) and
 * forwards Set-Cookie headers so the cookie sticks.
 */

const ORADB_FALLBACK = 'http://acharylab.140.245.227.176.nip.io'
const APP_NAME = 'sampada'

function cookiesFrom(res) {
  const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie')]
  return setCookies.filter(Boolean)
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const reqPath = url.pathname
  const rid = crypto.randomUUID().slice(0, 8)

  const requestOrigin = request.headers.get('Origin')
  const allowOrigin =
    requestOrigin && requestOrigin !== 'null' ? requestOrigin : new URL(request.url).origin

  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }

  // OPTIONS preflight
  if (request.method === 'OPTIONS' && reqPath.startsWith('/auth/v2/')) {
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

  // Better-Auth proxy
  if (reqPath.startsWith('/auth/v2/')) {
    try {
      const ORADB = env.ORADB_URL || ORADB_FALLBACK
      const proxyUrl = `${ORADB}${reqPath}${url.search}`

      const modifiedHeaders = new Headers(request.headers)
      modifiedHeaders.delete('host')

      const response = await fetch(proxyUrl, {
        method: request.method,
        headers: modifiedHeaders,
        body: request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer(),
        redirect: 'follow',
      })

      const setCookies = cookiesFrom(response)

      // App isolation: only accounts registered for sampada pass
      const appCheckPaths = ['/auth/v2/sign-in/email', '/auth/v2/session', '/auth/v2/sign-up/email', '/auth/v2/verify']
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
      if (reqPath === '/auth/v2/sign-out') {
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
      const API_ORIGIN = env.API_URL || 'http://sampada.140.245.227.176.nip.io'
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
        body: request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer(),
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
