import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateAmount} from '../src/domain/expression.ts';
test('restricted arithmetic uses exact rational calculation with a single final monetary rounding',()=>{
 assert.equal(evaluateAmount('0.1 + 0.2'),300000n);
 assert.equal(evaluateAmount('(100 + 20) * 3 / 2'),180000000n);
 assert.equal(evaluateAmount('1/3'),333333n);
 assert.equal(evaluateAmount('-1/2000000'),-1n);
 assert.equal(evaluateAmount('-(1,5 + 2) * 2'),-7000000n);
 for(const value of ['1/0','alert(1)','1e4','999999999*9','1+','1;2','((((((((((((((((((((((1))))))))))))))))))))))'])assert.throws(()=>evaluateAmount(value));
});
