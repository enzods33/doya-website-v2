# Contrôles de livraison — 2 septembre 2026

## Résultat

- `npm run lint` : aucune erreur ni avertissement.
- `npm test` : sept tests réussis (contenus, destinations, médias, six profils sociaux, JPEG natifs, tracés SVG, réglages reduced motion).
- `npm run build` : compilation de production réussie.
- React / React DOM : une seule version, dépendances dédupliquées.
- Ancien projet `doya-website` : comparaison SHA-256 de 99 fichiers, aucun changement ni suppression.
- Aucun nouvel asset photographique, aucune police téléchargée, aucune dépendance ajoutée pour les animations.

## Responsive après la passe de mouvement

Dimensions CSS mesurées dans le navigateur, hors largeur de la barre de défilement pour la colonne « contenu » :

| Viewport | Contenu / scrollWidth | Débordement horizontal | Images cassées après parcours |
| --- | --- | --- | --- |
| 1440 × 900 | 1431 / 1431 | Aucun | Aucune |
| 1920 × 1080 | 1912 / 1912 | Aucun | Aucune |
| 1024 × 768 | 1016 / 1016 | Aucun | Aucune |
| 390 × 844 | 382 / 382 | Aucun | Aucune |
| 320 × 700 | 312 / 312 | Aucun | Aucune |

Le navigateur de capture utilise une mise à l’échelle système : ses fichiers raster peuvent être plus petits que les viewports CSS. Ils ne sont pas agrandis artificiellement. Les mesures de viewport, les captures de la composition statique et les contrôles de mouvement sont conservés séparément.

## Interactions vérifiées

- Navigation vers les ancres Music, Univers, Photographies, Live, Shop et About ; retour en haut.
- Galerie : changement de photo, retour à la précédente, images superposées uniquement le temps du fondu, anciennes images masquées aux lecteurs d’écran.
- Shop : les quatre visuels changent réellement entre face et dos ; dimensions stables et état du bouton sélectionné.
- Menu mobile : ouverture, focus initial sur Fermer, boucle Tab / Maj-Tab, fermeture par Échap, restauration du focus et du défilement, fermeture après navigation vers About.
- Un seul h1 ; aucune ancre interne sans destination.
- Les quatre glyphes du Hero finissent à opacité 1. Aucun élément visité ne reste masqué après les apparitions.
- La photographie principale garde `filter: none` ; les fichiers JPEG sont vérifiés par leur empreinte.
- Passe hover : passage sur le premier vêtement, apparition de son vrai mockup de face, déplacement mesuré de 5 px, puis retour au dos quand le pointeur sort. Les commandes globales restent utilisables au clavier ; les textes restent noirs pour leur contraste.

## Console et limites du contrôle

La version de production a été parcourue dans une nouvelle session : aucun avertissement ni erreur. Pendant l’installation initiale de Motion, d’anciens événements transitoires de rechargement Vite avaient signalé des modules React désynchronisés. Ils sont conservés dans le premier relevé `browser-qa.json` ; le relevé final `motion-browser-qa.json` distingue la session de production propre. Il ne s’agit pas d’erreurs présentes après rechargement.

La réduction des mouvements est couverte par la configuration globale, les branches des composants, la feuille CSS et un test unitaire. Le navigateur disponible ne permet pas d’émuler la préférence système : le rendu réel en mode réduit reste à confirmer sur un appareil configuré ainsi. Aucun score Lighthouse ni audit complet WCAG n’est revendiqué.

## Captures

- `screenshots/desktop-*-full.png` et `mobile-*-full.png` : composition statique inspectée avant la passe de mouvement ; mêmes contenus et même mise en page.
- `screenshots/mobile-reading-board.png` : planche de lecture du mobile statique.
- `screenshots/motion-desktop-1440-hero.jpg` et `motion-mobile-390-hero.jpg` : nouvelles captures du Hero après la passe de mouvement.
- `screenshots/motion-mobile-menu.jpg` : menu mobile animé, une fois ouvert.

Les tentatives de capture intégrale après changement de facteur d’échelle présentaient un défaut d’assemblage du navigateur (bandes répétées) : elles ont été écartées. Cela n’apparaît ni dans les captures de viewport ni dans la page parcourue ; les dimensions et débordements ont aussi été mesurés directement dans le DOM.

## À faire avant ouverture publique

Valider les contenus avec DOYA, fournir les originaux HD, les webfonts licenciées, la biographie et les URLs officielles. Voir `project-notes.md` et `motion-notes.md`. L’aperçu est destiné à une relecture privée et reste non indexable.

## Ajout des profils sociaux

Les six destinations du footer sont renseignées et distinctes. Les contrôles lint, les sept tests et le build ont été relancés avec succès après cet ajout. Aucun composant, style, animation ou asset n’a changé. Les liens spécifiques à l’album restent vides. La vérification externe et ses limites sont détaillées dans `social-links.md` ; aucun nouveau contrôle visuel n’est revendiqué pour cette modification de données.
