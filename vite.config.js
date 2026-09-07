import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_ASSETS_BASE_URL, STAGING_SITE_URL } from './src/config/publicUrls.js'
import { buildJsonLd } from './src/utils/seo.js'

const SITEMAP_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { path: '/cgv', priority: '0.4', changefreq: 'yearly' },
  { path: '/confidentialite', priority: '0.3', changefreq: 'yearly' },
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const origin = env.VITE_SITE_URL ? new URL(env.VITE_SITE_URL).origin : null
  const pages = env.GITHUB_PAGES === 'true'
  const indexable = env.VITE_INDEXABLE === 'true'
  const assetsBase = String(env.VITE_ASSETS_URL || DEFAULT_ASSETS_BASE_URL).replace(/\/$/, '')
  const site = origin || STAGING_SITE_URL

  return {
    base: pages ? '/doya-website-v2/' : '/',
    appType: 'spa',
    build: {
      modulePreload: {
        resolveDependencies(_filename, deps) {
          // Ne pas rivaliser avec le LCP hero : supabase charge après le premier paint
          return deps.filter((dep) => !dep.includes('supabase'))
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@supabase')) return 'supabase'
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion'
          },
        },
      },
    },
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      allowedHosts: true,
    },
    plugins: [react(), tailwindcss(), {
      name: 'doya-metadata',
      transformIndexHtml(html) {
        const cover = `${site}/luna-bohemia-cover.jpg`
        const jsonLd = JSON.stringify(buildJsonLd(site))
        const tags = [
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'image',
              href: `${assetsBase}/site/hero.jpg`,
              fetchpriority: 'high',
            },
            injectTo: 'head',
          },
          {
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            children: jsonLd,
            injectTo: 'head',
          },
        ]

        // Remplacer les URLs relatives d’image de partage par l’origine absolue.
        html = html
          .replaceAll('content="/luna-bohemia-cover.jpg"', `content="${cover}"`)
          .replace(
            'content="noindex,nofollow"',
            `content="${indexable ? 'index,follow' : 'noindex,nofollow'}"`,
          )

        if (origin) {
          tags.push({ tag: 'link', attrs: { rel: 'canonical', href: `${origin}/` }, injectTo: 'head' })
          tags.push({ tag: 'meta', attrs: { property: 'og:url', content: `${origin}/` }, injectTo: 'head' })
        }

        return { html, tags }
      },
      closeBundle() {
        const outDir = resolve(process.cwd(), 'dist')
        const lastmod = new Date().toISOString().slice(0, 10)
        const robots = indexable
          ? [
              'User-agent: *',
              'Allow: /',
              'Disallow: /admin',
              'Disallow: /panier',
              'Disallow: /commande',
              `Sitemap: ${site}/sitemap.xml`,
              '',
            ].join('\n')
          : [
              'User-agent: *',
              'Disallow: /',
              '',
            ].join('\n')
        writeFileSync(resolve(outDir, 'robots.txt'), robots)

        const urls = SITEMAP_PATHS.map(({ path, priority, changefreq }) => {
          const loc = `${site}${path === '/' ? '/' : path}`
          return [
            '  <url>',
            `    <loc>${loc}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            `    <changefreq>${changefreq}</changefreq>`,
            `    <priority>${priority}</priority>`,
            '  </url>',
          ].join('\n')
        }).join('\n')

        writeFileSync(
          resolve(outDir, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        )
      },
    }],
  }
})
