# Mise en ligne DOYA — 5 octobre 2026

## Décision et périmètre

La bascule a été autorisée explicitement après la préparation : « allez fait au plus vite et balance sur la nouvelle url ». Le site reste accessible sur les deux domaines. L'achat et la création d'une boîte `contact@doyaofficial.com` ont été abandonnés à la demande de l'utilisateur ; l'adresse publique, les réponses et les notifications vendeur utilisent `doyamusicofficial@gmail.com`.

Le refactoring de thème reste en pause. Aucune branche Supabase, migration, remise à zéro des commandes/stocks ou transaction de test n'a été effectuée.

## État déployé

- Frontend : commit `84c6a453d248f96f9469f17e75d40e142d4d663d`, publié sur `master` depuis la branche existante `feature/clips-video-admin`.
- GitHub `DOYA_OFFICIAL_DOMAIN_ENABLED=true` sélectionne `https://doyaofficial.com` et un build indexable. Déploiement réussi : [37295753333](https://github.com/enzods33/doya-website-v2/actions/runs/37295753333).
- DNS racine et `www` : A `46.224.50.133`, TTL 300 ; anciennes AAAA OVH retirées ; anciens TXT de parking retirés. Résultats identiques chez OVH, Cloudflare et Google DNS.
- Les autres enregistrements DNS ont été conservés, notamment la validation Google, DKIM/DMARC Brevo et les MX OVH. Les MX ont été configurés par l'onboarding Zimbra pendant la préparation ; aucune boîte n'a été créée ni aucun achat validé. Ils n'interviennent pas dans la réception du Gmail existant.
- Caddy sert `/var/www/doya` sur le domaine officiel et conserve le bloc de l'ancienne URL. `www` redirige vers le domaine racine en préservant chemin et paramètres. Configuration validée avant rechargement.
- HTTPS vérifié sans désactiver la validation du certificat ; certificat de la racine valable jusqu'au 3 janvier 2027.
- Supabase projet `ipphjddgeotsohplzkbo` : Auth Site URL `https://doyaofficial.com` ; les autorisations localhost, ancien domaine et `/admin`, `/panier`, `/commande` du nouveau sont conservées.
- Secret Edge `SITE_URL=https://doyaofficial.com,https://doya.guzzler-bot.cloud` : domaine officiel primaire pour les liens des emails, les deux origines autorisées. Les retours Stripe suivent l'origine autorisée du checkout.
- Google OAuth : origines nouveau domaine/racine, `www`, ancien domaine et localhost conservées ; callback Supabase inchangé. Le back-office connecté a été observé sur le nouveau domaine, y compris l'onglet Vidéo. Cela ne constitue pas un essai indépendant de tous les comptes administrateur.
- Stripe Live et webhook restent en place sur le endpoint Supabase existant ; aucune nouvelle commande ni paiement de test n'a été lancé.

## Emails

- Expéditeur Brevo `DOYA <doyamusicofficial@gmail.com>` vérifié grâce au code reçu par l'utilisateur.
- Secrets `BREVO_SENDER_EMAIL=doyamusicofficial@gmail.com`, `BREVO_SENDER_NAME=DOYA`, `ORDER_NOTIFY_EMAIL=doyamusicofficial@gmail.com` enregistrés ; digests et dates vérifiés dans le dashboard.
- Confirmation et expédition : destinataire client conservé ; notification de vente vendeur distincte ; réponses et contact du pied de mail sur le Gmail DOYA. La déduplication existante est préservée lorsque client et vendeur ont la même adresse.
- Devis : notification vendeur sur le Gmail DOYA ; réponse au devis vers le client et destinataire technique existant conservés.
- Newsletter et campagnes : identité configurée, Reply-To Gmail DOYA. Le double opt-in surcharge l'expéditeur du template Brevo et utilise le lien de confirmation construit depuis le domaine primaire.
- Domaine `doyaofficial.com` authentifié dans Brevo mais inutilisé comme adresse d'expédition ; cette authentification ne s'applique pas à `gmail.com`. Brevo affiche son avertissement habituel pour les adresses gratuites. Aucune promesse d'absence de spam.
- Fonctions redéployées avec leur authentification existante conservée : `stripe-webhook` v42, `get-order` v33, `admin-stats` v30, `commerce-maintenance` v8, `request-shipping-quote` v19, `admin-brevo-campaign` v43, `subscribe-newsletter` v33, `confirm-newsletter` v7. Les fonctions publiques/webhook ont leurs contrôles internes ; les fonctions admin continuent à vérifier l'utilisateur et l'allowlist.

## Contrôles

- 81 tests unitaires réussis ; services externes et écritures simulés. Lint sans erreur, avertissements React préexistants. `git diff --check` sans erreur.
- Monitoring du domaine officiel : [37296630790](https://github.com/enzods33/doya-website-v2/actions/runs/37296630790), réussi ; 2 tests publics/admin, 2 panier/paiement simulé, 4 écoute/réseaux/newsletter simulée et job API en lecture seule.
- 30 préflights CORS après bascule : 10 fonctions autorisent le nouveau domaine, 10 l'ancien, 10 refusent une origine non autorisée.
- Sur les deux domaines : `/`, `/admin`, `/panier`, `/commande`, `/robots.txt`, `/sitemap.xml` répondent 200 ; asset inexistant répond 404.
- Domaine officiel : canonical officiel, robots `index,follow`, aucun header global noindex ; routes privées avec header noindex ; sitemap limité aux 4 routes publiques.
- Ancienne URL : toujours servie, canonical vers l'officiel, header noindex conservé et meta noindex appliquée par React à l'origine historique. Aucun transfert forcé des parcours de vente/admin historiques.
- Uptime Kuma : l'ancienne URL conserve sa sonde HTTP ; les 4 sondes push couvrent public/admin, commerce, intégrations et API sur le domaine officiel via GitHub. Les 3 nouvelles sondes push sont sans notification Telegram ; les notifications existantes n'ont pas été changées ni testées par envoi réel.
- Pas de commande/stock/contact/message de test réel. Les emails de confirmation/expédition sont validés avec mocks, pas par une nouvelle vente réelle.

## Référencement

Propriété de domaine Search Console vérifiée. Actions manuelles et sécurité : aucun problème signalé lors de la préparation. Sitemap officiel soumis après validation HTTPS/robots. Première soumission acceptée, puis renouvelée après le contrôle en direct Google ; le rapport affiche encore « Impossible de lire le sitemap ». Le fichier a été contrôlé depuis le PC et le VPS : HTTP 200, `text/xml; charset=utf-8`, XML valide, 4 URL publiques répondant 200, aucun header noindex. La cause du statut Search Console n'est pas confirmée ; ne pas le présenter comme une validation réussie de lecture du sitemap par Google.

Le contrôle en direct Google de l'accueil effectué à 12:32 (Paris) a confirmé « Google a accès à cette URL » et « La page peut être indexée ». La demande d'indexation de l'accueil a été acceptée dans la file d'exploration prioritaire. Le rapport historique affichait une 404 du 14 septembre 2026, antérieure à cette mise en ligne. Ne pas confondre la disponibilité du site avec son indexation effective par Google.

## Retour arrière

- Sauvegarde Caddy avant activation : `/home/stef/doya-go-live/Caddyfile.before-launch-20261005T101906Z`. Restaurer uniquement les blocs DOYA dans une copie fraîche de la configuration si d'autres sites ont changé depuis ; valider puis recharger Caddy. Ne pas écraser les configurations d'autres services.
- Ancienne URL reste utilisable même pendant un problème du nouveau domaine. Pour un rollback frontend, désactiver `DOYA_OFFICIAL_DOMAIN_ENABLED`, restaurer le commit stable choisi et redéployer ; conserver les anciens assets hashés.
- Remettre l'ancien domaine en première position dans `SITE_URL` et Auth Site URL si nécessaire, tout en conservant les deux origines autorisées. Aucun reset des données n'est nécessaire.
- La zone DNS avant bascule est sauvegardée localement dans `doya-go-live-audit/dns-before-launch.zone`. Un rollback DNS est soumis au cache et ne remplace pas la possibilité de garder immédiatement l'ancienne URL active.
- Sources antérieures des 8 fonctions sauvegardées via le connecteur avant leur redéploiement, puis conservées localement dans `doya-go-live-audit/edge-before-*.json` ; le commit précédent permet aussi de retrouver le code. Refaire les contrôles en lecture seule après tout rollback.

## À suivre

- Vérification de la récupération du sitemap par Google et de l'indexation réelle, qui n'est pas instantanée.
- Si une identité de domaine est voulue plus tard, choisir explicitement une solution de réception/redirection avant de changer d'adresse publique. La boîte professionnelle et sa redirection restent abandonnées.
