import test from 'node:test';import assert from 'node:assert/strict';
import {parseTsv,pastedDrafts,gridPayload,sortGridRows} from '../src/domain/grid.ts';
test('Excel paste preserves Unicode and quoted multiline notes and rejects incomplete input',()=>{
 const rows=pastedDrafts('25/11/2026\tחנות\t1\u202f234,50\tCourses\tCarte\t"première ligne\nseconde ""ligne"""\r\n','expense');
 assert.equal(rows.length,1);assert.equal(rows[0].occurredOn,'2026-11-25');assert.equal(rows[0].note,'première ligne\nseconde "ligne"');assert.equal(gridPayload({...rows[0],key:'test'}).input.amountMicros,'1234500000');
 assert.throws(()=>pastedDrafts('30/02/2026\tTest\t10','expense'));assert.throws(()=>pastedDrafts('2026-11-25\tTest','income'));assert.throws(()=>parseTsv('a\t"incomplete'));assert.throws(()=>pastedDrafts('2026-11-25\tTest\t=1+2','expense'));
});
test('grid sorting is numeric for amounts and independent of the displayed page',()=>{
 const rows=[{id:3,amountMicros:'100'},{id:1,amountMicros:'2'},{id:2,amountMicros:'-10'}];assert.deepEqual(sortGridRows(rows,'amountMicros','asc').map(r=>r.id),[2,1,3]);assert.deepEqual(rows.map(r=>r.id),[3,1,2]);
});
