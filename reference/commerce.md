# Boutique DOYA — Supabase + Stripe

Le Shop reste une collection visuelle tant qu’aucun produit n’est passé `on_sale` avec un prix et du stock. Les JPEG et mockups restent hors du panier critique (CDN R2). Supabase ne stocke que l’état commercial.

## Activer

1. Créer un projet Supabase. Auth admin : **Google OAuth** vers `/admin` (voir `reference/admin.md`). Dans Authentication → URL configuration, ajouter `http://127.0.0.1:5174/admin` et l’URL HTTPS de production `/admin` (plus `/panier`, `/commande` pour les retours Stripe).
2. Appliquer les migrations sous `supabase/migrations/` (dans l’ordre chronologique).
3. Déployer les Edge Functions (`create-checkout-session`, `stripe-webhook`, `get-order`, admin-*, newsletter, etc.). `verify_jwt` reste faux sur le checkout/webhook : le webhook utilise la signature Stripe ; l’admin vérifie la session Google côté fonction.
4. Secrets des fonctions (jamais dans git) :

```text
SITE_URL=https://domaine-officiel
STRIPE_SECRET_KEY=sk_test_ou_sk_live
STRIPE_WEBHOOK_SECRET=whsec_...
```

Les frais de port sont des **forfaits par zone** dans le code (`supabase/functions/_shared/shipping.ts`), choisis par le client sur Stripe Checkout. Miroir front : `src/commerce/shippingZones.js` (garder alignés ; test dans `tests/commerce.test.js`).

| Zone | Tarif | Pays |
| --- | --- | --- |
| France métropole | 6,00 € | FR, MC |
| Europe (UE + Suisse) | 8,00 € | BE, CH, LU, DE, NL, ES, IT, PT, AT, IE |
| DOM-TOM | 12,90 € | RE, GP, MQ, GF, YT, … |

Forfait valable pour **≤ 6 tee-shirts** et **≤ 5 CD**. Au-delà : pas de paiement Stripe, port **sur devis** (`shipping_quote_required`) — mails `almenaprod@gmail.com` et `stephanedasil@gmail.com`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis par la plateforme.

5. Compte Stripe en mode test, puis live. Webhook vers `https://<projet>.functions.supabase.co/stripe-webhook` avec :
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `charge.refunded`
6. Dans `.env.local` du site :

```text
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ASSETS_URL=https://pub-….r2.dev
```

7. L’hébergement statique doit renvoyer `index.html` pour `/panier`, `/commande` et `/admin`.

## Imports Supabase (front)

- **Pages publiques** : import dynamique `await import('./supabase.js')` (catalogue, analytics, concerts, bio) pour ne pas bloquer le LCP.
- **Admin** (`/admin`) : import statique OK — la route est déjà en `lazy()`.

## Article / stocks

SKU catalogue : `cd-luna-bohemia`, `luna-bohemia-white`, `luna-bohemia-black`, `doya-white`, `doya-black` (`src/data/products.js`).  
Tailles : `XS` … `XL` pour les tees ; `U` (unique) pour le CD. Pas de `XXL`.

Dans la table `products` : renseigner `price_cents` (ex. `4500` = 45 €), puis `on_sale = true`.  
Dans `product_variants` : stock par taille.  
Le bouton « Ajouter » n’apparaît que si ces deux conditions sont vraies.

Un SKU `test` éventuel sert uniquement aux paiements Stripe en mode test. Le passer `on_sale = false` avant toute ouverture publique.

## Code promo

Table `promo_codes` :

- `code` en majuscules, sans espace (`LUNA26`)
- soit `percent_off` (ex. `10`) soit `amount_off_cents` (ex. `500`), pas les deux
- `active = true`
- optionnel : dates, `min_subtotal_cents`, `max_redemptions`, `one_per_customer`, `min_tee_qty` (≥ N tee-shirts `type = T-shirt`, comptés en base)

Offres auto (une seule, la meilleure, pas de cumul) — miroir front `AUTO_PROMOS` dans `cartRules.js` :
- `2TEES` = −8 € si ≥ 2 tee-shirts
- `CDTEE` = −5 € si ≥ 1 CD et ≥ 1 tee-shirt  
Exemple : 1 CD + 2 tees → −8 € (pas −13 €).

