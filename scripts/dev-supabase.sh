#!/usr/bin/env bash
# Démarre la boutique en local : Supabase (base + Edge Functions) pour essayer
# le Shop et le tunnel Stripe en mode test.
#
# Prérequis : Docker et la CLI Supabase installés.
#
# En environnement Docker imbriqué (ex. certaines VM/CI), deux réglages sont
# nécessaires pour que le stack démarre et communique :
#   - storage driver Docker : fuse-overlayfs (overlay2 imbriqué échoue) ;
#   - net.bridge.bridge-nf-call-iptables=0 (sinon le trafic inter-conteneurs
#     est filtré et l'init du schéma échoue au bout de ~15 s).
# Note : l'accès Internet depuis les conteneurs (esm.sh, api.stripe.com) doit
# être possible ; certains environnements imbriqués le bloquent.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) Réglage réseau pour Docker imbriqué (ignore si non permis).
sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 2>/dev/null || true

# 2) Stack Supabase (services utiles au Shop ; le reste est exclu).
#    Les migrations activent les produits merch (T-shirts, CD) avec prix/stock.
supabase start \
  -x studio -x logflare -x vector -x imgproxy -x storage-api -x edge-runtime

# 3) Edge Functions avec secrets locaux (voir supabase/functions/.env.example).
#    Renseigner STRIPE_SECRET_KEY (sk_test_...) dans supabase/functions/.env.local
#    pour pouvoir aller jusqu'au paiement Stripe.
exec supabase functions serve \
  --env-file supabase/functions/.env.local \
  --no-verify-jwt
