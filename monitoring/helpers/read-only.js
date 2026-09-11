import { expect } from '@playwright/test'

const SUPABASE_WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Production safety boundary: catalog reads may leave the browser, but every
 * Supabase write is either answered in-memory by an explicit mock or rejected.
 */
export async function protectProduction(page, functionMocks = {}) {
  const unexpectedWrites = []

  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method().toUpperCase()
    const isSupabase = url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.net')

    if (!SUPABASE_WRITE_METHODS.has(method)) return route.continue()
    if (!isSupabase) {
      unexpectedWrites.push(`${method} ${url.origin}${url.pathname}`)
      return route.abort('blockedbyclient')
    }

    const functionPrefix = '/functions/v1/'
    if (url.pathname.startsWith(functionPrefix)) {
      const name = url.pathname.slice(functionPrefix.length).split('/')[0]
      const mock = functionMocks[name]
      if (mock) {
        return route.fulfill({
          status: mock.status ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(mock.body ?? {}),
        })
      }
    }

    // The public app records anonymous analytics through RPC POSTs. A monitor
    // must not alter those counters, so return an empty success locally.
    if (/\/rest\/v1\/rpc\/(record_pageview|record_event)$/.test(url.pathname)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    }

    unexpectedWrites.push(`${method} ${url.pathname}`)
    return route.abort('blockedbyclient')
  })

  return {
    assertSafe() {
      expect(unexpectedWrites, `Unexpected production writes: ${unexpectedWrites.join(', ')}`).toEqual([])
    },
  }
}

export async function putAvailableProductInCart(page) {
  await page.goto('/#shop', { waitUntil: 'domcontentloaded' })
  const product = page.locator('.product').filter({
    has: page.locator('button.commerce-button-small:enabled'),
  }).first()
  await expect(product).toBeVisible()

  const size = product.locator('.size-list button:enabled').first()
  if (await size.count()) await size.click()
  await product.locator('button.commerce-button-small:enabled').click()
  await expect(page.locator('.shop-feedback.is-added')).toBeVisible()
  await page.locator('a[href="/panier"]').first().click()
  await expect(page).toHaveURL(/\/panier/)
  await expect(page.locator('.cart-pay-note')).toContainText('Stripe')
}

export async function completeCheckoutForm(page, { newsletter = false } = {}) {
  await page.locator('#cart-email').fill('monitoring@example.invalid')
  if (newsletter) await page.locator('input[type="checkbox"]').first().check()
  await page.locator('#cart-accept-cgv').check()
}
