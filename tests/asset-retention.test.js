import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findAssetCandidates, deleteAssetCandidates } from '../scripts/asset-retention.mjs'

function fixture() {
  const root=mkdtempSync(join(tmpdir(),'doya-assets-'))
  const assets=join(root,'assets'); mkdirSync(assets)
  writeFileSync(join(root,'index.html'),'<script type="module" src="/assets/index-AAAAAA.js"></script><link rel="stylesheet" href="/assets/index-BBBBBB.css">')
  writeFileSync(join(assets,'index-AAAAAA.js'),'import("./lazy-CCCCCC.js");')
  writeFileSync(join(assets,'index-BBBBBB.css'),'body{background:url("./hero-FFFFFF.webp")}')
  writeFileSync(join(assets,'lazy-CCCCCC.js'),'export default 1')
  writeFileSync(join(assets,'hero-FFFFFF.webp'),'image')
  writeFileSync(join(assets,'orphan-DDDDDD.js'),'old')
  writeFileSync(join(assets,'recent-EEEEEE.js'),'recent')
  writeFileSync(join(assets,'logo.svg'),'keep')
  const old=new Date('2026-08-01T12:00:00Z'), recent=new Date('2026-09-20T12:00:00Z')
  for (const n of ['index-AAAAAA.js','index-BBBBBB.css','lazy-CCCCCC.js','hero-FFFFFF.webp','orphan-DDDDDD.js','logo.svg']) utimesSync(join(assets,n),old,old)
  utimesSync(join(assets,'recent-EEEEEE.js'),recent,recent)
  return {root,now:new Date('2026-09-28T12:00:00Z')}
}

test('seuls les assets hashés, anciens et non atteignables deviennent candidats',()=>{
  const {root,now}=fixture()
  const r=findAssetCandidates(root,{minAgeDays:30,nowMs:now.getTime()})
  assert.deepEqual([...r.reachable].sort(),['hero-FFFFFF.webp','index-AAAAAA.js','index-BBBBBB.css','lazy-CCCCCC.js'])
  assert.deepEqual(r.candidates.map(x=>x.name),['orphan-DDDDDD.js'])
})

test('la suppression exige 30 jours et une confirmation explicite',()=>{
  const {root,now}=fixture()
  const r=findAssetCandidates(root,{minAgeDays:30,nowMs:now.getTime()})
  assert.throws(()=>deleteAssetCandidates(r),/confirmation requise/)
  assert.equal(existsSync(join(root,'assets','orphan-DDDDDD.js')),true)
  assert.equal(deleteAssetCandidates(r,{confirm:'DELETE_OLD_DOYA_ASSETS'}),1)
  assert.equal(existsSync(join(root,'assets','orphan-DDDDDD.js')),false)
})
