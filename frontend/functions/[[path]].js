/**
 * Sampada — Cloudflare Pages Functions
 * Same-origin proxy for the Worker API (/api/worker/* → sampada-api-production).
 * Better-Auth (/api/auth/*) was retired in A8; those paths now fall through to
 * static-asset handling and 404.
 */

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
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

// Build the upstream URL for /api/worker/*: prefix stripped, query preserved.
export function workerProxyTarget(WORKER_URL, reqPath, search) {
  return `${WORKER_URL}${reqPath.slice('/api/worker'.length)}${search}`
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const reqPath = url.pathname
  const rid = crypto.randomUUID().slice(0, 8)

  // A8: /api/auth/* is retired. Return a hard 404 instead of letting the SPA
  // fallback serve index.html with a 200 for a dead auth endpoint.
  if (reqPath.startsWith('/api/auth/')) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...securityHeaders },
    })
  }

  if (!reqPath.startsWith('/api/worker/')) return context.next()

  const requestOrigin = request.headers.get('Origin')
  const allowOrigin =
    requestOrigin && requestOrigin !== 'null' ? requestOrigin : url.origin

  try {
    const WORKER_URL = env.WORKER_URL
    if (!WORKER_URL) return misconfigured(rid, 'Worker')

    const targetUrl = workerProxyTarget(WORKER_URL, reqPath, url.search)

    const modifiedHeaders = new Headers(request.headers)
    modifiedHeaders.delete('host')
    // Forward Origin so the Worker can run originGuard.
    const origin = request.headers.get('Origin')
    if (origin) modifiedHeaders.set('Origin', origin)

    let body = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer()
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: modifiedHeaders,
      body,
      redirect: 'follow',
    })

    const headers = new Headers(response.headers)
    headers.delete('set-cookie')
    headers.set('Access-Control-Allow-Origin', allowOrigin)
    headers.set('Vary', 'Origin')
    headers.set('X-Request-Id', rid)
    cookiesFrom(response).forEach((c) => headers.append('Set-Cookie', c))

    return new Response(response.body, { status: response.status, headers })
  } catch {
    return new Response(
      JSON.stringify({ error: 'Worker unreachable', meta: { request_id: rid, timestamp: new Date().toISOString() } }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowOrigin,
          ...securityHeaders,
        },
      },
    )
  }
}
