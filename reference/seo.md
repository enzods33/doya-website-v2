# SEO DOYA — prêt pour la prod

Tout le socle SEO est dans le code. En staging (`VITE_INDEXABLE=false`) le site reste **non indexable**.

## Déjà en place

| Élément | Où |
| --- | --- |
| Title / description (i18n FR ES EN PT) | `src/i18n/locales/*` + `src/utils/seo.js` |
| Meta par route (accueil, légales, noindex panier/commande/admin) | `applyDocumentSeo` dans `App.jsx` |
| Canonical + `og:url` absolus | Build si `VITE_SITE_URL` + runtime |
| Open Graph + Twitter Card | `index.html` + runtime |
| `robots.txt` | Généré au build (`vite.config.js`) |
| `sitemap.xml` (/, mentions, CGV, confidentialité) | Généré au build |
| JSON-LD (`MusicGroup`, `WebSite`, `WebPage`) | Injecté dans `index.html` au build |
| Preload LCP hero | Build |

## Au go-live (2 variables)

Dans l’hébergeur de **production** uniquement :

```text
VITE_SITE_URL=https://domaine-officiel
VITE_INDEXABLE=true
```

Puis **rebuild + redeploy**.

Ça active :
- `robots.txt` Allow + Sitemap
- meta `index,follow` sur les pages publiques
- canonical / OG / JSON-LD sur le vrai domaine

## Après mise en ligne (hors code)

1. Google Search Console → propriété du domaine → envoyer `https://domaine/sitemap.xml`
2. Vérifier un aperçu de partage (Facebook Sharing Debugger / Twitter) avec la pochette
3. (Optionnel) Bing Webmaster Tools

## Ne pas indexer

Déjà exclus : `/admin`, `/panier`, `/commande` (robots.txt + meta noindex runtime).

## Staging Netlify

`netlify.toml` force `VITE_INDEXABLE=false` → preview reste privée pour Google.
