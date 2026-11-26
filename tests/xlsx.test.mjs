import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeXlsx} from '../src/domain/xlsx.ts';
test('XLSX export is a valid OOXML ZIP, preserves Hebrew and stores formula-looking text as literal text',()=>{
 const bytes=writeXlsx([{name:'הכנסות',rows:[['Title','Amount'],['=1+2',{number:'-123.456789'}],['אבג " < &',{number:'123456789012345678.123456'}]]},{name:'הכנסות',rows:[['Note'],['a\r\nb']]}],true);
 const result=spawnSync('python',['-X','utf8','-c',`import sys,json,io,zipfile,xml.etree.ElementTree as E
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()));assert z.testzip() is None
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for name in z.namelist(): E.fromstring(z.read(name))
root=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
cells={c.get('r'):c for c in root.findall('.//s:c',ns)}
assert cells['A2'].get('t')=='inlineStr'
assert cells['A2'].find('s:is/s:t',ns).text=='=1+2'
assert cells['B2'].find('s:v',ns).text=='-123.456789'
assert cells['A3'].find('s:is/s:t',ns).text=='אבג " < &'
assert cells['B3'].get('t')=='inlineStr'
assert cells['B3'].find('s:is/s:t',ns).text=='123456789012345678.123456'
workbook=E.fromstring(z.read('xl/workbook.xml'))
names=[n.get('name') for n in workbook.findall('.//s:sheet',ns)]
assert len(set(names))==2
print('OK')`],{input:bytes,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'OK');
});
test('XLSX opens in an independent spreadsheet reader when available',t=>{
 const check=spawnSync('python',['-c','import openpyxl'],{encoding:'utf8'});if(check.status!==0){t.skip('openpyxl unavailable locally; installed by Windows CI');return;}
 const bytes=writeXlsx([{name:'Données',rows:[['Titre','Montant'],['שלום',{number:'123.456789'}]]}],true);
 const result=spawnSync('python',['-c',"import sys,io;from openpyxl import load_workbook; w=load_workbook(io.BytesIO(sys.stdin.buffer.read())); s=w.active; assert s['A2'].value=='שלום'; assert s['B2'].value==123.456789; assert s.freeze_panes=='A2'; assert s.sheet_view.rightToLeft; print('OK')"],{input:bytes,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
