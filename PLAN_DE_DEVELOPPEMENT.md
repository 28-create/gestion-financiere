# Plan de développement

## Audit de départ

Le classeur de référence utilise un récapitulatif, une feuille de graphiques, une feuille de catégories et une feuille par année sur la période 2026–2040. Deux tableaux structurés par année séparent les revenus et les dépenses. Les listes de validation lient le registre aux listes de catégories et de moyens de paiement. Les champs existants comprennent la date, le mois calculé, la description, le montant, le moyen de paiement, la catégorie et la note.

L’audit en lecture seule confirme la concordance des totaux de revenus et de dépenses 2026 après conversion à six décimales. Les écarts observés sur la représentation brute d’Excel sont inférieurs à un millionième de shekel. Aucun mouvement daté n’a été relevé dans les autres années de la version fournie. Les résultats détaillés et le classeur restent locaux. Le récapitulatif et certains graphiques utilisent des plages anciennes. L’import se réconcilie avec le contenu des tableaux structurés et les indicateurs calculés dans les feuilles annuelles.

### Correspondance de migration

| Source Excel | Destination et contrôle |
| --- | --- |
| Tableaux de revenus et de dépenses | Déterminer le type par tableau, préserver le signe et identifier chaque ligne par classeur, feuille, tableau et coordonnée. |
| Date et mois | Convertir la date avec le système de dates déclaré par le classeur et recomposer le mois depuis cette date. |
| Description, montant et notes | Préserver les caractères d’origine et contrôler le montant à six décimales. |
| Source et catégorie | Relier aux listes de référence. Préserver les catégories, sous-catégories et moyens historiques même quand ils sont peu utilisés. |
| Lignes de total et lignes modèles à zéro | Les identifier avant le comptage. Les présenter à part dans le rapport d’import. |
| Résumé, graphiques, formules et taux d’épargne | Comparer les résultats recalculés à Excel. Reproduire l’épargne du classeur avec ses catégories de versements. |

Le montant reste local lors des vérifications. Un écart de réconciliation, une ligne active incomplète ou un doublon potentiel doit être présenté dans l’aperçu. L’écriture en base attend la confirmation du lot.

## Développement par étapes

| Étape | Travail et validation |
| --- | --- |
| 1. Audit et conception | Source de référence identifiée et structure auditée. Préparer le rapport automatisé de réconciliation pour l’assistant d’import. |
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
