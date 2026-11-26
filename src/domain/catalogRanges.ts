import type {CatalogKind} from './catalog.ts';
export type CatalogValue={kind:CatalogKind;name:string};
export function catalogRanges(definitions:{name:string;formula:string}[]){
 const ranges:{kind:CatalogKind;sheet:string;column:string;first:number;last:number}[]=[],issues:string[]=[];
 for(const definition of definitions){
  const kind=({listedepenses:'expense',listerevenus:'income',listepaiements:'payment'} as Record<string,CatalogKind>)[definition.name.toLowerCase()];if(!kind)continue;
  const formula=definition.formula.replace(/^=/,'').trim();
  const offset=/^OFFSET\(([^!,()]+)!\$?([A-Z]+)\$?(\d+),0,0,COUNTA\(\1!\$?\2\$?\3:\$?\2\$?(\d+)\),1\)$/i.exec(formula);
  const direct=/^([^!]+)!\$?([A-Z]+)\$?(\d+):\$?\2\$?(\d+)$/i.exec(formula);
  const match=offset??direct;
  if(!match||Number(match[4])<Number(match[3])||Number(match[4])-Number(match[3])>10000){issues.push(`${definition.name} : plage non prise en charge`);continue;}
  const sheet=match[1].startsWith("'")?match[1].slice(1,-1).replaceAll("''", "'"):match[1];
  ranges.push({kind,sheet,column:match[2].toUpperCase(),first:Number(match[3]),last:Number(match[4])});
 }
 for(const name of ['income','expense','payment'])if(!ranges.some(r=>r.kind===name))issues.push(`Liste ${name} : définition absente ou non reconnue`);
 return {ranges,issues};
}
