import type {ReportRow} from './reports.ts';
export type AnnualSummary={year:number;income:bigint;expense:bigint;savings:bigint;currentExpense:bigint;net:bigint;incomeCount:number;expenseCount:number;count:number;months:{name:string;income:bigint;expense:bigint}[]};
export const normalizeCategory=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function annualSummary(rows:ReportRow[],year:number,savingsCategory='Epargne / Livret A'):AnnualSummary{
 const result:AnnualSummary={year,income:0n,expense:0n,savings:0n,currentExpense:0n,net:0n,incomeCount:0,expenseCount:0,count:0,months:Array.from({length:12},(_,i)=>({name:`${year}-${String(i+1).padStart(2,'0')}`,income:0n,expense:0n}))};
 for(const row of rows){if(row.status!=='realized'||Number(row.occurredOn.slice(0,4))!==year)continue;const month=Number(row.occurredOn.slice(5,7))-1;if(month<0||month>11)throw Error('date');const amount=BigInt(row.amountMicros);result.count++;
  if(row.kind==='income'){result.income+=amount;result.months[month].income+=amount;if(amount!==0n)result.incomeCount++;}
  else{result.expense+=amount;result.months[month].expense+=amount;if(amount!==0n)result.expenseCount++;if(savingsCategory&&normalizeCategory(row.category??'')===normalizeCategory(savingsCategory))result.savings+=amount;}
 }
 result.net=result.income-result.expense;result.currentExpense=result.expense-result.savings;return result;
}
export function yearRange(start:number,end:number){if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>9999||end<start||end-start>79)throw Error('years');return Array.from({length:end-start+1},(_,i)=>start+i);}
export function comparison(rows:ReportRow[],start:number,end:number,savingsCategory?:string){return yearRange(start,end).map(year=>annualSummary(rows,year,savingsCategory));}
export function categoryMatrix(rows:ReportRow[],start:number,end:number,kind:'income'|'expense',known:string[]=[]){
 const years=yearRange(start,end);const matrix=new Map<string,bigint[]>(known.map(name=>[name,years.map(()=>0n)]));
 for(const row of rows){const year=Number(row.occurredOn.slice(0,4));if(row.status!=='realized'||row.kind!==kind||year<start||year>end)continue;const name=row.category??'';const values=matrix.get(name)??years.map(()=>0n);values[year-start]+=BigInt(row.amountMicros);matrix.set(name,values);}
 return [...matrix].map(([name,values])=>({name,values,total:values.reduce((a,b)=>a+b,0n)}));
}
export function percentage(value:bigint,base:bigint):string|null{
 if(base===0n)return null;let n=value*10000n,d=base;const sign=(n<0n)!==(d<0n)?'-':'';if(n<0n)n=-n;if(d<0n)d=-d;const rounded=n/d+(n%d*2n>=d?1n:0n);return `${rounded===0n?'':sign}${rounded/100n}.${String(rounded%100n).padStart(2,'0')}%`;
}
