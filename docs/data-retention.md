# Conservation des données DOYA
Mise en service préparée le 6 octobre 2026.

## Règles et traitement
- Confirmation newsletter : nettoyage existant après 30 jours au maximum.
- Compteurs anti-abus : nettoyage existant après 48 heures.
- Commandes définitivement impayées : suppression après 90 jours, après contrôle Stripe et exclusion des réservations de stock, redemptions promotionnels, traces d'envoi et dossiers conservés pour litige.
- Traces d'e-mails envoyés : coordonnées du destinataire et erreur technique effacées après un an. Le statut sent et les clés de livraison restent présents pour éviter les doubles envois.
- Preuves de newsletter : pendant l'abonnement, puis 5 ans après retrait, hors litige et nouvelle inscription. Ce délai est un choix de gestion, pas une règle universelle imposée par la CNIL.
- Marketing Brevo : retrait du consentement ou revue après 3 ans depuis l'inscription ou le dernier contact actif. Ne pas assimiler une ouverture, une livraison de mail ou modifiedAt à un contact actif.
- Pièces comptables : 10 ans après clôture de l'exercice. Contrats électroniques >= 120 EUR : entre conclusion et livraison, puis 10 ans après livraison. Les données nécessaires à la preuve du contrat peuvent être conservées 5 ans après la fin de la relation, hors délai spécifique.
90 jours et un an sont des choix opérationnels. Les obligations comptables ne justifient pas de conserver toutes les données clients pendant 10 ans.

## Activation
commerce-maintenance vérifie son jeton interne avant de lire retentionApply.
Le cron existant transmet retentionApply=true. Une requête authentifiée peut transmettre false pour forcer un audit. Sans ce paramètre, DOYA_RETENTION_MODE=apply active les mutations ; toute autre valeur garde le mode audit.
- DOYA_RETENTION_HOLD_ORDER_IDS : UUID de commandes à conserver, séparés par virgules.
- DOYA_RETENTION_HOLD_OPTIN_IDS : UUID de preuves à conserver, séparés par virgules.
- Une liste mal formée bloque les nouvelles purges.
- Commandes payées, remboursées ou portant un PaymentIntent : jamais supprimées.
- Si session Stripe : expiration et payment_status=unpaid obligatoires. Erreur Stripe : aucune suppression.
- Chaque écriture réapplique les gardes critiques.
- Limite de 200 lignes par catégorie. Examiner blockedOrders : des dossiers anciens bloqués peuvent ralentir les suivants.
- Les réponses contiennent des nombres, jamais les adresses des clients. Une erreur du nouveau traitement produit HTTP 500.
Pour suspendre les nouvelles purges, mettre retentionApply=false dans les deux crons authentifiés et retirer la valeur apply de l'environnement si elle est présente. Cela ne restaure pas une donnée déjà supprimée.

## Brevo
Une revue quotidienne lit la liste DOYA avec la clé déjà présente sur le serveur. Elle compte les contacts récents, à revoir ou de date inconnue ; elle ne supprime aucun contact.
Une création antérieure à 3 ans ne prouve pas l'inactivité. Vérifier les demandes hors e-mails et les clics sur la période complète ; les statistiques par requête sont limitées à une fenêtre de 90 jours.
Ne pas supprimer un contact global utilisé pour les messages transactionnels ou d'autres finalités. Préserver les oppositions et la preuve du retrait. En cas d'expiration d'un abonnement, enregistrer la cessation pour faire courir le délai des preuves.
Les réponses unknown ou needsReview nécessitent une revue documentée par ALMENA PROD. Le contrôle quotidien ne remplace pas cette revue.

## Archives privées
Les commandes expédiées ou remboursées sont copiées dans doya_private.order_archives avec leurs lignes et une empreinte du contenu. Les copies sont conservées par version ; la commande opérationnelle reste présente.
L'accès aux archives est refusé à public, anon et authenticated. archive_completed_orders est réservé au service_role.
Ces snapshots ne remplacent ni les factures ni le texte exact des CGV accepté. La référence terms_version est conservée ; le texte historique doit être vérifié avant de le déclarer établi.
Les dates de clôture comptable, livraison confirmée et fin de relation restent nulles tant qu'elles ne sont pas vérifiées. Une date d'expédition ne vaut pas livraison confirmée. Aucun document payé n'est purgé sur une date supposée.
Le système n'efface pas automatiquement les commandes payées à 10 ans depuis created_at. La fin de conservation se calcule avec les dates juridiques vérifiées et les dossiers en cours.
Les archives opérationnelles doivent être examinées après la fin de la relation et après les délais applicables pour supprimer les données devenues inutiles.

## Vérification
Après déploiement, observer les résultats d'une requête authentifiée en audit, puis en application, et d'un deuxième passage pour l'idempotence.
Vérifier la réponse HTTP réelle, pas uniquement le succès d'envoi du cron.
Vérifier le contrôle Brevo, les nouvelles archives et les permissions de la fonction. Contrôler à nouveau les commandes, les réservations de stock et les nouvelles erreurs.
Définir séparément la conservation des journaux serveur, sauvegardes et messagerie. Une restauration doit réappliquer les retraits et effacements. Les propres obligations de Stripe et des prestataires ne disparaissent pas lors d'une purge Supabase.

## Sources consultées le 6 octobre 2026
- CNIL, gestion commerciale : https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des
- CNIL, référentiel : https://www.cnil.fr/sites/default/files/atoms/files/referentiel_traitements-donnees-caractere-personnel_gestion-activites-commerciales.pdf
- Service Public Entreprendre, conservation des documents : https://entreprendre.service-public.gouv.fr/vosdroits/F10029
- Légifrance, D213-1 et D213-2 : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032807206/
- Brevo, statistiques contact : https://developers.brevo.com/reference/get-contact-stats