`auto_apply = true` : sans code saisi, la meilleure promo éligible s’applique. Un autre code saisi a priorité.

Le client n’a aucun accès en lecture à cette table. Le code est vérifié au moment de créer la session Stripe.

## Paiement

Stripe Checkout héberge la carte. Le site ne voit jamais le numéro.  
Au clic, une fonction réserve le stock **30 minutes** (session Stripe `expires_at`), crée la session, puis le webhook confirme ou libère. Un job **pg_cron** (`release_stale_reservations`, toutes les 5 min) libère aussi les pending > 35 min. Annulation Stripe → retour `/panier?canceled=1&session_id=…` appelle `release-checkout`.
Les prix affichés dans le panier sont indicatifs ; le montant Stripe est recalculé en base.

Chaque commande reçoit un **n° humain** `DOYA-XXXXX` (colonne `orders.order_number`) dès la création pending. Il apparaît :
- page `/commande` après paiement
- métadonnées Stripe (`orderNumber` / `client_reference_id`)
- e-mail de confirmation client + notification atelier (`ORDER_NOTIFY_EMAIL`, défaut `almenaprod@gmail.com`) via Brevo  
  (n°, e-mail, nom, **téléphone**, adresse, lignes, totaux)
- liste « commandes récentes » dans l’admin Ventes (historique complet + statut d’expédition + n° de suivi ; e-mail client à l’expédition)

## Admin

Back-office **Backstage** sur `/admin` (Google OAuth, rôle `admin` sur `profiles`). Concerts, bio, audience, newsletter Brevo, ventes — détail dans `reference/admin.md`. Prix / stocks / promos restent aussi gérables via le dashboard Supabase.

## Checklist — passage au vrai domaine (HTTPS)

Quand le site est en ligne sur le nom de domaine définitif (nouvelle IP / DNS), mettre à jour **tout** ceci :

1. **Secret Edge Function `SITE_URL`**  
   → `https://domaine-officiel` (sans slash final). Sert aux redirections succès / annulation Stripe Checkout et au contrôle d’origine (CORS Edge).

2. **Supabase Auth → URL configuration**  
   - Site URL = `https://domaine-officiel`  
   - Redirect URLs : garder le local si besoin + ajouter  
     `https://domaine-officiel/admin`  
     `https://domaine-officiel/panier`  
     `https://domaine-officiel/commande`  
     (ou `https://domaine-officiel/**` en wildcard).

3. **Google Cloud OAuth** (provider Google activé)  
   - Authorized JavaScript origins : `https://domaine-officiel`  
   - Authorized redirect URIs : l’URL de callback Supabase  
     `https://ipphjddgeotsohplzkbo.supabase.co/auth/v1/callback`  
     (ne change **pas** avec le domaine du site).

4. **Build / hébergement front** (`.env` de prod ou variables CI)  
   - `VITE_SITE_URL=https://domaine-officiel`  
   - `VITE_INDEXABLE=true` seulement quand le SEO est voulu  
   - `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (déjà OK si mêmes valeurs)  
   - `VITE_ASSETS_URL` (CDN R2)  
   - Rebuild + redeploy du site après changement.

5. **Hébergeur (SPA)**  
   Fallback `index.html` pour `/panier`, `/commande`, `/admin`.

6. **DNS / IP**  
   A/AAAA (ou CNAME) vers la nouvelle IP / l’hébergeur ; HTTPS (certificat) OK avant de tester un vrai paiement.

7. **Stripe — passage TEST → LIVE (très important)**  
   - Dashboard Stripe : passer en mode **Live** (plus Test).  
   - Secrets Supabase Edge :  
     - `STRIPE_SECRET_KEY` → `sk_live_…` (**plus** `sk_test_…`)  
     - `STRIPE_WEBHOOK_SECRET` → `whsec_…` du **webhook Live**  
   - Créer / vérifier le webhook **Live** vers  
     `https://ipphjddgeotsohplzkbo.supabase.co/functions/v1/stripe-webhook`  
     (events : `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`).  
   - Le webhook pointe vers Supabase (pas vers le domaine du site) — l’URL ne change pas avec le DNS.  
   - Faire **1 paiement réel de contrôle** : `/commande` OK, mails, stock, admin Ventes.  
   - En live, la carte test `4242…` **ne marche plus** (normal).  
   - Régénérer les clés live si elles ont fuité dans un chat.

