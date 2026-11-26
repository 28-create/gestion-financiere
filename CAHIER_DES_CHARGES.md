# MASTER PROMPT — APPLICATION PROFESSIONNELLE DE GESTION FINANCIÈRE PERSONNELLE

## Périmètre actualisé — 26 novembre 2026

Décision explicite de l'utilisateur : réaliser intégralement la phase 1 de manière autonome, publier le code sur GitHub et produire l'exécutable Windows. Les justificatifs et la sécurité applicative (mot de passe, verrouillage, chiffrement et gestion des clés) sont reportés en phase 2. Les sauvegardes, la restauration, l'intégrité des calculs, la confidentialité des données et la validation des entrées restent exigées en phase 1. Les autres exclusions et reports initiaux restent applicables.

## 1. Mission générale

Tu agis comme un architecte logiciel senior, un développeur full-stack expérimenté, un expert en gestion de données financières, en sécurité informatique et en design UX/UI d'applications professionnelles.

Ta mission consiste à concevoir et développer une véritable application Windows de gestion financière personnelle, destinée à remplacer définitivement mon fichier Excel de gestion des revenus et dépenses 2026–2040.

L'application doit être :

- Extrêmement professionnelle.
- Élégante et moderne.
- Rapide et intuitive.
- Entièrement utilisable hors ligne.
- Fiable dans tous ses calculs.
- Évolutive sur plusieurs dizaines d'années.
- Facile à maintenir et à améliorer.
- Respectueuse de la confidentialité des données financières.

Il ne s'agit pas de reproduire simplement les tableaux Excel, mais de créer un véritable logiciel de gestion financière personnelle.

**Principe fondamental : une interface simple au quotidien, avec des fonctionnalités avancées accessibles uniquement lorsque l'utilisateur en a besoin.**

## 2. Exigences non négociables

1. Conserver toutes les données et fonctionnalités existantes du fichier Excel original.
2. Ne supprimer aucune fonctionnalité validée sans autorisation explicite.
3. Ne pas imposer de connexion Internet.
4. Ne pas imposer d'abonnement payant.
5. Ne pas imposer la gestion des comptes bancaires.
6. Ne pas développer de moteur de prévision financière automatique.
7. Ne pas développer les modules reportés en phase 2.
8. Ne pas surcharger l'interface.
9. Ne jamais utiliser de données fictives dans la base financière réelle.
10. Ne jamais sacrifier la fiabilité des calculs au profit du design.
11. Ne jamais modifier le fichier Excel original.
12. Ne pas transmettre mes données financières à un service externe sans autorisation.

## 3. Architecture technique

Architecture recommandée :

| Composant | Technologie |
|---|---|
| Application de bureau | Tauri |
| Interface | React |
| Langage frontend | TypeScript |
| Backend natif | Rust |
| Base de données | SQLite |
| Graphiques | Apache ECharts |
| Tableaux | TanStack Table |
| Internationalisation | i18next |
| Installation Windows | NSIS ou MSI |

Utiliser des versions stables et compatibles entre elles.

Cette architecture constitue une recommandation technique. Vérifier sa pertinence avant développement et signaler toute alternative importante nécessitant une validation.

### Principes d'architecture

- Séparation stricte de l'interface, de la logique métier et de l'accès aux données.
- Architecture modulaire.
- Composants réutilisables.
- Base de données relationnelle structurée.
- Migrations de base de données versionnées.
- Validation des données côté interface et backend.
- Tests automatisés.
- Gestion centralisée des erreurs.
- Journalisation technique sans divulgation de données sensibles.
- Aucune dépendance obligatoire à un serveur distant.
- Aucun CDN nécessaire au fonctionnement normal.
- Toutes les ressources essentielles disponibles localement.

Préparer l'architecture pour accueillir ultérieurement les modules bancaires et patrimoniaux, sans les développer actuellement.

## 4. Structure du projet

Organiser le projet selon une structure maintenable, par exemple :

- `src/components` : composants graphiques réutilisables.
- `src/pages` : pages principales.
- `src/features` : modules fonctionnels.
- `src/services` : services applicatifs.
- `src/hooks` : hooks React.
- `src/stores` : état de l'application.
- `src/types` : types TypeScript.
- `src/utils` : fonctions utilitaires.
- `src/locales` : traductions.
- `src/styles` : système graphique.
- `src-tauri` : backend natif.
- `migrations` : migrations de la base de données.
- `tests` : tests automatisés.
- `docs` : documentation technique et utilisateur.

Adapter cette structure au framework retenu.

## 5. Navigation principale

Prévoir une barre latérale professionnelle, rétractable, avec les espaces suivants :

