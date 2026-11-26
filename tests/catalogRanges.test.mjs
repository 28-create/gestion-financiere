import test from 'node:test';import assert from 'node:assert/strict';
import {catalogRanges} from '../src/domain/catalogRanges.ts';
test('full reference ranges follow workbook definitions and include unused cells beyond COUNTA gaps',()=>{
 const result=catalogRanges([{name:'ListeDepenses',formula:'OFFSET(Categories!$D$6,0,0,COUNTA(Categories!$D$6:$D$55),1)'},{name:'ListePaiements',formula:'OFFSET(Categories!$G$6,0,0,COUNTA(Categories!$G$6:$G$35),1)'},{name:'ListeRevenus',formula:"'Categories'!$B$6:$B$35"}]);
 assert.deepEqual(result.issues,[]);assert.deepEqual(result.ranges[0],{kind:'expense',sheet:'Categories',column:'D',first:6,last:55});assert.equal(result.ranges.length,3);
});
test('unsupported formulas and missing lists are reported rather than silently imported',()=>{
 const result=catalogRanges([{name:'ListeDepenses',formula:'SUM(Categories!D6:D55)'}]);assert.equal(result.ranges.length,0);assert.ok(result.issues.length>=3);
});
