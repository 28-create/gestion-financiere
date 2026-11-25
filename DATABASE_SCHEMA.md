# Schéma SQLite

| Objet | Rôle |
| --- | --- |
| `transactions` | Registre unique, toutes années confondues. Contient l’identifiant, la date, le type, le libellé, le statut, le montant, les dates techniques et la révision. |
| `transaction_history` | Instantané de chaque révision, y compris la mise en corbeille et la restauration. Une clé étrangère relie les instantanés à l’opération. |

La migration 001 active le schéma par une transaction atomique. Le registre garde les entrées supprimées sous forme logique avec `deleted_at`. Pour éviter l’écrasement d’une édition concurrente, les écritures exigent la révision lue au départ et incrémentent la révision au succès. Les déclencheurs créent les instantanés dans la même transaction que l’écriture. L’index partiel sert les listes actives par date.

Les lots Excel, devises, ventilations, remboursements, récurrences, justificatifs, budgets et préférences métier auront des migrations distinctes. La première migration conserve la place pour le journal et ses révisions.
