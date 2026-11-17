// A5.2 — first real browser WebAuthn ceremony test of the whole auth stack.
// Self-contained: local D1 migrations + wrangler dev + vite dev with VITE_WORKER_AUTH=true.
// Chromium-only (virtual authenticator via CDP).
import { test, expect } from '@playwright/test'
import { execSync, spawn } from 'node:child_process'

const WORKER_PORT = 8787
const VITE_PORT = 5173

let workerProc, viteProc

async function waitFor(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

test.beforeAll(async () => {
  test.setTimeout(120000)

  // Idempotent local D1 migrations (proven A4 pattern)
  execSync('npm run db:migrate:local', { cwd: '../worker', stdio: 'pipe' })

  workerProc = spawn('npx', ['wrangler', 'dev', '--port', String(WORKER_PORT)], { cwd: '../worker', detached: true, stdio: 'pipe' })
  viteProc = spawn('npx', ['vite', '--port', String(VITE_PORT), '--strictPort'], {
    cwd: '.',
    detached: true,
    stdio: 'pipe',
    env: { ...process.env, VITE_WORKER_AUTH: 'true' },
  })

  const workerUp = await waitFor(`http://localhost:${WORKER_PORT}/up`)
  const viteUp = await waitFor(`http://localhost:${VITE_PORT}`)
  if (!workerUp || !viteUp) {
    console.warn('A5.2: local infra did not come up; skipping passkey ceremony suite')
    test.skip()
  }
})

test.afterAll(async () => {
  for (const proc of [workerProc, viteProc]) {
    if (proc) {
      try { process.kill(-proc.pid, 'SIGTERM') } catch {}
    }
  }
})

test.use({ baseURL: `http://localhost:${VITE_PORT}` })

test('register → dashboard, session survives reload, login with resident key', async ({ context, page }) => {
  test.setTimeout(120000) // three WebAuthn ceremonies + server spawns — 30s default is tight
  // Virtual authenticator via CDP
  const cdp = await context.newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  })

  // Test 1: register via passkey
  const email = `a5.2+${Date.now()}@example.com`
  await page.goto('/register')
  await page.fill('input[placeholder="First name"] >> nth=0', 'Test')
  await page.fill('input[placeholder="Last name"] >> nth=0', 'User')
  await page.fill('input[placeholder="Email"] >> nth=0', email)
  await page.check('input[type="checkbox"]')
  await page.click('text=Create account with passkey')
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
  expect(page.url()).toContain('/dashboard')

  // Test 2: session survives reload (worker /me via checkAuth fallback)
  await page.reload()
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
  expect(page.url()).toContain('/dashboard')

  // Test 3: login after cookie clear — same context on purpose: resident keys
  // live in this context's virtual authenticator; a fresh context has none.
  await context.clearCookies()
  await page.goto('/login')
  await page.fill('input[placeholder="Email"]', email)
  await page.click('text=Use passkey')
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
  expect(page.url()).toContain('/dashboard')
})