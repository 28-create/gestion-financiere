# Règles de calcul financier

- La version initiale accepte les opérations en ILS avec au plus six décimales. Le montant saisi est converti en un entier signé exprimé en millionièmes de shekel. L’interface transmet cet entier comme chaîne décimale.
- Les totaux réalisés additionnent les opérations réalisées et actives dans le périmètre des filtres, avant toute pagination. Une dépense positive contribue positivement au total des dépenses. Le solde de ce périmètre se calcule en soustrayant ce total des revenus.
- Les montants sont totalisés avant arrondi. L’affichage en centimes arrondit à la valeur la plus proche, les demi-centimes s’éloignant de zéro. La modification d’une ligne retrouve sa précision stockée.
- Les statuts « Prévue » et « En attente » restent visibles dans la liste, avec leur propre statut.

La règle de précision finale de l’import Excel dépend de l’audit des cellules et des formules. Les montants au-delà de la précision du registre doivent être signalés pour validation. Le classeur de référence utilise les versements vers la catégorie d’épargne pour calculer l’épargne, qui fait aussi partie des dépenses totales. Les dépenses courantes retranchent cette épargne, et le taux d’épargne est le rapport entre l’épargne et les revenus, avec zéro si les revenus sont nuls. Le signe des montants correctifs est conservé. La politique de conversion multidevise reste à valider.
