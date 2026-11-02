// Accessibility test (Step 10) - runs axe on key pages
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/styleguide', name: 'styleguide' },
  { path: '/login', name: 'login' },
]

for (const page of PAGES) {
  test(`axe: ${page.name}`, async ({ page }) => {
    await page.goto(`http://localhost:4173${page.path}`, { waitUntil: 'networkidle' })
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
}