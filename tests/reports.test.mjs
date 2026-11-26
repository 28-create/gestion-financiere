import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize,transactionsCsv,csvCell } from '../src/domain/reports.ts';
const row=(changes={})=>({id:1,title:'Titre',kind:'income',status:'realized',occurredOn:'2026-01-05',amountMicros:'100001',category:'אוכל',paymentMethod:null,note:null,...changes});
test('analysis keeps exact precision, excludes planned entries and includes negative corrections',()=>{
 const values=[row(),row({amountMicros:'200002'}),row({status:'planned',amountMicros:'999999999'}),row({kind:'expense',amountMicros:'-10000'})];
 const result=summarize(values,'month');
 assert.equal(result.length,1);assert.equal(result[0].income,300003n);assert.equal(result[0].expense,-10000n);assert.equal(result[0].count,3);
 assert.equal(summarize([],'year').length,0);
});
test('CSV protects spreadsheet formulas including whitespace and preserves Unicode and notes',()=>{
 for(const value of ['=SUM(A1)',' +1','\t@evil','-test'])assert.ok(csvCell(value).startsWith('"\''));
 const csv=transactionsCsv([row({title:'=1+2',note:'a"b\nc'})]);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('אוכל'));assert.ok(csv.includes('"\'=1+2"'));assert.ok(csv.includes('a""b\nc'));assert.ok(csv.includes('0.100001'));
});