1. Accueil.
2. Dépenses.
3. Revenus.
4. Journal général.
5. Analyses.
6. Budgets.
7. Récurrences.
8. Catégories.
9. Réglages.

Les modules facultatifs désactivés doivent disparaître de la navigation.

Prévoir une barre supérieure comprenant, selon la page :

- Sélecteur de période.
- Recherche globale.
- Actions rapides.
- Changement de langue.
- Accès aux réglages utiles.
- Indication discrète de l'état des sauvegardes.

Ne pas multiplier les boutons ou les menus inutilement.

## 6. Design UX/UI

Le design doit être digne d'un logiciel financier commercial haut de gamme.

Éviter absolument :

- Une apparence enfantine.
- Des tableaux ternes.
- Une reproduction visuelle d'Excel.
- Des boutons disproportionnés.
- Des espaces inutilement vides.
- Des textes coupés.
- Des graphiques superposés.
- Des fenêtres mal dimensionnées.
- Une accumulation de bordures et d'encadrés.
- Des couleurs trop agressives.

### Palette graphique recommandée

| Utilisation | Couleur |
|---|---|
| Navigation principale | Bleu marine #142C46 |
| Revenus | Émeraude #087F78 |
| Dépenses | Corail #BF5264 |
| Indicateurs | Or champagne #C9A153 |
| Analyses | Violet #7960B2 |
| Arrière-plan clair | Gris perle #F2F5F9 |

Créer une identité visuelle homogène et personnalisable. Cette palette est une direction artistique proposée, pas une contrainte immuable.

### Système graphique

Définir un véritable design system comprenant :

- Palette principale et secondaire.
- Typographie.
- Échelle d'espacements.
- Composants de boutons.
- Champs de saisie.
- Tableaux.
- Fenêtres modales.
- Menus contextuels.
- Infobulles.
- États de chargement.
- Messages d'erreur.
- États vides.
- Graphiques.
- Icônes cohérentes.
- États de sélection.
- Styles de survol.
- Styles de focus clavier.

Prévoir un thème clair et un thème sombre complets.

Toutes les pages doivent rester lisibles sur différentes tailles d'écran et avec les paramètres de mise à l'échelle de Windows.

## 7. Internationalisation

L'application doit fonctionner intégralement en :

- Français.
- Hébreu.
- Anglais.

Exigences :

- Changement instantané de langue.
- Interface RTL complète en hébreu.
- Inversion cohérente de la navigation.
- Traduction des menus, formulaires, erreurs et réglages.
- Gestion des dates selon la langue.
- Formatage localisé des montants.
- Compatibilité parfaite avec les textes mixtes français, hébreu et anglais.
- Conservation du texte original des transactions.
- Aucune traduction automatique non autorisée des données personnelles.

## 8. Tableau de bord

Créer un tableau de bord financier moderne, personnalisable et immédiatement compréhensible.

### Indicateurs disponibles

- Total des revenus.
- Total des dépenses.
- Solde net de la période.
- Nombre de transactions.
- Montants consacrés à l'épargne.
- Taux d'épargne selon une définition explicite.
- Dépenses moyennes.
- Revenus moyens.
- Dépenses principales.
- Évolution par rapport à une période précédente.
- Transactions récentes.
- Échéances connues, si le module correspondant est activé.
- État des budgets, si le module est activé.

### Graphiques disponibles

- Revenus et dépenses par mois.
- Évolution du solde net.
- Solde net cumulé.
- Répartition des dépenses par catégorie.
- Répartition des revenus par catégorie.
- Comparaison entre années.
- Évolution historique.

### Personnalisation

L'utilisateur doit pouvoir :

- Afficher ou masquer chaque indicateur.
- Réorganiser les blocs.
- Choisir les graphiques affichés.
- Modifier la période.
- Enregistrer sa disposition.
- Restaurer la disposition par défaut.

Ne jamais présenter le solde net des flux financiers comme le solde réel d'un compte bancaire.

## 9. Gestion des périodes

Ne pas créer une page ou un tableau de base de données différent pour chaque année.

Utiliser une interface unique permettant de sélectionner :

- Aujourd'hui.
- Cette semaine.
- Ce mois.
- Ce trimestre.
- Cette année.
- Année précédente.
- Année spécifique.
- Période personnalisée.
- Historique complet.

L'application doit pouvoir gérer les années antérieures à 2026 et postérieures à 2040 sans modification structurelle.

Permettre les comparaisons entre périodes équivalentes ou librement sélectionnées.

Afficher clairement les dates de début et de fin de la période analysée.

## 10. Revenus et dépenses

Créer deux pages distinctes :

