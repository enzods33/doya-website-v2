# Rapport d’extraction des assets DOYA / Luna Bohemia

- Source analysée : `260730_Blava X Doya_Album Luna Bohemia_Direccion Creativa 2026_.pdf` (32 pages).
- Méthode principale : extraction directe des flux image avec `pdfimages`, sans capture de page, redimensionnement ni recompression des JPEG retenus.
- Déduplication : comparaison des objets PDF, empreintes SHA-256, comparaison perceptuelle et contrôle visuel.
- Vecteurs : chemins SVG isolés directement depuis les tracés de la page 7, sans vectorisation d’un raster.
- Merchandising : image et masque alpha intégrés au PDF réunis dans un PNG transparent sans perte.

## Résumé

- 70 ressources livrées : 24 photographies DOYA, 22 ressources Luna Bohemia, 12 mockups merchandising, 9 variantes de logo et 3 variantes du symbole des deux étoiles.
- Aucun asset live n’est présent dans ce PDF ; `src/assets/images/live/` reste vide.
- Aucun fichier de police n’a été créé ou téléchargé.

## Inventaire complet

| Fichier | Catégorie | Page | Dimensions | Format | Taille | Complète ou recadrée | Qualité web estimée |
|---|---|---:|---|---|---:|---|---|
| `doya-desert-01.jpg` | Photographie DOYA | 26 | 717 × 1021 px | JPEG | 104.2 Ko | Complète dans le PDF — source HD non vérifiable | Bon — utilisation standard |
| `doya-desert-02.jpg` | Photographie DOYA | 26 | 717 × 478 px | JPEG | 52.6 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-desert-03.jpg` | Photographie DOYA | 27 | 717 × 1021 px | JPEG | 125.1 Ko | Complète dans le PDF — source HD non vérifiable | Bon — utilisation standard |
| `doya-desert-04.jpg` | Photographie DOYA | 28 | 717 × 478 px | JPEG | 43.0 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-desert-05.jpg` | Photographie DOYA | 28 | 717 × 478 px | JPEG | 45.7 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-detail-01.jpg` | Photographie DOYA | 30 | 336 × 504 px | JPEG | 14.1 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-detail-02.jpg` | Photographie DOYA | 30 | 336 × 504 px | JPEG | 12.9 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-detail-03.jpg` | Photographie DOYA | 30 | 336 × 504 px | JPEG | 14.2 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-detail-04.jpg` | Photographie DOYA | 31 | 331 × 404 px | JPEG | 16.9 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-detail-05.jpg` | Photographie DOYA | 31 | 331 × 404 px | JPEG | 16.1 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-01.jpg` | Photographie DOYA | 26 | 336 × 504 px | JPEG | 16.6 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-02.jpg` | Photographie DOYA | 27 | 717 × 478 px | JPEG | 39.7 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-portrait-03.jpg` | Photographie DOYA | 27 | 717 × 478 px | JPEG | 59.1 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-portrait-04.jpg` | Photographie DOYA | 29 | 717 × 478 px | JPEG | 32.0 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-portrait-05.jpg` | Photographie DOYA | 29 | 717 × 478 px | JPEG | 32.8 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-portrait-06.jpg` | Photographie DOYA | 29 | 336 × 504 px | JPEG | 15.4 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-07.jpg` | Photographie DOYA | 29 | 336 × 504 px | JPEG | 16.8 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-08.jpg` | Photographie DOYA | 29 | 336 × 504 px | JPEG | 17.1 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-09.jpg` | Photographie DOYA | 29 | 336 × 504 px | JPEG | 17.0 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-10.jpg` | Photographie DOYA | 30 | 717 × 478 px | JPEG | 31.7 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `doya-portrait-11.jpg` | Photographie DOYA | 30 | 336 × 504 px | JPEG | 18.8 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-12.jpg` | Photographie DOYA | 30 | 336 × 504 px | JPEG | 17.5 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-13.jpg` | Photographie DOYA | 30 | 336 × 504 px | JPEG | 11.9 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `doya-portrait-14.jpg` | Photographie DOYA | 31 | 717 × 478 px | JPEG | 31.3 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-back-cover.jpg` | Luna Bohemia | 10 | 669 × 647 px | JPEG | 52.2 Ko | Composition complète intégrée au PDF | Moyen — éviter en plein écran |
| `luna-bohemia-booklet-a-01.jpg` | Luna Bohemia | 14 | 1059 × 353 px | JPEG | 119.9 Ko | Composition complète intégrée au PDF | Moyen — éviter en plein écran |
| `luna-bohemia-booklet-a-02.jpg` | Luna Bohemia | 14 | 1060 × 353 px | JPEG | 166.0 Ko | Composition complète intégrée au PDF | Moyen — éviter en plein écran |
| `luna-bohemia-booklet-a-03.jpg` | Luna Bohemia | 14 | 704 × 353 px | JPEG | 99.2 Ko | Composition complète intégrée au PDF | Faible — remplacer par l’original |
| `luna-bohemia-booklet-b-01.jpg` | Luna Bohemia | 15 | 1059 × 354 px | JPEG | 160.1 Ko | Composition complète intégrée au PDF | Moyen — éviter en plein écran |
| `luna-bohemia-booklet-b-02.jpg` | Luna Bohemia | 15 | 1060 × 354 px | JPEG | 143.8 Ko | Composition complète intégrée au PDF | Moyen — éviter en plein écran |
| `luna-bohemia-booklet-b-03.jpg` | Luna Bohemia | 15 | 705 × 354 px | JPEG | 96.6 Ko | Composition complète intégrée au PDF | Faible — remplacer par l’original |
| `luna-bohemia-booklet-overview-01.jpg` | Luna Bohemia | 13 | 1630 × 204 px | JPEG | 120.0 Ko | Composition complète intégrée au PDF | Moyen — éviter en plein écran |
| `luna-bohemia-booklet-overview-02.jpg` | Luna Bohemia | 13 | 1630 × 204 px | JPEG | 136.0 Ko | Composition complète intégrée au PDF | Moyen — éviter en plein écran |
| `luna-bohemia-cover.jpg` | Luna Bohemia | 9 | 1004 × 1004 px | JPEG | 136.7 Ko | Composition complète intégrée au PDF | Bon — utilisation standard |
| `luna-bohemia-landscape-01.jpg` | Luna Bohemia | 23 | 717 × 403 px | JPEG | 43.5 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-02.jpg` | Luna Bohemia | 23 | 717 × 478 px | JPEG | 53.2 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-03.jpg` | Luna Bohemia | 23 | 717 × 403 px | JPEG | 43.2 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-04.jpg` | Luna Bohemia | 23 | 717 × 478 px | JPEG | 24.2 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-05.jpg` | Luna Bohemia | 24 | 564 × 997 px | JPEG | 98.3 Ko | Recadrage PDF probable — seule version intégrée | Bon — utilisation standard |
| `luna-bohemia-landscape-06.jpg` | Luna Bohemia | 24 | 717 × 478 px | JPEG | 66.9 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-07.jpg` | Luna Bohemia | 24 | 717 × 478 px | JPEG | 48.1 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-08.jpg` | Luna Bohemia | 25 | 717 × 955 px | JPEG | 78.3 Ko | Complète dans le PDF — source HD non vérifiable | Bon — utilisation standard |
| `luna-bohemia-landscape-09.jpg` | Luna Bohemia | 25 | 717 × 494 px | JPEG | 38.4 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-10.jpg` | Luna Bohemia | 25 | 717 × 403 px | JPEG | 42.2 Ko | Complète dans le PDF — source HD non vérifiable | Moyen — éviter en plein écran |
| `luna-bohemia-landscape-11.jpg` | Luna Bohemia | 26 | 336 × 504 px | JPEG | 23.7 Ko | Recadrage PDF probable — seule version intégrée | Faible — remplacer par l’original |
| `luna-bohemia-photo-dark-chairs.jpg` | Luna Bohemia | 11 | 1041 × 1133 px | JPEG | 647.4 Ko | Complète dans le PDF — source HD non vérifiable | Bon — utilisation standard |
| `shop-tshirt-doya-black-front.png` | Merchandising | 18 | 1070 × 1070 px | PNG | 161.9 Ko | Complète — image et masque alpha natifs réunis | Bon — utilisation standard |
| `shop-tshirt-doya-white-front.png` | Merchandising | 18 | 535 × 535 px | PNG | 37.3 Ko | Complète — image et masque alpha natifs réunis | Moyen — éviter en plein écran |
| `shop-tshirt-logo-black-back.png` | Merchandising | 21 | 1070 × 1070 px | PNG | 163.6 Ko | Complète — image et masque alpha natifs réunis | Bon — utilisation standard |
| `shop-tshirt-logo-white-back.png` | Merchandising | 21 | 535 × 535 px | PNG | 50.2 Ko | Complète — image et masque alpha natifs réunis | Moyen — éviter en plein écran |
| `shop-tshirt-luna-a-black-back.png` | Merchandising | 18 | 1070 × 1070 px | PNG | 238.2 Ko | Complète — image et masque alpha natifs réunis | Bon — utilisation standard |
| `shop-tshirt-luna-a-white-back.png` | Merchandising | 18 | 535 × 535 px | PNG | 101.5 Ko | Complète — image et masque alpha natifs réunis | Moyen — éviter en plein écran |
| `shop-tshirt-luna-b-black-back.png` | Merchandising | 19 | 1070 × 1070 px | PNG | 196.6 Ko | Complète — image et masque alpha natifs réunis | Bon — utilisation standard |
| `shop-tshirt-luna-b-white-back.png` | Merchandising | 19 | 535 × 535 px | PNG | 66.8 Ko | Complète — image et masque alpha natifs réunis | Moyen — éviter en plein écran |
| `shop-tshirt-luna-c-black-back.png` | Merchandising | 20 | 1070 × 1070 px | PNG | 203.5 Ko | Complète — image et masque alpha natifs réunis | Bon — utilisation standard |
| `shop-tshirt-luna-c-white-back.png` | Merchandising | 20 | 535 × 535 px | PNG | 69.9 Ko | Complète — image et masque alpha natifs réunis | Moyen — éviter en plein écran |
| `shop-tshirt-wordmark-black-front.png` | Merchandising | 21 | 1070 × 1070 px | PNG | 162.5 Ko | Complète — image et masque alpha natifs réunis | Bon — utilisation standard |
| `shop-tshirt-wordmark-white-front.png` | Merchandising | 21 | 535 × 535 px | PNG | 35.6 Ko | Complète — image et masque alpha natifs réunis | Moyen — éviter en plein écran |
| `doya-logo-black.svg` | Logo | 7 | 50.512 × 45.301 unités SVG — scalable | SVG | 3.9 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-logo-red.svg` | Logo | 7 | 50.516 × 45.301 unités SVG — scalable | SVG | 4.2 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-logo-white.svg` | Logo | 7 | 50.512 × 45.301 unités SVG — scalable | SVG | 4.1 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-monogram-black.svg` | Logo | 7 | 62.098 × 62.277 unités SVG — scalable | SVG | 4.1 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-monogram-red.svg` | Logo | 7 | 62.102 × 62.277 unités SVG — scalable | SVG | 4.2 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-monogram-white.svg` | Logo | 7 | 62.098 × 62.277 unités SVG — scalable | SVG | 4.1 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-wordmark-black.svg` | Logo | 7 | 50.512 × 14.535 unités SVG — scalable | SVG | 3.0 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-wordmark-red.svg` | Logo | 7 | 50.516 × 14.535 unités SVG — scalable | SVG | 3.2 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-wordmark-white.svg` | Logo | 7 | 50.512 × 14.535 unités SVG — scalable | SVG | 3.2 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-stars-black.svg` | Icône / symbole | 7 | 35.547 × 44.785 unités SVG — scalable | SVG | 1.1 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-stars-red.svg` | Icône / symbole | 7 | 35.547 × 44.785 unités SVG — scalable | SVG | 1.1 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |
| `doya-stars-white.svg` | Icône / symbole | 7 | 35.543 × 44.785 unités SVG — scalable | SVG | 1.1 Ko | Vectoriel natif — non recadré | Excellent — plein écran possible |

## Doublons détectés et non conservés

- Couverture : l’objet 9 (page 10, 644 × 644 px) reprend la couverture de l’objet 8 (page 9, 1004 × 1004 px). Seule la version 1004 × 1004 px est conservée.
- Photographie sombre avec les chaises : objets 11 et 12, page 11, strictement identiques. Une seule copie est conservée.
- Aperçus du livret : objets 13/21 et 14/22, pages 13 et 16, strictement identiques. Une seule copie de chaque aperçu est conservée.
- Mockups recto : les objets 23/31/39 et 25/33/41 sont réutilisés sur plusieurs pages. Chaque visuel recto n’est conservé qu’une fois.
- Masques alpha de merchandising : plusieurs masques sont réutilisés à l’identique ; ils ont été réunis avec leur image et ne sont pas livrés séparément.
- Paysage : l’objet 87 (page 31, 717 × 401 px) est une version recadrée de l’objet 60 (page 24, 717 × 478 px). La version la plus complète est conservée.
- Le logo `blava` des pages 1 et 32 est dupliqué mais n’est pas un asset DOYA ; il n’a pas été copié dans `src/assets/`.

## Limites de qualité et fichiers à remplacer en priorité

- Le PDF a été exporté avec des images généralement ramenées à 150 ppp. Pour un Hero ou une photographie plein écran, les fichiers photo originaux restent préférables.
- Les fichiers de 336 × 504 px ou 331 × 404 px sont classés « Faible » : ils conviennent seulement à de petites vignettes.
- Les paysages de 717 × 403/478 px et les compositions de livret très panoramiques sont classés « Moyen » : éviter le plein écran.
- Plusieurs images et compositions de livret sont des JPEG CMJN natifs du PDF. Leur conversion contrôlée en sRGB pourra être faite lors de l’optimisation web, mais n’a pas été imposée ici afin de préserver les flux extraits.
- Les mockups blancs font seulement 535 × 535 px ; les mockups noirs à 1070 × 1070 px offrent davantage de marge.

## Éléments non extractibles proprement comme fichiers autonomes

- Le visuel CD de la page 11 est une composition de tracés, textes et photographie sous masque. Il n’existe pas comme image autonome dans le PDF ; aucune capture de page n’a été créée. La photographie sous-jacente est conservée sous `luna-bohemia-photo-dark-chairs.jpg`.
- Aucun visuel de vinyle autonome n’a été détecté.
- Les graphismes imprimés au dos des tee-shirts sont fusionnés dans les mockups ; ils ne sont pas disponibles séparément en haute définition dans le PDF.
- Les pages de livret sont des compositions JPEG aplaties : textes et photographies ne peuvent pas tous être séparés proprement.
- Le mot-symbole « Luna Bohemia » est intégré aux compositions et n’est pas fourni comme objet autonome clairement isolé.

## Logos et symboles vectoriels

Les fichiers `doya-wordmark-*`, `doya-logo-*`, `doya-monogram-*` et `doya-stars-*` proviennent réellement de tracés vectoriels de la page 7. Les versions noire, blanche et rouge sont des variantes présentes dans le PDF ; aucune couleur n’a été inventée et aucun raster n’a été vectorisé.

## Typographies et couleurs relevées

- Typographies indiquées visuellement dans la direction artistique : **New Frank** et **Editorial New**.
- Polices techniquement incorporées au PDF pour la présentation : `FKDisplay-RegularAlt` et `Degular-Medium`. Cela ne prouve pas que leurs fichiers sont les fontes officielles à utiliser sur le site.
- Couleurs des tracés d’identité isolés : noir `#000000`, blanc `#FFFFFF` et rouge `#E30613` (valeur arrondie du flux vectoriel du PDF).
- Aucun CSS du projet n’a été modifié.
