export const translations = {
  fr: {
    app: "Gestion financière", journal: "Journal", income: "Revenus", expense: "Dépenses",
    trash: "Corbeille", balance: "Solde net", title: "Titre", amount: "Montant (₪)", date: "Date",
    status: "Statut", kind: "Type", realized: "Réalisée", planned: "Prévue", pending: "En attente",
    from: "Du", to: "Au", search: "Rechercher par titre", add: "Nouvelle opération",
    edit: "Modifier", save: "Enregistrer", cancel: "Annuler", remove: "Mettre à la corbeille",
    restore: "Restaurer", actions: "Actions", empty: "Aucune opération sur cette période.",
    previous: "Précédente", next: "Suivante", today: "Aujourd’hui", yesterday: "Hier",
    language: "Langue", light: "Clair", dark: "Sombre", theme: "Thème", count: "Opérations",
    filterError: "Vérifie les dates de la période.", amountError: "Saisis un montant avec six décimales au maximum.",
    error: "L’opération a échoué. Réessaie.", conflict: "Cette opération a changé. Recharge la liste.",
    details: "Détails", category: "Catégorie", paymentMethod: "Moyen de paiement", note: "Note",
    working: "Chargement…", realizedTotals: "Totaux réalisés de la sélection"
  },
  en: {
    app: "Personal finances", journal: "Journal", income: "Income", expense: "Expenses",
    trash: "Trash", balance: "Net balance", title: "Title", amount: "Amount (₪)", date: "Date",
    status: "Status", kind: "Type", realized: "Actual", planned: "Planned", pending: "Pending",
    from: "From", to: "To", search: "Search by title", add: "New transaction",
    edit: "Edit", save: "Save", cancel: "Cancel", remove: "Move to trash",
    restore: "Restore", actions: "Actions", empty: "No transactions in this period.",
    previous: "Previous", next: "Next", today: "Today", yesterday: "Yesterday",
    language: "Language", light: "Light", dark: "Dark", theme: "Theme", count: "Transactions",
    filterError: "Check the date range.", amountError: "Enter an amount with up to six decimal places.",
    error: "The operation failed. Try again.", conflict: "This transaction changed. Refresh the list.",
    details: "Details", category: "Category", paymentMethod: "Payment method", note: "Note",
    working: "Loading…", realizedTotals: "Actual totals for the current selection"
  },
  he: {
    app: "ניהול כספים", journal: "יומן", income: "הכנסות", expense: "הוצאות",
    trash: "סל מחזור", balance: "יתרה נטו", title: "כותרת", amount: "סכום (₪)", date: "תאריך",
    status: "סטטוס", kind: "סוג", realized: "בוצעה", planned: "מתוכננת", pending: "ממתינה",
    from: "מתאריך", to: "עד תאריך", search: "חיפוש לפי כותרת", add: "תנועה חדשה",
    edit: "עריכה", save: "שמירה", cancel: "ביטול", remove: "העברה לסל המחזור",
    restore: "שחזור", actions: "פעולות", empty: "אין תנועות בתקופה הזו.",
    previous: "הקודם", next: "הבא", today: "היום", yesterday: "אתמול",
    language: "שפה", light: "בהיר", dark: "כהה", theme: "ערכת נושא", count: "תנועות",
    filterError: "יש לבדוק את טווח התאריכים.", amountError: "יש להזין סכום עם עד שש ספרות אחרי הנקודה.",
    error: "הפעולה נכשלה. יש לנסות שוב.", conflict: "התנועה השתנתה. יש לרענן את הרשימה.",
    details: "פרטים", category: "קטגוריה", paymentMethod: "אמצעי תשלום", note: "הערה",
    working: "בטעינה…", realizedTotals: "סכומי התנועות שבוצעו לפי הסינון"
  }
} as const;

export type Language = keyof typeof translations;
export const locales: Record<Language, string> = { fr: "fr-FR", en: "en-GB", he: "he-IL" };
