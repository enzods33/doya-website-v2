import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('la section musique conserve le vinyle animé dans le livret éditorial', () => {
  const music = readFileSync(new URL('../src/sections/music/Music.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')

  assert.match(music, /className="music-heading music-heading-editorial"/)
  assert.match(music, /className="music-liner-sheet"/)
  assert.match(music, /<VinylDisc className="music-tracklist-vinyl" \/>/)
  assert.match(styles, /\.music-tracklist-vinyl-rotor\s*\{[\s\S]*animation-duration:\s*48s/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styles, /\.music-liner-sheet\s*\{/)
})
