import type {ReportRow} from './reports.ts';
export type FeatureKind='budget'|'recurrence'|'project'|'tag'|'template'|'classification'|'settings';
export type Feature={id:number;revision:number;kind:FeatureKind;name:string;payload:Record<string,unknown>;archived:boolean};
export function budgetUsage(budget:Feature,rows:ReportRow[]){
 const amount=BigInt(String(budget.payload.amountMicros));const from=String(budget.payload.from),to=String(budget.payload.to),category=String(budget.payload.category??''),project=budget.payload.projectId;
 let consumed=0n;
 for(const row of rows){if(row.status!=='realized'||row.kind!=='expense'||row.occurredOn<from||row.occurredOn>to||(project!=null&&row.projectId!==Number(project)))continue;
  if(category){if(row.splits?.length){consumed+=row.splits.filter(s=>s.category===category).reduce((n,s)=>n+BigInt(s.amountMicros),0n);}else if(row.category===category)consumed+=BigInt(row.amountMicros);}
  else consumed+=BigInt(row.amountMicros);
 }
 return {amount,consumed,remaining:amount-consumed,over:consumed>amount};
}
export function classificationSuggestions(title:string,kind:string,rules:Feature[]){
 const normalized=title.trim().normalize('NFC').toLocaleLowerCase();
 return rules.filter(rule=>rule.kind==='classification'&&!rule.archived&&(!rule.payload.kind||rule.payload.kind===kind))
 .sort((a,b)=>Number(b.payload.priority??0)-Number(a.payload.priority??0)||a.id-b.id)
 .filter(rule=>{const needle=String(rule.payload.match??'').trim().normalize('NFC').toLocaleLowerCase();const except=String(rule.payload.except??'').trim().toLocaleLowerCase();return needle.length>=3&&(!except||!normalized.includes(except))&&(rule.payload.mode==='exact'?normalized===needle:normalized.includes(needle));});
}
