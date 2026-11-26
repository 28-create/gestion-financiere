use std::{fs, path::PathBuf, sync::Mutex, time::{SystemTime, UNIX_EPOCH}};
use rusqlite::{params, Connection,OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

type Db<'a> = State<'a, Mutex<Connection>>;
type Result<T> = std::result::Result<T, String>;
fn err(e: impl std::fmt::Display) -> String { e.to_string() }

#[derive(Deserialize, Serialize)]
#[serde(rename_all="camelCase")]
pub struct Row {
 pub title: String, pub kind: String, pub occurred_on: String,
 pub amount_micros: String, pub category: Option<String>,
 pub payment_method: Option<String>, pub note: Option<String>,
 #[serde(default)]pub source_key:Option<String>,#[serde(default)]pub source_sheet:Option<String>,#[serde(default)]pub source_table:Option<String>,#[serde(default)]pub source_row:Option<i64>,
 #[serde(default)]pub currency:Option<String>,#[serde(default)]pub original_micros:Option<String>,#[serde(default)]pub rate_micros:Option<String>,#[serde(default)]pub rate_date:Option<String>,
}
fn validate(row: &Row) -> Result<i64> {
 if row.title.trim().is_empty() || row.title.chars().count()>200 { return Err("title".into()); }
 if !matches!(row.kind.as_str(), "income" | "expense") { return Err("kind".into()); }
 let date=chrono::NaiveDate::parse_from_str(&row.occurred_on,"%Y-%m-%d").map_err(err)?;
 if date.to_string()!=row.occurred_on || row.occurred_on.starts_with("0000") {return Err("date".into());}
 let amount=row.amount_micros.parse::<i64>().map_err(err)?;
 if row.source_key.as_ref().is_some_and(|s|s.len()>4000)||row.source_row.is_some_and(|n|n<1){return Err("source".into());}
 if let Some(currency)=&row.currency{if currency.len()!=3||!currency.bytes().all(|b|b.is_ascii_uppercase()){return Err("currency".into());}if currency!="ILS"{let original=row.original_micros.as_ref().ok_or("currency")?.parse::<i64>().map_err(|_|"amount")?;if !(-999_999_999_999_999..=999_999_999_999_999).contains(&original){return Err("amount".into());}let rate=row.rate_micros.as_ref().ok_or("rate")?.parse::<i64>().map_err(|_|"rate")?;if crate::details::converted(original,rate)?!=amount{return Err("currency".into());}crate::features::date(row.rate_date.as_deref().ok_or("date")?)?;}}
 if !(-999_999_999_999_999..=999_999_999_999_999).contains(&amount) {return Err("amount".into());}
 Ok(amount)
}
pub(crate) fn snapshot(db: &Connection) -> Result<String> {
 let folder=crate::backups::folder(db)?;
 fs::create_dir_all(&folder).map_err(err)?;
 let stamp=SystemTime::now().duration_since(UNIX_EPOCH).map_err(err)?.as_nanos();
 let destination=folder.join(format!("ledger-{stamp}.sqlite3"));
 db.execute("VACUUM INTO ?1",[destination.to_string_lossy().as_ref()]).map_err(err)?;
 let check=Connection::open_with_flags(&destination,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(err)?;
 let integrity:String=check.query_row("PRAGMA integrity_check",[],|r|r.get(0)).map_err(err)?;
 if integrity!="ok" { return Err("integrity".into()); }
 Ok(destination.to_string_lossy().into_owned())
}
#[tauri::command]
pub fn create_backup(database:Db<'_>) -> Result<String> {
 let db=database.lock().map_err(err)?;
 snapshot(&db)
}
fn backup_folder(db:&Connection)->Result<PathBuf>{
 crate::backups::folder(db)
}
#[tauri::command]
pub fn list_backups(database:Db<'_>)->Result<Vec<String>>{
 let db=database.lock().map_err(err)?;let folder=backup_folder(&db)?;
 if !folder.exists(){return Ok(vec![]);}
 let mut names=vec![];
 for item in fs::read_dir(folder).map_err(err)?{
  let item=item.map_err(err)?;let name=item.file_name().to_string_lossy().into_owned();
  if name.starts_with("ledger-")&&name.ends_with(".sqlite3")&&item.file_type().map_err(err)?.is_file(){names.push(name);}
 }
 names.sort();names.reverse();Ok(names)
}
#[tauri::command]
pub fn restore_backup(database:Db<'_>,name:String)->Result<String>{
 if !name.starts_with("ledger-")||!name.ends_with(".sqlite3")||name.contains(['/', '\\', ':'])||name.contains("..") {return Err("backup".into());}
 let mut db=database.lock().map_err(err)?;
 let path=backup_folder(&db)?.join(name);
 if fs::symlink_metadata(&path).map_err(err)?.file_type().is_symlink(){return Err("backup".into());}
 let source=Connection::open_with_flags(path,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(err)?;
 let integrity:String=source.query_row("PRAGMA integrity_check",[],|r|r.get(0)).map_err(err)?;
 let version:i64=source.query_row("PRAGMA user_version",[],|r|r.get(0)).map_err(err)?;
 if integrity!="ok"||!(1..=crate::ledger::SCHEMA_VERSION).contains(&version){return Err("Sauvegarde incompatible ou endommagée".into());}
 let violations:bool=source.prepare("PRAGMA foreign_key_check").map_err(err)?.exists([]).map_err(err)?;
 if violations{return Err("integrity".into());}
 // Verify the expected schema before replacing the current register.
 source.prepare("SELECT title,kind,status,occurred_on,amount_micros FROM transactions LIMIT 0").map_err(err)?;
 // Upgrade a private copy before touching the live register or the source file.
 let mut upgraded=Connection::open_in_memory().map_err(err)?;
 {
  let copy=rusqlite::backup::Backup::new(&source,&mut upgraded).map_err(err)?;
  copy.run_to_completion(64,std::time::Duration::from_millis(5),None).map_err(err)?;
 }
 upgraded.pragma_update(None,"foreign_keys",true).map_err(err)?;
 crate::ledger::migrate(&mut upgraded).map_err(err)?;
 let safety=snapshot(&db)?;
 let restore=rusqlite::backup::Backup::new(&upgraded,&mut db).map_err(err)?;
 restore.run_to_completion(64,std::time::Duration::from_millis(5),None).map_err(err)?;
 Ok(safety)
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct ImportResult { batch_id:i64, imported:usize, duplicates:usize,catalog_imported:usize }
#[derive(Deserialize)]
pub struct ReferenceValue {kind:String,name:String}
fn validate_catalog(items:&[ReferenceValue])->Result<()>{
 if items.len()>5000{return Err("size".into());}
 for item in items{if !matches!(item.kind.as_str(),"income"|"expense"|"payment")||item.name.trim().is_empty()||item.name.chars().count()>10000{return Err("catalog".into());}}
 Ok(())
}
fn insert_catalog(tx:&rusqlite::Transaction<'_>,items:&[ReferenceValue])->Result<usize>{
 let mut count=0;for item in items{count+=tx.execute("INSERT OR IGNORE INTO catalog_items(kind,name) VALUES (?1,?2)",params![item.kind,item.name]).map_err(err)?;}Ok(count)
}
fn database_stamp(db:&Connection)->Result<String>{let version:i64=db.pragma_query_value(None,"data_version",|r|r.get(0)).map_err(err)?;let changes:i64=db.query_row("SELECT total_changes()",[],|r|r.get(0)).map_err(err)?;Ok(format!("{}:{}",version,changes))}
#[tauri::command]
pub fn import_catalog(database:Db<'_>,items:Vec<ReferenceValue>)->Result<usize>{
 validate_catalog(&items)?;let mut db=database.lock().map_err(err)?;snapshot(&db)?;let tx=db.transaction().map_err(err)?;let count=insert_catalog(&tx,&items)?;tx.commit().map_err(err)?;Ok(count)
}
#[tauri::command]
pub fn preview_import_rows(database:Db<'_>,rows:Vec<Row>)->Result<serde_json::Value>{
 if rows.len()>100000{return Err("size".into());}let db=database.lock().map_err(err)?;let stamp=database_stamp(&db)?;let mut result=vec![];
 for (index,row) in rows.iter().enumerate(){let amount=validate(row)?;
  let source_id:Option<i64>=db.query_row("SELECT id FROM transactions WHERE source_key=?1",[&row.source_key],|r|r.get(0)).optional().map_err(err)?;
  let mut stmt=db.prepare("SELECT id FROM transactions WHERE title=?1 AND kind=?2 AND occurred_on=?3 AND amount_micros=?4 AND coalesce(category,'')=coalesce(?5,'') AND coalesce(payment_method,'')=coalesce(?6,'') AND coalesce(note,'')=coalesce(?7,'') ORDER BY id LIMIT 20").map_err(err)?;
  let ids=stmt.query_map(params![row.title,row.kind,row.occurred_on,amount,row.category,row.payment_method,row.note],|r|r.get::<_,i64>(0)).map_err(err)?.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?;
  if source_id.is_some()||!ids.is_empty(){result.push(serde_json::json!({"index":index,"sourceId":source_id,"possibleIds":ids}));}
 }if database_stamp(&db)?!=stamp{return Err("conflict".into());}Ok(serde_json::json!({"matches":result,"stamp":stamp}))
}
#[tauri::command]
pub fn list_imports(database:Db<'_>)->Result<Vec<serde_json::Value>>{
 let db=database.lock().map_err(err)?;let mut stmt=db.prepare("SELECT id,filename,created_at,undone_at,report FROM import_batches ORDER BY id DESC").map_err(err)?;
 let rows=stmt.query_map([],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,Option<String>>(3)?,r.get::<_,Option<String>>(4)?))).map_err(err)?;
 rows.map(|r|{let(id,filename,date,undone,report)=r.map_err(err)?;Ok(serde_json::json!({"id":id,"filename":filename,"createdAt":date,"undoneAt":undone,"report":report.and_then(|s|serde_json::from_str::<serde_json::Value>(&s).ok())}))}).collect()
}
#[tauri::command]
pub fn import_rows(database:Db<'_>, filename:String, rows:Vec<Row>,catalog:Option<Vec<ReferenceValue>>,keep_possible_duplicates:Option<bool>,expected_stamp:Option<String>) -> Result<ImportResult> {
 if rows.is_empty() || rows.len()>100_000 {return Err("size".into());}
 let amounts:Vec<i64>=rows.iter().map(validate).collect::<Result<_>>()?;
 let catalog=catalog.unwrap_or_default();validate_catalog(&catalog)?;
 let mut db=database.lock().map_err(err)?;
 snapshot(&db)?;
 let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(err)?;
 if expected_stamp.as_deref().is_some_and(|stamp|database_stamp(&tx).ok().as_deref()!=Some(stamp)){return Err("conflict".into());}
 let catalog_imported=insert_catalog(&tx,&catalog)?;
 tx.execute("INSERT INTO import_batches(filename) VALUES (?1)",[filename]).map_err(err)?;
 let batch_id=tx.last_insert_rowid();
 let(mut imported,mut duplicates)=(0,0);
 let mut income=0_i128;let mut expense=0_i128;
 for (row,amount) in rows.iter().zip(amounts) {
  let source_exists:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM transactions WHERE source_key=?1)",[&row.source_key],|r|r.get(0)).map_err(err)?;
  let exists:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM transactions WHERE title=?1 AND kind=?2 AND occurred_on=?3 AND amount_micros=?4 AND coalesce(category,'')=coalesce(?5,'') AND coalesce(payment_method,'')=coalesce(?6,'') AND coalesce(note,'')=coalesce(?7,'') AND (import_batch_id IS NULL OR import_batch_id<>?8))",params![row.title,row.kind,row.occurred_on,amount,row.category,row.payment_method,row.note,batch_id],|r|r.get(0)).map_err(err)?;
  if source_exists||(exists&&!keep_possible_duplicates.unwrap_or(false)) {duplicates+=1;continue;}
  tx.execute("INSERT INTO transactions(title,kind,occurred_on,amount_micros,category,payment_method,note,status,import_batch_id,source_key,source_sheet,source_table,source_row) VALUES (?1,?2,?3,?4,?5,?6,?7,'realized',?8,?9,?10,?11,?12)",params![row.title,row.kind,row.occurred_on,amount,row.category,row.payment_method,row.note,batch_id,row.source_key,row.source_sheet,row.source_table,row.source_row]).map_err(err)?;
  if row.currency.as_deref().is_some_and(|c|c!="ILS"){let id=tx.last_insert_rowid();tx.execute("INSERT INTO transaction_details(transaction_id,currency,original_micros,rate_micros,rate_date,rate_source) VALUES (?1,?2,?3,?4,?5,'Import manuel')",params![id,row.currency,row.original_micros.as_ref().and_then(|s|s.parse::<i64>().ok()),row.rate_micros.as_ref().and_then(|s|s.parse::<i64>().ok()),row.rate_date]).map_err(err)?;}
  if row.kind=="income"{income+=i128::from(amount);}else{expense+=i128::from(amount);}
  imported+=1;
 }
 let report=serde_json::json!({"sourceRows":rows.len(),"imported":imported,"duplicates":duplicates,"incomeMicros":income.to_string(),"expenseMicros":expense.to_string(),"catalogImported":catalog_imported});
 tx.execute("UPDATE import_batches SET report=?1 WHERE id=?2",params![report.to_string(),batch_id]).map_err(err)?;
 tx.commit().map_err(err)?;
 Ok(ImportResult{batch_id,imported,duplicates,catalog_imported})
}
#[tauri::command]
pub fn undo_import(database:Db<'_>, batch_id:i64) -> Result<()> {
 let mut db=database.lock().map_err(err)?;
 snapshot(&db)?;
 let tx=db.transaction().map_err(err)?;
 let changed:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM transactions WHERE import_batch_id=?1 AND revision>1)",[batch_id],|r|r.get(0)).map_err(err)?;
 if changed {return Err("Des opérations du lot ont été modifiées. Annulation refusée pour préserver ces modifications.".into());}
 if tx.execute("UPDATE import_batches SET undone_at=CURRENT_TIMESTAMP WHERE id=?1 AND undone_at IS NULL",[batch_id]).map_err(err)?!=1 {return Err("batch".into());}
 tx.execute("UPDATE transactions SET deleted_at=CURRENT_TIMESTAMP, revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE import_batch_id=?1 AND deleted_at IS NULL",[batch_id]).map_err(err)?;
 crate::complex::validate_visibility(&tx)?;
 tx.commit().map_err(err)
}

#[cfg(test)]
mod tests {
 use super::*;
 #[test]
 fn imported_amounts_and_dates_are_validated() {
  let mut row=Row {title:"Test".into(),kind:"expense".into(),occurred_on:"2026-11-25".into(),amount_micros:"1234567".into(),category:None,payment_method:None,note:None,source_key:None,source_sheet:None,source_table:None,source_row:None,currency:None,original_micros:None,rate_micros:None,rate_date:None};
  assert_eq!(validate(&row).unwrap(),1_234_567);
  row.occurred_on="2026-02-30".into();assert!(validate(&row).is_err());
  row.occurred_on="2026-11-25".into();row.amount_micros="1000000000000000".into();assert!(validate(&row).is_err());
  row.amount_micros="1.2".into();assert!(validate(&row).is_err());
 }
}
