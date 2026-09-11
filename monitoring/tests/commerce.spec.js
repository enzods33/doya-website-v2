import { test, expect } from '@playwright/test'
import {
  completeCheckoutForm,
  protectProduction,
  putAvailableProductInCart,
} from '../helpers/read-only.js'

test.describe('Doya panier et paiement — Stripe simulé, aucune commande', () => {
  test('validation CGV puis fallback visible quand Stripe est indisponible', async ({ page }) => {
    const safety = await protectProduction(page, {
      'create-checkout-session': { status: 502, body: { error: 'stripe_unavailable' } },
    })
    await putAvailableProductInCart(page)

    await page.locator('#cart-email').fill('monitoring@example.invalid')
    await page.locator('button.cart-pay-button').click()
    await expect(page.getByRole('alert')).toContainText(/conditions générales|terms (and conditions|of sale)/i)

    await page.locator('#cart-accept-cgv').check()
    await page.locator('button.cart-pay-button').click()
    await expect(page.getByRole('alert')).toContainText(/Paiement indisponible|Payment.*unavailable/i)
    await expect(page.locator('button.cart-pay-button')).toBeEnabled()
    safety.assertSafe()
  })

  test('une panne Brevo ne bloque pas la redirection Stripe', async ({ page }) => {
    const safety = await protectProduction(page, {
      'subscribe-newsletter': { status: 503, body: { error: 'newsletter_failed' } },
      'create-checkout-session': {
        status: 200,
        body: { url: 'https://checkout.stripe.com/c/pay/cs_test_doya_monitoring' },
      },
    })
    await page.route('https://checkout.stripe.com/**', (route) => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Stripe simulé</title><h1>Stripe Checkout simulé</h1>',
    }))

    await putAvailableProductInCart(page)
    await completeCheckoutForm(page, { newsletter: true })
    await page.locator('button.cart-pay-button').click()
    await expect(page).toHaveURL(/checkout\.stripe\.com/)
    await expect(page.getByRole('heading', { name: /Stripe Checkout simul/i })).toBeVisible()
    safety.assertSafe()
  })
})
