import { chromium } from '@playwright/test'

const base = process.argv[2] || 'https://sampada.vayalabs.in'
const tag = process.argv[3] || 'live'
const email = process.argv[4] || 'ui-audit-2026-11-05@example.com'
const password = 'SampadaAudit2026!'

const pagesToShot = [
  ['/dashboard', 'dashboard'],
  ['/dashboard/transactions', 'transactions'],
  ['/dashboard/recurring', 'recurring'],
  ['/dashboard/reports', 'reports'],
  ['/dashboard/budgets', 'budgets'],
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

// Sign in (or register first).
await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)

const emailInput = page.locator('input[type="email"]').first()
await emailInput.fill(email)
await page.locator('input[type="password"]').first().fill(password)
await page.locator('button[type="submit"]').first().click()
await page.waitForTimeout(3000)

let url = page.url()
if (url.includes('/login')) {
  console.log('LOGIN FAILED — registering')
  await page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const textInputs = page.locator('input[type="text"]')
  await textInputs.nth(0).fill('UI')
  await textInputs.nth(1).fill('Audit')
  await page.locator('input[type="email"]').first().fill(email)
  const pws = page.locator('input[type="password"]')
  await pws.nth(0).fill(password)
  await pws.nth(1).fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForTimeout(4000)
  url = page.url()
  console.log('after register:', url, (await page.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' | '))
}
console.log('session url:', url)

for (const [path, name] of pagesToShot) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `/tmp/opencode/shots/${tag}-${name}-1280.png` })
  const info = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    h1: document.querySelector('h1')?.textContent?.slice(0, 40) || null,
    // any element wider than the viewport = horizontal overflow
    overflow: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2)
      .slice(0, 3)
      .map((el) => el.tagName + '.' + (el.className?.toString?.().slice(0, 40) || '')),
  }))
  console.log(name, JSON.stringify(info))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `/tmp/opencode/shots/${tag}-${name}-390.png` })
  await page.setViewportSize({ width: 1280, height: 900 })
}

// Open a modal from the transactions page (the dialog primitive).
await page.goto(`${base}/dashboard/transactions`, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(2000)
const addBtn = page.getByRole('button', { name: /\+ Add/i }).first()
if (await addBtn.count()) {
  await addBtn.click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `/tmp/opencode/shots/${tag}-modal-1280.png` })
  console.log('modal shot taken')
}

console.log('page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
