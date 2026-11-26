use std::{collections::HashSet,sync::Mutex};
use rusqlite::Connection;
use serde::Deserialize;
use tauri::State;
use crate::ledger::{EntryInput,validate_input,write_transaction};
#[derive(Deserialize)]
pub struct Change {id:Option<i64>,revision:Option<i64>,input:EntryInput}
#[derive(Deserialize)]
pub struct Selection {id:i64,revision:i64}
fn write(db:&mut Connection,changes:&[Change])->Result<(),String>{
 if changes.is_empty()||changes.len()>1000{return Err("size".into());}
 let mut ids=HashSet::new();
 let amounts=changes.iter().map(|change|{
  if let Some(id)=change.id {if change.revision.is_none()||!ids.insert(id){return Err("conflict");}}
  else if change.revision.is_some(){return Err("conflict");}
  validate_input(&change.input)
 }).collect::<Result<Vec<_>,_>>().map_err(str::to_string)?;
 let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(|_|"database")?;
 for (change,amount) in changes.iter().zip(amounts){write_transaction(&tx,&change.input,change.id,change.revision,amount,change.input.title.trim()).map_err(str::to_string)?;}
 tx.commit().map_err(|_|"database".into())
}
#[tauri::command]
pub fn save_grid(database:State<'_,Mutex<Connection>>,changes:Vec<Change>)->Result<(),String>{
 let mut db=database.lock().map_err(|_|"database")?;
 crate::data_tools::snapshot(&db)?;write(&mut db,&changes)
}
fn remove(db:&mut Connection,rows:&[Selection])->Result<(),String>{
 if rows.is_empty()||rows.len()>1000{return Err("size".into());}
 let mut ids=HashSet::new();
 let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(|_|"database")?;
 for row in rows{
  if !ids.insert(row.id){return Err("conflict".into());}
  let count=tx.execute("UPDATE transactions SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=?1 AND revision=?2 AND deleted_at IS NULL",[row.id,row.revision]).map_err(|_|"database")?;
  if count!=1{return Err("conflict".into());}
 }
 tx.commit().map_err(|_|"database".into())
}
#[tauri::command]
pub fn trash_grid(database:State<'_,Mutex<Connection>>,rows:Vec<Selection>)->Result<(),String>{
 let mut db=database.lock().map_err(|_|"database")?;crate::data_tools::snapshot(&db)?;remove(&mut db,&rows)
}
#[cfg(test)]
mod tests{
 use super::*;
 fn change(id:Option<i64>,revision:Option<i64>)->Change{Change{id,revision,input:EntryInput{title:"Test".into(),kind:"expense".into(),status:"realized".into(),occurred_on:"2026-01-01".into(),amount_micros:"1000000".into(),category:Some("Courses".into()),payment_method:None,note:None}}}
 #[test]
 fn grid_batch_rolls_back_on_stale_revision_and_supports_legitimate_identical_rows(){
  let mut db=Connection::open_in_memory().unwrap();crate::ledger::migrate(&mut db).unwrap();
  write(&mut db,&[change(None,None),change(None,None)]).unwrap();
  assert!(write(&mut db,&[change(Some(1),Some(1)),change(Some(2),Some(99))]).is_err());
  let sum:i64=db.query_row("SELECT sum(revision) FROM transactions",[],|r|r.get(0)).unwrap();assert_eq!(sum,2);
  assert!(remove(&mut db,&[Selection{id:1,revision:1},Selection{id:2,revision:99}]).is_err());
  let count:i64=db.query_row("SELECT count(*) FROM transactions WHERE deleted_at IS NULL",[],|r|r.get(0)).unwrap();assert_eq!(count,2);
 }
}
