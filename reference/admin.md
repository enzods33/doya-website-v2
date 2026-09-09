# Back-office VIP DOYA

## Accès

1. Triple-clic sur les **étoiles blanches** du hero → `/admin`
2. Connexion **Google** (comptes whitelist seulement)

Whitelist actuelle (`admin_allowlist`) :
- stephanedasil@gmail.com
- dasildoya@gmail.com
- dasilveira.enzo@gmail.com
- almenaprod@gmail.com
- doyamusicofficial@gmail.com
- marina.doya@gmail.com
- melissa.doya@gmail.com

## Setup Supabase Auth

**Déjà fait (dev)** : provider Google activé sur le projet `ipphjddgeotsohplzkbo` (client **DOYA Web**), Site URL + redirects `127.0.0.1:5174` / `localhost:5174` (wildcard `/**` + `/admin`).

**Google Cloud Console** (client OAuth web) — à vérifier côté Google :
- Authorized JavaScript origins (dev) : `http://127.0.0.1:5174`, `http://localhost:5174`
- Authorized redirect URI : `https://ipphjddgeotsohplzkbo.supabase.co/auth/v1/callback` (fixe)

**À la mise en prod / preview HTTPS** (aussi `reference/commerce.md`) :
1. Supabase Auth : Site URL + Redirect URLs → URL HTTPS (`/admin`, wildcard `/**`)
2. Google Cloud : ajouter l’origin HTTPS (ex. Netlify preview ou domaine final)
3. Hébergeur : fallback SPA pour `/admin`
4. Preview actuelle : `https://harmonious-hamster-bac94a.netlify.app` (Auth + `SITE_URL` déjà branchés ; origin Google Cloud à ajouter)

## Secrets Edge Functions

Déjà utilisés :
- `BREVO_API_KEY`
- `BREVO_LIST_ID` (= 3)

À renseigner :
```bash
npx supabase secrets set --project-ref ipphjddgeotsohplzkbo \
  BREVO_SENDER_EMAIL=almenaprod@gmail.com \
  BREVO_SENDER_NAME=DOYA \
  R2_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com \
  R2_BUCKET=doya-assets \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_PUBLIC_BASE=https://pub-5b2b2b3b50ba46c485eeff926fa26420.r2.dev
```

L’expéditeur Brevo doit être **vérifié** dans Brevo (Senders).
**Avant live** : domaine pro (`hello@` / `boutique@` sur le domaine du site) + DKIM/DMARC — voir `reference/commerce.md` §8.
**Staging actuel** : `almenaprod@gmail.com` (`BREVO_SENDER_EMAIL`).

## Modules

| Onglet | Action |
|---|---|
| Dates | CRUD concerts (table `concerts`) |
| Photos | Import auto de la galerie site si vide + upload R2 `bio/web/` + ordre + publish |
| Newsletter | Message texte → HTML auto + logo album ; compteur d’inscrits Brevo ; mail de bienvenue auto aux nouveaux |
| Ventes | Commandes payées, CA, articles vendus (tailles) |
| Audience | Visites /jour + sections les plus vues (Accueil, Bio, Dates…) |

## Edge Functions

- `admin-auth-check`
- `admin-concerts`
- `admin-bio-photos`
- `admin-brevo-campaign`
- `admin-stats`
- `subscribe-newsletter` (inscription + e-mail de bienvenue)

Toutes les fonctions admin vérifient JWT + allowlist avant toute écriture.
