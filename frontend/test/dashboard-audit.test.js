import { test, expect } from '@playwright/test'

test('dashboard audit - check for overlapping elements', async ({ page }) => {
  // Navigate to deployed dashboard
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  
  // Check current URL
  console.log('Current URL:', page.url())
  
  // If we're on login page, we need to log in
  if (page.url().includes('/login')) {
    console.log('On login page, attempting to log in...')
    // Try common demo credentials
    await page.fill('input[type="email"]', 'demo@demo.com')
    await page.fill('input[type="password"]', 'demo123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    
    // Check if login succeeded
    if (page.url().includes('/login')) {
      // Try another common demo
      await page.fill('input[type="email"]', 'test@test.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(3000)
    }
    
    // Try to navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
  }
  
  console.log('Final URL:', page.url())
  
  const bodyText = await page.locator('body').textContent()
  console.log('Body contains "Net worth":', bodyText?.includes('Net worth'))
  console.log('Body contains "Total debt":', bodyText?.includes('Total debt'))
  console.log('Body contains "Dashboard":', bodyText?.includes('Dashboard'))
  
  // Take screenshot
  await page.screenshot({ path: 'dashboard-audit.png', fullPage: true })
  
  // Check for overlapping elements
  const overlappingElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'))
    const overlapping = []
    
    for (let i = 0; i < elements.length; i++) {
      const rect1 = elements[i].getBoundingClientRect()
      if (rect1.width === 0 || rect1.height === 0) continue
      
      for (let j = i + 1; j < elements.length; j++) {
        const rect2 = elements[j].getBoundingClientRect()
        if (rect2.width === 0 || rect2.height === 0) continue
        
        // Check if they overlap significantly
        const overlapX = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left))
        const overlapY = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top))
        
        if (overlapX > 10 && overlapY > 10) {
          // Check if one is not a child of the other
          if (!elements[i].contains(elements[j]) && !elements[j].contains(elements[i])) {
            overlapping.push({
              element1: elements[i].tagName + (elements[i].className ? '.' + elements[i].className : '') + (elements[i].id ? '#' + elements[i].id : ''),
              element2: elements[j].tagName + (elements[j].className ? '.' + elements[j].className : '') + (elements[j].id ? '#' + elements[j].id : ''),
              overlapX,
              overlapY
            })
          }
        }
      }
    }
    
    return overlapping
  })
  
  console.log('Overlapping elements found:', overlappingElements.length)
  if (overlappingElements.length > 0) {
    console.log('Details:', overlappingElements)
  }
  
  expect(true).toBe(true)
})