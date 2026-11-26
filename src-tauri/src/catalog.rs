use std::sync::Mutex;
use rusqlite::{params,Connection,TransactionBehavior};
use serde::{Deserialize,Serialize};
use tauri::State;
type Db<'a>=State<'a,Mutex<Connection>>;

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Item {id:i64,kind:String,name:String,archived:bool,revision:i64,uses:i64,parent_id:Option<i64>,color:String,icon:String,translations:serde_json::Value,sort_order:Option<i64>}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
pub struct ItemInput {id:Option<i64>,revision:Option<i64>,kind:String,name:String,archived:bool,#[serde(default)] metadata:Option<serde_json::Value>}
fn error(_:rusqlite::Error)->String{"database".into()}

fn list(db:&Connection)->Result<Vec<Item>,String>{
 let mut stmt=db.prepare("SELECT c.id,c.kind,c.name,c.archived,c.revision,(SELECT count(*) FROM transactions t WHERE t.deleted_at IS NULL AND ((c.kind='payment' AND t.payment_method=c.name) OR (c.kind=t.kind AND t.category=c.name))),c.parent_id,c.color,c.icon,c.translations,c.sort_order FROM catalog_items c ORDER BY c.id").map_err(error)?;
 let rows=stmt.query_map([],|r|Ok(Item{id:r.get(0)?,kind:r.get(1)?,name:r.get(2)?,archived:r.get(3)?,revision:r.get(4)?,uses:r.get(5)?,parent_id:r.get(6)?,color:r.get(7)?,icon:r.get(8)?,translations:serde_json::from_str(&r.get::<_,String>(9)?).map_err(|e|rusqlite::Error::FromSqlConversionFailure(9,rusqlite::types::Type::Text,Box::new(e)))?,sort_order:r.get(10)?})).map_err(error)?;
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
fn metadata(db:&Connection,id:i64,kind:&str,meta:&serde_json::Value)->Result<(),String>{
 let color=meta["color"].as_str().unwrap_or("#087f78");let icon=meta["icon"].as_str().unwrap_or("");
 if color.len()!=7||!color.starts_with('#')||!color[1..].bytes().all(|c|c.is_ascii_hexdigit())||icon.chars().count()>40{return Err("validation".into());}
 let translations=meta["translations"].as_object().cloned().unwrap_or_default();for (language,value) in &translations{if !matches!(language.as_str(),"fr"|"he"|"en")||value.as_str().is_none_or(|v|v.chars().count()>200){return Err("validation".into());}}
 let parent=meta["parentId"].as_i64();if parent.is_some()&&kind=="payment"{return Err("parent".into());}
 let mut next=parent;let mut seen=std::collections::HashSet::new();while let Some(current)=next{if current==id||!seen.insert(current){return Err("parent".into());}let (parent_kind,ancestor):(String,Option<i64>)=db.query_row("SELECT kind,parent_id FROM catalog_items WHERE id=?1",[current],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"parent".to_string())?;if parent_kind!=kind{return Err("parent".into());}next=ancestor;}
 db.execute("UPDATE catalog_items SET parent_id=?1,color=?2,icon=?3,translations=?4,sort_order=?5 WHERE id=?6",params![parent,color,icon,serde_json::Value::Object(translations).to_string(),meta["sortOrder"].as_i64(),id]).map_err(error)?;Ok(())
}
fn rename_references(db:&Connection,kind:&str,old:&str,name:&str)->Result<(),String>{
 let mut statement=db.prepare("SELECT id,revision FROM transactions t WHERE (?1='payment' AND payment_method=?2) OR (kind=?1 AND (category=?2 OR EXISTS(SELECT 1 FROM transaction_splits s WHERE s.transaction_id=t.id AND s.category=?2)))").map_err(error)?;
 let affected=statement.query_map(params![kind,old],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,i64>(1)?))).map_err(error)?.collect::<rusqlite::Result<Vec<_>>>().map_err(error)?;
 for (id,revision) in &affected{let details=crate::details::read(db,*id)?;db.execute("INSERT OR IGNORE INTO detail_history(transaction_id,revision,payload) VALUES (?1,?2,?3)",params![id,revision,serde_json::to_string(&details).map_err(|_|"database")?]).map_err(error)?;}
 if kind=="payment"{db.execute("UPDATE transactions SET payment_method=?1,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE payment_method=?2",params![name,old]).map_err(error)?;db.execute("UPDATE feature_items SET payload=json_set(payload,'$.paymentMethod',?1),revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE kind IN ('template','recurrence','classification') AND json_extract(payload,'$.paymentMethod')=?2",params![name,old]).map_err(error)?;}
 else {
  db.execute("UPDATE transactions SET category=CASE WHEN category=?2 THEN ?1 ELSE category END,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE kind=?3 AND (category=?2 OR EXISTS(SELECT 1 FROM transaction_splits s WHERE s.transaction_id=transactions.id AND s.category=?2))",params![name,old,kind]).map_err(error)?;
  db.execute("UPDATE transaction_splits SET category=?1 WHERE category=?2 AND transaction_id IN (SELECT id FROM transactions WHERE kind=?3)",params![name,old,kind]).map_err(error)?;
  db.execute("UPDATE feature_items SET payload=json_set(payload,'$.category',?1),revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE json_extract(payload,'$.category')=?2 AND ((kind='budget' AND ?3='expense') OR (kind IN ('template','recurrence','classification') AND json_extract(payload,'$.kind')=?3))",params![name,old,kind]).map_err(error)?;
 }
 for (id,_) in affected{let details=crate::details::read(db,id)?;db.execute("INSERT OR REPLACE INTO detail_history(transaction_id,revision,payload) SELECT id,revision,?2 FROM transactions WHERE id=?1",params![id,serde_json::to_string(&details).map_err(|_|"database")?]).map_err(error)?;}Ok(())
}
#[tauri::command]
pub fn merge_catalog(database:Db<'_>,id:i64,revision:i64,target_id:i64,target_revision:i64)->Result<(),String>{
 if id==target_id{return Err("target".into());}let mut db=database.lock().map_err(|_|"database")?;let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(error)?;
 let (kind,old):(String,String)=tx.query_row("SELECT kind,name FROM catalog_items WHERE id=?1 AND revision=?2",params![id,revision],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"conflict")?;
 let (target_kind,name):(String,String)=tx.query_row("SELECT kind,name FROM catalog_items WHERE id=?1 AND revision=?2 AND archived=0",params![target_id,target_revision],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"conflict")?;if kind!=target_kind{return Err("kind".into());}
 let mut current=Some(target_id);while let Some(ancestor)=current{if ancestor==id{return Err("parent".into());}current=tx.query_row("SELECT parent_id FROM catalog_items WHERE id=?1",[ancestor],|r|r.get(0)).map_err(error)?;}
 rename_references(&tx,&kind,&old,&name)?;
 tx.execute("UPDATE catalog_items SET parent_id=?1,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE parent_id=?2",params![target_id,id]).map_err(error)?;
 tx.execute("UPDATE catalog_items SET archived=1,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?1",[id]).map_err(error)?;
 tx.execute("UPDATE catalog_items SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?1",[target_id]).map_err(error)?;
 tx.commit().map_err(error)
}
fn save(db:&mut Connection,input:ItemInput)->Result<(),String>{
 let name=input.name.trim();
 if name.is_empty()||name.chars().count()>200||!matches!(input.kind.as_str(),"income"|"expense"|"payment"){return Err("validation".into());}
 let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(error)?;
 let id=match(input.id,input.revision){
  (None,None)=>{tx.execute("INSERT INTO catalog_items(kind,name,archived) VALUES (?1,?2,?3)",params![input.kind,name,input.archived]).map_err(|_|"duplicate".to_string())?;tx.last_insert_rowid()},
  (Some(id),Some(revision))=>{
   let (kind,old):(String,String)=tx.query_row("SELECT kind,name FROM catalog_items WHERE id=?1 AND revision=?2",params![id,revision],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"conflict".to_string())?;
   if kind!=input.kind{return Err("validation".into());}
   tx.execute("UPDATE catalog_items SET name=?1,archived=?2,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?3 AND revision=?4",params![name,input.archived,id,revision]).map_err(|_|"duplicate".to_string())?;
   if old!=name {
    rename_references(&tx,&kind,&old,name)?;
   }
   id
  },
  _=>return Err("conflict".into())
 };
 if let Some(meta)=input.metadata{metadata(&tx,id,&input.kind,&meta)?;}
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
  save(&mut db,ItemInput{id:Some(item.id),revision:Some(item.revision),kind:"expense".into(),name:"Nouveau".into(),archived:false,metadata:None}).unwrap();
  let name:String=db.query_row("SELECT category FROM transactions WHERE kind='income'",[],|r|r.get(0)).unwrap();assert_eq!(name,"Identique");
  let old:String=db.query_row("SELECT category FROM transaction_history WHERE kind='expense' AND revision=1",[],|r|r.get(0)).unwrap();assert_eq!(old,"Identique");
  let item=list(&db).unwrap().into_iter().find(|i|i.kind=="expense").unwrap();assert_eq!(item.name,"Nouveau");assert_eq!(item.uses,1);
  assert!(save(&mut db,ItemInput{id:Some(item.id),revision:Some(1),kind:"expense".into(),name:"Conflit".into(),archived:false,metadata:None}).is_err());
  save(&mut db,ItemInput{id:Some(item.id),revision:Some(item.revision),kind:"expense".into(),name:item.name,archived:true,metadata:None}).unwrap();
  let count:i64=db.query_row("SELECT count(*) FROM transactions",[],|r|r.get(0)).unwrap();assert_eq!(count,2);
 }
}
#[tauri::command]
pub fn title_habit(database:tauri::State<'_,std::sync::Mutex<rusqlite::Connection>>,title:String,kind:String)->Result<Option<serde_json::Value>,String>{
 if title.trim().is_empty()||title.chars().count()>200||!matches!(kind.as_str(),"income"|"expense"){return Ok(None);}
 let db=database.lock().map_err(|_|"database")?;
 use rusqlite::OptionalExtension;
 db.query_row("SELECT category,payment_method FROM transactions WHERE title=?1 COLLATE NOCASE AND kind=?2 AND deleted_at IS NULL AND (category IS NOT NULL OR payment_method IS NOT NULL) ORDER BY updated_at DESC,id DESC LIMIT 1",rusqlite::params![title.trim(),kind],|r|Ok(serde_json::json!({"category":r.get::<_,Option<String>>(0)?,"paymentMethod":r.get::<_,Option<String>>(1)?}))).optional().map_err(|_|"database".into())
}
