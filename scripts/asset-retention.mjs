import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ASSET_REF_RE = /(?:\/assets\/|\.\/)([A-Za-z0-9][A-Za-z0-9._-]*\.(?:js|css|svg|png|jpe?g|webp|gif|avif|woff2?|ttf|otf|ico|json))/g
const HASHED_ASSET_RE = /-[A-Za-z0-9_-]{6,}\.[A-Za-z0-9]+$/
const SAFE_DELETE_CONFIRM = 'DELETE_OLD_DOYA_ASSETS'

function extractAssetNames(source) {
  const names = new Set()
  for (const match of source.matchAll(ASSET_REF_RE)) names.add(match[1])
  return names
}

export function collectReachableAssets(rootDir) {
  const root = resolve(rootDir)
  const assetsDir = resolve(root, 'assets')
  const indexPath = resolve(root, 'index.html')
  if (!existsSync(indexPath)) throw new Error(`index.html introuvable: ${indexPath}`)
  if (!existsSync(assetsDir)) throw new Error(`dossier assets introuvable: ${assetsDir}`)
  const reachable = new Set()
  const queue = [...extractAssetNames(readFileSync(indexPath, 'utf8'))]
  while (queue.length) {
    const name = queue.shift()
    if (!name || reachable.has(name) || basename(name) !== name) continue
    const path = resolve(assetsDir, name)
    if (!existsSync(path) || !statSync(path).isFile()) continue
    reachable.add(name)
    if (/\.(?:js|css)$/.test(name)) {
      const text = readFileSync(path, 'utf8')
      for (const child of extractAssetNames(text)) if (!reachable.has(child)) queue.push(child)
    }
  }
  return reachable
}

export function findAssetCandidates(rootDir, { minAgeDays = 30, nowMs = Date.now() } = {}) {
  const root = resolve(rootDir)
  const assetsDir = resolve(root, 'assets')
  const reachable = collectReachableAssets(root)
  const cutoffMs = nowMs - minAgeDays * 86400000
  const candidates = []
  let totalBytes = 0
  for (const name of readdirSync(assetsDir)) {
    const path = resolve(assetsDir, name)
    const stat = statSync(path)
    if (!stat.isFile() || !HASHED_ASSET_RE.test(name) || reachable.has(name) || stat.mtimeMs >= cutoffMs) continue
    candidates.push({ name, path, bytes: stat.size, mtimeMs: stat.mtimeMs })
    totalBytes += stat.size
  }
  candidates.sort((a,b)=>a.mtimeMs-b.mtimeMs || a.name.localeCompare(b.name))
  return { root, assetsDir, minAgeDays, reachable, candidates, totalBytes }
}

export function deleteAssetCandidates(result, { confirm } = {}) {
  if (result.minAgeDays < 30) throw new Error('refus: une suppression exige minAgeDays >= 30')
  if (confirm !== SAFE_DELETE_CONFIRM) throw new Error(`refus: confirmation requise --confirm=${SAFE_DELETE_CONFIRM}`)
  for (const item of result.candidates) unlinkSync(item.path)
  return result.candidates.length
}

function parseArgs(argv) {
  const options = { root: '/var/www/doya', minAgeDays: 30, delete: false, confirm: '' }
  for (let i=0;i<argv.length;i+=1) {
    const arg=argv[i]
    if (arg==='--root') options.root=argv[++i]
    else if (arg==='--min-age-days') options.minAgeDays=Number(argv[++i])
    else if (arg==='--delete') options.delete=true
    else if (arg.startsWith('--confirm=')) options.confirm=arg.slice('--confirm='.length)
    else throw new Error(`argument inconnu: ${arg}`)
  }
  if (!Number.isFinite(options.minAgeDays) || options.minAgeDays < 1) throw new Error('minAgeDays invalide')
  return options
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KiB`
  return `${(bytes/1048576).toFixed(2)} MiB`
}

export function runCli(argv=process.argv.slice(2)) {
  const options=parseArgs(argv)
  const result=findAssetCandidates(options.root,{minAgeDays:options.minAgeDays})
  console.log(`Racine: ${result.root}`)
  console.log(`Assets atteignables depuis le build actuel: ${result.reachable.size}`)
  console.log(`Candidats non référencés et âgés d'au moins ${result.minAgeDays} jours: ${result.candidates.length}`)
  console.log(`Volume candidat: ${formatBytes(result.totalBytes)}`)
  for (const item of result.candidates) console.log(`- ${item.name} | ${formatBytes(item.bytes)} | ${new Date(item.mtimeMs).toISOString()}`)
  if (!options.delete) {
    console.log('DRY-RUN uniquement: aucun fichier supprimé.')
    return 0
  }
  console.log(`SUPPRESSION terminée: ${deleteAssetCandidates(result,{confirm:options.confirm})} fichier(s).`)
  return 0
}

const isMain=process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href
if (isMain) {
  try { process.exitCode=runCli() }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode=1 }
}
