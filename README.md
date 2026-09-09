# DOYA — Luna Bohemia / v2

Site de présentation indépendant, créé de zéro en React et JavaScript. L’ancien dossier `doya-website` n’est ni importé ni modifié. Seuls les assets et le PDF fournis ont été repris, sans altération des originaux.

## État actuel

- **Base technique** : React 19 + Vite 8, Tailwind 4, Motion 13. Node 22. `npm run lint`, `npm test` et `npm run build` passent.
- **Internationalisation** : FR (défaut), ES, EN, PT via `src/i18n/` (détection navigateur, persistance `localStorage`, sélecteur `LanguageSwitcher`). Aucune bibliothèque i18n externe.
- **Design** : Hero / CTA glass, header sticky, sections en gris chauds, crédits footer (Almena Prod + Reelazura). Polices FK Display / Degular câblées mais fichiers absents → fallbacks `tokens.css`.
- **Boutique** : T-shirts + CD digipack. Stripe Checkout + Edge Functions, stock / promos / forfaits zones côté Supabase. Visuels shop **uniquement CDN R2** (`VITE_ASSETS_URL`). N° de commande humain `DOYA-XXXXX` + mails Brevo.
- **Sécurité** : rate-limits Postgres (checkout / newsletter / get-order), honeypot newsletter, CSP / HSTS (`public/_headers`, `netlify.toml`), CORS limité à `SITE_URL` + localhost de dev, restock seulement sur remboursement total.
- **Live** : dates Supabase (billetterie, passé / à venir).
- **Admin** : `/admin` Google OAuth + allowlist (`reference/admin.md`) — concerts, bio, audience, newsletter, ventes.
- **Médias** : hero / cover / shop sur R2 ; galerie Bio via admin (fallback `media.js`).
- **SEO** : prêt-prod — `reference/seo.md` (`VITE_SITE_URL` + `VITE_INDEXABLE=true` au go-live). Staging Netlify reste `noindex`.
- **Déploiement** : push `master` → GitHub Actions → VPS Hetzner (`dist/` via SSH), comme Alegria / Dojo. Staging Netlify possible en manuel. **Go-live** : checklist `reference/commerce.md` (domaine, Stripe test→live, reset stocks/ventes/stats, CM2C, Brevo).

## Lancer le site

```sh
npm ci
npm run dev
```

Aperçu local : `http://127.0.0.1:5174/`.

```sh
npm run lint
npm test
npm run build
npm run preview
```

Build → `dist/` (port preview `4174`).

## Déploiement VPS (Hetzner)

Comme Alegria / Dojo : push sur `master` → Actions `Deploy to VPS` → `dist/` sur le serveur.

Secrets GitHub (Settings → Secrets and variables → Actions) :

| Secret | Exemple |
| --- | --- |
| `SSH_PRIVATE_KEY` | clé privée déployée (comme Alegria) |
| `REMOTE_HOST` | `46.224.50.133` |
| `REMOTE_USER` | `stef` |
| `REMOTE_TARGET` | `/var/www/doya` |
| `VITE_SUPABASE_URL` | URL projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | clé anon |
| `VITE_ASSETS_URL` | CDN R2 |
| `VITE_SITE_URL` | `https://doya.guzzler-bot.cloud` puis le domaine final |
| `VITE_INDEXABLE` | **`false`** tant que l’URL est temporaire (`doya.guzzler-bot.cloud`) — **ne jamais mettre `true` avant le vrai domaine** |

Sur le VPS (une fois) :

```bash
sudo mkdir -p /var/www/doya
sudo chown stef:stef /var/www/doya
```

Bloc Caddy (`/etc/caddy/Caddyfile`) — adapter le domaine :

```caddy
# --- DOYA ---
doya.guzzler-bot.cloud {
    root * /var/www/doya
    file_server

    @noCache {
        path /index.html /
    }
    header @noCache Cache-Control "no-store, no-cache, must-revalidate"

    @staticAssets {
        path /assets/*
    }
    header @staticAssets Cache-Control "public, max-age=31536000, immutable"

    try_files {path} /index.html
    encode gzip zstd
}
```

