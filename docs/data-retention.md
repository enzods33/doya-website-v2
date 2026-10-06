# DOYA — conservation des données
État préparé le 6 octobre 2026. Ce document distingue les règles proposées et leur activation réelle.

## Règles
- Confirmation newsletter : fenêtre existante de 30 jours ; adresse effacée après le welcome ou à expiration.
- Compteurs anti-abus : nettoyage existant après 48 heures.
- Marketing Brevo : retrait immédiat du consentement ; revue des contacts au bout de 3 ans depuis inscription ou dernier contact actif du prospect. Ne pas utiliser une simple ouverture, une livraison de mail ou `modifiedAt` comme preuve d'activité.
- Preuves Supabase : pendant l'abonnement ; conservation proposée de 5 ans après retrait pour preuve et défense des droits, puis suppression hors litige. Ce délai est un choix de gestion, pas une durée universelle imposée par la CNIL.
- Commandes définitivement impayées : 90 jours, après contrôle Stripe et examen des demandes en cours.
- Traces d'e-mails envoyés : coordonnées du destinataire et erreur technique effacées après un an. Conserver le statut `sent`, les identifiants et la clé de livraison pour ne pas déclencher un nouvel envoi.
- Documents contractuels nécessaires : conservation restreinte proposée de 5 ans après la fin de la relation, hors délais spécifiques. Factures et justificatifs : 10 ans après clôture de l'exercice. Contrats électroniques >= 120 EUR : entre conclusion et livraison puis 10 ans à compter de celle-ci.
- Litiges : suspendre toute purge des éléments nécessaires jusqu'à résolution et expiration des délais applicables.

90 jours et un an sont des choix opérationnels. Ne pas étendre le délai comptable de 10 ans à toutes les données clients.

## Fonctionnement préparé
`commerce-maintenance` appelle `processRetention` après sa vérification d'authentification existante.
Sans configuration, les nouvelles règles fonctionnent en **audit** : pas de nouvelle suppression.
Le nettoyage existant des opt-ins non confirmés et compteurs reste actif.

`DOYA_RETENTION_MODE=apply` active les nouvelles mutations. Ne pas activer avant validation explicite du périmètre et de la liste de dossiers en cours.
- `DOYA_RETENTION_HOLD_ORDER_IDS` : UUID de commandes à conserver, séparés par virgules.
- `DOYA_RETENTION_HOLD_OPTIN_IDS` : UUID de preuves à conserver, séparés par virgules.
- Une valeur mal formée bloque le traitement. Utiliser les identifiants, jamais des e-mails.
- Les dossiers payés, remboursés ou comportant un PaymentIntent ne sont jamais supprimés.
- Avant suppression d'une commande : aucune réservation autre que released, aucun redemption promotionnel, aucune ligne d'outbox ; si session Stripe, elle doit être expired ET unpaid. Erreur Stripe : aucune suppression.
- Chaque écriture réapplique les gardes critiques (statut/paiement ou version de la preuve), pour limiter les courses avec une confirmation.
- Les commandes encore liées à un redemption ou un envoi nécessitent une revue manuelle.
- Chaque catégorie examine au maximum 200 lignes par passage. Des lignes bloquées parmi les plus anciennes peuvent ralentir les suivantes : examiner `blockedOrders`.
- La réponse contient uniquement des nombres, pas des adresses. Toute erreur de ce nouveau traitement produit `ok:false` et HTTP 500.
- Pour revenir au mode audit, retirer la valeur apply. Cela arrête les nouvelles purges ; cela ne restaure pas les éléments déjà supprimés.

Aucune nouvelle table, permission publique ni migration n'est nécessaire.

## Activation et vérification
1. Fusionner la PR après validation, puis déployer commerce-maintenance avec sa dépendance dataRetention.js et les dépendances existantes. Garder le mécanisme d'authentification existant et le même réglage verify_jwt.
2. Laisser le mode audit et observer une exécution authentifiée du cron existant. Vérifier `retention.mode=audit`, les compteurs et `failed=0`.
3. Vérifier les litiges/demandes avec ALMENA PROD et renseigner les UUID concernés.
4. Obtenir la validation du périmètre avant de configurer apply.
5. Vérifier après passage les nombres appliqués et l'absence d'erreurs ; vérifier à nouveau au passage suivant (idempotence).
Ne pas publier d'affirmation de conformité globale à ce stade.

## Brevo : action distincte à finaliser
Le mécanisme préparé n'efface aucun contact Brevo. Le compte et ses automatisations ne sont pas accessibles via le connecteur présent.
- Examiner les contacts de la liste DOYA et les preuves de dernier contact actif, y compris les demandes reçues en dehors des e-mails.
- Ne pas conclure à 3 ans d'inactivité depuis des statistiques disponibles sur 90 jours seulement.
- Ne pas supprimer un contact global qui sert aussi à des messages transactionnels ou à une autre finalité. Retirer de la prospection et appliquer une suppression ciblée après vérification.
- Maintenir les oppositions et la preuve minimale du retrait ; une suppression globale du contact ne doit pas réautoriser les campagnes.
- Lorsque l'abonnement cesse par expiration de la durée, enregistrer la cessation pour faire courir le délai des preuves. Ne pas purger une preuve encore marquée active sur une simple supposition d'inactivité.
Une revue manuelle documentée est possible ; aucune automatisation Brevo n'est déclarée vérifiée.

## Archives et prestataires : action distincte à finaliser
La fonction ne purge ni n'archive les commandes payées. La base conserve actuellement les commandes pour le service après-vente.
Définir l'archive à accès restreint avec les dates de fin de relation, clôture comptable et livraison ; garantir les documents et versions de CGV nécessaires et leur disponibilité. Ne pas simplement supprimer les commandes à 10 ans depuis created_at.
Définir les durées de journaux serveur, sauvegardes et messagerie auprès des prestataires. Une restauration doit réappliquer les retraits et effacements. Les propres obligations de Stripe et des autres prestataires ne disparaissent pas lors d'une purge Supabase.

## Sources consultées le 6 octobre 2026
- CNIL, questions/réponses sur la gestion commerciale : https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des
- CNIL, référentiel de gestion commerciale : https://www.cnil.fr/sites/default/files/atoms/files/referentiel_traitements-donnees-caractere-personnel_gestion-activites-commerciales.pdf
- Service Public Entreprendre, conservation des documents : https://entreprendre.service-public.gouv.fr/vosdroits/F10029
- Légifrance, Code de la consommation D213-1 et D213-2 : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032807206/
- CNIL, consentement : https://www.cnil.fr/fr/les-bases-legales/consentement
- Brevo, statistiques contact (fenêtre maximale de 90 jours par requête) : https://developers.brevo.com/reference/get-contact-stats

## Vérifications
Tests unitaires des exclusions, du mode audit, des gardes d'écriture, de l'effacement des traces, des erreurs et de la réinscription ; tests i18n des neuf langues. Les tests locaux ne remplacent pas une observation du cron après déploiement.

