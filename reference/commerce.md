# Boutique DOYA — Supabase + Stripe

Le Shop reste une collection visuelle tant qu’aucun produit n’est passé `on_sale` avec un prix et du stock. Les JPEG et mockups restent dans l’app. Supabase ne stocke que l’état commercial.

## Activer

1. Créer un projet Supabase. Auth : e-mail / magic link uniquement. Dans Authentication → URL configuration, ajouter `http://127.0.0.1:5174/compte` et l’URL HTTPS de production `/compte`.
2. Appliquer `supabase/migrations/20260903120000_init_commerce.sql`.
3. Déployer les fonctions `create-checkout-session`, `stripe-webhook`, `get-order`. `verify_jwt` reste faux : l’auth utilisateur est optionnelle, le webhook utilise la signature Stripe.
4. Secrets des fonctions (jamais dans git) :

```text
SITE_URL=https://domaine-officiel
STRIPE_SECRET_KEY=sk_test_ou_sk_live
STRIPE_WEBHOOK_SECRET=whsec_...
```

Les frais de port sont des **forfaits par zone** dans le code (`supabase/functions/_shared/shipping.ts`), choisis par le client sur Stripe Checkout :

| Zone | Tarif | Pays |
| --- | --- | --- |
| France métropole | 6,00 € | FR, MC |
| Europe (UE + Suisse) | 8,00 € | BE, CH, LU, DE, NL, ES, IT, PT, AT, IE |
| DOM-TOM | 12,90 € | RE, GP, MQ, GF, YT, … |

Forfait valable pour **≤ 6 tee-shirts** et **≤ 5 CD**. Au-delà : pas de paiement Stripe, port **sur devis** (`shipping_quote_required`) — mails `almenaprod@gmail.com` et `doyamusicofficial@gmail.com`.

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
```

7. L’hébergement statique doit renvoyer `index.html` pour `/panier`, `/compte` et `/commande`.

## Article test

Un SKU `test` (« Article test », 1,00 €, 5 pièces par taille) sert uniquement aux paiements Stripe en mode test. Le passer `on_sale = false` avant toute ouverture publique.

Dans la table `products` : renseigner `price_cents` (ex. `4500` = 45 €), puis `on_sale = true`.  
Dans `product_variants` : stock par taille (`XS` … `XXL`).  
Le bouton « Ajouter » n’apparaît que si ces deux conditions sont vraies.

## Code promo

Table `promo_codes` :

- `code` en majuscules, sans espace (`LUNA26`)
- soit `percent_off` (ex. `10`) soit `amount_off_cents` (ex. `500`), pas les deux
- `active = true`
- optionnel : dates, `min_subtotal_cents`, `max_redemptions`, `one_per_customer`, `min_tee_qty` (≥ N tee-shirts `type = T-shirt`, comptés en base)

Offres auto (une seule, la meilleure, pas de cumul) :
- `2TEES` = −8 € si ≥ 2 tee-shirts
- `CDTEE` = −5 € si ≥ 1 CD et ≥ 1 tee-shirt  
Exemple : 1 CD + 2 tees → −8 € (pas −13 €).

`auto_apply = true` : sans code saisi, la meilleure promo éligible s’applique. Un autre code saisi a priorité.

Le client n’a aucun accès en lecture à cette table. Le code est vérifié au moment de créer la session Stripe.

## Paiement

Stripe Checkout héberge la carte. Le site ne voit jamais le numéro.  
Au clic, une fonction réserve le stock 30 minutes, crée la session, puis le webhook confirme ou libère.  
Les prix affichés dans le panier sont indicatifs ; le montant Stripe est recalculé en base.

## Ce que le dashboard suffit à gérer

Prix, activation, stocks, codes promo. Pas d’admin dans le site pour cette passe : moins de surface d’attaque. Le rôle `admin` existe sur `profiles` pour plus tard, sans politique d’écriture client.

## Checklist — passage au vrai domaine (HTTPS)

Quand le site est en ligne sur le nom de domaine définitif (nouvelle IP / DNS), mettre à jour **tout** ceci :

1. **Secret Edge Function `SITE_URL`**  
   → `https://domaine-officiel` (sans slash final). Sert aux redirections succès / annulation Stripe Checkout et au contrôle d’origine.

2. **Supabase Auth → URL configuration**  
   - Site URL = `https://domaine-officiel`  
   - Redirect URLs : garder le local si besoin + ajouter `https://domaine-officiel/compte` (et `/**` si tu utilises le wildcard).

3. **Build / hébergement front** (`.env` de prod ou variables CI)  
   - `VITE_SITE_URL=https://domaine-officiel`  
   - `VITE_INDEXABLE=true` seulement quand le SEO est voulu  
   - `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (déjà OK si mêmes valeurs)  
   - Rebuild + redeploy du site après changement.

4. **Hébergeur (SPA)**  
   Fallback `index.html` pour `/panier`, `/compte`, `/commande` (et le reste des routes client).

5. **DNS / IP**  
   A/AAAA (ou CNAME) vers la nouvelle IP / l’hébergeur ; HTTPS (certificat) OK avant de tester un vrai paiement.

6. **Stripe**  
   - Webhook : **ne change pas** (il pointe vers Supabase, pas vers le domaine du site).  
   - Après un paiement test live : vérifier success_url / cancel_url sur le bon domaine.  
   - Régénérer les clés live si elles ont fuité dans un chat.

7. **Ne touche pas** (sauf besoin métier)  
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, tables produits / stocks.  
   Tarifs / zones : `supabase/functions/_shared/shipping.ts` (redéployer les fonctions après changement).
