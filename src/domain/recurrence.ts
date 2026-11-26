import type {Feature} from './features.ts';
const DAY=86400000;
const iso=(date:Date)=>date.toISOString().slice(0,10);
const utc=(value:string)=>new Date(value+'T00:00:00Z');
const formatter=new Intl.DateTimeFormat('en-u-ca-hebrew',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
export function hebrewParts(date:Date){const parts=formatter.formatToParts(date);return {year:Number(parts.find(p=>p.type==='year')?.value),month:parts.find(p=>p.type==='month')?.value??'',day:Number(parts.find(p=>p.type==='day')?.value)};}
type Span={month:string;first:Date;last:Date};const cache=new Map<number,Span[]>();
function civil(year:number,month:number,day:number){const d=new Date(0);d.setUTCFullYear(year,month,day);d.setUTCHours(0,0,0,0);return d;}
function hebrewMonths(year:number){if(cache.has(year))return cache.get(year)!;const spans:Span[]=[];const end=civil(year-3760,11,31).valueOf();for(let time=civil(year-3761,6,1).valueOf();time<=end;time+=DAY){const d=new Date(time),p=hebrewParts(d);if(p.year!==year)continue;const last=spans.at(-1);if(last?.month===p.month)last.last=d;else spans.push({month:p.month,first:d,last:d});}if(spans.length<12)throw Error('calendar');cache.set(year,spans);return spans;}
function spanFor(rule:Feature,index:number):Span{
 const p=rule.payload,start=utc(String(p.start)),interval=Number(p.interval??1),calendar=p.calendar??'civil',frequency=p.frequency;
 const factor=frequency==='yearly'?12:frequency==='quarterly'?3:1;
 if(calendar==='civil'){const offset=index*interval*factor;const first=civil(start.getUTCFullYear(),start.getUTCMonth()+offset,1);return {month:'',first,last:civil(first.getUTCFullYear(),first.getUTCMonth()+1,0)};}
 const anchor=hebrewParts(start);if(frequency==='yearly'){
  const months=hebrewMonths(anchor.year+index*interval);let wanted=anchor.month;
  if(wanted.startsWith('Adar'))wanted=months.some(m=>m.month==='Adar I')?(p.adar==='first'?'Adar I':'Adar II'):'Adar';
  const span=months.find(m=>m.month===wanted);if(!span)throw Error('calendar');return span;
 }
 let offset=index*interval*factor,year=anchor.year;let months=hebrewMonths(year),position=months.findIndex(m=>m.month===anchor.month);offset+=position;
 while(offset>=months.length){offset-=months.length;months=hebrewMonths(++year);}return months[offset];
}
function dateInSpan(rule:Feature,span:Span){const p=rule.payload,anchor=p.calendar==='hebrew'?hebrewParts(utc(String(p.start))).day:utc(String(p.start)).getUTCDate();const length=Math.round((span.last.valueOf()-span.first.valueOf())/DAY)+1;let date=new Date(span.first.valueOf()+(Math.min(anchor,length)-1)*DAY);
 const weekend=Array.isArray(p.weekend)?p.weekend.map(Number):[5,6];if(weekend.length>=7)throw Error('calendar');
 if(p.policy==='last'||p.policy==='lastBusiness')date=new Date(span.last);if(p.policy==='firstBusiness')date=new Date(span.first);
 if(p.policy==='firstBusiness'||p.policy==='lastBusiness'){const direction=p.policy==='firstBusiness'?1:-1;while(weekend.includes(date.getUTCDay()))date=new Date(date.valueOf()+direction*DAY);}
 if(p.policy==='weekday'){const weekday=Number(p.weekday??0),ordinal=Number(p.ordinal??1);if(weekday<0||weekday>6||![1,2,3,4,5,-1].includes(ordinal))throw Error('calendar');date=ordinal===-1?new Date(span.last.valueOf()-((span.last.getUTCDay()-weekday+7)%7)*DAY):new Date(span.first.valueOf()+((weekday-span.first.getUTCDay()+7)%7+(ordinal-1)*7)*DAY);if(date>span.last)return null;}
 return date;
}
export type Due={ruleId:number;revision:number;scheduledOn:string;occurredOn:string;amountMicros:string|null;name:string;mode:string};
export function occurrences(rule:Feature,until:string,max=10000,known=new Set<string>()):Due[]{
 if(rule.archived||rule.payload.paused)return [];const p=rule.payload,start=utc(String(p.start)),limit=utc(until);if(!Number.isFinite(start.valueOf())||!Number.isFinite(limit.valueOf()))throw Error('date');
 const result:Due[]=[];const count=Number(p.count)||Infinity;let previous='',generated=0;
 for(let index=0;generated<count;index++){
  let date:Date|null;
  if(p.frequency==='daily'||p.frequency==='weekly')date=new Date(start.valueOf()+index*Number(p.interval??1)*(p.frequency==='weekly'?7:1)*DAY);else{const span=spanFor(rule,index);if(span.first>limit)break;date=dateInSpan(rule,span);}
  if(!date)continue;if(date>limit)break;if(date<start)continue;const scheduledOn=iso(date);if(p.until&&scheduledOn>String(p.until))break;if(scheduledOn===previous)continue;previous=scheduledOn;generated++;
  const exception=(Array.isArray(p.exceptions)?p.exceptions:[]).find((e:unknown)=>typeof e==='object'&&e!==null&&(e as {on?:string}).on===scheduledOn) as {skip?:boolean;date?:string;amountMicros?:string}|undefined;
  if(exception?.skip||known.has(`${rule.id}:${scheduledOn}`)||(p.effectiveFrom&&scheduledOn<String(p.effectiveFrom)))continue;const occurredOn=exception?.date??scheduledOn;
  result.push({ruleId:rule.id,revision:rule.revision,scheduledOn,occurredOn,amountMicros:exception?.amountMicros??(p.variable||p.amountMicros==null?null:String(p.amountMicros)),name:rule.name,mode:String(p.mode)});
  if(result.length>=max)break;
 }return result;
}
export function dueThrough(rules:Feature[],today:string,known=new Set<string>()){return rules.filter(r=>r.kind==='recurrence').flatMap(r=>occurrences(r,today,10000,known)).filter(d=>d.occurredOn<=today).sort((a,b)=>a.occurredOn.localeCompare(b.occurredOn)||a.ruleId-b.ruleId);}
