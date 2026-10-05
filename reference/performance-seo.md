# Images, cache et sitemap DOYA

## Photographie d'accueil

Source inchangée : `https://pub-5b2b2b3b50ba46c485eeff926fa26420.r2.dev/site/hero.jpg`.
Le fichier original fait 2400 x 2400 pixels et 2 167 778 octets.
Les fichiers `public/site/hero-95679591479f-*.webp` sont des versions de cette même
photo, sans recadrage, générées avec Sharp (WebP qualité 78, effort 6,
largeurs 768, 1200, 1600, 1920 et 2400). Le préfixe est le début du SHA-256
de la source ; changer le nom lors d'un remplacement pour éviter un cache périmé.

`src/config/heroImage.js` partage les candidats et la taille entre le preload
Vite et le composant Photo. La taille tient compte de la hauteur du viewport,
car la photo carrée remplit aussi un écran mobile vertical. Les fonds floutés
Musique et Boutique utilisent la petite version de 768 pixels. Le logo Luna
Bohemia est converti en WebP sans perte. Les images de galerie sous le premier
écran sont chargées à la demande ; les contenus du back-office restent dynamiques.

## Serveur Caddy

Les deux blocs DOYA ont ces gestionnaires, placés avant le fallback SPA :

```caddyfile
@optimizedPhotos path /site/hero-*.webp
handle @optimizedPhotos {
    header Cache-Control "public, max-age=31536000, immutable"
    file_server
}
handle /sitemap.xml {
    header Content-Type "application/xml; charset=utf-8"
    header Cache-Control "no-cache"
    file_server
}
```

Les autres assets hashés gardent leur cache long. Le HTML reste revalidé.
L'ancienne URL garde son `X-Robots-Tag: noindex, nofollow` et ses parcours.
Sauvegarde serveur avant modification :
`/home/stef/doya-go-live/Caddyfile.before-seo-cache-20261005T142520Z`.
Restaurer seulement les blocs DOYA dans une configuration fraîche, valider
avec Caddy puis recharger ; ne pas écraser des changements d'autres sites.

## Sitemap

Le build publie les quatre pages publiques. `lastmod` est omis : la date d'un
build ne prouve pas que chaque page a changé. Ne pas inventer de dates pour
les contenus administrables. Le test direct de Google a confirmé l'accès au
sitemap le 5 octobre 2026. Le statut du rapport Sitemaps reste une vérification
distincte : un test d'accès réussi ne confirme pas le traitement du sitemap.

## Vérification

Lint, tests unitaires et build en local ; tests Playwright publics avec blocage
des écritures de production. Contrôler après déploiement le preload, les tailles
choisies, les headers de cache/XML et les deux domaines. Les rapports Lighthouse
dépendent du matériel, des conditions réseau et du profil mobile/desktop :
comparer des mesures réalisées avec les mêmes paramètres.

Résultats du 5 octobre 2026 : 81 tests unitaires, 8 tests Playwright en
production (services mutatifs simulés) et un contrôle mobile 390 x 844,
DPR 2, réussis. Sur ce mobile la photo choisie est la version 1920 et il
n'y a pas de débordement horizontal.

Mesure Lighthouse desktop locale : performance 88/100, accessibilité 100,
bonnes pratiques 100, SEO 100. Poids chargé 1 953 097 octets et LCP estimé
2,16 s. La mesure avant changements était 75/100, 3 572 737 octets et
2,82 s. Les conditions locales ne sont pas celles du rapport utilisateur
à 85/100 ; ne pas présenter ce comparatif comme une garantie de score.
Les rapports JSON ont été produits ; le processus CLI a rencontré une
erreur Windows lors du nettoyage de son profil temporaire, après la mesure.

Le sitemap répond en HTTP 200 avec le type XML et ses quatre URL. Il a été
renvoyé dans Search Console : confirmation « Sitemap envoyé ». Le rapport
affiche encore « Impossible de récupérer le sitemap » à la fin du contrôle,
malgré le test direct d'accès Google réussi. Son traitement reste à confirmer.

