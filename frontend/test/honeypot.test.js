import test from 'node:test'
import assert from 'node:assert/strict'
import { HONEYPOT_PATHS, honeypotTriggered } from '../functions/[[path]].js'

const json = (website) => JSON.stringify({ email: 'a@b.c', password: 'x', website })

test('the three credential endpoints are trapped', () => {
  assert.deepEqual(HONEYPOT_PATHS, [
    '/api/auth/sign-up/email',
    '/api/auth/sign-in/email',
    '/api/auth/request-password-reset',
  ])
})

test('an empty or whitespace website is a human', () => {
  for (const path of HONEYPOT_PATHS) {
    assert.equal(honeypotTriggered(path, json('')), false)
    assert.equal(honeypotTriggered(path, json('   ')), false)
  }
})

test('a missing website field is a human', () => {
  assert.equal(honeypotTriggered('/api/auth/sign-in/email', JSON.stringify({ email: 'a@b.c' })), false)
})

test('a filled website is a bot on every trapped path', () => {
  for (const path of HONEYPOT_PATHS) {
    assert.equal(honeypotTriggered(path, json('https://spam.example')), true)
  }
})

test('a non-string website is a human', () => {
  assert.equal(honeypotTriggered('/api/auth/sign-in/email', JSON.stringify({ website: 42 })), false)
  assert.equal(honeypotTriggered('/api/auth/sign-in/email', JSON.stringify({ website: null })), false)
})

test('other endpoints are never swallowed', () => {
  const body = json('https://spam.example')
  const others = ['/api/auth/sign-out', '/api/auth/get-session', '/api/v1/dpdp/consent', '/api/auth/sign-up/email/x']
  for (const path of others) {
    assert.equal(honeypotTriggered(path, body), false)
  }
})

test('unparseable and missing bodies are never swallowed', () => {
  assert.equal(honeypotTriggered('/api/auth/sign-in/email', null), false)
  assert.equal(honeypotTriggered('/api/auth/sign-in/email', ''), false)
  assert.equal(honeypotTriggered('/api/auth/sign-in/email', 'not json'), false)
  assert.equal(honeypotTriggered('/api/auth/sign-in/email', '<html>'), false)
})
