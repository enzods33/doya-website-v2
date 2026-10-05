import { test, expect } from '@playwright/test'
import { protectProduction } from '../helpers/read-only.js'

test.describe('Doya public et back-office — lecture seule', () => {
  test('bio mobile dépliable et texte intégral conservé sur desktop', async ({ page }) => {
    const safety = await protectProduction(page)
    await page.addInitScript(() => localStorage.setItem('doya-locale', 'fr'))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'networkidle' })
    const paragraphs = page.locator('.about-biography-body')
    const more = page.getByRole('button', { name: 'Lire la suite' })
    await expect(paragraphs.first()).toBeVisible()
    await expect(paragraphs.nth(1)).toBeHidden()
    await more.click()
    await expect(paragraphs.last()).toBeVisible()
    const less = page.getByRole('button', { name: 'Réduire' })
    await expect(less).toHaveAttribute('aria-expanded', 'true')
    await less.click()
    await expect(paragraphs.nth(1)).toBeHidden()
    await expect(more).toBeFocused()
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(more).toBeHidden()
    await expect(paragraphs.last()).toBeVisible()
    expect(await page.locator('.about-biography-body-flow').evaluate((node) => getComputedStyle(node).columnCount)).toBe('2')
    safety.assertSafe()
  })
  test('le site public rend ses sections et ses médias principaux', async ({ page }) => {
    const safety = await protectProduction(page)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main')).toBeVisible()
    await expect(page.locator('#music')).toBeVisible()
    await expect(page.locator('#about')).toBeVisible()
    await expect(page.locator('#gallery')).toBeVisible()
    await expect(page.locator('#live')).toBeVisible()
    await expect(page.locator('#shop')).toBeVisible()
    await expect(page.locator('footer#contact')).toBeVisible()
    const sectionOrder = await page.locator('#music, #about, #gallery, #live, #shop, footer#contact').evaluateAll((nodes) => nodes.map((node) => node.id))
    expect(sectionOrder).toEqual(['music', 'about', 'gallery', 'live', 'shop', 'contact'])
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