- Dépenses.
- Revenus.

Ajouter un journal général regroupant toutes les opérations.

Utiliser un moteur de transactions commun afin d'éviter les incohérences.

### Champs obligatoires

Seulement :

- Titre.
- Montant.
- Date.

La date du jour est préremplie.

### Champs facultatifs

- Catégorie.
- Sous-catégorie.
- Moyen de paiement.
- Devise.
- Taux de change.
- Description complémentaire.
- Notes.
- Étiquettes.
- Projet.
- Type de dépense.
- Niveau de nécessité.
- Statut.
- Justificatifs.

Les champs supplémentaires ne doivent pas encombrer la saisie rapide.

## 11. Saisie rapide

Créer deux niveaux de saisie :

### Saisie express

Petite fenêtre ou panneau compact comprenant les trois champs obligatoires et les champs facultatifs les plus utiles.

### Saisie détaillée

Accessible à la demande pour les opérations complexes.

Fonctionnalités obligatoires :

- Raccourcis clavier.
- Navigation avec la touche Tab.
- Date du jour préremplie.
- Raccourcis Aujourd'hui et Hier.
- Saisie directe des dates.
- Autocomplétion du titre.
- Suggestions de catégories.
- Mémorisation des habitudes.
- Bouton Enregistrer.
- Bouton Enregistrer et continuer.
- Calculs simples dans le champ montant.
- Calculatrice facultative.
- Duplication de transactions.
- Modèles réutilisables.
- Saisie groupée semblable à Excel.

Le moteur de calcul du champ montant doit analyser uniquement les expressions arithmétiques autorisées, sans exécution de code arbitraire.

## 12. Tableaux professionnels

Les tableaux constituent un élément central du logiciel.

Prévoir :

- En-têtes fixes.
- Lignes alternées.
- Colonnes redimensionnables.
- Colonnes déplaçables.
- Colonnes masquables.
- Tri simple et multiple.
- Recherche.
- Filtres combinés.
- Regroupements.
- Sélection multiple.
- Modification directe.
- Actions groupées.
- Menus contextuels.
- Copie et collage contrôlés.
- Pagination ou virtualisation adaptée au volume.
- Export des résultats filtrés.

Afficher :

- Total général.
- Total de la période sélectionnée.
- Total des transactions filtrées.
- Total des transactions sélectionnées.
- Nombre d'opérations.

Les préférences de colonnes doivent être enregistrées automatiquement.

## 13. Catégories

Créer deux ensembles indépendants :

- Catégories de revenus.
- Catégories de dépenses.

Permettre :

- Sous-catégories facultatives.
- Nom personnalisable.
- Couleur.
- Icône.
- Traductions facultatives FR/HE/EN.
- Création rapide pendant la saisie.
- Archivage.
- Réactivation.
- Fusion.
- Renommage global ou création d'une nouvelle catégorie.
- Modification groupée.
- Statistiques d'utilisation.

Importer intégralement les catégories existantes du fichier Excel.

Les transactions sans catégorie doivent pouvoir être enregistrées immédiatement et retrouvées dans un espace Non catégorisé.

Afficher une liste chronologique par défaut, avec options de classement alphabétique, manuel et par fréquence d'utilisation.

La définition exacte de l'ordre chronologique reste à confirmer. Ne pas imposer une interprétation irréversible.

## 14. Classification intelligente

Créer un système local de suggestions intelligent mais prudent.

Le système peut apprendre à partir :

- Des titres précédemment utilisés.
- Des catégories habituellement associées.
- Des moyens de paiement habituels.
- Des mots-clés.
- Des choix corrigés par l'utilisateur.

Prévoir des règles personnalisables avec priorités et exceptions.

Ne jamais :

- Imposer une catégorie incertaine.
- Modifier automatiquement l'historique.
- Déclencher une règle sur une ressemblance insuffisante.
- Envoyer les données financières à un service d'intelligence artificielle externe sans autorisation.

Les suggestions doivent être faciles à ignorer et à corriger.

## 15. Étiquettes et projets

Permettre l'ajout de plusieurs étiquettes facultatives à une transaction.

Exemples :

- Pessa'h.
- Souccot.
- Vacances.
- Mariage.
- Travaux.
- Frais professionnels.

Créer également un système facultatif de projets permettant de regrouper les revenus et dépenses liés à un événement.

Une transaction associée à plusieurs étiquettes ne doit jamais être comptabilisée plusieurs fois dans les totaux généraux.

## 16. Gestion multidevise

Devise principale proposée : ILS.

Permettre l'utilisation de :

- ILS.
- EUR.
- USD.
- Autres devises configurables.

Conserver pour chaque transaction :

