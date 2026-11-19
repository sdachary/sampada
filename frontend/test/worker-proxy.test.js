import test from 'node:test'
import assert from 'node:assert/strict'
import { workerProxyTarget, onRequest } from '../functions/[[path]].js'

const WORKER_URL = 'https://worker.example.dev'

test('workerProxyTarget strips the /api/worker prefix and preserves the query string', () => {
  const target = workerProxyTarget(WORKER_URL, '/api/worker/api/v1/auth/me', '?foo=bar')
  assert.equal(target, 'https://worker.example.dev/api/v1/auth/me?foo=bar')
})

test('workerProxyTarget with no search string', () => {
  const target = workerProxyTarget(WORKER_URL, '/api/worker/api/v1/auth/me', '')
  assert.equal(target, 'https://worker.example.dev/api/v1/auth/me')
})

test('onRequest hard-404s retired /api/auth paths', async () => {
  const request = new Request('https://pages.example/api/auth/get-session')
  const nextCalled = []
  const context = { request, env: {}, next: () => { nextCalled.push(true); return new Response('next') } }
  const res = await onRequest(context)
  assert.equal(res.status, 404)
  assert.equal(nextCalled.length, 0)
  assert.deepEqual(await res.json(), { error: 'not found' })
})

test('onRequest returns 502 when WORKER_URL is unset', async () => {
  const request = new Request('https://pages.example/api/worker/api/v1/auth/me')
  const context = { request, env: {}, next: () => new Response('next') }
  const res = await onRequest(context)
  assert.equal(res.status, 502)
  const body = await res.json()
  assert.match(body.error, /not configured/)
})

test('onRequest forwards method, Origin, Cookie and body to the worker', async () => {
  const calls = []
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts })
    return new Response(JSON.stringify({ user: { id: '1' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const request = new Request('https://pages.example/api/worker/api/v1/auth/me?x=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://sampada.vayalabs.in',
      Cookie: 'sampada_session=abc',
    },
    body: JSON.stringify({ email: 'a@b.c' }),
  })
  const context = { request, env: { WORKER_URL }, next: () => new Response('next') }
  const res = await onRequest(context)
  assert.equal(res.status, 200)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://worker.example.dev/api/v1/auth/me?x=1')
  assert.equal(calls[0].opts.method, 'POST')
  assert.equal(calls[0].opts.headers.get('Origin'), 'https://sampada.vayalabs.in')
  assert.equal(calls[0].opts.headers.get('Cookie'), 'sampada_session=abc')
  const body = await res.json()
  assert.equal(body.user.id, '1')
})