import test from 'node:test'
import assert from 'node:assert/strict'
import { localAdminPreview } from '../src/commerce/localAdminPreview.js'
import { readLocalVideoPreview } from '../src/commerce/localVideoPreview.js'

test('l’aperçu admin enregistre uniquement sa vidéo dans le navigateur et refuse les autres écritures', async () => {
  const previousStorage = globalThis.localStorage
  const previousFetch = globalThis.fetch
  const cache = new Map()
  globalThis.localStorage = { getItem: (key) => cache.get(key), setItem: (key, value) => cache.set(key, value) }
  globalThis.fetch = async () => { assert.fail('No real network request is allowed') }
  try {
    const saved = await localAdminPreview('admin-clips', { action: 'save', title: 'Solo tú', enabled: true, video_url: 'https://youtu.be/sO-I92cpFSY' })
    assert.equal(saved.clip.title, 'Solo tú')
    assert.equal(readLocalVideoPreview().video_url, 'https://www.youtube.com/watch?v=sO-I92cpFSY')
    assert.equal(cache.size, 1)
    for (const [path, action] of [['admin-concerts', 'save'], ['admin-bio-photos', 'save_bio'], ['admin-stats', 'inventory'], ['admin-brevo-campaign', 'send']]) {
      await assert.rejects(localAdminPreview(path, { action }), /read_only_preview/)
    }
    await assert.rejects(localAdminPreview('admin-clips', { action: 'save', title: 'Test', video_url: 'https://youtube.com.evil.example/watch?v=sO-I92cpFSY' }), /invalid_youtube_url/)
    assert.equal(cache.size, 1)
    assert.equal(readLocalVideoPreview().title, 'Solo tú')
  } finally {
    globalThis.localStorage = previousStorage
    globalThis.fetch = previousFetch
  }
})
