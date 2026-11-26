export type CatalogKind='income'|'expense'|'payment';
export type CatalogItem={id:number;kind:CatalogKind;name:string;archived:boolean;revision:number;uses:number};
export function availableItems(items:CatalogItem[],kind:CatalogKind){return items.filter(item=>item.kind===kind&&!item.archived);}
