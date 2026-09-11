import { spawnSync } from 'node:child_process'
import { kumaPush } from './kuma-push.mjs'

const suites = {
  public: ['tests/public.spec.js', 'KUMA_PUSH_DOYA_PUBLIC'],
  commerce: ['tests/commerce.spec.js', 'KUMA_PUSH_DOYA_COMMERCE'],
  integrations: ['tests/integrations.spec.js', 'KUMA_PUSH_DOYA_INTEGRATIONS'],
}

const suite = process.argv[2]
const config = suites[suite]
if (!config) process.exit(2)

const started = Date.now()
const result = spawnSync('npx', ['playwright', 'test', config[0]], {
  shell: true,
  stdio: 'inherit',
  env: process.env,
})
const ok = result.status === 0
const delivery = await kumaPush(process.env[config[1]], {
  status: ok ? 'up' : 'down',
  msg: ok ? `OK ${suite} (read-only)` : `FAIL ${suite} exit=${result.status}`,
  ping: Date.now() - started,
})
if (!delivery.ok) process.exit(3)
process.exit(ok ? 0 : result.status || 1)
