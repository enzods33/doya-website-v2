# DOYA — Luna Bohemia / v2

Site de présentation indépendant, créé de zéro en React et JavaScript. L’ancien dossier `doya-website` n’est ni importé ni modifié. Seuls les assets et le PDF fournis ont été repris, sans altération des originaux.

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

## Où modifier les contenus ?

| Besoin | Fichier |
| --- | --- |
| Titres et liens d’écoute | `src/data/album.js` |
| Dates, villes, salles, billetterie | `src/data/live.js` |
| Vêtements, prix et liens produits | `src/data/products.js` |
| Liens sociaux | `src/data/socials.js` |
| Biographie, année, libellés et mentions | `src/data/siteContent.js` |
| Photographies, dimensions et textes alternatifs | `src/data/media.js` |
| Couleurs, polices et espacements | `src/styles/tokens.css` |

Les valeurs `null` signalent une information non fournie. Le site n’en fait pas un lien cliquable. Les dates de concerts restent dans une liste vide tant qu’aucune n’est confirmée. Les prix s’expriment en euros dans les données et ne s’affichent que lorsqu’ils sont renseignés.

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
│   ├── data/               album, live, products, socials, siteContent, media
│   ├── styles/             index, tokens, base, hero, sections, motion
│   └── utils/              Validation HTTPS, réglages des mouvements
├── reference/
│   ├── direction-artistique-luna-bohemia.pdf
│   ├── web-reference.png
│   ├── assets-report.md
│   ├── asset-manifest.json
│   ├── project-notes.md
│   ├── motion-notes.md
│   ├── qa-report.md
│   └── screenshots/
├── scripts/                Audit des sources, séparation des tracés natifs
├── tests/content.test.js
├── index.html              Métadonnées de base
├── vite.config.js
├── .env.example
└── package.json
```

Une section correspond à un fichier lisible. Les styles spécifiques restent groupés, les paramètres graphiques sont centralisés. Les quelques utilitaires Tailwind et les styles de composition utilisent le même thème. Aucune bibliothèque UI, aucun routeur, aucune infrastructure de boutique ou lecteur audio ne sont ajoutés.

## Dépendances

React / React DOM 19.2.8, Vite 8.2.2, Tailwind CSS / plugin Vite 4.3.3, Motion 13.1.1, plugin React Vite 6.1.0, Oxlint 1.79.0. Les tests utilisent le runner natif de Node.js.

Les scripts Python d’audit sont facultatifs pour le développement du site. Ils demandent `pypdf`, `Pillow` et Poppler (`pdftoppm`). Les résultats de provenance sont déjà conservés dans `reference/`.

## Identité et qualité

Le wordmark et les étoiles sont les SVG officiels. Les quatre grandes lettres du Hero sont des chemins séparés du wordmark blanc : mêmes tracés, sans police substituée ni vectorisation. Les JPEG natifs sont inchangés. Les photographies ne reçoivent aucun filtre, grain, flou, sharpening ou upscaling.

Les piles de polices sont provisoires : Editorial New et New Frank ne sont pas distribuées ici. À réception des webfonts licenciées, ajouter les `@font-face` et conserver les deux noms de variables du thème.

Voir `reference/project-notes.md` pour les sources, les limites HD et la liste des informations à compléter.

## Mouvements

Une entrée décalée des lettres, des titres révélés au scroll et des fondus sur les actions de la galerie et des vêtements prolongent la direction éditoriale. Les photographies ne sont ni zoomées ni filtrées. Aucun scroll forcé, boucle automatique, curseur spécial ou bibliothèque supplémentaire.

Les paramètres partagés sont dans `src/utils/motion.js`, les détails de survol dans `src/styles/motion.css`. `MotionConfig` et `useReducedMotion` respectent les préférences système. Voir `reference/motion-notes.md`.

## Avant publication publique

1. Faire valider la tracklist retranscrite du livret, la biographie et les liens officiels.
2. Confirmer les modèles commercialisés, leurs prix et leurs destinations boutique.
3. Remplacer les photographies utilisées en grand par les originaux HD.
4. Ajouter les webfonts uniquement avec leur licence web.
5. Copier `.env.example` en `.env.local`, renseigner `VITE_SITE_URL` avec le domaine vérifié, puis passer `VITE_INDEXABLE=true` seulement lorsque le site est prêt à être indexé.
6. Refaire `npm run lint`, `npm test` et `npm run build`.

Sans domaine confirmé, aucun canonical ni `og:url` fictif n’est publié. La pochette est déjà l’image de partage ; l’URL devient absolue au build quand `VITE_SITE_URL` est renseigné. Le site est non indexable par défaut pendant la relecture.
