# Historique

## Phase 1 — travaux en cours, non distribués

- Gestion des catégories de revenus, de dépenses et des moyens de paiement : création, renommage global confirmé, archivage, réactivation, recherche et nombre d'opérations actives.
- Suggestions de catégories et de paiements pendant la saisie, ainsi que des titres déjà utilisés ; les éléments archivés sont exclus des suggestions.
- Migration 004 : reprise des valeurs des opérations existantes, y compris dans la corbeille, et alimentation automatique des listes lors des prochaines écritures.
- Copie de sécurité avant migration d'une base existante ; restauration des anciennes sauvegardes en préparant d'abord une copie migrée, sans modifier la sauvegarde source.

- Saisie simplifiée : catégorie et moyen de paiement visibles sur une même ligne ; statut réalisé par défaut, sélecteur rangé dans les détails ; type présélectionné par le bouton d'ajout et sélecteur retiré à la création.

- Journal : boutons distincts « Ajouter une dépense » et « Ajouter un revenu », avec le type correspondant présélectionné. Les pages Revenus et Dépenses affichent uniquement leur bouton. Les libellés et titres de saisie sont adaptés en français, anglais et hébreu.

- Analyses réalisées par mois, année, catégorie et moyen de paiement, avec graphiques en barres et cumul net de période.
- Export CSV protégé contre les formules dans les textes et impression du rapport via la boîte de dialogue système.
- Liste et restauration des sauvegardes locales avec contrôle d'intégrité, contrôle de version et copie de sécurité préalable.
- Consultation de l'historique complet d'une opération depuis le journal et la corbeille.
- Duplication d'opérations, saisie avec « Enregistrer et continuer » et calcul arithmétique exact dans le montant.

- Lecture locale des tableaux structurés du classeur Budget XLSX et aperçu avant validation.
- Blocage de l'import si une ligne comporte une anomalie et vérification backend de chaque opération.
- Import atomique par lot et exclusion des lignes identiques, avec avertissement explicite.
- Sauvegarde SQLite vérifiée avant import ou annulation et sauvegarde manuelle.
- Annulation d'un lot vers la corbeille, refusée si des opérations ont été modifiées.
- Ces changements ne sont pas encore compilés ni validés dans un exécutable Windows.


## 0.1.0 — En développement

- Structure Tauri, React, TypeScript et SQLite.
- Première migration du journal avec historique et corbeille.
- Saisie, modification, filtres, pagination et totaux réalisés.
- Interface FR, EN et HE avec mode RTL et thèmes clair et sombre.
- Contrôles automatisés des montants et du schéma.
