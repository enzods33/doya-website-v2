# Profils officiels DOYA

Vérification du 2 septembre 2026. Seuls les liens du footer sont renseignés ; la présentation, les assets et les animations sont inchangés.

| Plateforme | Destination |
| --- | --- |
| Instagram | https://www.instagram.com/doyaofficial_/ |
| YouTube | https://www.youtube.com/@DOYAofficial_ |
| TikTok | https://www.tiktok.com/@doyaofficial_ |
| Facebook | https://www.facebook.com/doya.music/ |
| Spotify | https://open.spotify.com/artist/1JGqJy0whUevjrA3Tw6OMA |
| Apple Music | https://music.apple.com/fr/artist/doya/1646461706 |
| Deezer | https://www.deezer.com/artist/184643787 |

## Sources et identification

- La description de [No Anda Sola, vidéo publiée par la chaîne artiste officielle DOYA](https://www.youtube.com/watch?v=L3QQhlZFLxc) donne le compte `doyaofficial_` pour YouTube, Instagram et TikTok, ainsi que `doya.music` pour Facebook. Cette vidéo est également intégrée sur la [fiche DOYA de leur agence R3dLine](https://r3dline.fr/project/doya/), qui identifie Marina et Melissa : il s’agit bien du duo et non d’un artiste homonyme.
- La [fiche artiste Alhambra Guitarras](https://alhambraguitarras.com/fr-ch/blogs/artistas-alhambra/doya-francia-espana) recoupe Instagram et Facebook. Ses mentions abrégées de TikTok et YouTube ne sont pas retenues : la description de la chaîne officielle fournit les identifiants complets avec underscore.
- La page Spotify de [MARIPOSA](https://open.spotify.com/track/33B70dfszgAWsf8RCWSqao) référence directement, dans son HTML public, le profil artiste `1JGqJy0whUevjrA3Tw6OMA`. Aucun identifiant d’artiste n’a été deviné à partir du seul nom DOYA.
- Le [profil Apple Music français](https://music.apple.com/fr/artist/doya/1646461706) réunit notamment No anda sola, TÚ CONMIGO, MARIPOSA, Mueve et LO VI VENIR, cohérents avec le duo.
- Le [profil Deezer](https://www.deezer.com/artist/184643787) est confirmé par l'API publique Deezer : ses titres les plus écoutés (MARIPOSA, TÚ CONMIGO, LO VI VENIR, Mueve, No Anda Sola) et les crédits « DOYA Mélissa - DOYA Marina » correspondent au duo, distinct de l'homonyme brésilien « Doya ».

## Titres de l'album Luna Bohemia

L'album Luna Bohemia n'est pas encore sorti (septembre 2026). Seules les avances singles publiées ont une URL officielle, toutes rattachées à l'artiste Spotify `1JGqJy0whUevjrA3Tw6OMA` (vérifié dans le HTML public de chaque page) :

| Titre | Destination |
| --- | --- |
| Mariposa | https://open.spotify.com/track/33B70dfszgAWsf8RCWSqao |
| Mueve | https://open.spotify.com/track/4Mnitba7ayBKEJa0mguDJQ |

Les dix autres titres et les liens d'écoute de l'album complet (`album.platforms`) restent `null` tant que l'album n'est pas publié. Aucun profil YouTube Music ni lien de recherche automatique n'a été ajouté.

## Limites et périmètre

Instagram, Facebook, TikTok et les ouvertures directes YouTube limitent la consultation automatisée. Les identifiants sont vérifiés par les références croisées ci-dessus, notamment la description officielle indexée, sans prétendre avoir testé une connexion à ces services.

Les six destinations pointent vers les profils du duo. Elles ne remplacent pas les URLs de l’album ou des titres dans `src/data/album.js`, qui restent à renseigner. Aucun lecteur intégré, suivi publicitaire ou nouveau réseau supposé n’est ajouté. Les liens externes utilisent le comportement existant du footer : nouvel onglet et `rel="noopener noreferrer"`.
