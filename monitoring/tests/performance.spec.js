import { test, expect } from '@playwright/test'
import { protectProduction } from '../helpers/read-only.js'

test('accueil utilisable avant le SDK, puis catalogue disponible', async ({ page }) => {
  const safety = await protectProduction(page)
  let release
  const ready = new Promise((resolve) => { release = resolve })
  await page.route('**/assets/supabase-*.js', async (route) => {
    await ready
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.hero-photo')).toBeVisible()
    await expect(page.locator('.menu-trigger')).toBeAttached()
    release()
    await expect(page.locator('#shop').getByRole('button', { name: 'XS', exact: true }).first()).toBeVisible()
    safety.assertSafe()
  } finally {
    release()
  }
})

test('miniature YouTube mobile avec repli si le WebP manque', async ({ page }) => {
  const safety = await protectProduction(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/vi_webp/**', (route) => route.fulfill({ status: 404, body: '' }))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const poster = page.locator('.music-video-poster')
  await poster.scrollIntoViewIfNeeded()
  await expect.poll(() => poster.evaluate((image) => image.currentSrc)).toContain('hqdefault.jpg')
  await expect.poll(() => poster.evaluate((image) => image.naturalWidth)).toBeGreaterThan(120)
  const box = await poster.boundingBox()
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
  safety.assertSafe()
})
