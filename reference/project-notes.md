# Relecture de la v2 DOYA

## Sources et méthode

- PDF fourni, 32 pages, copié sans modification sous `direction-artistique-luna-bohemia.pdf`.
- SHA-256 du PDF : `457B75A0E8B6C4AE046B458189D419DF7E8792DA94D20B29617AF0F6F79B63AB`.
- Maquette `web-reference.png` utilisée pour la composition seulement, jamais pour ses données ni pour ses photographies générées.
- Identité contrôlée visuellement pages 4–7 ; pochette page 9 ; livret et crédits pages 14–15 ; tee-shirts pages 18–21 ; photographies pages 23–31.
- Les 46 JPEG conservés correspondent exactement, par SHA-256, aux flux DCT natifs du PDF. Aucun n’a été réencodé ou redimensionné.
- Les PNG de merchandising reprennent l’extraction précédente : image et masque alpha réunis sans perte. Leur provenance est documentée dans `assets-report.md` ; contrairement aux JPEG, leur fichier PNG n’est pas un flux natif autonome du PDF.
- Les 12 SVG d’identité sont les tracés natifs précédemment isolés de la page 7. Les quatre fichiers de `logos/glyphs/` reprennent chacun un chemin du wordmark blanc ; un test vérifie qu’aucun tracé n’a changé.

Le PDF ne fournit pas de mockup autonome de vinyle. Le CD est une composition sous masque, non réutilisée comme faux produit. La collection du site présente uniquement les vrais tee-shirts disponibles.

## Choix graphiques

- Hero plein écran, photographie officielle de DOYA en mouvement, lettres issues du dessin original disposées autour du duo.
- Wordmark officiel discret, navigation noire sur le ciel clair et symbole rouge placé hors des visages.
- Album sur fond papier : pochette, tracklist linéaire, portrait et nombre de titres. Aucune carte ni faux lecteur.
- Composition LUNA / BOHEMIA à très grande échelle, avec chevauchement maîtrisé sur un paysage.
- Galerie noire manuelle à trois formats ; sur mobile, une photographie principale et deux commandes accessibles.
- Live en état vide explicite, sans date inventée ni photographie de concert substituée.
- Collection en quatre colonnes sur desktop, deux sur mobile, avec vues face/dos réellement connectées aux mockups officiels.
- About fondé sur l’identité et un portrait officiel, avec biographie signalée comme manquante.
- Footer noir minimal, avec six profils officiels vérifiés ; sources dans `social-links.md`.

Noir `#000000`, blanc `#FFFFFF`, rouge `#E30613` : identité vérifiée. Le fond papier `#F2EFEA` est un choix web neutre, pas une couleur revendiquée comme officielle. Fallbacks serif/sans centralisés ; aucun téléchargement de police.

La passe de mouvement demandée ensuite ajoute une entrée des glyphes du Hero, des titres révélés au défilement et des transitions d’images sur action. `prefers-reduced-motion` supprime les translations, délais et révélations. Aucun mouvement de fond, parallax, filtre ou animation automatique de galerie. Détails dans `motion-notes.md`.

## Contenu vérifié

DOYA, Luna Bohemia, 2026 et les 12 titres des crédits :

1. Solo tú
2. Ángel de la guarda
3. Guerrières
4. Casa de los limoneros
5. Todo de mí
6. Mariposa
7. Lo vi venir
8. Ahora
9. Dónde se va
10. Mueve
11. Luna Bohemia
12. Amor y libertad

La casse est normalisée pour l’affichage, l’ordre et l’orthographe suivent le livret. Les crédits lisibles du PDF prévalent sur la fausse tracklist de la maquette et sur les transcriptions antérieures du projet.

Tee-shirts Luna Bohemia A, B, C et identité DOYA : maquettes officielles des pages 18–21. Aucune disponibilité commerciale n’est affirmée. La mention `© DOYA 2026 — ALMENA PROD` vient du brief utilisateur.

## À compléter

| Information | Emplacement |
| --- | --- |
| 4 URLs album : Spotify, Apple Music, YouTube, Deezer | `src/data/album.js`, `platforms` |
| Destinations éventuelles des 12 titres | `src/data/album.js`, `tracks` |
| Concerts, dates, villes, salles et URLs billets | `src/data/live.js` |
| Prix, stocks, codes promo et mise en vente | Dashboard Supabase, voir `reference/commerce.md` |
| Frais de port | Secret de fonction `SHIPPING_CENTS` |
| Biographie officielle et contact éventuel | `src/data/siteContent.js` |
| Domaine officiel / indexation | `.env.local`, d’après `.env.example` |
| Webfonts Editorial New et New Frank, avec licences | `src/assets/fonts/` |

Les plateformes non connectées sont du texte, jamais des ancres vides. Aucun compte social, concert, prix, extrait audio, témoignage, origine géographique ou fait biographique n’a été ajouté par supposition.

## Fichiers HD prioritaires

| Usage | Fichier | Pixels natifs | À prévoir |
| --- | --- | --- | --- |
| Hero | `doya-desert-05.jpg` | 717 × 478 | Priorité absolue : original HD large |
| Composition éditoriale | `doya-desert-02.jpg` | 717 × 478 | Original HD pour les grands écrans |
| Album / galerie | `doya-portrait-02.jpg` | 717 × 478 | Portrait HD |
| About | `doya-portrait-03.jpg` | 717 × 478 | Portrait HD |
| Galerie | `doya-desert-03.jpg` | 717 × 1021 | Original HD pour retina / grands formats |
| Galerie | `doya-portrait-05.jpg` | 717 × 478 | Original HD |
| Galerie | `luna-bohemia-landscape-09.jpg` | 717 × 494 | Original HD |
| Pochette | `luna-bohemia-cover.jpg` | 1004 × 1004 | Suffisante au format courant, master souhaitable |
| Mockups noirs | Tee-shirts utilisés | 1070 × 1070 | Suffisants pour le catalogue actuel |

Les photos plein écran sont agrandies à l’affichage CSS ; aucun fichier agrandi n’a été créé. Leur manque de définition demeure visible et n’est pas masqué. Les petits portraits 336 × 504 ne sont pas utilisés dans la page.

## Préparation développeur

- Aucun backend, achat, panier, collecte de données ou outil de suivi.
- HTML sémantique, un seul h1, navigation par ancres, images légendées et dimensions explicites.
- Menu natif `dialog`, focus initial, boucle Tab, Escape, restauration du focus, verrouillage du défilement et fermeture au passage desktop.
- Boutons réservés aux actions ; liens réservés aux vraies destinations.
- Chargement prioritaire du Hero, lazy loading des photographies suivantes et des produits.
- Les éléments inutilisés de la bibliothèque d’assets ne sont pas publiés par le build Vite.
- Les ressources sous `reference/` ne sont pas servies par le build de production.
