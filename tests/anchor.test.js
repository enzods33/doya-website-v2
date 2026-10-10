import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForAnchor } from '../src/utils/waitForAnchor.js'

test('ancres : montage différé, annulation et cible déjà présente', () => {
  const original = { document: globalThis.document, window: globalThis.window, MutationObserver: globalThis.MutationObserver }
  let target = null
  let notify
  let disconnected = false
  const listeners = new Map()
  globalThis.document = { body: {}, getElementById: (id) => id === 'shop' ? target : null }
  globalThis.window = {
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: (event) => listeners.delete(event),
  }
  globalThis.MutationObserver = class {
    constructor(fn) { notify = fn }
    observe() { disconnected = false }
    disconnect() { disconnected = true }
  }
  try {
    const results = []
    const stop = waitForAnchor('#shop', (el) => results.push(el))
    // Still absent after the initial render: do not give up after 16 frames.
    for (let i = 0; i < 30; i++) notify()
    assert.equal(results.length, 0)
    target = { id: 'shop' }
    notify()
    assert.deepEqual(results, [target])
    stop()
    assert.equal(disconnected, true)
    assert.equal(listeners.size, 0)

    target = null
    waitForAnchor('#shop', () => assert.fail('cancelled anchor must not scroll'))
    listeners.get('touchstart')()
    assert.equal(disconnected, true)
    assert.equal(listeners.size, 0)

    target = { id: 'shop' }
    const stopImmediate = waitForAnchor('#shop', (el) => results.push(el))
    assert.equal(results.length, 2)
    stopImmediate()
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