## Optimisations légères suivantes, 5 octobre 2026

Le commit `926b9cd` charge les styles admin uniquement avec la route admin,
et le code du zoom photo uniquement à son ouverture. Le lecteur flottant
observe les sections avec IntersectionObserver et mesure la section Musique
seulement lorsqu'elle intersecte le viewport. Le header évite les écritures
CSS inchangées. Aucun changement de la photo d'accueil, du backend ou des données.

Contrôles locaux : chargement différé CSS/zoom, ouverture et fermeture du zoom,
visibilité du lecteur dans Musique/Bio/Boutique/footer et porte admin réussis.
Déploiement GitHub Actions 37335123559 réussi ; huit tests Playwright après
déploiement réussis, avec écritures bloquées et services mutatifs simulés.

Lighthouse desktop : performance 89, accessibilité 100, bonnes pratiques 100,
SEO 100 ; LCP 2,09 s, poids 1 945 127 octets. Le plus gros recalcul forcé du
rapport passe de 99,44 à 55,77 ms. Le rapport JSON est valide sans runtimeError
ni runWarnings ; l'erreur de nettoyage du profil temporaire Windows persiste.
Ces petites variations de score ne garantissent pas un résultat constant.

Sitemap contrôlé à nouveau : HTTP 200, XML, robots.txt le référence ; www
redirige en 301 vers la version sans www. Test Search Console du 5 octobre
à 17:39:51 : exploration autorisée, récupération réussie. Le rapport sitemap
affiche encore une erreur générique sans cause détaillée. Google documente
des nouvelles tentatives sur quelques jours après un échec ; cela ne prouve
pas que le délai est la cause de cette erreur.

## Mobile : contrôle final du 5 octobre 2026

Les commits `880723e` et `11c095b` sont déployés sur master. Les variantes
AVIF mobiles sont issues de la même photo, sans recadrage. Le picture et
le preload sélectionnent la même variante ; les WebP desktop restent inchangés.
Les nouveaux fichiers sous /assets/ répondent en image/avif avec un cache
immutable d'un an. La comparaison visuelle à 390 x 844, DPR 2, conserve
la géométrie et les couleurs ; la compression adoucit légèrement le grain.

Les miniatures YouTube, pochette et logo ont des variantes adaptées ; le
SDK Supabase ne bloque plus le premier affichage. Les observations du header
réutilisent les dimensions de ResizeObserver. Aucun changement de base,
stockage, authentification ou service de paiement n'est appliqué.

Contrôles : 81 tests unitaires, lint et build réussis ; 11 tests Playwright
locaux puis en production réussis. Les commandes et inscriptions sont simulées,
les écritures externes bloquées. Un test contrôle l'absence de double téléchargement
de la photo mobile et le retour à la photo originale sur desktop. L'ancien domaine
répond toujours en HTTP 200.

Lighthouse en production, même profil mobile : avant AVIF 68, LCP 8,50 s,
1 393 926 octets ; après AVIF deux mesures 74 et 72, LCP 5,60 et 5,73 s,
environ 868 254 octets. Accessibilité, bonnes pratiques et SEO : 100.
Le résultat local de 86 ne représente pas le score en production. Desktop
après déploiement : 90, LCP 2,04 s, autres catégories 100.

L'objectif d'égaler le desktop n'est pas atteint. Le rapport de production
identifie encore environ 2 s de délai observé entre chargement et rendu de la
photo ; cette durée observée ne s'additionne pas au LCP simulé. La suppression
du zoom d'entrée a été essayée localement sans gain convaincant et écartée.
Les travaux plus larges de pré-rendu restent reportés conformément au choix utilisateur.
Les rapports JSON sont valides sans runtimeError ni runWarnings ; la CLI Windows
signale toujours EPERM au nettoyage de son profil temporaire après la mesure.
