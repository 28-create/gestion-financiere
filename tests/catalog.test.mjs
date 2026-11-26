import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import assert from 'node:assert/strict';
import {availableItems} from '../src/domain/catalog.ts';
const migration=name=>readFileSync(new URL(`../src-tauri/migrations/${name}`,import.meta.url),'utf8');
function olderDatabase(){const db=new DatabaseSync(':memory:');db.exec(migration('001_ledger.sql'));db.exec(migration('002_workbook_fields.sql'));db.exec(migration('003_import.sql'));return db;}
const insert=(db,kind,category,payment)=>db.prepare("INSERT INTO transactions(title,kind,status,occurred_on,amount_micros,category,payment_method) VALUES ('Test',?,'realized','2026-11-25',1000000,?,?)").run(kind,category,payment);
test('catalog migration preserves financial data, creates separate lists and retains multilingual names',()=>{
 const db=olderDatabase();try{
  insert(db,'expense','אוכל','Carte');insert(db,'income','אוכל','Carte');insert(db,'expense','Ancienne','Espèces');
  db.prepare('UPDATE transactions SET deleted_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=3').run();
  const before=db.prepare('SELECT * FROM transactions ORDER BY id').all();
  const historyBefore=db.prepare('SELECT * FROM transaction_history ORDER BY transaction_id,revision').all();
  db.exec(migration('004_catalog.sql'));
  assert.deepEqual(db.prepare('SELECT * FROM transactions ORDER BY id').all(),before);
  assert.deepEqual(db.prepare('SELECT * FROM transaction_history ORDER BY transaction_id,revision').all(),historyBefore);
  assert.equal(db.prepare('SELECT count(*) AS n FROM catalog_items WHERE name=?').get('אוכל').n,2);
  assert.equal(db.prepare("SELECT count(*) AS n FROM catalog_items WHERE kind='payment' AND name='Carte'").get().n,1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM catalog_items WHERE name='Ancienne'").get().n,1);
 }finally{db.close();}
});
test('new and edited transactions populate lists without reactivating archived names',()=>{
 const db=olderDatabase();try{
  db.exec(migration('004_catalog.sql'));
  insert(db,'expense','Courses','Carte');
  db.prepare("UPDATE catalog_items SET archived=1 WHERE kind='expense' AND name='Courses'").run();
  insert(db,'expense','Courses','Carte');
  assert.equal(db.prepare("SELECT archived FROM catalog_items WHERE name='Courses'").get().archived,1);
  db.prepare("UPDATE transactions SET category='Nouveau',kind='income',payment_method='Virement',revision=revision+1 WHERE id=1").run();
  assert.equal(db.prepare("SELECT count(*) AS n FROM catalog_items WHERE kind='income' AND name='Nouveau'").get().n,1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM catalog_items WHERE kind='payment' AND name='Virement'").get().n,1);
  const history=db.prepare('SELECT category FROM transaction_history WHERE transaction_id=1 AND revision=1').get();assert.equal(history.category,'Courses');
 }finally{db.close();}
});
test('form suggestions exclude archived names and the other transaction kind',()=>{
 const items=[{id:1,kind:'expense',name:'Courses',archived:false},{id:2,kind:'expense',name:'Ancien',archived:true},{id:3,kind:'income',name:'Salaire',archived:false},{id:4,kind:'payment',name:'Carte',archived:false}];
 assert.deepEqual(availableItems(items,'expense').map(i=>i.name),['Courses']);
 assert.deepEqual(availableItems(items,'payment').map(i=>i.name),['Carte']);
});
