import test from 'node:test';import assert from 'node:assert/strict';
import {annualSummary,comparison,categoryMatrix,percentage,yearRange} from '../src/domain/annual.ts';
const row=(overrides={})=>({id:1,title:'Test',kind:'expense',status:'realized',occurredOn:'2026-01-15',amountMicros:'1000000',category:'Courses',paymentMethod:null,note:null,...overrides});
test('annual indicators match the workbook savings rule and count only nonzero realized operations',()=>{
 const rows=[row({kind:'income',amountMicros:'100000000'}),row({amountMicros:'20000000',category:'Epargne / Livret A'}),row({amountMicros:'30000000'}),row({amountMicros:'0'}),row({status:'planned',amountMicros:'900000000'}),row({occurredOn:'2027-01-01'})];
 const summary=annualSummary(rows,2026);assert.equal(summary.income,100000000n);assert.equal(summary.expense,50000000n);assert.equal(summary.net,50000000n);assert.equal(summary.savings,20000000n);assert.equal(summary.currentExpense,30000000n);assert.equal(summary.incomeCount,1);assert.equal(summary.expenseCount,2);assert.equal(summary.months.length,12);assert.equal(summary.months[11].expense,0n);assert.equal(percentage(summary.savings,summary.income),'20.00%');
});
test('comparisons preserve empty years and never duplicate category totals',()=>{
 const rows=[row(),row({occurredOn:'2040-12-31',amountMicros:'-100001'}),row({occurredOn:'2041-01-01',amountMicros:'9000000'}),row({kind:'income',category:'Courses',amountMicros:'7000000'})];
 const annual=comparison(rows,2026,2040);assert.equal(annual.length,15);assert.equal(annual[1].expense,0n);assert.equal(annual[14].expense,-100001n);
 const matrix=categoryMatrix(rows,2026,2040,'expense',['Courses','Unused']);assert.equal(matrix.length,2);assert.equal(matrix[0].total,899999n);assert.equal(matrix[1].total,0n);
 assert.equal(matrix.reduce((n,c)=>n+c.total,0n),annual.reduce((n,a)=>n+a.expense,0n));assert.equal(yearRange(2025,2041).length,17);assert.throws(()=>yearRange(2040,2026));assert.throws(()=>yearRange(1,100));
});
test('percentage calculation handles zero income, negative corrections and exact half rounding',()=>{assert.equal(percentage(1n,0n),null);assert.equal(percentage(1n,3n),'33.33%');assert.equal(percentage(-1n,3n),'-33.33%');assert.equal(percentage(1n,20000n),'0.01%');});
