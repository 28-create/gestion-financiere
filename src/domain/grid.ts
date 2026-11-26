import {decimalAmount} from './money.ts';
import {evaluateAmount} from './expression.ts';
import type {ReportRow} from './reports.ts';
export type Draft={key:string;id:number|null;revision:number|null;title:string;kind:'income'|'expense';status:'realized'|'planned'|'pending';occurredOn:string;amount:string;category:string;paymentMethod:string;note:string};
export function draftFromRow(row:ReportRow):Draft{if(!row.revision)throw Error('revision');return {key:`saved-${row.id}`,id:row.id,revision:row.revision,title:row.title,kind:row.kind as Draft['kind'],status:row.status as Draft['status'],occurredOn:row.occurredOn,amount:decimalAmount(BigInt(row.amountMicros)),category:row.category??'',paymentMethod:row.paymentMethod??'',note:row.note??''};}
export function gridPayload(draft:Draft){
 if(!draft.title.trim()||Array.from(draft.title.trim()).length>200)throw Error('title');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.occurredOn)||draft.occurredOn.startsWith('0000'))throw Error('date');
 const date=new Date(draft.occurredOn+'T00:00:00Z');if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==draft.occurredOn)throw Error('date');
 if(!['income','expense'].includes(draft.kind)||!['realized','planned','pending'].includes(draft.status))throw Error('validation');
 return {id:draft.id,revision:draft.revision,input:{title:draft.title,kind:draft.kind,status:draft.status,occurredOn:draft.occurredOn,amountMicros:evaluateAmount(draft.amount).toString(),category:draft.category||null,paymentMethod:draft.paymentMethod||null,note:draft.note||null}};
}
export function parseTsv(input:string):string[][]{
 if(input.length>2000000)throw Error('size');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,afterQuote=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else {quoted=false;afterQuote=true;}}else cell+=c;continue;}
  if(afterQuote&&c!=='\t'&&c!=='\r'&&c!=='\n')throw Error('tsv');
  if(c==='"'&&cell===''){quoted=true;continue;}
  if(c==='\t'){row.push(cell);cell='';afterQuote=false;}
  else if(c==='\r'||c==='\n'){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';afterQuote=false;if(rows.length>1000)throw Error('size');}
  else cell+=c;
 }
 if(quoted)throw Error('tsv');if(cell||row.length){row.push(cell);rows.push(row);}return rows.filter(r=>r.some(c=>c.trim()));
}
export function pastedDrafts(text:string,kind:Draft['kind']):Omit<Draft,'key'>[]{
 return parseTsv(text).map(cells=>{
  if(cells.length<3||cells.length>6)throw Error('columns');
  let date=cells[0].trim();const french=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);if(french)date=`${french[3]}-${french[2].padStart(2,'0')}-${french[1].padStart(2,'0')}`;
  const draft={id:null,revision:null,kind,status:'realized' as const,occurredOn:date,title:cells[1],amount:cells[2].replace(/[ \u00a0\u202f]/g,''),category:cells[3]??'',paymentMethod:cells[4]??'',note:cells[5]??''};
  gridPayload({...draft,key:'paste'});return draft;
 });
}
export function sortGridRows(rows:ReportRow[],field:keyof ReportRow,direction:'asc'|'desc'){
 return [...rows].sort((a,b)=>{let n=0;if(field==='amountMicros'){const x=BigInt(a.amountMicros),y=BigInt(b.amountMicros);n=x<y?-1:x>y?1:0;}else n=String(a[field]??'').localeCompare(String(b[field]??''));return (direction==='asc'?n:-n)||a.id-b.id;});
}
export function matchesColumn(value:string|null,filter:string){if(!filter)return true;try{return (value||null)===JSON.parse(filter);}catch{return false;}}
