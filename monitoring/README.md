# Monitoring Doya

Les sondes tournent toutes les 15 minutes et publient leur résultat dans Uptime Kuma.

## Couverture

- site public, médias principaux et porte de connexion Google du back-office ;
- ajout d'un article disponible, panier, e-mail, pays, CGV et total ;
- succès de redirection Stripe simulé et message de panne Stripe ;
- panne Brevo pendant le paiement, succès et erreur du formulaire newsletter ;
- liens d'écoute, pistes publiées et réseaux sociaux officiels ;
- lectures `GET` du catalogue public et requêtes `OPTIONS` des fonctions Edge critiques.

## Barrière de sécurité

Playwright bloque toutes les requêtes réseau `POST`, `PUT`, `PATCH` et `DELETE`. Les appels
Stripe, Brevo et analytics attendus sont répondus en mémoire par le test. Toute autre
tentative d'écriture fait échouer la sonde. Le contrôle API utilise uniquement `GET` et
`OPTIONS`.

Le monitoring ne crée donc ni commande, ni réservation de stock, ni session Stripe, ni
contact Brevo, ni événement analytics. Il ne modifie ni la base Supabase ni le stockage.

Les sondes ne saisissent aucune carte et ne cliquent jamais sur la connexion Google.
Elles vérifient l'affichage du Checkout et ses fallbacks, mais pas une transaction réelle
ni l'accès authentifié au back-office.
