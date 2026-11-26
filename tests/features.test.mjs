import test from 'node:test';import assert from 'node:assert/strict';
import {budgetUsage,classificationSuggestions} from '../src/domain/features.ts';
import {annualSummary,categoryMatrix} from '../src/domain/annual.ts';
import {summarize} from '../src/domain/reports.ts';
const row=(extra={})=>({id:1,title:'Courses',kind:'expense',status:'realized',occurredOn:'2026-01-05',amountMicros:'10000000',category:'Main',paymentMethod:null,note:null,...extra});
test('split-aware analyses, savings and budgets use allocations without counting a transaction twice',()=>{
 const rows=[row({projectId:7,tags:[1,2],splits:[{category:'Epargne / Livret A',amountMicros:'3000000'},{category:'Courses',amountMicros:'5000000'},{category:'Courses',amountMicros:'2000000'}]}),row({status:'planned',amountMicros:'9000000'})];
 assert.equal(annualSummary(rows,2026).expense,10000000n);assert.equal(annualSummary(rows,2026).savings,3000000n);
 const buckets=summarize(rows,'category');assert.equal(buckets.find(b=>b.name==='Courses').expense,7000000n);assert.equal(buckets.find(b=>b.name==='Courses').count,1);
 assert.equal(categoryMatrix(rows,2026,2026,'expense').reduce((n,c)=>n+c.total,0n),10000000n);
 const budget={id:1,kind:'budget',revision:1,name:'Courses',archived:false,payload:{from:'2026-01-01',to:'2026-01-31',amountMicros:'8000000',category:'Courses',projectId:7}};
 assert.equal(budgetUsage(budget,rows).remaining,1000000n);assert.equal(budgetUsage({...budget,payload:{...budget.payload,projectId:8}},rows).consumed,0n);
});
test('classification rules are local suggestions, ordered by priority, with exceptions',()=>{
 const rule=(id,priority,extra={})=>({id,kind:'classification',revision:1,name:'R',archived:false,payload:{match:'Courses',mode:'contains',priority,kind:'expense',...extra}});
 const rules=[rule(1,1),rule(2,10),rule(3,99,{except:'Exception'}),rule(4,100,{mode:'exact'}),{...rule(5,500),archived:true}];
 assert.deepEqual(classificationSuggestions('Courses Exception','expense',rules).map(r=>r.id),[2,1]);assert.equal(classificationSuggestions('Courses','income',rules).length,0);
});
