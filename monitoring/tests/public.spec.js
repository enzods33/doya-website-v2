import { test, expect } from '@playwright/test'
import { protectProduction } from '../helpers/read-only.js'

test.describe('Doya public et back-office — lecture seule', () => {
  test('le site public rend ses sections et ses médias principaux', async ({ page }) => {
    const safety = await protectProduction(page)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main')).toBeVisible()
    await expect(page.locator('#music')).toBeVisible()
    await expect(page.locator('#shop')).toBeVisible()
    await expect(page.locator('footer#contact')).toBeVisible()
    await expect(page.locator('img').first()).toHaveJSProperty('complete', true)

    expect(errors).toEqual([])
    safety.assertSafe()
  })

  test('le back-office reste protégé par la porte Google', async ({ page }) => {
    const safety = await protectProduction(page)
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Backstage' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuer avec Google|Continue with Google/i })).toBeVisible()
    await expect(page.getByRole('tab')).toHaveCount(0)
    safety.assertSafe()
  })
})