- Montant original.
- Devise originale.
- Taux de change appliqué.
- Montant converti.
- Devise de référence.
- Date du taux de change.
- Source éventuelle du taux.

Permettre la saisie manuelle du taux de change hors ligne.

Ne jamais modifier automatiquement les taux historiques lors d'une actualisation des taux actuels.

Si un taux nécessaire manque, signaler clairement la transaction non convertie et ne pas inventer sa valeur.

## 17. Moyens de paiement

Créer une liste indépendante et personnalisable des moyens de paiement.

Exemples :

- Espèces.
- Carte bancaire.
- Virement.
- Chèque.
- Bit.
- PayBox.
- Prélèvement automatique.
- Autre.

Permettre leur création, modification, classement et archivage.

Dans la phase 1, un moyen de paiement ne constitue pas un compte bancaire et ne possède pas de solde indépendant.

## 18. Transactions complexes

### Ventilation

Permettre de répartir une transaction entre plusieurs catégories.

Vérifier que la somme des ventilations correspond exactement au montant de la transaction.

### Remboursements

Permettre de relier un remboursement total ou partiel à la dépense originale.

Conserver :

- Montant initial.
- Montant remboursé.
- Coût net.
- Historique des remboursements.

Éviter de présenter un remboursement comme un revenu ordinaire.

### Paiements fractionnés — תשלומים

Permettre d'enregistrer un achat en plusieurs mensualités.

Conserver :

- Montant total.
- Nombre de mensualités.
- Dates des échéances.
- Montant payé.
- Montant restant.
- Statut des mensualités.

Ne jamais comptabiliser simultanément le montant intégral de l'achat et les mensualités dans un même total.

Les règles de comptabilisation doivent être explicites, cohérentes et couvertes par des tests.

## 19. Justificatifs

Permettre de joindre facultativement :

- Images.
- Factures.
- Reçus.
- PDF.
- Autres documents autorisés.

Fonctionnalités :

- Glisser-déposer.
- Ajout depuis l'explorateur Windows.
- Aperçu lorsque possible.
- Consultation depuis la transaction.
- Suppression contrôlée.

Les fichiers doivent être stockés et protégés localement.

Les sauvegardes doivent inclure les pièces jointes et leurs références.

## 20. Transactions récurrentes

Créer un module facultatif, activable ou masquable dans les réglages.

### Fréquences

- Quotidienne.
- Hebdomadaire.
- Mensuelle.
- Trimestrielle.
- Annuelle.
- Intervalles personnalisés.

Prendre en charge :

- Jour fixe du mois.
- Dernier jour du mois.
- Premier ou dernier jour ouvré.
- Position d'un jour dans le mois.
- Calendrier civil.
- Calendrier hébraïque.
- Années embolismiques.
- Gestion configurable d'Adar.

### Modes de fonctionnement

Pour chaque récurrence :

- Enregistrement automatique.
- Confirmation manuelle.
- Rappel individuel explicitement activé.

Aucune notification générale automatique.

Les montants variables doivent être renseignés manuellement à chaque échéance.

### Gestion des séries

Permettre de définir :

- Date de début.
- Date de fin.
- Nombre d'occurrences.
- Répétition illimitée.
- Montants futurs programmés.
- Exceptions.
- Report d'une occurrence.
- Annulation d'une occurrence.

Lors d'une modification, proposer :

- Cette occurrence uniquement.
- Cette occurrence et les suivantes.
- Ensemble de la série.

Ne jamais modifier silencieusement les transactions réalisées.

Lors de la suppression d'une récurrence, arrêter les futures occurrences et préserver les transactions réalisées.

Ne pas créer de module séparé pour les abonnements.

### Présentation

- Liste classique par défaut.
- Vue avancée facultative.
- Calendrier financier.
- Liste des prochaines échéances.

### Automatisation

- Détection locale des opérations potentiellement récurrentes.
- Proposition de création sans activation automatique.
- Rattrapage des occurrences manquées après fermeture de l'application.
- Détection des doublons.
- Liaison avec les opérations déjà enregistrées.
- Historique des actions automatiques.
- Suspension globale des automatisations.

Les échéances futures ne constituent pas des prévisions financières automatiques.

## 21. Budgets

Créer un module entièrement facultatif.

Permettre de définir :

- Budget global.
- Budget par catégorie.
- Budget par sous-catégorie.
- Budget par projet.
- Période personnalisée.

Afficher :

- Montant budgété.
- Montant réellement dépensé.
- Montant restant.
- Pourcentage consommé.
- Dépassement.
- Seuils visuels.
- Graphiques.
- Historique des modifications budgétaires.

