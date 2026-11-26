import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisRows,periodMetrics,averageMicros} from '../src/domain/analysis.ts';
import {sortGridMulti} from '../src/domain/grid.ts';
import {transactionsCsv} from '../src/domain/reports.ts';
const row=(id,changes={})=>({id,revision:1,title:'Titre',kind:'expense',status:'realized',occurredOn:'2026-01-01',amountMicros:'10000000',category:'A',paymentMethod:'Carte',note:null,projectId:1,tags:[2,3],...changes});
test('analysis combines metadata filters and allocates a split only once per selected category',()=>{
 const rows=[row(1,{splits:[{category:'A',amountMicros:'3000000'},{category:'B',amountMicros:'7000000'}]}),row(2,{status:'planned'}),row(3,{projectId:2})];const filter={category:'A',payment:'Carte',project:'1',tag:'2',nature:'',necessity:''};const result=analysisRows(rows,filter);assert.equal(result.length,2);assert.equal(result[0].amountMicros,'3000000');assert.deepEqual(periodMetrics(result),{income:0n,expense:3000000n,net:-3000000n,count:1});assert.equal(averageMicros(-1n,2),-1n);assert.equal(averageMicros(1n,0),0n);
});
test('multiple sorting applies exact amount order after the primary key and keeps deterministic ties',()=>{
 const rows=[row(2,{title:'B',amountMicros:'900719925474099'}),row(3,{title:'A',amountMicros:'20'}),row(1,{title:'A',amountMicros:'100'})];assert.deepEqual(sortGridMulti(rows,[{field:'title',direction:'asc'},{field:'amountMicros',direction:'desc'}]).map(r=>r.id),[1,3,2]);
 const csv=transactionsCsv([row(1,{amountMicros:'-1000001',title:'-text'})]);assert.ok(csv.includes('"-1.000001"'));assert.ok(csv.includes('"\'-text"'));
});
