# Schéma SQLite

| Objet | Rôle |
| --- | --- |
| `import_batches` | Lots d'importation et état d'annulation ; rattachement des opérations via `import_batch_id`. |
| `catalog_items` | Listes distinctes revenus, dépenses et paiements, avec archivage, révision et dates techniques. |
| `transactions` | Registre unique, toutes années confondues. Contient l’identifiant, la date, le type, le libellé, le statut, le montant, les dates techniques et la révision. |
| `transaction_history` | Instantané de chaque révision, y compris la mise en corbeille et la restauration. Une clé étrangère relie les instantanés à l’opération. |

La migration 001 active le schéma par une transaction atomique. Le registre garde les entrées supprimées sous forme logique avec `deleted_at`. Pour éviter l’écrasement d’une édition concurrente, les écritures exigent la révision lue au départ et incrémentent la révision au succès. Les déclencheurs créent les instantanés dans la même transaction que l’écriture. L’index partiel sert les listes actives par date.

La migration 002 ajoute les catégories, paiements, notes et coordonnées Excel au registre. La migration 003 ajoute les lots d'importation. La migration 004 reprend les catégories et paiements existants et installe les déclencheurs d'alimentation du catalogue. L'ordre initial des éléments suit leur première apparition dans les opérations datées ; cet ordre interne ne constitue pas une validation définitive de la règle de classement des catégories.

Le renommage d'un élément du catalogue et la mise à jour des opérations correspondantes sont atomiques. Les révisions des opérations sont incrémentées et leur historique conserve les valeurs précédentes. Archiver un élément ne modifie aucune opération. Les devises, ventilations, remboursements, récurrences, justificatifs, budgets et préférences métier nécessitent encore des migrations distinctes.