Les budgets globaux et détaillés ne doivent pas être additionnés de manière incorrecte.

La phase 1 ne comprend pas les options avancées de configuration, de duplication intelligente et de report des budgets non consommés, correspondant aux décisions 98, 99 et 100.

Ne pas créer d'objectifs de revenus.

## 22. Centre d'analyse

Créer un véritable centre d'analyse financière professionnel.

### Analyses obligatoires

- Revenus mensuels.
- Dépenses mensuelles.
- Revenus annuels.
- Dépenses annuelles.
- Solde net.
- Solde net cumulé.
- Évolution historique.
- Répartition par catégorie.
- Répartition par sous-catégorie.
- Répartition par moyen de paiement.
- Analyse par projet.
- Analyse par étiquette.
- Dépenses fixes et variables.
- Dépenses essentielles et non essentielles.
- Suivi de l'épargne existant dans Excel.
- Comparaison entre périodes.
- Tendances historiques.
- Moyennes et pourcentages.

### Graphiques

Prévoir notamment :

- Histogrammes.
- Courbes.
- Graphiques en anneau.
- Graphiques comparatifs.
- Aires cumulées.
- Graphiques empilés lorsque pertinents.
- Tableaux statistiques détaillés.

### Interactivité

- Infobulles.
- Zoom lorsque pertinent.
- Filtres.
- Sélection des séries.
- Choix de période.
- Accès aux transactions composant un résultat.
- Export.
- Affichage plein écran si utile.

Tous les graphiques doivent être liés aux données réelles et se mettre à jour automatiquement.

Les analyses historiques ne doivent pas devenir des projections ou prévisions futures.

## 23. Statuts des opérations

Distinguer :

- Réalisée.
- Prévue.
- En attente.

Les opérations prévues et en attente doivent être clairement identifiées et exclues des totaux réalisés.

Conserver les fonctionnalités d'échéances et de calendrier.

Ne pas générer de prévisions financières automatiques, de simulations ou de projections pluriannuelles.

La décision finale 105 du QCM global prévaut sur les anciennes propositions de prévisions.

## 24. Moteur de calcul financier

Cette partie est critique.

Ne pas utiliser les nombres flottants binaires comme source de vérité pour les calculs monétaires.

Utiliser une représentation décimale exacte ou des entiers en unités monétaires minimales avec une précision adaptée à chaque devise.

Définir des règles explicites d'arrondi et de conversion.

### Calculs

- Total des revenus.
- Total des dépenses.
- Solde net = revenus − dépenses selon la définition de flux retenue.
- Moyennes.
- Pourcentages.
- Comparaisons.
- Ventilations.
- Remboursements.
- Conversions multidevises.
- Budgets.
- Épargne.

Distinguer les dépenses de consommation des versements en épargne ou investissements conformément aux données et règles du classeur original.

Ne pas inventer de définition du taux d'épargne avant d'avoir analysé celle utilisée dans Excel.

Toutes les pages, graphiques, exports et indicateurs doivent utiliser le même moteur de calcul.

Tester notamment :

- Les valeurs nulles.
- Les années sans transaction.
- Les montants négatifs.
- Les remboursements.
- Les périodes partielles.
- Les opérations ventilées.
- Les mensualités.
- Les conversions de devises.
- Les arrondis.
- Les divisions par zéro.

## 25. Base de données

Utiliser une base relationnelle locale.

Prévoir notamment les entités suivantes :

| Entité | Utilisation |
|---|---|
| transactions | Revenus et dépenses |
| categories | Catégories et sous-catégories |
| payment_methods | Moyens de paiement |
| currencies | Devises |
| exchange_rates | Taux de change |
| transaction_splits | Ventilations |
| transaction_links | Remboursements et liens |
| tags | Étiquettes |
| transaction_tags | Associations des étiquettes |
| projects | Projets |
| project_transactions | Associations aux projets |
| recurring_rules | Règles de récurrence |
| recurring_occurrences | Occurrences |
| installments | Paiements fractionnés |
| budgets | Budgets |
| budget_revisions | Historique budgétaire |
| attachments | Justificatifs |
| transaction_templates | Modèles de saisie |
| classification_rules | Règles de classification |
| audit_logs | Historique des modifications |
| import_batches | Sessions d'importation |
| user_settings | Préférences |
| dashboard_layouts | Disposition du tableau de bord |
| backup_metadata | Informations de sauvegarde |

Cette liste est indicative. Normaliser le schéma et l'adapter à l'architecture définitive.

### Exigences

