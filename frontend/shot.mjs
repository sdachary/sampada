import { chromium } from '@playwright/test'

const base = process.argv[2] || 'https://sampada.vayalabs.in'
const tag = process.argv[3] || 'live'
const paths = (process.argv[4] || '/,/login,/styleguide').split(',')

const browser = await chromium.launch()
for (const p of paths) {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${base}${p}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1500)
    const name = `${tag}-${p.replace(/\//g, '_') || 'root'}-${width}`
    await page.screenshot({ path: `/tmp/opencode/shots/${name}.png`, fullPage: true })
    const body = await page.evaluate(() => ({
      font: getComputedStyle(document.body).fontFamily,
      h1: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : null,
      h1Size: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontSize : null,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }))
    console.log(name, JSON.stringify(body), errors.length ? `ERRORS: ${errors.join(' | ')}` : '')
    await page.close()
  }
}
await browser.close()
