import type {ReportRow} from './reports.ts';
import type {Feature} from './features.ts';
export function recurrenceSuggestions(rows:ReportRow[],rules:Feature[]){
 const groups=new Map<string,ReportRow[]>();for(const row of rows){if(row.status!=='realized'||BigInt(row.amountMicros)<=0n)continue;const key=JSON.stringify([row.title.trim().toLocaleLowerCase(),row.kind,row.category,row.paymentMethod]);const group=groups.get(key)??[];group.push(row);groups.set(key,group);}
 return [...groups.values()].flatMap(group=>{group.sort((a,b)=>a.occurredOn.localeCompare(b.occurredOn)||a.id-b.id);const dates=[...new Set(group.map(r=>r.occurredOn))];if(dates.length<3)return [];const last=group.at(-1)!;if(rules.some(f=>f.kind==='recurrence'&&!f.archived&&f.name.trim().toLocaleLowerCase()===last.title.trim().toLocaleLowerCase()&&f.payload.kind===last.kind))return [];
  const recent=dates.slice(-4),gaps=recent.slice(1).map((d,i)=>(Date.parse(d)-Date.parse(recent[i]))/86400000);const frequency=gaps.every(g=>g>=6&&g<=8)?'weekly':gaps.every(g=>g>=26&&g<=33)?'monthly':null;if(!frequency)return [];
  const date=new Date(last.occurredOn+'T00:00:00Z');if(frequency==='weekly')date.setUTCDate(date.getUTCDate()+7);else{const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+1);const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));}
  return [{title:last.title,kind:last.kind,category:last.category,paymentMethod:last.paymentMethod,frequency,start:date.toISOString().slice(0,10),amountMicros:last.amountMicros,variable:new Set(group.slice(-4).map(r=>r.amountMicros)).size>1,evidence:recent}];
 }).slice(0,20);
}
