# Tests

`npm test` exécute les tests du moteur de précision monétaire et du schéma SQLite en mémoire avec Node.js 24. Ils vérifient la lecture décimale, les arrondis à l’affichage, les contraintes, l’historique des révisions et la restauration. Les données de test sont synthétiques et confinées à la mémoire.

L’inventaire Excel est également vérifié avec un classeur synthétique. La commande `python -B -m unittest discover -s tests -p test_audit_excel.py` vérifie les feuilles masquées, formules, validations, tableaux et graphiques et contrôle l’intégrité du fichier source.

La CI Windows lance les tests, vérifie la compilation du frontend et compile le binaire Tauri. Les vérifications interactives restent à exécuter sous WebView2 pour les trois langues, le RTL, les deux thèmes, les changements de taille et l’usage hors ligne. L’import réel, l’installateur, les sauvegardes, la restauration sur disque et les performances à grande échelle exigent leurs propres validations.
