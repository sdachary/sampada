// Mount smoke test - catches render crashes that blank the whole app.
// A bad React.lazy()/hook mismatch unmounts the tree, so #root ends up empty
// and the visitor gets a white page (shipped once via #27's landing icons).
import { test, expect } from '@playwright/test'

test('landing page mounts and stays mounted', async ({ page }) => {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#root h1')).toBeVisible({ timeout: 15000 })

  // Lazy chunks (3D hero, feature icons) settle after first paint.
  await page.waitForTimeout(3000)

  await expect(page.locator('#root')).not.toBeEmpty()
  expect(errors).toEqual([])
})
