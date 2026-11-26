# Architecture

## Application Windows

Tauri 2 héberge l’interface React et TypeScript dans WebView2. L’interface appelle trois commandes Rust typées pour lire le journal, enregistrer une transaction et déplacer une transaction depuis ou vers la corbeille. Rust valide les saisies et utilise les requêtes paramétrées de rusqlite. Une connexion SQLite est sérialisée côté application et utilise un délai d’attente pour la concurrence entre processus.

Le stockage est placé dans le dossier de données de l’application. Au démarrage, la migration est appliquée sous transaction SQLite et sa version est enregistrée par `user_version`. Les composants d’interface et les textes traduits restent locaux.

## Suite de l’architecture

Les modules Rust `data_tools`, `reporting` et `catalog` complètent le journal : sauvegardes et import par lot, données d'analyse et historique consultable, gestion des catégories et paiements. Les catégories et les lots ont leurs migrations. Le catalogue se met à jour à chaque écriture d'opération, avec un archivage indépendant des données financières et des renommages globaux sous transaction. Le frontend utilise des composants séparés pour ces espaces.

L'assistant Excel doit encore compléter la correspondance manuelle des colonnes, les références détaillées aux lignes et le traitement des doublons légitimes. Les opérations complexes et les budgets consommeront le même moteur de calcul. Le chiffrement, les sauvegardes automatiques configurables et les autres fonctions restantes doivent encore être développés et validés.

Les bibliothèques de tableaux, de graphiques et d’internationalisation seront intégrées aux étapes qui utilisent leurs capacités. La première interface utilise les sélecteurs natifs, un tableau paginé et un catalogue de traductions local.