- Identifiants uniques et stables.
- Clés étrangères.
- Contraintes d'intégrité.
- Index adaptés aux recherches.
- Transactions de base de données atomiques.
- Dates de création et modification.
- Suppression logique lorsque nécessaire.
- Migrations versionnées.
- Protection contre les incohérences.
- Tests de migration.

Ne pas créer une base différente par année.

Ne pas implémenter les tables et fonctionnalités bancaires ou patrimoniales complexes avant leur phase de développement.

## 26. Migration du fichier Excel

La migration est une priorité absolue.

Analyser le fichier Excel original et, si disponibles, les versions améliorées ultérieures.

### Audit préalable

Inventorier :

- Toutes les feuilles.
- Toutes les colonnes.
- Toutes les transactions.
- Toutes les catégories.
- Les moyens de paiement.
- Les devises.
- Les formules.
- Les indicateurs.
- Les graphiques.
- Les règles de calcul.
- Les éventuelles données masquées.
- Les listes de validation.
- Les différences entre versions.

Déterminer quelle version fait autorité pour les données. Signaler les divergences sans fusionner arbitrairement les fichiers.

### Assistant d'importation

Créer un assistant permettant :

1. Sélection du fichier.
2. Reconnaissance des feuilles et colonnes.
3. Correspondance manuelle si nécessaire.
4. Aperçu des transactions.
5. Détection des dates et devises.
6. Validation des montants.
7. Détection des doublons.
8. Présentation des erreurs.
9. Importation confirmée par l'utilisateur.
10. Rapport détaillé.
11. Annulation d'une session d'importation si nécessaire.

### Contrôles

Comparer avant et après migration :

- Nombre de transactions.
- Totaux des revenus.
- Totaux des dépenses.
- Totaux mensuels.
- Totaux annuels.
- Soldes nets.
- Catégories.
- Montants d'épargne.
- Données hébraïques.

Les totaux précédemment calculés pour 2026 sont des repères de contrôle, et non des valeurs à coder en dur.

En cas de différence, identifier précisément son origine, notamment les arrondis et les éventuelles différences entre versions du fichier.

Ne jamais considérer la migration comme terminée tant que les écarts inexpliqués ne sont pas résolus.

## 27. Importation et exportation générale

Prendre en charge l'importation Excel et CSV.

L'importation de PDF doit être limitée aux documents dont les données peuvent être extraites et validées de manière fiable.

Permettre :

- Export Excel.
- Export CSV.
- Export PDF.
- Export des transactions sélectionnées.
- Export des résultats filtrés.
- Export des rapports.
- Export des graphiques.
- Export complet des données.

Les documents PDF doivent être professionnels, lisibles et correctement adaptés aux trois langues.

Les fichiers Excel exportés doivent respecter les standards Excel et s'ouvrir sans message de réparation.

Prévenir les injections de formules dans les champs textuels exportés.

## 28. Corbeille et historique

Prévoir :

- Suppression logique.
- Corbeille.
- Restauration des opérations.
- Suppression définitive après confirmation.
- Historique des modifications.
- Actions groupées.
- Annulation des dernières actions lorsque techniquement possible.

Une modification financière importante doit être traçable.

L'interface ne doit jamais permettre une suppression massive accidentelle sans confirmation explicite.

## 29. Sécurité et confidentialité

L'application contient des données financières personnelles sensibles.

Prévoir :

- Protection facultative par mot de passe.
- Verrouillage de l'application.
- Chiffrement des données sensibles.
- Protection des sauvegardes.
- Gestion sécurisée des clés.
- Permissions système adaptées.
- Requêtes SQL paramétrées.
- Validation des fichiers importés.
- Protection contre les fichiers malveillants.
- Absence de télémétrie financière non autorisée.

Ne pas confondre un écran verrouillé par mot de passe avec un véritable chiffrement de la base de données.

Choisir une solution de chiffrement éprouvée et compatible avec SQLite et l'environnement Windows.

Documenter la récupération et les conséquences de la perte d'une clé ou d'un mot de passe.

Ne jamais stocker les secrets ou mots de passe en clair.

## 30. Sauvegardes

Créer un système de sauvegarde professionnel.

### Sauvegardes locales

- Sauvegardes automatiques.
- Sauvegardes manuelles.
- Fréquence configurable.
- Emplacement configurable.
- Conservation de plusieurs versions.
- Sauvegarde avant migration importante.
- Sauvegarde avant mise à jour sensible.
- Vérification d'intégrité.

### Restauration

Prévoir :

- Sélection d'une sauvegarde.
- Informations sur sa date et son contenu.
- Contrôle de compatibilité.
- Confirmation.
- Sauvegarde préalable des données actuelles.
- Restauration sécurisée.

Tester réellement les restaurations.

