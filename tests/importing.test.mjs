import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceMicros,sourceDate,parseDelimited,convertMicros} from '../src/domain/importing.ts';
import {mapRows,suggestMapping} from '../src/domain/mapping.ts';
test('import parses exact decimal, Excel noise, localized currency, signs and quoted multiline CSV',()=>{
 assert.equal(sourceMicros('1 234,567891'),1234567891n);assert.equal(sourceMicros('(2,50)'),-2500000n);assert.equal(sourceMicros('0.30000000000000004'),300000n);assert.equal(sourceMicros('1.23e2'),123000000n);assert.throws(()=>sourceMicros('0.1234567'));assert.throws(()=>sourceMicros('=1+2'));
 assert.deepEqual(parseDelimited('\uFEFFDate;Titre;Note\r\n2026-01-01;"אוכל";"un;deux\nligne ""2"""',';'),[['Date','Titre','Note'],['2026-01-01','אוכל','un;deux\nligne "2"']]);assert.throws(()=>parseDelimited('"a"oops;', ';'));assert.throws(()=>parseDelimited('"a', ';'));
 assert.equal(sourceDate('61','excel'),'1900-03-01');assert.throws(()=>sourceDate('60','excel'));assert.equal(sourceDate('0','excel',true),'1904-01-01');assert.equal(sourceDate('31/12/2026','dmy'),'2026-12-31');assert.throws(()=>sourceDate('31/02/2026','dmy'));assert.equal(convertMicros(-1n,1500000n),-2n);
});
test('mapping preserves two identical legitimate rows, source coordinates and exact manual currency conversion',()=>{
 const headers=['Date','Description','Montant','Devise','Taux','Note'];const m=suggestMapping(headers);const sheet={name:'Données',rows:[{number:1,cells:headers,errors:[]},...[2,3].map(number=>({number,cells:['31/01/2026','Salaire','12,345678','USD','3,50','שלום\nDeux lignes'],errors:[]}))]};
 const options={first:2,last:3,kind:'income',dateFormat:'dmy',decimal:',',currency:'ILS',rate:'',fingerprint:'abc'};const result=mapRows(sheet,m,options);assert.deepEqual(result.issues,[]);assert.equal(result.rows.length,2);assert.equal(result.rows[0].amountMicros,'43209873');assert.equal(result.rows[0].originalMicros,'12345678');assert.equal(result.rows[0].note,'שלום\nDeux lignes');assert.notEqual(result.rows[0].sourceKey,result.rows[1].sourceKey);
 sheet.rows[1].cells[4]='';const failed=mapRows(sheet,m,options);assert.equal(failed.issues.length,1);assert.equal(failed.rows.length,1);
});
