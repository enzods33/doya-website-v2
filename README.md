# DOYA — Luna Bohemia / v2

Site de présentation indépendant, créé de zéro en React et JavaScript. L’ancien dossier `doya-website` n’est ni importé ni modifié. Seuls les assets et le PDF fournis ont été repris, sans altération des originaux.

## État actuel

- **Base technique** : React 19 + Vite 8, Tailwind 4, Motion 13, carrousel Embla. Node 22. `npm run lint`, `npm test` (contenu, commerce, concerts, i18n — 23 tests) et `npm run build` passent.
- **Internationalisation** : FR (défaut), ES, EN, PT via `src/i18n/` (détection navigateur, persistance `localStorage`, sélecteur `LanguageSwitcher`). Aucune bibliothèque i18n externe.
- **Design** : refonte réalisée — nouveau Hero et CTA « glass », header **sticky** avec ancrage corrigé, sections re-stylées (gris chauds, titres plus calmes), chrome mobile/desktop clarifié, icônes de plateformes. Des affinages d’accessibilité/typographie issus de l’audit peuvent rester à faire.
- **Environnement Cloud Agent** : `.cursor/environment.json` en place (voir plus bas).
- **Polices** : `FK Display Regular Alt` et `Degular Medium` câblées via `src/styles/fonts.css` ; en attente des fichiers licenciés dans `src/assets/fonts/` (repli automatique d’ici là).
- **Liens externes** : audités et vérifiés. Sept profils au footer, groupés `listen` (Spotify, Apple Music, Deezer, YouTube) et `social` (Instagram, TikTok, Facebook). Deux avances singles reliées (`Mariposa`, `Mueve`) ; album complet et dix autres titres en attente de sortie (`null`). Détails dans `reference/social-links.md`.
- **Boutique / merch** : T-shirts (Luna Bohemia et DOYA, blanc/noir) et CD digipack Luna Bohemia. Paiement **Stripe Checkout uniquement** via Edge Functions, stock et codes promo côté Supabase. Activée dès que les clés Supabase publiques sont présentes et qu’un produit est `on_sale`.
- **Live** : dates chargées depuis Supabase (billetterie, fenêtre passé/à venir), section « Dates ».
- **Médias** : la galerie Bio peut être servie depuis Cloudflare R2 (`VITE_ASSETS_URL`).
- **Déploiement** : workflow GitHub Pages (`.github/workflows/pages.yml`) avec base path Vite gérée par le routeur.
- **Développement local de la boutique** : `src/commerce/config.js` autorise un Supabase **local** (127.0.0.1) en mode dev ; `scripts/dev-supabase.sh` et `supabase/functions/.env.example` aident à lancer base + Edge Functions. Voir plus bas.

## Lancer le site

Depuis ce dossier, avec Node.js compatible Vite 8 (Node 22.12+ conseillé) :

```sh
npm ci
npm run dev
```

L’aperçu local utilise `http://127.0.0.1:5174/`, indépendamment de l’ancien projet.

```sh
npm run lint
npm test
npm run build
npm run preview
```

Le build est généré dans `dist/`. L’aperçu du build utilise le port `4174`.

## Environnement Cloud Agent

Le fichier `.cursor/environment.json` décrit l’environnement des Cloud Agents Cursor : `install` exécute `npm ci`, un terminal `dev` lance `npm run dev`, et le port `5174` est exposé. Il permet à un agent (ou à un aperçu cloud) de démarrer le site déjà installé et en cours d’exécution, sans configuration manuelle. Aucun secret n’y figure : la boutique (Supabase/Stripe) reste optionnelle et le site tourne sans clés.

## Développement local de la boutique (Supabase + Stripe)

Pour essayer le Shop et le tunnel Stripe en local, sans projet Supabase hébergé :

1. Prérequis : Docker et la CLI Supabase.
2. Copier `supabase/functions/.env.example` en `supabase/functions/.env.local` et renseigner `STRIPE_SECRET_KEY` (clé de **test** `sk_test_…`).
3. Lancer `scripts/dev-supabase.sh` : il démarre le stack Supabase (base + migrations, qui activent le merch) et sert les Edge Functions.
4. Créer `.env.local` du site avec `VITE_SUPABASE_URL=http://127.0.0.1:54321` et la clé anon locale.

