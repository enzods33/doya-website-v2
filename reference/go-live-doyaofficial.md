# DOYA — bascule vers doyaofficial.com

Domaine canonique : `https://doyaofficial.com`
Alias : `https://www.doyaofficial.com` → redirection permanente vers le domaine canonique.
Ancien domaine : `https://doya.guzzler-bot.cloud` conservé temporairement pendant la transition.

## Ordre de bascule

### 1. OVH DNS
Dans la zone DNS de `doyaofficial.com` :
- `A` pour le domaine racine (`@`) → `46.224.50.133`
- `CNAME` pour `www` → `doyaofficial.com.`
- ne pas créer d’`AAAA` tant que l’IPv6 du VPS n’est pas explicitement validée
- supprimer/éviter tout enregistrement A/AAAA/CNAME concurrent issu d’une page de parking OVH

Attendre la propagation et vérifier :
- `doyaofficial.com` résout vers `46.224.50.133`
- `www.doyaofficial.com` résout aussi correctement

### 2. Caddy / VPS
Avant toute modification :
- lire le bloc Caddy DOYA actuel ;
- ne toucher à aucun autre site.

Cible :
- servir `/var/www/doya` pour `doyaofficial.com`
- rediriger `www.doyaofficial.com` vers `https://doyaofficial.com{uri}`
- conserver le fallback SPA `try_files {path} /index.html`
- ne pas mettre `X-Robots-Tag: noindex, nofollow` sur le domaine officiel
- garder temporairement `doya.guzzler-bot.cloud` fonctionnel

Valider avant reload :
`sudo caddy validate --config /etc/caddy/Caddyfile`

Puis seulement :
`sudo systemctl reload caddy`

Vérifier HTTPS et HTTP 200 sur :
- `/`
- `/admin`
- `/panier`
- `/commande`
- `/mentions-legales`
- `/cgv`
- `/confidentialite`

### 3. GitHub / build
Secret Actions :
- `VITE_SITE_URL=https://doyaofficial.com`

Le workflow prod doit construire avec :
- `VITE_INDEXABLE=true`
- Supabase/R2 inchangés

Après déploiement vérifier :
- canonical → `https://doyaofficial.com/`
- OpenGraph URLs → nouveau domaine
- `robots.txt` = indexable
- `sitemap.xml` → nouveau domaine

### 4. Supabase Auth
Projet : `ipphjddgeotsohplzkbo`

Authentication → URL Configuration :
- Site URL = `https://doyaofficial.com`
- Redirect URLs exactes :
  - `https://doyaofficial.com/admin`
  - `https://doyaofficial.com/panier`
  - `https://doyaofficial.com/commande`

Garder les URLs locales nécessaires au développement.
Le wildcard `https://doyaofficial.com/**` peut être utilisé en complément, mais les URLs exactes prod sont préférées.

### 5. Google OAuth
Client OAuth DOYA Web :
- Authorized JavaScript origin : `https://doyaofficial.com`
- callback Google/Supabase reste :
  `https://ipphjddgeotsohplzkbo.supabase.co/auth/v1/callback`

Tester une vraie connexion admin depuis `https://doyaofficial.com/admin`.

### 6. Supabase Edge Functions / CORS / Stripe returns
Secret Edge Function `SITE_URL`.

Pendant la transition :
`https://doyaofficial.com,https://doya.guzzler-bot.cloud`

Le domaine officiel est volontairement placé en premier.
Après validation complète et retrait de l’ancien domaine :
`https://doyaofficial.com`

Ce secret contrôle :
- CORS des Edge Functions
- retours Stripe succès / annulation
- origine publique de secours

### 7. Backend arabe à rattraper avant ouverture définitive
État audité le 29/09/2026 :
- le front arabe est en ligne ;
- production Supabase n’a pas encore `orders.locale` ;
- aucune ligne `site_bio.locale='ar'` ;
- les Edge Functions déployées ne contiennent pas encore le parcours arabe récent.

Avant ouverture officielle :
- appliquer les migrations manquantes validées par la CI ;
- déployer les Edge Functions actuelles du repo ;
- revalider checkout, e-mails de confirmation et e-mails d’expédition en arabe.

### 8. Stripe
Le webhook reste sur Supabase ; le changement de domaine web ne change pas son URL :
`https://ipphjddgeotsohplzkbo.supabase.co/functions/v1/stripe-webhook`

À vérifier dans le compte Stripe :
- mode réellement utilisé : TEST ou LIVE
- `STRIPE_SECRET_KEY` correspondant au mode attendu
- `STRIPE_WEBHOOK_SECRET` correspondant au webhook du même mode
- événements requis présents
- aucune ancienne URL du site configurée dans un réglage Stripe annexe

Le code construit `success_url` et `cancel_url` depuis l’origine autorisée, donc après mise à jour `SITE_URL`, Checkout reviendra sur :
- `https://doyaofficial.com/commande`
- `https://doyaofficial.com/panier`

Faire un paiement de contrôle uniquement lorsque le domaine, HTTPS, Supabase et le webhook sont validés.

### 9. Images produit encore liées à l’ancien domaine
Audit production :
- `tee-luna-mini-red`
- `cap-luna-black`
- `tote-eclipse-black`

ont encore des `image_front_url/image_back_url` absolues en `https://doya.guzzler-bot.cloud/shop/...`.

Ne pas couper l’ancien host avant correction.
Après mise en ligne officielle :
- soit migrer ces URLs vers R2 (préféré),
- soit remplacer le host par `https://doyaofficial.com`.

Vérifier les 6 images avant puis après modification.

### 10. Brevo / email
Le changement de domaine web n’impose pas de changer immédiatement le sender, mais avant lancement public :
- choisir un expéditeur DOYA sur le domaine, par ex. `contact@doyaofficial.com` ou `boutique@doyaofficial.com`
- ajouter/vérifier le domaine dans Brevo
- ajouter dans la zone DNS OVH exactement les enregistrements DKIM/DMARC et autres valeurs fournis par Brevo
- mettre ensuite le secret `BREVO_SENDER_EMAIL` sur cette adresse
- tester bienvenue newsletter, confirmation commande et expédition

Ne pas inventer les valeurs DKIM/DMARC : utiliser celles générées par Brevo.

### 11. SEO
Quand le domaine officiel est stable :
- créer une propriété Google Search Console pour `doyaofficial.com`
- validation DNS via le TXT fourni par Google dans la zone OVH
- soumettre `https://doyaofficial.com/sitemap.xml`
- vérifier que `robots.txt` autorise l’indexation des pages publiques
- vérifier canonical et OpenGraph
- conserver panier, commande, admin et désabonnement en noindex

### 12. Ancien domaine
Ne pas le supprimer le jour J.
Après plusieurs jours de validation :
- rediriger `doya.guzzler-bot.cloud` vers `https://doyaofficial.com{uri}`
- seulement après correction des URLs d’images produit
- conserver la redirection suffisamment longtemps pour les anciens liens

## Contrôles finaux obligatoires
- DNS A/CNAME
- HTTPS valide
- HTTP 200 pages publiques + SPA
- login Google admin
- catalogue / images
- panier
- CORS Edge
- Stripe Checkout + retour succès/annulation
- webhook Stripe
- stock/réservation
- e-mails Brevo
- newsletter + désabonnement
- arabe + RTL + e-mails arabes
- robots/sitemap/canonical
- monitoring Uptime Kuma / Playwright
- espace disque VPS, Docker et services protégés après modifications serveur
