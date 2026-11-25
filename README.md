# Gestion financière

Application Windows de gestion financière personnelle, conçue pour fonctionner hors ligne.

La première version du code couvre le journal local en ILS, la saisie et la modification des opérations, les filtres de dates et de titre, les totaux réalisés et la restauration depuis la corbeille. L’interface propose le français, l’anglais et l’hébreu (RTL), ainsi que deux thèmes.

## Développement Windows

Prérequis de compilation : Node.js 24, Rust stable avec la cible MSVC, Microsoft C++ Build Tools et Microsoft Edge WebView2. L’application stocke sa base SQLite dans le dossier de données applicatives de Windows, en dehors du dossier du projet.

```powershell
npm install
npm test
npm run tauri -- dev
npm run tauri -- build --no-bundle
```

Les dépendances sont téléchargées à la préparation du poste de développement. L’application utilise ses ressources locales à l’exécution. L’installateur reste à développer et à valider.

Un inventaire Excel en lecture seule est disponible avec `python -B tools/audit_excel.py chemin/vers/classeur.xlsx`. La commande `python -B tools/reconcile_budget.py chemin/vers/classeur.xlsx` calcule les totaux de contrôle du modèle de budget 2026–2040 et signale les lignes à examiner. Garde ces rapports avec les données locales.

- [Cahier des charges](CAHIER_DES_CHARGES.md)
- [Plan de développement et audit](PLAN_DE_DEVELOPPEMENT.md)
- [Architecture](ARCHITECTURE.md)
- [Schéma SQLite](DATABASE_SCHEMA.md)
- [Règles de calcul](REGLES_CALCUL_FINANCIER.md)
- [Design system](DESIGN_SYSTEM.md)
- [Tests](TESTS.md)
- [Historique des versions](CHANGELOG.md)