En mode dev uniquement, `src/commerce/config.js` accepte une URL Supabase locale (`127.0.0.1`/`localhost`) ; en build de production, seuls les domaines Supabase hébergés en `https` sont autorisés. Sans clé Stripe, tout le Shop fonctionne mais le paiement renvoie proprement `stripe_unavailable`.

Note : les Edge Functions et l’API Stripe nécessitent un accès Internet **depuis les conteneurs Docker** ; certains environnements imbriqués le bloquent. Un environnement Docker imbriqué peut aussi requérir le driver `fuse-overlayfs` et `net.bridge.bridge-nf-call-iptables=0` (voir `scripts/dev-supabase.sh`).

## Où modifier les contenus ?

| Besoin | Fichier |
| --- | --- |
| Titres et liens d’écoute | `src/data/album.js` |
| Dates, villes, salles, billetterie | Supabase (concerts) — repli/libellés dans `src/data/live.js` |
| Produits (T-shirts, CD), visuels | `src/data/products.js` |
| Prix, stock, promos, vente | Dashboard Supabase — `reference/commerce.md` |
| Liens d’écoute et réseaux (groupes `listen`/`social`) | `src/data/socials.js` |
| Contacts (booking, presse…) | `src/data/contacts.js` |
| Biographie, année, libellés et mentions | `src/data/siteContent.js` |
| Traductions FR/ES/EN/PT | `src/i18n/locales/*.js` |
| Photographies, dimensions et textes alternatifs | `src/data/media.js` |
| Couleurs, polices et espacements | `src/styles/tokens.css` |

Les valeurs `null` signalent une information non fournie. Le site n’en fait pas un lien cliquable. Les dates de concerts restent dans une liste vide tant qu’aucune n’est confirmée. Les prix s’expriment en euros dans les données et ne s’affichent que lorsqu’ils sont renseignés.

Les sept profils du footer (Instagram, YouTube, TikTok, Facebook, Spotify, Apple Music et Deezer) sont renseignés et vérifiés (documentation et sources dans `reference/social-links.md`). Ce sont des profils artistes, distincts des liens d’écoute de l’album. L’album `Luna Bohemia` n’étant pas encore sorti, `album.platforms` reste `null` ; seules les deux avances singles publiées ont une URL dans `src/data/album.js` (`Mariposa` et `Mueve`, pistes Spotify rattachées à l’artiste `1JGqJy0whUevjrA3Tw6OMA`). Les dix autres titres restent `null`. Aucun profil YouTube Music ni X/Twitter n’est ajouté tant qu’une URL officielle n’est pas confirmée.

## Architecture

```text
doya-website-v2/
├── public/                 Favicon officiel et pochette de partage
├── src/
│   ├── App.jsx             Ordre des sections, aucune logique métier
│   ├── main.jsx            Point d’entrée React
│   ├── assets/
│   │   ├── images/         doya, luna-bohemia, shop
│   │   ├── hero/           luna-phases
│   │   ├── icons/          étoiles officielles + icons/platforms (icônes plateformes)
│   │   ├── textures/       film-grain
│   │   ├── logos/glyphs/   Logos natifs + lettres séparées sans redessin
│   │   └── fonts/          Vide : licences et fichiers officiels attendus
│   ├── components/         Brand, Header, Footer, Photo, Reveal, TransitionImage,
│   │                       LanguageSwitcher, PlatformIcon, Link
│   ├── sections/           hero, music, live, shop, about (galerie repliée dans Bio)
│   ├── i18n/               I18nProvider, index, locales/{fr,es,en,pt}
│   ├── pages/              Accueil, panier, compte, commande
│   ├── commerce/           Catalogue, panier, auth, concerts, appels Edge Functions
│   ├── data/               album, live, products, socials, contacts, siteContent, media
│   ├── styles/             index, fonts, tokens, base, hero, sections, motion, commerce
│   └── utils/              Validation HTTPS, routeur léger (base path), assets, mouvements
├── supabase/               Migrations, RLS, Edge Functions Stripe (+ functions/.env.example)
├── reference/              PDF direction artistique, rapports, social-links, screenshots
├── scripts/                Audit des sources + dev-supabase.sh (stack local)
├── tests/                  content, commerce, concerts, i18n (23 tests)
├── .github/workflows/      pages.yml (déploiement GitHub Pages)
├── .cursor/                environment.json (environnement Cloud Agent)
├── index.html              Métadonnées de base
├── vite.config.js
├── .env.example
└── package.json
```

