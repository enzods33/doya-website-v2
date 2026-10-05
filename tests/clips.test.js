import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createReadOnlyPreviewFetch } from '../src/commerce/readOnlyPreviewFetch.js'
import { defaultFeaturedClip } from '../src/data/clips.js'
import { normalizeFeaturedClip, youtubeThumbnailUrl, youtubeVideoId, youtubeWatchUrl } from '../src/commerce/clips.js'
import { fetchYoutubeMetadata } from '../supabase/functions/_shared/youtube.js'
import { handleClipAction } from '../supabase/functions/admin-clips/handler.js'
import { album } from '../src/data/album.js'

test('la vidéo mise en avant vient du clip officiel Solo tú déclaré dans l’album', () => {
  const soloTu = album.tracks.find((track) => track.title === 'Solo tú')
  assert.equal(defaultFeaturedClip.title, 'Solo tú')
  assert.equal(defaultFeaturedClip.sourceVideoUrl, soloTu.links.youtube)
  assert.equal(defaultFeaturedClip.videoUrl, 'https://www.youtube.com/watch?v=sO-I92cpFSY')
  assert.equal(youtubeVideoId(defaultFeaturedClip.sourceVideoUrl), 'sO-I92cpFSY')
  assert.equal(defaultFeaturedClip.videoId, youtubeVideoId(soloTu.links.youtube))
  assert.equal(defaultFeaturedClip.poster, 'https://i.ytimg.com/vi/sO-I92cpFSY/maxresdefault.jpg')
})

test('les liens YouTube reconnus sont convertis en identifiant, sans iframe arbitraire', () => {
  assert.equal(youtubeVideoId('https://www.youtube.com/watch?v=w3R8leGVyRk'), 'w3R8leGVyRk')
  assert.equal(youtubeVideoId('https://youtu.be/w3R8leGVyRk?t=15'), 'w3R8leGVyRk')
  assert.equal(youtubeVideoId('https://www.youtube.com/shorts/w3R8leGVyRk'), 'w3R8leGVyRk')
  assert.equal(youtubeVideoId('https://example.com/watch?v=w3R8leGVyRk'), null)
  assert.equal(youtubeVideoId('http://www.youtube.com/watch?v=w3R8leGVyRk'), null)
  assert.equal(youtubeVideoId('https://www.youtube.com.evil.example/watch?v=w3R8leGVyRk'), null)
  assert.equal(youtubeVideoId('https://www.youtube.com@evil.example/watch?v=w3R8leGVyRk'), null)
  assert.equal(youtubeVideoId('https://user:pass@www.youtube.com/watch?v=w3R8leGVyRk'), null)
  assert.equal(youtubeVideoId('https://www.youtube.com:444/watch?v=w3R8leGVyRk'), null)
  assert.equal(youtubeWatchUrl('w3R8leGVyRk'), 'https://www.youtube.com/watch?v=w3R8leGVyRk')
  assert.equal(youtubeThumbnailUrl('w3R8leGVyRk'), 'https://i.ytimg.com/vi/w3R8leGVyRk/maxresdefault.jpg')
  assert.equal(youtubeThumbnailUrl('w3R8leGVyRk', 'fallback'), 'https://i.ytimg.com/vi/w3R8leGVyRk/hqdefault.jpg')
  assert.equal(youtubeThumbnailUrl('invalid'), null)
  assert.equal(youtubeVideoId('<iframe src="https://evil.example"></iframe>'), null)
})

test('un lien remplacé change la miniature et conserve le titre libre choisi par l’artiste', async () => {
  let savedRow
  const deps = {
    readClip: async () => ({ data: savedRow }),
    saveClip: async (row) => { savedRow = row; return { data: row } },
    fetchMetadata: (url) => fetchYoutubeMetadata(url, {
      fetchImpl: async (endpoint, options) => {
        const query = new URL(endpoint)
        assert.equal(query.origin, 'https://www.youtube.com')
        assert.equal(query.pathname, '/oembed')
        assert.equal(query.searchParams.get('url'), 'https://www.youtube.com/watch?v=w3R8leGVyRk')
        assert.equal(options.redirect, 'error')
        return Response.json({ title: 'Nouveau titre officiel', thumbnail_url: 'https://evil.example/tracker.png' })
      },
    }),
  }
  const preview = await handleClipAction({ action: 'preview', video_url: 'https://youtu.be/w3R8leGVyRk?t=15' }, deps)
  assert.equal(preview.status, 200)
  assert.equal(savedRow, undefined)
  const saved = await handleClipAction({ action: 'save', enabled: false, title: '  Notre titre libre  ', video_url: 'https://youtu.be/w3R8leGVyRk' }, deps)
  assert.equal(saved.status, 200)
  assert.equal(savedRow.title, 'Notre titre libre')
  assert.equal(savedRow.enabled, false)
  const publicClip = normalizeFeaturedClip((await handleClipAction({ action: 'get' }, deps)).body.clip)
  assert.equal(publicClip.title, 'Notre titre libre')
  assert.equal(publicClip.poster, 'https://i.ytimg.com/vi/w3R8leGVyRk/maxresdefault.jpg')
  assert.equal(publicClip.videoUrl, 'https://www.youtube.com/watch?v=w3R8leGVyRk')
})