### Cloud facultatif

Prévoir une solution de sauvegarde et de synchronisation cloud facultative.

Le logiciel doit fonctionner parfaitement lorsque cette fonctionnalité est désactivée.

Ne pas imposer de fournisseur cloud.

Ne pas activer de transfert distant sans autorisation.

Avant toute synchronisation multiappareil, définir et valider les règles de gestion des conflits et de chiffrement.

Ne jamais synchroniser naïvement une base SQLite ouverte vers plusieurs appareils.

## 31. Réglages

Organiser les réglages en sections professionnelles :

- Général.
- Apparence.
- Langues.
- Devises.
- Transactions.
- Catégories.
- Moyens de paiement.
- Modules.
- Récurrences.
- Budgets.
- Raccourcis clavier.
- Importation et exportation.
- Confidentialité.
- Sécurité.
- Sauvegardes.
- Mises à jour.
- À propos.

Les réglages avancés ne doivent pas encombrer les réglages courants.

## 32. Fonctionnalités explicitement reportées en phase 2

Ne pas développer actuellement :

- Comptes bancaires avec soldes indépendants.
- Virements entre comptes.
- Rapprochement bancaire.
- Gestion détaillée des cycles de cartes de crédit.
- Plafonds et découverts bancaires.
- Portefeuilles électroniques avec suivi des soldes.
- Gestion du patrimoine.
- Gestion avancée des investissements.
- Valorisation de portefeuilles.
- Suivi des dettes et emprunts.
- Objectifs financiers patrimoniaux.
- Budgets avancés correspondant aux décisions 98, 99 et 100.

Ces modules devront rester facultatifs lorsqu'ils seront développés ultérieurement.

Ne pas créer de pages factices ou de boutons non fonctionnels pour ces modules.

## 33. Fonctionnalités exclues

- Prévisions financières automatiques.
- Simulations financières.
- Projections de patrimoine.
- Objectifs de revenus.
- Notifications générales automatiques.
- Module spécifique aux abonnements.
- Gestion bancaire obligatoire.
- Utilisateurs multiples.
- Connexion Internet obligatoire.
- Abonnement obligatoire.

Les transactions futures connues, échéances, budgets et récurrences validés restent autorisés.

## 34. Installation Windows

Créer un véritable installateur professionnel.

Prévoir :

- Installation simple.
- Choix de l'emplacement lorsque pertinent.
- Raccourci sur le bureau.
- Entrée dans le menu Démarrer.
- Désinstallation.
- Gestion des dépendances nécessaires.
- Conservation des données lors des mises à jour.
- Version de l'application.
- Mécanisme de mise à jour contrôlé.
- Documentation des prérequis.

Les données utilisateur doivent être stockées séparément des fichiers du programme.

Une mise à jour ne doit jamais écraser les données financières.

Une désinstallation ne doit pas supprimer silencieusement les données.

Prévoir la signature de l'installateur si les ressources nécessaires sont disponibles. Ne pas prétendre disposer d'un certificat qui n'existe pas.

## 35. Performances

Optimiser :

- Temps de démarrage.
- Ouverture des pages.
- Recherche.
- Filtrage.
- Tri.
- Calcul des statistiques.
- Importations volumineuses.
- Affichage des graphiques.
- Utilisation mémoire.

L'application doit rester utilisable avec plusieurs dizaines de milliers de transactions.

Prévoir des tests de performance avec des données synthétiques, séparées des données réelles.

Éviter les recalculs inutiles et les blocages de l'interface.

## 36. Tests obligatoires

### Tests financiers

- Exactitude des totaux.
- Cohérence entre pages.
- Cohérence des graphiques.
- Arrondis.
- Multidevise.
- Remboursements.
- Paiements fractionnés.
- Ventilations.
- Budgets.
- Transactions prévues et réalisées.

### Tests fonctionnels

- Création.
- Modification.
- Suppression.
- Restauration.
- Recherche.
- Filtres.
- Importation.
- Exportation.
- Récurrences.
- Détection des doublons.
- Sauvegarde.
- Restauration.

### Tests visuels

- Thème clair.
- Thème sombre.
- Interface française.
- Interface hébraïque RTL.
- Interface anglaise.
- Différentes tailles d'écran.
- Mise à l'échelle Windows.
- Tableaux volumineux.
- Graphiques.
- Fenêtres modales.

### Tests techniques

- Fonctionnement hors ligne.
- Fermeture inattendue.
- Redémarrage.
- Mise à jour.
- Migration de base de données.
- Corruption d'un fichier importé.
- Échec de sauvegarde.
- Restauration.
- Installation et désinstallation.