Une section correspond à un fichier lisible. Les styles spécifiques restent groupés, les paramètres graphiques sont centralisés. Les quelques utilitaires Tailwind et les styles de composition utilisent le même thème. Aucune bibliothèque UI ni lecteur audio ne sont ajoutés.

La boutique se branche via Supabase (stock, promo, compte) et Stripe Checkout (paiement). Sans clés et sans produit `on_sale`, le Shop reste une collection visuelle. Détail dans `reference/commerce.md`.

## Dépendances

React / React DOM 19.2.8, Vite 8.2.2, Tailwind CSS / plugin Vite 4.3.3, Motion 13.1.1, Embla Carousel (react + class-names) 8.6.x, plugin React Vite 6.1.0, Oxlint 1.79.0, Supabase JS 2.x. L’internationalisation est maison (aucune bibliothèque i18n). Les tests utilisent le runner natif de Node.js. Stripe n’est appelé que depuis les Edge Functions.

Les scripts Python d’audit sont facultatifs pour le développement du site. Ils demandent `pypdf`, `Pillow` et Poppler (`pdftoppm`). Les résultats de provenance sont déjà conservés dans `reference/`.

## Identité et qualité

Le wordmark et les étoiles sont les SVG officiels. Les quatre grandes lettres du Hero sont des chemins séparés du wordmark blanc : mêmes tracés, sans police substituée ni vectorisation. Les JPEG natifs sont inchangés. Les photographies ne reçoivent aucun filtre, grain, flou, sharpening ou upscaling.

Les polices du site sont **FK Display Regular Alt** (titres, variable `--font-editorial`) et **Degular Medium** (textes, variable `--font-functional`). Les `@font-face` sont déclarés dans `src/styles/fonts.css`. Déposer les fichiers licenciés `FKDisplay-RegularAlt` et `Degular-Medium` (`.woff2` puis `.woff`) dans `src/assets/fonts/` pour qu'elles se chargent ; tant qu'ils sont absents, les piles de repli de `tokens.css` s'appliquent.

Voir `reference/project-notes.md` pour les sources, les limites HD et la liste des informations à compléter.

## Mouvements

Une entrée décalée des lettres, des titres révélés au scroll et des fondus sur les actions de la galerie et des vêtements prolongent la direction éditoriale. Les photographies ne sont ni zoomées ni filtrées. Aucun scroll forcé, boucle automatique, curseur spécial ou bibliothèque supplémentaire.

Les paramètres partagés sont dans `src/utils/motion.js`, les détails de survol dans `src/styles/motion.css`. `MotionConfig` et `useReducedMotion` respectent les préférences système. Voir `reference/motion-notes.md`.

## Avant publication publique

1. Faire valider la tracklist retranscrite du livret, la biographie et les liens officiels.
2. Confirmer les modèles commercialisés, leurs prix et leurs stocks dans Supabase. Les forfaits livraison sont dans `supabase/functions/_shared/shipping.ts`.
3. Remplacer les photographies utilisées en grand par les originaux HD.
4. Ajouter les webfonts uniquement avec leur licence web.
5. Copier `.env.example` en `.env.local`, renseigner `VITE_SITE_URL` avec le domaine vérifié, puis passer `VITE_INDEXABLE=true` seulement lorsque le site est prêt à être indexé.
6. Refaire `npm run lint`, `npm test` et `npm run build`.

Sans domaine confirmé, aucun canonical ni `og:url` fictif n’est publié. La pochette est déjà l’image de partage ; l’URL devient absolue au build quand `VITE_SITE_URL` est renseigné. Le site est non indexable par défaut pendant la relecture.
