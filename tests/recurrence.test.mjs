import test from 'node:test';import assert from 'node:assert/strict';
import {occurrences,dueThrough,hebrewParts} from '../src/domain/recurrence.ts';
const rule=extra=>({id:1,revision:1,kind:'recurrence',name:'R',archived:false,payload:{start:'2026-01-31',frequency:'monthly',calendar:'civil',interval:1,kind:'expense',amountMicros:'1000000',mode:'manual',...extra}});
test('monthly recurrence keeps its anchor day and supports counts, business days and exceptions',()=>{
 assert.deepEqual(occurrences(rule({count:3}),'2026-12-31').map(d=>d.scheduledOn),['2026-01-31','2026-02-28','2026-03-31']);
 assert.equal(occurrences(rule({start:'2026-01-15',policy:'firstBusiness',count:1}),'2026-03-01')[0].scheduledOn,'2026-02-01');
 assert.deepEqual(occurrences(rule({count:3,exceptions:[{on:'2026-02-28',skip:true},{on:'2026-03-31',date:'2026-04-05'}]}),'2026-04-30').map(d=>d.occurredOn),['2026-01-31','2026-04-05']);
});
test('Hebrew annual recurrence applies the selected Adar policy in leap years',()=>{
 const leap=occurrences(rule({start:'2026-03-03',calendar:'hebrew',frequency:'yearly',adar:'second',count:2}),'2027-12-31');
 assert.equal(leap.length,2);const dates=leap.map(d=>hebrewParts(new Date(d.scheduledOn+'T00:00:00Z')));assert.equal(dates[0].month,'Adar');assert.equal(dates[1].month,'Adar II');assert.equal(dates[0].day,dates[1].day);
});
test('catch-up excludes recorded occurrences and retains variable amounts for manual entry',()=>{
 const r=rule({start:'2026-01-01',frequency:'daily',variable:true});const known=new Set(['1:2026-01-01']);const due=dueThrough([r],'2026-01-03',known);assert.equal(due.length,2);assert.equal(due[0].scheduledOn,'2026-01-02');assert.equal(due[0].amountMicros,null);
 const recorded=new Set(occurrences(r,'2026-02-01',20).map(d=>`1:${d.scheduledOn}`));assert.equal(occurrences(r,'2026-02-01',20,recorded)[0].scheduledOn,'2026-01-21');
});
