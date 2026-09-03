import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const origin = env.VITE_SITE_URL ? new URL(env.VITE_SITE_URL).origin : null
  const pages = env.GITHUB_PAGES === 'true'

  return {
    base: pages ? '/doya-website-v2/' : '/',
    appType: 'spa',
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      allowedHosts: true,
    },
    plugins: [react(), tailwindcss(), {
      name: 'doya-metadata',
      transformIndexHtml(html) {
        const tags = [{ tag: 'meta', attrs: { name: 'robots', content: env.VITE_INDEXABLE === 'true' ? 'index,follow' : 'noindex,nofollow' }, injectTo: 'head' }]
        if (origin) {
          html = html.replace('content="/luna-bohemia-cover.jpg"', `content="${origin}/luna-bohemia-cover.jpg"`)
          tags.push({ tag: 'link', attrs: { rel: 'canonical', href: `${origin}/` }, injectTo: 'head' })
          tags.push({ tag: 'meta', attrs: { property: 'og:url', content: `${origin}/` }, injectTo: 'head' })
        }
        return { html, tags }
      },
    }],
  }
})
