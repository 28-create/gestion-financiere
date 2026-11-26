export type ReportRow={id:number;revision?:number;title:string;kind:string;status:string;occurredOn:string;amountMicros:string;category:string|null;paymentMethod:string|null;note:string|null};
export type Bucket={name:string;income:bigint;expense:bigint;count:number};
export function summarize(rows:ReportRow[],field:'month'|'category'|'payment'|'year') {
 const buckets=new Map<string,Bucket>();
 for(const row of rows){
  if(row.status!=='realized')continue;
  const name=field==='month'?row.occurredOn.slice(0,7):field==='year'?row.occurredOn.slice(0,4):field==='category'?row.category??'':row.paymentMethod??'';
  const b=buckets.get(name)??{name,income:0n,expense:0n,count:0};
  if(row.kind==='income')b.income+=BigInt(row.amountMicros);else b.expense+=BigInt(row.amountMicros);
  b.count++;buckets.set(name,b);
 }
 return [...buckets.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function csvCell(value:string){
 // Neutralize spreadsheet formulas, including prefixes hidden by whitespace.
 const safe=/^[\s\uFEFF]*[=+\-@]/u.test(value)?"'"+value:value;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function transactionsCsv(rows:ReportRow[]){
 const headers=['Date','Title','Kind','Status','Amount ILS','Category','Payment','Note'];
 const decimal=(s:string)=>{const n=BigInt(s),m=n<0n?-n:n;return(n<0n?'-':'')+(m/1000000n).toString()+'.'+(m%1000000n).toString().padStart(6,'0');};
 return '\uFEFF'+[headers.map(csvCell).join(';'),...rows.map(r=>[r.occurredOn,r.title,r.kind,r.status,decimal(r.amountMicros),r.category??'',r.paymentMethod??'',r.note??''].map(csvCell).join(';'))].join('\r\n');
}
