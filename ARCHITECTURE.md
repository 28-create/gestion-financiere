# Architecture

## Application Windows

Tauri 2 héberge l’interface React et TypeScript dans WebView2. L’interface appelle trois commandes Rust typées pour lire le journal, enregistrer une transaction et déplacer une transaction depuis ou vers la corbeille. Rust valide les saisies et utilise les requêtes paramétrées de rusqlite. Une connexion SQLite est sérialisée côté application et utilise un délai d’attente pour la concurrence entre processus.

Le stockage est placé dans le dossier de données de l’application. Au démarrage, la migration est appliquée sous transaction SQLite et sa version est enregistrée par `user_version`. Les composants d’interface et les textes traduits restent locaux.

## Suite de l’architecture

Les catégories, moyens de paiement, devises et lots d’import auront leurs propres migrations. L’assistant Excel doit valider un lot, conserver les références aux lignes et permettre sa réconciliation. Les opérations complexes et les budgets consommeront le même moteur de calcul. L’architecture du chiffrement et des sauvegardes devra être validée avant leur mise en service.

Les bibliothèques de tableaux, de graphiques et d’internationalisation seront intégrées aux étapes qui utilisent leurs capacités. La première interface utilise les sélecteurs natifs, un tableau paginé et un catalogue de traductions local.
