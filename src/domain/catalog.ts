export type CatalogKind='income'|'expense'|'payment';
export type CatalogItem={id:number;kind:CatalogKind;name:string;archived:boolean;revision:number;uses:number;parentId?:number|null;color?:string;icon?:string;translations?:Record<string,string>;sortOrder?:number|null};
export function availableItems(items:CatalogItem[],kind:CatalogKind){return items.filter(item=>item.kind===kind&&!item.archived);}
