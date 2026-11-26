use std::sync::Mutex;
use rusqlite::{params,Connection};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct ReportRow {
 id:i64, revision:i64,title:String, kind:String, status:String, occurred_on:String,
 amount_micros:String, category:Option<String>, payment_method:Option<String>, note:Option<String>,
}
#[tauri::command]
pub fn report_rows(database:State<'_,Mutex<Connection>>,from:String,to:String,search:String)->Result<Vec<ReportRow>,String>{
 let valid=|s:&str|chrono::NaiveDate::parse_from_str(s,"%Y-%m-%d").map(|d|d.to_string()==s).unwrap_or(false);
 if !valid(&from)||!valid(&to)||from>to||search.chars().count()>200{return Err("filter".into());}
 let db=database.lock().map_err(|_|"database")?;
 let mut stmt=db.prepare("SELECT id,title,kind,status,occurred_on,amount_micros,category,payment_method,note,revision FROM transactions WHERE deleted_at IS NULL AND occurred_on BETWEEN ?1 AND ?2 AND (?3='' OR instr(lower(title),lower(?3))>0) ORDER BY occurred_on,id").map_err(|_|"database")?;
 let rows=stmt.query_map(params![from,to,search],|r|Ok(ReportRow{id:r.get(0)?,revision:r.get(9)?,title:r.get(1)?,kind:r.get(2)?,status:r.get(3)?,occurred_on:r.get(4)?,amount_micros:r.get::<_,i64>(5)?.to_string(),category:r.get(6)?,payment_method:r.get(7)?,note:r.get(8)?})).map_err(|_|"database")?;
 rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|_|"database".into())
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct HistoryRow {revision:i64,title:String,kind:String,status:String,occurred_on:String,amount_micros:String,category:Option<String>,payment_method:Option<String>,note:Option<String>,deleted_at:Option<String>,recorded_at:String}
#[tauri::command]
pub fn transaction_history(database:State<'_,Mutex<Connection>>,id:i64)->Result<Vec<HistoryRow>,String>{
 let db=database.lock().map_err(|_|"database")?;
 let mut stmt=db.prepare("SELECT revision,title,kind,status,occurred_on,amount_micros,category,payment_method,note,deleted_at,recorded_at FROM transaction_history WHERE transaction_id=?1 ORDER BY revision DESC").map_err(|_|"database")?;
 let rows=stmt.query_map([id],|r|Ok(HistoryRow{revision:r.get(0)?,title:r.get(1)?,kind:r.get(2)?,status:r.get(3)?,occurred_on:r.get(4)?,amount_micros:r.get::<_,i64>(5)?.to_string(),category:r.get(6)?,payment_method:r.get(7)?,note:r.get(8)?,deleted_at:r.get(9)?,recorded_at:r.get(10)?})).map_err(|_|"database")?;
 rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|_|"database".into())
}
