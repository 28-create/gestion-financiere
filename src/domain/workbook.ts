import { parseAmount } from './money.ts';
import {catalogRanges,type CatalogValue} from './catalogRanges.ts';
import {sourceMicros} from './importing.ts';
export type ImportRow = { title:string; kind:string; occurredOn:string; amountMicros:string; category:string|null; paymentMethod:string|null; note:string|null;sourceKey?:string;sourceSheet?:string;sourceTable?:string;sourceRow?:number;currency?:string;originalMicros?:string;rateMicros?:string;rateDate?:string };
export type Preview = { rows:ImportRow[]; issues:string[]; catalog:CatalogValue[];catalogIssues:string[] };
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const xml=(s:string)=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('XML invalide');return d;};
const nodes=(e:Document|Element,n:string)=>Array.from(e.getElementsByTagNameNS('*',n));
const text=(e:Element,n:string)=>nodes(e,n).map(v=>v.textContent??'').join('');

async function unzip(buffer:ArrayBuffer) {
 const view=new DataView(buffer); const bytes=new Uint8Array(buffer); const decoder=new TextDecoder();
 let end=buffer.byteLength-22;
 while(end>=Math.max(0,buffer.byteLength-65557)&&view.getUint32(end,true)!==0x06054b50)end--;
 if(end<0||view.getUint32(end,true)!==0x06054b50)throw Error('Archive Excel invalide');
 let offset=view.getUint32(end+16,true); const count=view.getUint16(end+10,true);
 const files=new Map<string,string>(); let total=0;
 for(let i=0;i<count;i++) {
  if(view.getUint32(offset,true)!==0x02014b50)throw Error('Archive Excel invalide');
  const method=view.getUint16(offset+10,true), size=view.getUint32(offset+20,true), expanded=view.getUint32(offset+24,true);
  const length=view.getUint16(offset+28,true), extra=view.getUint16(offset+30,true), comment=view.getUint16(offset+32,true);
  const name=decoder.decode(bytes.slice(offset+46,offset+46+length));
  const local=view.getUint32(offset+42,true);
  offset+=46+length+extra+comment;
  if(!name.endsWith('.xml')&&!name.endsWith('.rels'))continue;
  total+=expanded;if(expanded>30_000_000||total>100_000_000)throw Error('Classeur trop volumineux');
  const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
  const content=bytes.slice(start,start+size);
  if(method===0)files.set(name,decoder.decode(content));
  else if(method===8){
   const stream=new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const reader=stream.getReader();let received=0;const chunks:ArrayBuffer[]=[];
   for(;;){const part=await reader.read();if(part.done)break;received+=part.value.length;if(received>expanded||received>30_000_000){await reader.cancel();throw Error('Archive trop volumineuse');}const copy=new Uint8Array(part.value.length);copy.set(part.value);chunks.push(copy.buffer);}
   files.set(name,await new Blob(chunks).text());
  } else throw Error('Compression Excel non prise en charge');
 }
 return files;
}
function resolve(base:string,target:string){const parts=target.startsWith('/')?[]:base.split('/').slice(0,-1);for(const part of target.split('/')){if(part==='..')parts.pop();else if(part&&part!=='.')parts.push(part);}return parts.join('/');}
export type SourceSheet={name:string;rows:{number:number;cells:string[];errors:number[]}[]};
export type SourceBook={sheets:SourceSheet[];since1904:boolean;fingerprint:string};
export async function readWorkbookTables(file:File):Promise<SourceBook>{
 if(file.size>30000000)throw Error('size');const buffer=await file.arrayBuffer(),files=await unzip(buffer);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const required=(path:string)=>{const value=files.get(path);if(!value)throw Error('xlsx');return xml(value);};const book=required('xl/workbook.xml');
 const links=new Map(nodes(required('xl/_rels/workbook.xml.rels'),'Relationship').map(r=>[r.getAttribute('Id'),resolve('xl/workbook.xml',r.getAttribute('Target')??'')]));
 const strings=files.has('xl/sharedStrings.xml')?nodes(required('xl/sharedStrings.xml'),'si').map(si=>text(si,'t')):[];const sheets:SourceSheet[]=[];
 for(const sheet of nodes(book,'sheet')){const path=links.get(sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));if(!path||!path.startsWith('xl/worksheets/'))continue;const data=required(path),rows:SourceSheet['rows']=[];
  for(const row of nodes(data,'row')){const cells:string[]=[],errors:number[]=[];for(const cell of nodes(row,'c')){const ref=/^([A-Z]+)\d+$/.exec(cell.getAttribute('r')??'');if(!ref)throw Error('xlsx');const column=Array.from(ref[1]).reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;if(column>16383)throw Error('xlsx');const kind=cell.getAttribute('t'),value=text(cell,'v');cells[column]=kind==='s'?strings[Number(value)]:kind==='inlineStr'?text(cell,'t'):value;if(kind==='e')errors.push(column);}rows.push({number:Number(row.getAttribute('r')),cells,errors});if(rows.length>100000)throw Error('size');}
  sheets.push({name:sheet.getAttribute('name')??'',rows});
 }return {sheets,since1904:['1','true'].includes(nodes(book,'workbookPr')[0]?.getAttribute('date1904')??''),fingerprint};
}
export async function readWorkbook(file:File):Promise<Preview>{
 if(file.size>30_000_000)throw Error('Fichier limité à 30 Mo');
 const buffer=await file.arrayBuffer();const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const files=await unzip(buffer);
 const required=(name:string)=>{const value=files.get(name);if(!value)throw Error(`Partie Excel absente : ${name}`);return xml(value);};
 const book=required('xl/workbook.xml'), rels=required('xl/_rels/workbook.xml.rels');
 const links=new Map(nodes(rels,'Relationship').map(r=>[r.getAttribute('Id'),resolve('xl/workbook.xml',r.getAttribute('Target')??'')]));
 const strings=files.has('xl/sharedStrings.xml')?nodes(required('xl/sharedStrings.xml'),'si').map(s=>text(s,'t')):[];
 const since1904=['1','true'].includes(nodes(book,'workbookPr')[0]?.getAttribute('date1904')??'');
 const definitions=nodes(book,'definedName').map(n=>({name:n.getAttribute('name')??'',formula:n.textContent??''}));
 const references=catalogRanges(definitions);
 const result:Preview={rows:[],issues:[],catalog:[],catalogIssues:[...references.issues]};let tables=0;
 const sheetPaths=new Map(nodes(book,'sheet').map(s=>[s.getAttribute('name'),links.get(s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'))]));
 for(const reference of references.ranges){
  const path=sheetPaths.get(reference.sheet);if(!path){result.catalogIssues.push(`${reference.sheet} : feuille absente`);continue;}
  const cells=new Map(nodes(required(path),'c').map(c=>[c.getAttribute('r'),c]));
  for(let row=reference.first;row<=reference.last;row++){
   const cell=cells.get(`${reference.column}${row}`);if(!cell)continue;
   if(cell.getAttribute('t')==='e'||nodes(cell,'f').length){result.catalogIssues.push(`${reference.sheet}!${reference.column}${row} : valeur de liste non validée`);continue;}
   const kind=cell.getAttribute('t'),value=text(cell,'v');const name=kind==='s'?strings[Number(value)]:kind==='inlineStr'?text(cell,'t'):value;
   if(name?.trim()&&!result.catalog.some(c=>c.kind===reference.kind&&c.name===name))result.catalog.push({kind:reference.kind,name});
  }
 }
 for(const sheet of nodes(book,'sheet')){
  const name=sheet.getAttribute('name')??'';
  const id=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const path=links.get(id);if(!path)continue;
  const data=required(path), cells=new Map(nodes(data,'c').map(c=>[c.getAttribute('r'),c]));
  const relpath=path.replace(/([^/]+)$/,'_rels/$1.rels');if(!files.has(relpath))continue;
  for(const rel of nodes(required(relpath),'Relationship')){
   if(!rel.getAttribute('Type')?.endsWith('/table'))continue;
   const table=required(resolve(path,rel.getAttribute('Target')??'')); const root=table.documentElement;
   const tableName=root.getAttribute('name')??'';
   const kind=/^tblrev/i.test(tableName)?'income':/^tbldep/i.test(tableName)?'expense':null;
   if(!kind){result.issues.push(`${name} / ${tableName} : type de tableau non reconnu`);continue;}tables++;
   const range=/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(root.getAttribute('ref')??'');
   if(!range){result.issues.push(`${name} : plage invalide`);continue;}
   const number=(s:string)=>Array.from(s).reduce((v,c)=>v*26+c.charCodeAt(0)-64,0);
   const label=(n:number):string=>n?label(Math.floor((n-1)/26))+String.fromCharCode(65+(n-1)%26):'';
   const columns=new Map(nodes(table,'tableColumn').map((c,i)=>[normalize(c.getAttribute('name')??'').replace(/^montant.*$/,'montant'),label(number(range[1])+i)]));
   if(['date','description','montant'].some(c=>!columns.has(c))){result.issues.push(`${name} : colonnes requises absentes`);continue;}
   const last=Number(range[4])-Number(root.getAttribute('totalsRowCount')??0);
   for(let row=Number(range[2])+Number(root.getAttribute('headerRowCount')??1);row<=last;row++){
    try{
     const get=(field:string)=>{const c=cells.get(`${columns.get(field)}${row}`);if(!c)return '';const type=c.getAttribute('t');if(type==='e')throw Error('cellule Excel en erreur');const v=text(c,'v');return type==='s'?strings[Number(v)]:type==='inlineStr'?text(c,'t'):v;};
     const date=get('date'),title=get('description'),amount=get('montant');
     const category=get('categorie'),paymentMethod=get('source')||get('moyen de paiement'),note=get('note');
     if(!date&&!title&&(!amount||Number(amount)===0)&&!category&&!paymentMethod&&!note)continue;
     if(!date||!title||!amount)throw Error('date, titre ou montant manquant');
     let when=date;
     if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      const serial=Number(date);if(!Number.isInteger(serial)||serial<0||(!since1904&&serial===60))throw Error('date Excel invalide');
      when=new Date(Date.UTC(since1904?1904:1899,since1904?0:11,since1904?1:31)+(serial-(!since1904&&serial>60?1:0))*86400000).toISOString().slice(0,10);
     }
     const micros=sourceMicros(amount);
     result.rows.push({title,kind,occurredOn:when,amountMicros:micros.toString(),category:category||null,paymentMethod:paymentMethod||null,note:note||null,sourceKey:`${fingerprint}:${name}:${tableName}:${row}`,sourceSheet:name,sourceTable:tableName,sourceRow:row});
    }catch(error){result.issues.push(`${name} / ${tableName} / ligne ${row} : ${String(error)}`);}
   }
  }
 }
 if(!tables)result.issues.push('Aucun tableau de revenus ou dépenses reconnu. Utilisez le classeur Budget original avec ses tableaux structurés.');
 return result;
}
