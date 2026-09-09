import { socials } from '../data/socials.js'
import { album } from '../data/album.js'
import { siteContent } from '../data/siteContent.js'
import { STAGING_SITE_URL } from '../config/publicUrls.js'

const INDEXABLE_PATHS = new Set(['/', '/mentions-legales', '/cgv', '/confidentialite'])

function setNamedMeta(attr, key, content) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Résout le contenu SEO d’une route (titre / description / indexabilité). */
export function resolveRouteSeo(path, t) {
  if (path === '/mentions-legales') {
    return {
      title: `${t('legal.mentions.title')} — ${siteContent.name}`,
      description: t('meta.mentionsDescription'),
      canonicalPath: '/mentions-legales',
    }
  }
  if (path === '/cgv') {
    return {
      title: `${t('legal.cgv.title')} — ${siteContent.name}`,
      description: t('meta.cgvDescription'),
      canonicalPath: '/cgv',
    }
  }
  if (path === '/confidentialite') {
    return {
      title: `${t('legal.privacy.title')} — ${siteContent.name}`,
      description: t('meta.privacyDescription'),
      canonicalPath: '/confidentialite',
    }
  }
  if (path === '/panier') {
    return {
      title: `${t('cart.title')} — ${siteContent.name}`,
      description: t('meta.description'),
      canonicalPath: '/panier',
    }
  }
  if (path === '/commande') {
    return {
      title: `${t('order.title')} — ${siteContent.name}`,
      description: t('meta.description'),
      canonicalPath: '/commande',
    }
  }
  if (path === '/admin') {
    return {
      title: `${t('admin.kicker')} — ${siteContent.name}`,
      description: t('meta.description'),
      canonicalPath: '/admin',
    }
  }
  if (path !== '/') {
    return {
      title: `${t('notFound.title')} — ${siteContent.name}`,
      description: t('meta.description'),
      canonicalPath: '/',
    }
  }
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    canonicalPath: '/',
  }
}

export function siteOrigin() {
  const raw = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SITE_URL : ''
  if (raw) {
    try {
      return new URL(raw).origin
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    return window.location.origin
  }
  return STAGING_SITE_URL
}

/** Met à jour title / description / robots / OG / Twitter / canonical selon la route. */
export function applyDocumentSeo({ path, locale, intlLocale, t, indexable }) {
  const seo = resolveRouteSeo(path, t)
  const origin = siteOrigin()
  const canonical = `${origin}${seo.canonicalPath === '/' ? '/' : seo.canonicalPath}`
  const allowIndex = Boolean(indexable) && INDEXABLE_PATHS.has(path)
  const robots = allowIndex ? 'index,follow' : 'noindex,nofollow'
  const ogLocale = String(intlLocale || 'fr-FR').replace('-', '_')
  const cover = `${origin}/luna-bohemia-cover.jpg`

  document.title = seo.title
  setNamedMeta('name', 'description', seo.description)
  setNamedMeta('name', 'robots', robots)

  setNamedMeta('property', 'og:title', seo.title)
  setNamedMeta('property', 'og:description', seo.description)
  setNamedMeta('property', 'og:url', canonical)
  setNamedMeta('property', 'og:locale', ogLocale)
  setNamedMeta('property', 'og:image', cover)

  setNamedMeta('name', 'twitter:title', seo.title)
  setNamedMeta('name', 'twitter:description', seo.description)
  setNamedMeta('name', 'twitter:image', cover)

  setLink('canonical', canonical)
  document.documentElement.lang = locale
}

/** Graphe JSON-LD (injecté au build). */
export function buildJsonLd(origin = siteOrigin()) {
  const sameAs = socials.map((entry) => entry.url).filter(Boolean)
  const cover = `${origin}/luna-bohemia-cover.jpg`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MusicGroup',
        '@id': `${origin}/#artist`,
        name: siteContent.name,
        url: `${origin}/`,
        genre: ['Latin', 'Pop', 'World'],
        sameAs,
        member: [
          { '@type': 'Person', name: 'Marina' },
          { '@type': 'Person', name: 'Melissa' },
        ],
        album: { '@id': `${origin}/#album` },
      },
      {
        '@type': 'MusicAlbum',
        '@id': `${origin}/#album`,
        name: album.title,
        byArtist: { '@id': `${origin}/#artist` },
        datePublished: String(album.year),
        numTracks: album.tracks?.length ?? 12,
        image: cover,
        track: (album.tracks ?? []).map((track, index) => ({
          '@type': 'MusicRecording',
          name: track.title,
          position: index + 1,
          byArtist: { '@id': `${origin}/#artist` },
        })),
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: `${siteContent.name} — ${siteContent.albumTitle}`,
        url: `${origin}/`,
        inLanguage: ['fr', 'es', 'en', 'pt'],
        publisher: {
          '@type': 'Organization',
          name: 'ALMENA PROD',
          email: 'almenaprod@gmail.com',
          url: `${origin}/`,
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${origin}/#webpage`,
        url: `${origin}/`,
        name: `${siteContent.name} — ${siteContent.albumTitle}`,
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@id': `${origin}/#artist` },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: cover,
        },
      },
    ],
  }
}
