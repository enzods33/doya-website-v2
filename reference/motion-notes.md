# Direction de mouvement — DOYA

La composition, les données et les fichiers photographiques restent les mêmes. Les mouvements introduisent un rythme éditorial sans piloter le défilement de la personne.

## Séquences

| Élément | Mouvement | Durée |
| --- | --- | --- |
| Header | Apparition, déplacement de 8 px | 0,7 s |
| D / O / Y / A | Apparition, 26 px, décalage de 0,11 s entre les glyphes | 1,1 s chacun |
| Étoiles du Hero | Apparition unique, taille de 80 à 100 % | 0,9 s |
| Mention album du Hero | Apparition, 16 px | 0,85 s |
| Titres / blocs secondaires | Apparition au premier passage, 22 px | 0,85 s |
| LUNA / BOHEMIA éditorial | Révélation verticale dans le cadre typographique, une fois | 1,1 s |
| Photos hors Hero | Apparition, 24 px ; aucun zoom | 1 s |
| Galerie et vues des vêtements | Fondu sur commande seulement ; dimensions réservées | 0,48 s |
| Menu mobile | Ouverture / fermeture en fondu, liens décalés | 0,28 / 0,5 s |
| Tracklist et flèches | Ligne rouge et déplacement de quelques pixels au survol | 0,4–0,45 s |

La courbe commune est `[0.22, 1, 0.36, 1]`. L’entrée du Hero ne retarde pas la photo principale. Les emplacements restent réservés pendant les fondus. Les anciennes images sont masquées à l’arbre d’accessibilité pendant leur sortie.

## Accessibilité et sobriété

- Respect de `prefers-reduced-motion` avec `MotionConfig` et `useReducedMotion` : apparition immédiate, pas de translation ni délai ; pas de fondu entre les images.
- Les survols déplacés sont supprimés avec la même préférence.
- Le menu conserve son focus modal jusqu’à la fin de la fermeture, puis rend le focus au déclencheur. Échap reste utilisable.
- Aucun autoplay, parallaxe, zoom photographique, filtre, grain, défilement intercepté, préchargement artificiel ou animation infinie.
- Motion déjà installé : aucune dépendance ajoutée pour cette passe.

## Références consultées

- [Motion — Stagger reveal](https://motion.dev/ui/components/stagger-reveal) : principe d’entrée coordonnée et de révélation éditoriale, sans reprendre une bibliothèque UI ou son code.
- [Motion — Scroll animations](https://motion.dev/docs/react-scroll-animations) : déclenchement au premier passage dans le viewport.
- [Motion — AnimatePresence](https://motion.dev/docs/react-animate-presence) : transition entre images.
- [Motion — Accessibility](https://motion.dev/docs/react-accessibility) : préférence de réduction des mouvements.

Les animations sont propres au projet ; aucun composant Motion+ payant n’a été importé.