Puis `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy`.

## Environnement Cloud Agent

`.cursor/environment.json` : `npm ci`, terminal `dev` sur le port `5174`. Aucun secret ; boutique optionnelle.

## Développement local boutique (Supabase + Stripe)

1. Docker + CLI Supabase.
2. Copier `supabase/functions/.env.example` → `.env.local` avec `STRIPE_SECRET_KEY=sk_test_…`.
3. `scripts/dev-supabase.sh` (base + Edge Functions).
4. `.env.local` front : `VITE_SUPABASE_URL=http://127.0.0.1:54321` + clé anon locale.

En prod build, seuls les domaines Supabase `https` sont acceptés. Détail : `reference/commerce.md`.

## Où modifier les contenus ?

| Besoin | Fichier |
| --- | --- |
| Titres et liens d’écoute | `src/data/album.js` |
| Dates / billetterie | Supabase concerts — `src/data/live.js` |
| Produits (IDs, visuels R2) | `src/data/products.js` |
| Prix, stock, promos | Dashboard Supabase — `reference/commerce.md` |
| Liens écoute / réseaux | `src/data/socials.js` |
| Contacts | `src/data/contacts.js` |
| Bio / libellés | `src/data/siteContent.js` |
| Traductions FR/ES/EN/PT | `src/i18n/locales/*.js` |
| Photos hero / bio | `src/data/media.js` + R2 |
| Couleurs / typo | `src/styles/tokens.css` |

## Architecture

```text
doya-website-v2/
├── public/                 Favicon, _redirects, _headers (sécu Netlify)
├── src/
│   ├── App.jsx             Routes lazy + SEO document
│   ├── assets/
│   │   ├── images/         doya, luna-bohemia (shop/ = .gitkeep, médias sur R2)
│   │   ├── icons/platforms Icônes écoute / réseaux
│   │   ├── logos/          Almena, Reelazura, glyphs DOYA
│   │   └── fonts/          Attente licences FK / Degular
│   ├── components/         Header, Footer, PlatformIcon, crédits, i18n…
│   ├── sections/           hero, music, live, shop, about
│   ├── pages/              Accueil, panier, commande, admin, légales
│   ├── commerce/           Panier, checkout, analytics, config
│   ├── config/             URLs publiques (CDN, staging)
│   ├── data/               album, products, socials, media…
│   ├── i18n/               FR/ES/EN/PT
│   ├── styles/             tokens, fonts, sections, commerce…
│   └── utils/              seo, assets, router
├── supabase/               Migrations RLS + Edge Functions
├── reference/              commerce.md, seo.md, admin.md, DA…
├── scripts/                Upload R2, extract PDF, dev-supabase
├── tests/
└── dist/                   Build Netlify Drop (gitignoré)
```

## Avant publication publique (go-live)

Checklist détaillée : **`reference/commerce.md`** § passage au vrai domaine, dont notamment :

1. Domaine + `SITE_URL` + Auth redirects + Google OAuth origin  
2. `VITE_SITE_URL` + `VITE_INDEXABLE=true` + rebuild  
3. **Stripe TEST → LIVE** (`sk_live`, webhook live, 1 paiement réel)  
4. Reset stocks / ventes à 0 / stats site  
5. **Brevo** : domaine pro pour les mails (pas Gmail en live) + sender vérifié / DKIM — staging : `almenaprod@gmail.com`  
6. Médiateur CM2C dans les CGV  
7. Search Console + `sitemap.xml`

Sans domaine confirmé, le site reste non indexable par défaut.

## Identité

Wordmark / étoiles = SVG officiels. Polices attendues : FK Display Regular Alt + Degular Medium (`fonts.css`) ; fallbacks tant que les `.woff2` manquent. Voir `reference/project-notes.md`.

## Mouvements

Paramètres dans `src/utils/motion.js` et `src/styles/motion.css`. `prefers-reduced-motion` respecté. Voir `reference/motion-notes.md`.
