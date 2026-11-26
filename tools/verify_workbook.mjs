// Read-only reconciliation of the JS XLSX reader against the independent Python audit.
// Node uses a stdlib XML adapter here. WebView2 still requires an interactive check.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readWorkbook} from '../src/domain/workbook.ts';
import {annualSummary,categoryMatrix} from '../src/domain/annual.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
const path=process.argv[2];if(!path)throw Error('Usage: node tools/verify_workbook.mjs path.xlsx');
function python(code,args=[],input){const result=spawnSync('python',['-X','utf8','-B','-c',code,...args],{cwd:root,input,encoding:'utf8',maxBuffer:64*1024*1024});if(result.status!==0)throw Error(result.stderr||'XML audit failed');return JSON.parse(result.stdout);}
const xmlCode=`import sys,json,xml.etree.ElementTree as E
def node(e):
 return {'tag':e.tag,'attributes':e.attrib,'text':e.text or '', 'tail':e.tail or '', 'children':[node(c) for c in e]}
print(json.dumps(node(E.fromstring(sys.stdin.read())),ensure_ascii=False))`;
class XmlElement{
 constructor(value){this.value=value;this.children=value.children.map(c=>new XmlElement(c));}
 get textContent(){return this.value.text+this.children.map(c=>c.textContent+c.value.tail).join('');}
 getAttribute(name){return this.value.attributes[name]??null;}
 getAttributeNS(ns,name){return this.getAttribute(`{${ns}}${name}`);}
 getElementsByTagNameNS(ns,name){return this.children.flatMap(c=>[...(c.value.tag.split('}').at(-1)===name?[c]:[]),...c.getElementsByTagNameNS(ns,name)]);}
}
globalThis.DOMParser=class {
 parseFromString(source){const root=new XmlElement(python(xmlCode,[],source));return {documentElement:root,querySelector:()=>null,getElementsByTagNameNS:(ns,name)=>[...(root.value.tag.split('}').at(-1)===name?[root]:[]),...root.getElementsByTagNameNS(ns,name)]};}
};
const bytes=readFileSync(path),before=createHash('sha256').update(bytes).digest('hex');
const preview=await readWorkbook(new File([bytes],'Budget.xlsx'));
assert.deepEqual(preview.issues,[]);assert.deepEqual(preview.catalogIssues,[]);
const expected=python(`import json,sys
from zipfile import ZipFile
from tools.reconcile_budget import reconcile
from tools.audit_excel import read_xml,descendants,children
operations=[]
summary=reconcile(sys.argv[1],collect=operations.append)
assert not summary['issues']
rows=[{'title':t,'kind':k,'occurredOn':d.isoformat(),'amountMicros':str(int(a*1000000)),'category':c or None,'paymentMethod':p or None,'note':n or None} for t,k,d,a,c,p,n,*_ in operations]
with ZipFile(sys.argv[1]) as z:
 strings=[''.join(e.text or '' for e in descendants(si,'t')) for si in descendants(read_xml(z,'xl/sharedStrings.xml'),'si')] if 'xl/sharedStrings.xml' in z.namelist() else []
 sheet=read_xml(z,'xl/worksheets/sheet3.xml')
 catalog=[]
 for cell in descendants(sheet,'c'):
  ref=cell.get('r','');column=''.join(c for c in ref if c.isalpha());row=int(''.join(c for c in ref if c.isdigit()) or '0')
  kind={'B':'income','D':'expense','G':'payment'}.get(column)
  if not kind or row<6 or row>({'B':35,'D':55,'G':35}[column]):continue
  value=next(children(cell,'v'),None)
  name=strings[int(value.text)] if cell.get('t')=='s' and value is not None else ''.join(e.text or '' for e in descendants(cell,'t')) if cell.get('t')=='inlineStr' else value.text if value is not None else ''
  if name and name.strip() and {'kind':kind,'name':name} not in catalog:catalog.append({'kind':kind,'name':name})
print(json.dumps({'rows':rows,'catalog':catalog,'summary':summary},default=str,ensure_ascii=False))`,[path]);
const canonical=rows=>rows.map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).sort();
assert.deepEqual(canonical(preview.rows),canonical(expected.rows));
assert.deepEqual(canonical(preview.catalog),canonical(expected.catalog));
const reports=preview.rows.map((r,i)=>({...r,id:i+1,status:'realized'}));
for(const [year,control] of Object.entries(expected.summary.years)){
 const summary=annualSummary(reports,Number(year));
 // Compare monetary values through integer micros, never through binary floats.
 const micros=value=>{const [whole,fraction='']=value.split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'))*(value.startsWith('-')?-1n:1n);};
 for(const [key,source] of [['income','income'],['expense','expense'],['net','balance'],['savings','savings'],['currentExpense','current_expense']])assert.equal(summary[key],micros(control[source]));
 const categories=categoryMatrix(reports,Number(year),Number(year),'expense');assert.equal(categories.reduce((n,c)=>n+c.total,0n),summary.expense);
}
assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),before);
console.log(JSON.stringify({result:'OK',operations:preview.rows.length,incomeCategories:preview.catalog.filter(c=>c.kind==='income').length,expenseCategories:preview.catalog.filter(c=>c.kind==='expense').length,paymentMethods:preview.catalog.filter(c=>c.kind==='payment').length,yearsChecked:Object.keys(expected.summary.years).length,sourceUnchanged:true}));