Ne jamais déclarer un test réussi s'il n'a pas réellement été exécuté.

## 37. Ordre de développement

### Étape 1 — Audit et conception

- Analyser les fichiers Excel.
- Inventorier les fonctionnalités existantes.
- Vérifier les décisions du cahier des charges.
- Définir l'architecture.
- Concevoir le schéma de base de données.
- Définir les règles financières.
- Identifier les risques.

### Étape 2 — Fondations techniques

- Initialiser le projet.
- Configurer Tauri ou l'architecture retenue.
- Configurer React et TypeScript.
- Créer la base de données.
- Mettre en place les migrations.
- Configurer les tests.

### Étape 3 — Design général

- Créer le design system.
- Créer la navigation.
- Créer les composants.
- Intégrer les trois langues.
- Intégrer les thèmes clair et sombre.

### Étape 4 — Moteur des transactions

- Développer les revenus.
- Développer les dépenses.
- Développer le journal général.
- Développer les formulaires.
- Développer les tableaux.
- Développer les catégories.
- Développer les moyens de paiement.

### Étape 5 — Migration Excel

- Développer l'assistant d'importation.
- Importer les données.
- Contrôler les résultats.
- Vérifier les écarts.

### Étape 6 — Tableau de bord et analyses

- Développer les indicateurs.
- Développer les graphiques.
- Développer les filtres.
- Développer les comparaisons.
- Développer la personnalisation.

### Étape 7 — Fonctionnalités complémentaires

- Multidevise.
- Remboursements.
- Ventilations.
- Paiements fractionnés.
- Justificatifs.
- Étiquettes.
- Projets.
- Modèles de saisie.
- Classification intelligente.

### Étape 8 — Modules facultatifs

- Récurrences.
- Échéances.
- Calendrier financier.
- Budgets.

### Étape 9 — Sécurité et gestion des données

- Chiffrement.
- Protection.
- Corbeille.
- Historique.
- Sauvegardes.
- Restauration.
- Exports.

### Étape 10 — Validation et distribution

- Tests complets.
- Contrôle des performances.
- Audit visuel.
- Vérification des données.
- Documentation.
- Installateur Windows.

## 38. Méthode de travail imposée

Avant de commencer, examiner le dossier du projet et les fichiers existants.

Ne pas écraser un projet existant sans inspection préalable.

Créer et maintenir :

- `CAHIER_DES_CHARGES.md`
- `ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `REGLES_CALCUL_FINANCIER.md`
- `DESIGN_SYSTEM.md`
- `PLAN_DE_DEVELOPPEMENT.md`
- `TESTS.md`
- `CHANGELOG.md`
- `README.md`

Après chaque étape :

1. Vérifier les fonctionnalités développées.
2. Exécuter les tests applicables.
3. Corriger les erreurs détectées.
4. Mettre à jour la documentation.
5. Indiquer les fichiers modifiés.
6. Indiquer les fonctionnalités terminées.
7. Indiquer les difficultés éventuelles.
8. Identifier les fonctionnalités restantes.

Ne pas multiplier les demandes de confirmation pour les petits détails techniques.

Demander une validation uniquement pour les décisions importantes qui modifieraient le périmètre, les règles financières, la sécurité, le comportement des données ou l'architecture fondamentale.

## 39. Critères d'acceptation finale

L'application sera considérée comme prête lorsque :

- Elle s'installe correctement sous Windows.
- Elle fonctionne sans Internet.
- Toutes les données Excel ont été importées et vérifiées.
- Les calculs sont exacts et cohérents.
- Les graphiques correspondent aux données.
- Les transactions sont faciles à saisir.
- Les tableaux sont professionnels et lisibles.
- Les trois langues fonctionnent correctement.
- L'hébreu RTL est parfaitement adapté.
- Les thèmes clair et sombre sont complets.
- Les modules facultatifs peuvent être masqués.
- Les sauvegardes et restaurations sont fonctionnelles.
- Les exports sont exploitables.
- Les tests critiques sont réussis.
- Aucun module reporté n'a inutilement complexifié la première version.

## 40. Instruction de démarrage

Commence par analyser l'environnement de travail, les fichiers Excel disponibles et l'état éventuel du projet.

Établis un plan de développement détaillé ainsi qu'un inventaire des fonctionnalités existantes.

Présente les décisions techniques importantes, les risques identifiés et les éventuelles incohérences du cahier des charges.

Puis commence le développement selon l'ordre défini, sans créer de prototype jetable.

Construis dès le départ les fondations du véritable logiciel final.

La qualité du design, la simplicité d'utilisation et la fiabilité financière doivent rester les trois priorités absolues pendant tout le développement.
