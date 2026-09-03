# DOYA — Luna Bohemia / v2

Site de présentation indépendant, créé de zéro en React et JavaScript. L’ancien dossier `doya-website` n’est ni importé ni modifié. Seuls les assets et le PDF fournis ont été repris, sans altération des originaux.

## État actuel

- **Base technique** : React 19 + Vite 8, Tailwind 4, Motion 13. `npm run lint`, `npm test` (contenu + commerce) et `npm run build` passent.
- **Environnement Cloud Agent** : `.cursor/environment.json` en place (voir plus bas).
- **Polices** : `FK Display Regular Alt` et `Degular Medium` câblées via `src/styles/fonts.css` ; en attente des fichiers licenciés dans `src/assets/fonts/` (repli automatique d’ici là).
- **Liens externes** : audités et vérifiés. Sept profils artistes au footer (dont Deezer) ; deux avances singles reliées (`Mariposa`, `Mueve`) ; album complet et dix autres titres en attente de sortie (`null`). Détails dans `reference/social-links.md`.
- **Design** : un audit design a été réalisé (Hero et système global : contraste, tailles de texte, header, placement des étoiles). Une refonte est prévue sur une branche dédiée ; le design actuel n’a pas encore été modifié.
- **Boutique** : non activée (Supabase/Stripe optionnels) ; le Shop reste une collection visuelle sans clés.

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

## Où modifier les contenus ?

| Besoin | Fichier |
| --- | --- |
| Titres et liens d’écoute | `src/data/album.js` |
| Dates, villes, salles, billetterie | `src/data/live.js` |
| Vêtements, visuels | `src/data/products.js` |
| Prix, stock, promos, vente | Dashboard Supabase — `reference/commerce.md` |
| Liens sociaux | `src/data/socials.js` |
| Biographie, année, libellés et mentions | `src/data/siteContent.js` |
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
│   │   ├── images/
│   │   │   ├── doya/
│   │   │   ├── luna-bohemia/
│   │   │   ├── live/        Vide : aucune photo live fournie
│   │   │   └── shop/
│   │   ├── logos/glyphs/    Logos natifs + lettres séparées sans redessin
│   │   ├── icons/          Deux étoiles officielles
│   │   └── fonts/          Vide : licences et fichiers officiels attendus
│   ├── components/
│   │   ├── Brand.jsx
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Photo.jsx
│   │   ├── Reveal.jsx      Apparitions au défilement
│   │   └── TransitionImage.jsx  Fondus galerie / vêtements
│   ├── sections/
│   │   ├── hero/Hero.jsx
│   │   ├── music/Music.jsx
│   │   ├── editorial/Editorial.jsx
│   │   ├── photography/Photography.jsx
│   │   ├── live/Live.jsx
│   │   ├── shop/Shop.jsx
│   │   └── about/About.jsx
│   ├── pages/              Accueil, panier, compte, commande
│   ├── commerce/           Catalogue distant, panier, auth, appels fonctions
│   ├── data/               album, live, products, socials, siteContent, media
│   ├── styles/             index, fonts, tokens, base, hero, sections, motion, commerce
│   └── utils/              Validation HTTPS, routeur léger, réglages des mouvements
├── supabase/               Migration, RLS, Edge Functions Stripe
├── reference/
│   ├── direction-artistique-luna-bohemia.pdf
│   ├── web-reference.png
│   ├── assets-report.md
│   ├── asset-manifest.json
│   ├── project-notes.md
│   ├── motion-notes.md
│   ├── social-links.md
│   ├── qa-report.md
│   └── screenshots/
├── scripts/                Audit des sources, séparation des tracés natifs
├── tests/                  content.test.js, commerce.test.js
├── .cursor/                environment.json (environnement Cloud Agent)
├── index.html              Métadonnées de base
├── vite.config.js
├── .env.example
└── package.json
```

Une section correspond à un fichier lisible. Les styles spécifiques restent groupés, les paramètres graphiques sont centralisés. Les quelques utilitaires Tailwind et les styles de composition utilisent le même thème. Aucune bibliothèque UI ni lecteur audio ne sont ajoutés.

La boutique se branche via Supabase (stock, promo, compte) et Stripe Checkout (paiement). Sans clés et sans produit `on_sale`, le Shop reste une collection visuelle. Détail dans `reference/commerce.md`.

## Dépendances

React / React DOM 19.2.8, Vite 8.2.2, Tailwind CSS / plugin Vite 4.3.3, Motion 13.1.1, plugin React Vite 6.1.0, Oxlint 1.79.0, Supabase JS 2.x. Les tests utilisent le runner natif de Node.js. Stripe n’est appelé que depuis les Edge Functions.

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
2. Confirmer les modèles commercialisés, leurs prix et leurs stocks dans Supabase, plus `SHIPPING_CENTS`.
3. Remplacer les photographies utilisées en grand par les originaux HD.
4. Ajouter les webfonts uniquement avec leur licence web.
5. Copier `.env.example` en `.env.local`, renseigner `VITE_SITE_URL` avec le domaine vérifié, puis passer `VITE_INDEXABLE=true` seulement lorsque le site est prêt à être indexé.
6. Refaire `npm run lint`, `npm test` et `npm run build`.

Sans domaine confirmé, aucun canonical ni `og:url` fictif n’est publié. La pochette est déjà l’image de partage ; l’URL devient absolue au build quand `VITE_SITE_URL` est renseigné. Le site est non indexable par défaut pendant la relecture.