8. **Brevo / e-mails — domaine pro (obligatoire avant live)**  
   - **Acheter un vrai domaine** (idéalement **le même** que le site) pour les mails — **pas** rester sur `@gmail.com` en prod (délivrabilité Gmail/Yahoo + image marque).  
   - Créer une boîte d’envoi du type `hello@domaine`, `contact@domaine` ou `boutique@domaine`.  
   - Dans Brevo → Senders : ajouter / vérifier cet expéditeur ; **authentifier le domaine** (DKIM / DMARC) si proposé.  
   - Secret Supabase `BREVO_SENDER_EMAIL=…@domaine` (+ `BREVO_SENDER_NAME=DOYA`).  
   - **Transitoire actuel** (staging) : sender vérifié `almenaprod@gmail.com` — à remplacer par `@domaine` avant ouverture publique.

9. **Données boutique & stats — reset « jour J » (obligatoire avant ouverture réelle)**  
   Remettre un état propre **prod**, sans les tests staging :
   - **Stocks** : mettre à jour `product_variants.stock` (et `products.on_sale` / prix) avec les vrais stocks atelier.  
   - **Ventes** : partir de **0 vente** — purger les commandes / réservations / redemptions de test (`orders`, `order_items`, `stock_reservations`, `promo_redemptions`, éventuellement `processed_stripe_events` liés aux tests).  
   - **Stats site** : vider `site_pageviews` et `site_events` (audience admin repart de zéro).  
   Ne pas confondre avec les **clés** Stripe / R2 : on change les clés Stripe **test→live** (point 7) ; on ne regénère pas R2 sans besoin. On reset l’**historique métier**, pas les assets.

10. **Ne touche pas** (sauf besoin métier)  
   Secrets R2.  
   Tarifs / zones : `supabase/functions/_shared/shipping.ts` (redéployer les fonctions après changement).

11. **Médiateur de la consommation (obligatoire avant vente live B2C)**  
    - Adhérer à **CM2C** (choix retenu, pas cher) : https://www.cm2c.net/  
    - Tarifs : https://www.cm2c.net/tarifs.php — ~**48 € pour 3 ans** (&lt; 10 salariés) ; ~36 € si un dossier à distance.  
    - Puis mettre dans les CGV le **nom + URL** du médiateur (remplacer la mention provisoire « coordonnées sur demande à almenaprod@gmail.com »).  
    - Liste officielle CECMC si besoin : https://www.economie.gouv.fr/mediation-conso

12. **SEO post-deploy**  
    Search Console → propriété du domaine → envoyer `https://domaine/sitemap.xml` (détail : `reference/seo.md`).

### Preview Netlify (staging)

URL actuelle : `https://harmonious-hamster-bac94a.netlify.app`  
(constante front : `STAGING_SITE_URL` dans `src/config/publicUrls.js`)

**Prod front** : VPS Hetzner via `.github/workflows/deploy.yml` (push `master`), comme Alegria / Dojo. Netlify reste optionnel (workflow manuel).

Déjà côté Supabase (en plus du local) :
- Secret `SITE_URL` → cette URL (CORS Edge + retours Stripe)
- Auth redirects : `…/**`, `/admin`, `/panier`, `/commande`

À faire côté Google Cloud (client OAuth **DOYA Web**) :
- Authorized JavaScript origins → ajouter `https://harmonious-hamster-bac94a.netlify.app`
- Redirect URI Supabase inchangé : `https://ipphjddgeotsohplzkbo.supabase.co/auth/v1/callback`

Netlify (build) — variables :
- `VITE_SITE_URL=https://harmonious-hamster-bac94a.netlify.app`
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (mêmes valeurs que `.env.local`)
- `VITE_INDEXABLE=false`
- `VITE_ASSETS_URL` (voir `netlify.toml`)
- `netlify.toml` : SPA fallback `/* → /index.html`