test('une vidéo indisponible ou un lien hostile ne remplace jamais la vidéo enregistrée', async () => {
  let writes = 0
  let requests = 0
  const deps = {
    saveClip: async () => { writes++; return { data: {} } },
    fetchMetadata: (url) => fetchYoutubeMetadata(url, { fetchImpl: async () => { requests++; return new Response('', { status: 404 }) } }),
  }
  const rejected = await handleClipAction({ action: 'save', video_url: 'https://youtube.com.evil.example/watch?v=w3R8leGVyRk' }, deps)
  assert.equal(rejected.status, 400)
  assert.equal(requests, 0)
  const unavailable = await handleClipAction({ action: 'save', title: 'Solo tú', video_url: 'https://youtu.be/w3R8leGVyRk' }, deps)
  assert.equal(unavailable.body.error, 'youtube_metadata_unavailable')
  assert.equal(writes, 0)
  assert.equal(requests, 1)
})

test('un titre vide ou trop long est refusé avant toute requête ou sauvegarde', async () => {
  const forbidden = async () => { assert.fail('No service should be called') }
  for (const title of ['', '   ', 'X'.repeat(121)]) {
    const result = await handleClipAction({ action: 'save', title, video_url: defaultFeaturedClip.videoUrl }, { fetchMetadata: forbidden, saveClip: forbidden })
    assert.equal(result.body.error, 'invalid_clip_title')
  }
})

test('une réponse YouTube incomplète ou une panne ne publie aucun titre de secours incorrect', async () => {
  for (const data of [{}, { title: ' ' }, { title: 'X'.repeat(121) }]) {
    await assert.rejects(fetchYoutubeMetadata(defaultFeaturedClip.videoUrl, { fetchImpl: async () => Response.json(data) }), /youtube_metadata_unavailable/)
  }
  await assert.rejects(fetchYoutubeMetadata(defaultFeaturedClip.videoUrl, { fetchImpl: async () => { throw new Error('timeout') } }), /youtube_metadata_unavailable/)
})

test('CSP et préparation Supabase limitent le lecteur et les écritures', () => {
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')
  const netlify = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../supabase/migrations/20261004170952_site_featured_clip.sql', import.meta.url), 'utf8')
  const admin = readFileSync(new URL('../supabase/functions/admin-clips/index.ts', import.meta.url), 'utf8')
  const youtube = readFileSync(new URL('../supabase/functions/_shared/youtube.js', import.meta.url), 'utf8')
  const section = readFileSync(new URL('../src/sections/clips/Clips.jsx', import.meta.url), 'utf8')
  const music = readFileSync(new URL('../src/sections/music/Music.jsx', import.meta.url), 'utf8')
  assert.match(headers, /img-src[^\n]*https:\/\/i\.ytimg\.com/)
  assert.match(netlify, /img-src[^\n]*https:\/\/i\.ytimg\.com/)
  assert.doesNotMatch(headers, /frame-src[^\n]*youtube-nocookie/)
  assert.doesNotMatch(netlify, /frame-src[^\n]*youtube-nocookie/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /revoke all on public\.site_featured_clip from anon, authenticated, public/)
  assert.match(migration, /grant select on public\.site_featured_clip to anon, authenticated/)
  assert.match(admin, /requireAdmin/)
  assert.match(youtube, /url\.protocol !== 'https:'/)
  assert.match(youtube, /url\.username \|\| url\.password \|\| url\.port/)
  assert.match(admin, /handleClipAction/)
  assert.doesNotMatch(section, /w3R8leGVyRk/)
  assert.match(section, /className="music-video-link"/)
  assert.match(section, /href=\{watchUrl\}/)
  assert.match(section, /music-video-poster/)
  assert.doesNotMatch(section, /className="music-video-play"/)
  assert.doesNotMatch(section, /<iframe/)
  assert.doesNotMatch(section, /Ouvrir sur YouTube|clips-meta|clips-play/)
  assert.match(music, /<FeaturedVideo \/>/)
})

test('le garde lecture seule n’envoie que les lectures directes des tables autorisées', async () => {
  let networkCalls = 0
  const safeFetch = createReadOnlyPreviewFetch({
    origin: 'https://example.supabase.co',
    tables: ['site_bio', 'catalog_products'],
    fetchImpl: async () => {
      networkCalls += 1
      return new Response('ok')
    },
  })

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await assert.rejects(safeFetch('https://example.supabase.co/rest/v1/site_bio', { method }), /read_only_preview/)
  }

  const request = new Request('https://example.supabase.co/rest/v1/site_bio')
  await assert.rejects(safeFetch(request, { method: 'POST' }), /read_only_preview/)
  await assert.rejects(safeFetch('https://example.supabase.co/rest/v1/rpc/site_bio'), /read_only_preview/)
  await assert.rejects(safeFetch('https://other.supabase.co/rest/v1/site_bio'), /read_only_preview/)
  assert.equal(networkCalls, 0)

  const response = await safeFetch('https://example.supabase.co/rest/v1/catalog_products?select=id')
  assert.equal(await response.text(), 'ok')
  assert.equal(networkCalls, 1)
})
