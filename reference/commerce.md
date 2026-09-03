# Boutique DOYA — Supabase + Stripe

Le Shop reste une collection visuelle tant qu’aucun produit n’est passé `on_sale` avec un prix et du stock. Les JPEG et mockups restent dans l’app. Supabase ne stocke que l’état commercial.

## Activer

1. Créer un projet Supabase. Auth : e-mail / magic link uniquement. Dans Authentication → URL configuration, ajouter `http://127.0.0.1:5174/compte` et l’URL HTTPS de production `/compte`.
2. Appliquer `supabase/migrations/20260903120000_init_commerce.sql`.
3. Déployer les fonctions `create-checkout-session`, `stripe-webhook`, `get-order`. `verify_jwt` reste faux : l’auth utilisateur est optionnelle, le webhook utilise la signature Stripe.
4. Secrets des fonctions (jamais dans git) :

```text
SITE_URL=https://domaine-officiel
SHIPPING_CENTS=800
STRIPE_SECRET_KEY=sk_test_ou_sk_live
STRIPE_WEBHOOK_SECRET=whsec_...
```

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

## Mettre un tee-shirt en vente

Dans la table `products` : renseigner `price_cents` (ex. `4500` = 45 €), puis `on_sale = true`.  
Dans `product_variants` : stock par taille (`XS` … `XXL`).  
Le bouton « Ajouter » n’apparaît que si ces deux conditions sont vraies.

## Code promo

Table `promo_codes` :

- `code` en majuscules, sans espace (`LUNA26`)
- soit `percent_off` (ex. `10`) soit `amount_off_cents` (ex. `500`), pas les deux
- `active = true`
- optionnel : dates, `min_subtotal_cents`, `max_redemptions`, `one_per_customer`

Le client n’a aucun accès en lecture à cette table. Le code est vérifié au moment de créer la session Stripe.

## Paiement

Stripe Checkout héberge la carte. Le site ne voit jamais le numéro.  
Au clic, une fonction réserve le stock 30 minutes, crée la session, puis le webhook confirme ou libère.  
Les prix affichés dans le panier sont indicatifs ; le montant Stripe est recalculé en base.

## Ce que le dashboard suffit à gérer

Prix, activation, stocks, codes promo. Pas d’admin dans le site pour cette passe : moins de surface d’attaque. Le rôle `admin` existe sur `profiles` pour plus tard, sans politique d’écriture client.
