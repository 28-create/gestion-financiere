# Plan de développement

## Audit de départ

Le dépôt commence à vide. Plusieurs éditions du classeur 2026–2040 ont été repérées, dont le classeur professionnel, les versions de réparation et les éditions de mise en forme. Les extraits disponibles identifient un récapitulatif pluriannuel et des indicateurs par année pour les revenus, les dépenses, le solde, l’épargne et le taux d’épargne. Des valeurs à plus de deux décimales figurent dans les extraits. Le tableau de bord, l’analyse des dépenses par catégorie et la série mensuelle figurent dans les extraits. Le classeur professionnel décrit le taux d’épargne comme le rapport des versements vers le livret aux revenus. Deux éditions de présentation donnent les mêmes totaux annuels sur la portion comparée. L’inventaire cellule par cellule, la comparaison des formules et la classification effective des versements restent à vérifier sur les fichiers sources.

La version de référence doit être identifiée par comparaison des données et des formules, y compris les variantes de présentation, avant de migrer des transactions. Tenir un inventaire des feuilles visibles et masquées, tableaux, colonnes, validations et graphiques. Contrôler les comptages et les totaux par mois, année et devise, ainsi que l’épargne et les caractères hébreux. Les écarts sont consignés localement. Aucun classeur financier n’est inclus dans le dépôt.

## Développement par étapes

| Étape | Travail et validation |
| --- | --- |
| 1. Audit et conception | Finir la comparaison des classeurs, identifier la source de référence, confirmer les définitions d’épargne et les règles de précision. |
| 2. Fondations | Vérifier la compilation Windows, figer les versions des dépendances, vérifier la migration sur disque et la réouverture de la base. |
| 3. Interface | Vérifier la navigation, les trois langues et les deux thèmes sous WebView2, dont les écrans étroits et le redimensionnement Windows. |
| 4. Transactions | Compléter la saisie, les raccourcis, les catégories, les moyens de paiement et les tableaux avancés. Vérifier l’historique, la corbeille et les révisions concurrentes. |
| 5. Excel | Ajouter l’aperçu, la correspondance des colonnes, les doublons, les rapports et l’annulation d’un lot. Réconcilier les chiffres avec le classeur d’origine. |
| 6. Analyses | Relier les graphiques, les comparaisons et le tableau de bord au registre filtré. |
| 7. Opérations complexes | Ajouter les devises, ventilations, remboursements, mensualités, justificatifs, étiquettes, modèles et suggestions locales. |
| 8. Modules facultatifs | Ajouter les récurrences, le calendrier et les budgets validés. |
| 9. Protection et données | Valider le chiffrement, les sauvegardes, la restauration et les exports. |
| 10. Distribution | Vérifier les performances, l’utilisation hors ligne, les mises à jour et l’installation Windows. |

La version actuelle pose les fondations et livre la première tranche du journal. Le suivi bancaire, patrimonial et les projections financières suivent les exclusions du cahier des charges.
