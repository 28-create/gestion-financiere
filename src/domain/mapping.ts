import {sourceDate,sourceMicros,convertMicros} from './importing.ts';
import type {ImportRow} from './workbook.ts';
export type RawSheet={name:string;rows:{number:number;cells:string[];errors:number[]}[]};
export type Mapping={date:number;title:number;amount:number;kind:number;category:number;paymentMethod:number;note:number;currency:number;rate:number};
export const blankMapping:Mapping={date:-1,title:-1,amount:-1,kind:-1,category:-1,paymentMethod:-1,note:-1,currency:-1,rate:-1};
const clean=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function suggestMapping(headers:string[]):Mapping{const m={...blankMapping};const aliases:Record<keyof Mapping,string[]>={date:['date','occurredon','תאריך'],title:['titre','description','title','libelle','תיאור'],amount:['montant','amount','סכום'],kind:['type','kind','סוג'],category:['categorie','category','קטגוריה'],paymentMethod:['source','paiement','mode de paiement','payment','paymentmethod','אמצעי תשלום'],note:['note','notes','הערה','הערות'],currency:['devise','currency','מטבע'],rate:['taux','rate','שער']};for(const key of Object.keys(m) as (keyof Mapping)[])m[key]=headers.findIndex(h=>aliases[key].includes(clean(h)));return m;}
export function mapRows(sheet:RawSheet,m:Mapping,options:{first:number;last:number;kind:'income'|'expense';dateFormat:'auto'|'iso'|'dmy'|'mdy'|'excel';decimal:'auto'|'.'|',';currency:string;rate:string;fingerprint:string;since1904?:boolean}){
 const rows:ImportRow[]=[],issues:string[]=[];
 if([m.date,m.title,m.amount].some(n=>n<0))return {rows,issues:['mapping']};
 for(const row of sheet.rows){if(row.number<options.first||row.number>options.last||!row.cells.some(s=>s.trim()))continue;
  try{if(row.errors.length)throw Error('cell');const get=(key:keyof Mapping)=>row.cells[m[key]]??'';const title=get('title');if(!title.trim())throw Error('title');
   const rawKind=clean(get('kind')),kind=!rawKind?options.kind:['income','revenu','revenus','הכנסה','הכנסות'].includes(rawKind)?'income':['expense','depense','depenses','הוצאה','הוצאות'].includes(rawKind)?'expense':null;if(!kind)throw Error('kind');
   const occurredOn=sourceDate(get('date'),options.dateFormat,options.since1904),original=sourceMicros(get('amount'),options.decimal),currency=(get('currency')||options.currency).trim().toUpperCase();if(!/^[A-Z]{3}$/.test(currency))throw Error('currency');
   const rate=currency==='ILS'?1000000n:sourceMicros(get('rate')||options.rate,options.decimal);if(rate<=0n)throw Error('rate');const amount=convertMicros(original,rate);
   rows.push({title,kind,occurredOn,amountMicros:amount.toString(),category:get('category')||null,paymentMethod:get('paymentMethod')||null,note:get('note')||null,sourceKey:`${options.fingerprint}:${sheet.name}:manual:${row.number}`,sourceSheet:sheet.name,sourceTable:'manual',sourceRow:row.number,...(currency==='ILS'?{}:{currency,originalMicros:original.toString(),rateMicros:rate.toString(),rateDate:occurredOn})});
  }catch(e){issues.push(`${sheet.name} · ${row.number}: ${String(e)}`);}
 }return {rows,issues};
}
