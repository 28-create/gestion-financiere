use std::sync::Mutex;
use rusqlite::{params,Connection,TransactionBehavior};
use serde::{Deserialize,Serialize};
use tauri::State;
type Db<'a>=State<'a,Mutex<Connection>>;

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Item {id:i64,kind:String,name:String,archived:bool,revision:i64,uses:i64}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
pub struct ItemInput {id:Option<i64>,revision:Option<i64>,kind:String,name:String,archived:bool}
fn error(_:rusqlite::Error)->String{"database".into()}

fn list(db:&Connection)->Result<Vec<Item>,String>{
 let mut stmt=db.prepare("SELECT c.id,c.kind,c.name,c.archived,c.revision,(SELECT count(*) FROM transactions t WHERE t.deleted_at IS NULL AND ((c.kind='payment' AND t.payment_method=c.name) OR (c.kind=t.kind AND t.category=c.name))) FROM catalog_items c ORDER BY c.id").map_err(error)?;
 let rows=stmt.query_map([],|r|Ok(Item{id:r.get(0)?,kind:r.get(1)?,name:r.get(2)?,archived:r.get(3)?,revision:r.get(4)?,uses:r.get(5)?})).map_err(error)?;
 rows.collect::<rusqlite::Result<Vec<_>>>().map_err(error)
}
#[tauri::command]
pub fn list_catalog(database:Db<'_>)->Result<Vec<Item>,String>{
 let db=database.lock().map_err(|_|"database")?;list(&db)
}
#[tauri::command]
pub fn list_titles(database:Db<'_>)->Result<Vec<String>,String>{
 let db=database.lock().map_err(|_|"database")?;
 let mut stmt=db.prepare("SELECT title FROM transactions WHERE deleted_at IS NULL GROUP BY title ORDER BY max(occurred_on) DESC,max(id) DESC LIMIT 1000").map_err(error)?;
 let rows=stmt.query_map([],|r|r.get(0)).map_err(error)?;
 rows.collect::<rusqlite::Result<Vec<_>>>().map_err(error)
}
fn save(db:&mut Connection,input:ItemInput)->Result<(),String>{
 let name=input.name.trim();
 if name.is_empty()||name.chars().count()>200||!matches!(input.kind.as_str(),"income"|"expense"|"payment"){return Err("validation".into());}
 let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(error)?;
 match(input.id,input.revision){
  (None,None)=>{tx.execute("INSERT INTO catalog_items(kind,name,archived) VALUES (?1,?2,?3)",params![input.kind,name,input.archived]).map_err(|_|"duplicate".to_string())?;},
  (Some(id),Some(revision))=>{
   let (kind,old):(String,String)=tx.query_row("SELECT kind,name FROM catalog_items WHERE id=?1 AND revision=?2",params![id,revision],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"conflict".to_string())?;
   if kind!=input.kind{return Err("validation".into());}
   tx.execute("UPDATE catalog_items SET name=?1,archived=?2,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?3 AND revision=?4",params![name,input.archived,id,revision]).map_err(|_|"duplicate".to_string())?;
   if old!=name {
    if kind=="payment" {
     tx.execute("UPDATE transactions SET payment_method=?1,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE payment_method=?2",params![name,old]).map_err(error)?;
    } else {
     tx.execute("UPDATE transactions SET category=?1,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE category=?2 AND kind=?3",params![name,old,kind]).map_err(error)?;
    }
   }
  },
  _=>return Err("conflict".into())
 }
 tx.commit().map_err(error)
}
#[tauri::command]
pub fn save_catalog_item(database:Db<'_>,input:ItemInput)->Result<(),String>{
 let mut db=database.lock().map_err(|_|"database")?;save(&mut db,input)
}
#[cfg(test)]
mod tests {
 use super::*;
 #[test]
 fn rename_preserves_history_and_type_and_archive_preserves_transactions(){
  let mut db=Connection::open_in_memory().unwrap();crate::ledger::migrate(&mut db).unwrap();
  for kind in ["expense","income"] {db.execute("INSERT INTO transactions(title,kind,status,occurred_on,amount_micros,category,payment_method) VALUES ('Test',?1,'realized','2026-11-25',1000000,'Identique','Carte')",[kind]).unwrap();}
  let items=list(&db).unwrap();let item=items.iter().find(|i|i.kind=="expense").unwrap();
  save(&mut db,ItemInput{id:Some(item.id),revision:Some(item.revision),kind:"expense".into(),name:"Nouveau".into(),archived:false}).unwrap();
  let name:String=db.query_row("SELECT category FROM transactions WHERE kind='income'",[],|r|r.get(0)).unwrap();assert_eq!(name,"Identique");
  let old:String=db.query_row("SELECT category FROM transaction_history WHERE kind='expense' AND revision=1",[],|r|r.get(0)).unwrap();assert_eq!(old,"Identique");
  let item=list(&db).unwrap().into_iter().find(|i|i.kind=="expense").unwrap();assert_eq!(item.name,"Nouveau");assert_eq!(item.uses,1);
  assert!(save(&mut db,ItemInput{id:Some(item.id),revision:Some(1),kind:"expense".into(),name:"Conflit".into(),archived:false}).is_err());
  save(&mut db,ItemInput{id:Some(item.id),revision:Some(item.revision),kind:"expense".into(),name:item.name,archived:true}).unwrap();
  let count:i64=db.query_row("SELECT count(*) FROM transactions",[],|r|r.get(0)).unwrap();assert_eq!(count,2);
 }
}
