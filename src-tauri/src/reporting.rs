use std::sync::Mutex;
use rusqlite::{params,Connection};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct ReportRow {
 id:i64, revision:i64,title:String, kind:String, status:String, occurred_on:String,
 amount_micros:String, category:Option<String>, payment_method:Option<String>, note:Option<String>,
 project_id:Option<i64>,tags:Vec<i64>,splits:Vec<crate::details::Split>,nature:Option<String>,necessity:Option<String>,
}
#[tauri::command]
pub fn report_rows(database:State<'_,Mutex<Connection>>,from:String,to:String,search:String)->Result<Vec<ReportRow>,String>{
 let valid=|s:&str|chrono::NaiveDate::parse_from_str(s,"%Y-%m-%d").map(|d|d.to_string()==s).unwrap_or(false);
 if !valid(&from)||!valid(&to)||from>to||search.chars().count()>200{return Err("filter".into());}
 let db=database.lock().map_err(|_|"database")?;
 let mut stmt=db.prepare("SELECT t.id,t.title,t.kind,t.status,t.occurred_on,t.amount_micros,t.category,t.payment_method,t.note,t.revision,d.project_id,(SELECT json_group_array(tag_id) FROM transaction_tags WHERE transaction_id=t.id),(SELECT json_group_array(json_object('category',category,'amountMicros',CAST(amount_micros AS TEXT))) FROM transaction_splits WHERE transaction_id=t.id),d.nature,d.necessity FROM transactions t LEFT JOIN transaction_details d ON d.transaction_id=t.id WHERE t.deleted_at IS NULL AND t.occurred_on BETWEEN ?1 AND ?2 AND (?3='' OR instr(lower(t.title),lower(?3))>0) ORDER BY t.occurred_on,t.id").map_err(|_|"database")?;
 let rows=stmt.query_map(params![from,to,search],|r|Ok(ReportRow{id:r.get(0)?,revision:r.get(9)?,title:r.get(1)?,kind:r.get(2)?,status:r.get(3)?,occurred_on:r.get(4)?,amount_micros:r.get::<_,i64>(5)?.to_string(),category:r.get(6)?,payment_method:r.get(7)?,note:r.get(8)?,project_id:r.get(10)?,tags:serde_json::from_str(&r.get::<_,String>(11)?).map_err(|e|rusqlite::Error::FromSqlConversionFailure(11,rusqlite::types::Type::Text,Box::new(e)))?,splits:serde_json::from_str(&r.get::<_,String>(12)?).map_err(|e|rusqlite::Error::FromSqlConversionFailure(12,rusqlite::types::Type::Text,Box::new(e)))?,nature:r.get(13)?,necessity:r.get(14)?})).map_err(|_|"database")?;
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
