// Visual smoke test (Step 10) - Playwright screenshots
import { test, expect } from '@playwright/test'

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/styleguide', name: 'styleguide' },
]

const VIEWPORTS = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1280, height: 844, name: 'desktop' },
]

for (const page of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`visual: ${page.name} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(`http://localhost:4173${page.path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000) // Let animations settle
      await expect(page).toHaveScreenshot(`${page.name}-${vp.name}.png`, {
        maxDiffPixels: 100,
        threshold: 0.1,
      })
    })
  }
}