use std::sync::Mutex;
use rusqlite::{params,Connection};
use serde::Serialize;
use tauri::State;
pub(crate) fn totals(db:&Connection,from:&str,to:&str,kind:Option<&str>)->Result<serde_json::Value,String>{
 crate::features::date(from)?;crate::features::date(to)?;if from>to||kind.is_some_and(|k|!matches!(k,"income"|"expense")){return Err("filter".into());}
 let mut statement=db.prepare("SELECT kind,amount_micros FROM transactions WHERE deleted_at IS NULL AND status='realized' AND occurred_on BETWEEN ?1 AND ?2 AND (?3 IS NULL OR kind=?3)").map_err(|_|"database")?;
 let mut result=statement.query(params![from,to,kind]).map_err(|_|"database")?;let(mut income,mut expense,mut count)=(0_i128,0_i128,0_u64);
 while let Some(row)=result.next().map_err(|_|"database")?{let amount=i128::from(row.get::<_,i64>(1).map_err(|_|"database")?);if row.get::<_,String>(0).map_err(|_|"database")?=="income"{income+=amount;}else{expense+=amount;}count+=1;}
 Ok(serde_json::json!({"incomeMicros":income.to_string(),"expenseMicros":expense.to_string(),"count":count}))
}
#[tauri::command]
pub fn ledger_totals(database:State<'_,Mutex<Connection>>,from:String,to:String,kind:Option<String>)->Result<serde_json::Value,String>{let db=database.lock().map_err(|_|"database")?;totals(&db,&from,&to,kind.as_deref())}

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
#[tauri::command]
pub fn restore_revision(database:State<'_,Mutex<Connection>>,id:i64,revision:i64,target_revision:i64)->Result<(),String>{
 let mut db=database.lock().map_err(|_|"database")?;crate::data_tools::snapshot(&db)?;let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(|_|"database")?;
 let input=tx.query_row("SELECT title,kind,status,occurred_on,amount_micros,category,payment_method,note FROM transaction_history WHERE transaction_id=?1 AND revision=?2",[id,target_revision],|r|Ok(crate::ledger::EntryInput{title:r.get(0)?,kind:r.get(1)?,status:r.get(2)?,occurred_on:r.get(3)?,amount_micros:r.get::<_,i64>(4)?.to_string(),category:r.get(5)?,payment_method:r.get(6)?,note:r.get(7)?})).map_err(|_|"history")?;
 let amount=crate::ledger::validate_input(&input).map_err(str::to_string)?;crate::ledger::write_transaction(&tx,&input,Some(id),Some(revision),amount,&input.title).map_err(str::to_string)?;crate::complex::validate_visibility(&tx)?;tx.commit().map_err(|_|"database".into())
}
#[cfg(test)]mod tests{use super::*;#[test]fn fifty_thousand_transactions_keep_totals_beyond_sqlite_integer_sum_range(){
 let mut db=Connection::open_in_memory().unwrap();crate::ledger::migrate(&mut db).unwrap();let tx=db.transaction().unwrap();{let mut statement=tx.prepare("INSERT INTO transactions(title,kind,status,occurred_on,amount_micros) VALUES ('Synthetic volume test','expense','realized','2026-01-01',999999999999999)").unwrap();for _ in 0..50000{statement.execute([]).unwrap();}}tx.commit().unwrap();let result=totals(&db,"2026-01-01","2026-12-31",None).unwrap();assert_eq!(result["expenseMicros"].as_str().unwrap(),(50000_i128*999999999999999_i128).to_string());assert_eq!(result["count"],50000);assert_eq!(totals(&db,"2027-01-01","2027-12-31",None).unwrap()["expenseMicros"],"0");
}}
