import { test, expect } from '@playwright/test'
import { protectProduction } from '../helpers/read-only.js'

const expectedHosts = {
  Spotify: 'open.spotify.com',
  'Apple Music': 'music.apple.com',
  Deezer: 'www.deezer.com',
  YouTube: 'www.youtube.com',
  Instagram: 'www.instagram.com',
  TikTok: 'www.tiktok.com',
  Facebook: 'www.facebook.com',
}

test.describe('Doya écoute, réseaux et Brevo — sans appel externe mutatif', () => {
  test('les liens officiels sont présents, sûrs et les pistes publiées s’ouvrent', async ({ page }) => {
    const safety = await protectProduction(page)
    await page.goto('/#music', { waitUntil: 'domcontentloaded' })

    for (const [name, host] of Object.entries(expectedHosts)) {
      const link = page.locator(`footer a[aria-label="${name}"]`).first()
      await expect(link).toBeVisible()
      const href = await link.getAttribute('href')
      expect(new URL(href).hostname).toBe(host)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
    }

    const publishedTrack = page.locator('.track-row').filter({ hasText: 'Todo de mí' }).locator('button.track-play')
    await publishedTrack.click()
    await expect(publishedTrack).toHaveAttribute('aria-expanded', 'true')
    const panelId = await publishedTrack.getAttribute('aria-controls')
    await expect(page.locator(`[id="${panelId}"] a`)).toHaveCount(4)
    safety.assertSafe()
  })

  test('le formulaire newsletter affiche succès et erreur Brevo', async ({ page }) => {
    const safety = await protectProduction(page, {
      'subscribe-newsletter': { status: 200, body: { ok: true, already: false } },
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const form = page.locator('footer .newsletter-signup-form')
    await form.locator('input[name="email"]').fill('monitoring@example.invalid')
    await form.locator('button[type="submit"]').click()
    await expect(page.locator('footer .newsletter-signup-status.is-ok')).toBeVisible()
    safety.assertSafe()
  })

  test('le fallback newsletter est compréhensible', async ({ page }) => {
    const safety = await protectProduction(page, {
      'subscribe-newsletter': { status: 503, body: { error: 'newsletter_failed' } },
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const form = page.locator('footer .newsletter-signup-form')
    await form.locator('input[name="email"]').fill('monitoring@example.invalid')
    await form.locator('button[type="submit"]').click()
    await expect(page.locator('footer .newsletter-signup-status.is-error')).toBeVisible()
    safety.assertSafe()
  })
})
