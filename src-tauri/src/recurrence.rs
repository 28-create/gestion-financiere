use std::sync::Mutex;
use rusqlite::{params,Connection};
use serde::Deserialize;
use serde_json::{Value,json};
use tauri::State;
type Result<T>=std::result::Result<T,String>;
fn error(_:rusqlite::Error)->String{"database".into()}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Occurrence {rule_id:i64,revision:i64,scheduled_on:String,occurred_on:String,amount_micros:Option<String>,skip:bool}
#[tauri::command]
pub fn link_occurrence(database:State<'_,Mutex<Connection>>,rule_id:i64,revision:i64,scheduled_on:String,transaction_id:i64,transaction_revision:i64)->Result<()>{
 crate::features::date(&scheduled_on)?;let mut db=database.lock().map_err(|_|"database")?;let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(error)?;
 let payload:String=tx.query_row("SELECT payload FROM feature_items WHERE id=?1 AND revision=?2 AND kind='recurrence' AND archived=0",params![rule_id,revision],|r|r.get(0)).map_err(|_|"conflict")?;let rule:Value=serde_json::from_str(&payload).map_err(|_|"database")?;
 let expected=rule["exceptions"].as_array().and_then(|a|a.iter().find(|e|e["on"].as_str()==Some(scheduled_on.as_str()))).and_then(|e|e["date"].as_str()).unwrap_or(&scheduled_on);
 let valid:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM transactions WHERE id=?1 AND revision=?2 AND kind=?3 AND occurred_on=?4 AND status='realized' AND deleted_at IS NULL)",params![transaction_id,transaction_revision,rule["kind"].as_str().ok_or("kind")?,expected],|r|r.get(0)).map_err(error)?;if !valid{return Err("conflict".into());}
 tx.execute("INSERT INTO recurring_occurrences(rule_id,scheduled_on,transaction_id,state) VALUES (?1,?2,?3,'recorded')",params![rule_id,scheduled_on,transaction_id]).map_err(|_|"conflict")?;tx.commit().map_err(error)
}
#[tauri::command]
pub fn list_occurrences(database:State<'_,Mutex<Connection>>)->Result<Vec<Value>>{
 let db=database.lock().map_err(|_|"database")?;let mut stmt=db.prepare("SELECT o.rule_id,o.scheduled_on,o.transaction_id,o.state,t.status,t.revision FROM recurring_occurrences o LEFT JOIN transactions t ON t.id=o.transaction_id ORDER BY o.scheduled_on,o.id").map_err(error)?;
 let rows=stmt.query_map([],|r|Ok(json!({"ruleId":r.get::<_,i64>(0)?,"scheduledOn":r.get::<_,String>(1)?,"transactionId":r.get::<_,Option<i64>>(2)?,"state":r.get::<_,String>(3)?,"status":r.get::<_,Option<String>>(4)?,"revision":r.get::<_,Option<i64>>(5)?}))).map_err(error)?;rows.collect::<rusqlite::Result<_>>().map_err(error)
}
pub(crate) fn record(db:&mut Connection,items:&[Occurrence])->Result<usize>{
 if items.len()>10000{return Err("size".into());}
 let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(error)?;let mut recorded=0;
 for item in items{
  crate::features::date(&item.scheduled_on)?;crate::features::date(&item.occurred_on)?;
  let (name,payload):(String,String)=tx.query_row("SELECT name,payload FROM feature_items WHERE id=?1 AND revision=?2 AND kind='recurrence' AND archived=0",params![item.rule_id,item.revision],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"conflict")?;let rule:Value=serde_json::from_str(&payload).map_err(|_|"database")?;
  if rule["paused"].as_bool().unwrap_or(false){return Err("paused".into());}
  let exists:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM recurring_occurrences WHERE rule_id=?1 AND scheduled_on=?2)",params![item.rule_id,item.scheduled_on],|r|r.get(0)).map_err(error)?;if exists{continue;}
  if item.scheduled_on<rule["start"].as_str().unwrap_or("").to_string(){return Err("date".into());}
  if rule["effectiveFrom"].as_str().is_some_and(|d|item.scheduled_on.as_str()<d){return Err("date".into());}
  let exception=rule["exceptions"].as_array().and_then(|a|a.iter().find(|v|v["on"].as_str()==Some(item.scheduled_on.as_str())));
  if exception.is_some_and(|e|e["skip"].as_bool()==Some(true))&&!item.skip{return Err("skipped".into());}
  let expected=exception.and_then(|e|e["date"].as_str()).unwrap_or(&item.scheduled_on);
  if item.occurred_on!=expected{return Err("date".into());}
  let until=rule["until"].as_str().unwrap_or("");if !until.is_empty()&&item.scheduled_on.as_str()>until{return Err("date".into());}
  if item.skip{tx.execute("INSERT INTO recurring_occurrences(rule_id,scheduled_on,state) VALUES (?1,?2,'skipped')",params![item.rule_id,item.scheduled_on]).map_err(error)?;continue;}
  let amount=if rule["variable"].as_bool().unwrap_or(false){item.amount_micros.as_deref().ok_or("amount")?}else{rule["exceptions"].as_array().and_then(|a|a.iter().find(|v|v["on"].as_str()==Some(item.scheduled_on.as_str()))).and_then(|e|e["amountMicros"].as_str()).or(rule["amountMicros"].as_str()).ok_or("amount")?};
  let value=|key:&str|exception.and_then(|e|e.get(key)).unwrap_or(&rule[key]).as_str().map(str::to_string);
  let input=crate::ledger::EntryInput{title:value("title").unwrap_or_else(||name.clone()),kind:rule["kind"].as_str().ok_or("kind")?.into(),status:"realized".into(),occurred_on:item.occurred_on.clone(),amount_micros:amount.into(),category:value("category").filter(|s|!s.is_empty()),payment_method:value("paymentMethod").filter(|s|!s.is_empty()),note:value("note").filter(|s|!s.is_empty())};
  let amount=crate::ledger::validate_input(&input).map_err(str::to_string)?;
  if item.occurred_on>chrono::Local::now().date_naive().to_string(){return Err("future".into());}
  let duplicate:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM transactions t WHERE title=?1 AND kind=?2 AND occurred_on=?3 AND amount_micros=?4 AND deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM recurring_occurrences o WHERE o.transaction_id=t.id))",params![input.title,input.kind,input.occurred_on,amount],|r|r.get(0)).map_err(error)?;
  if duplicate{return Err("possible_duplicate".into());}
  crate::ledger::write_transaction(&tx,&input,None,None,amount,&input.title).map_err(str::to_string)?;let id=tx.last_insert_rowid();tx.execute("INSERT INTO recurring_occurrences(rule_id,scheduled_on,transaction_id,state) VALUES (?1,?2,?3,'recorded')",params![item.rule_id,item.scheduled_on,id]).map_err(error)?;recorded+=1;
 }
 tx.commit().map_err(error)?;Ok(recorded)
}
#[tauri::command]
pub fn record_occurrences(database:State<'_,Mutex<Connection>>,items:Vec<Occurrence>)->Result<usize>{let mut db=database.lock().map_err(|_|"database")?;record(&mut db,&items)}
#[tauri::command]
pub fn split_recurrence(database:State<'_,Mutex<Connection>>,id:i64,revision:i64,from:String,name:String,payload:Value)->Result<i64>{
 crate::features::date(&from)?;crate::features::validate("recurrence",&payload)?;if name.trim().is_empty()||name.chars().count()>200||payload["start"].as_str()!=Some(from.as_str()){return Err("recurrence".into());}
 let mut db=database.lock().map_err(|_|"database")?;let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(error)?;
 let old:String=tx.query_row("SELECT payload FROM feature_items WHERE id=?1 AND revision=?2 AND kind='recurrence' AND archived=0",params![id,revision],|r|r.get(0)).map_err(|_|"conflict")?;let mut previous:Value=serde_json::from_str(&old).map_err(|_|"database")?;
 if from.as_str()<=previous["start"].as_str().ok_or("date")?{return Err("date".into());}
 let before=chrono::NaiveDate::parse_from_str(&from,"%Y-%m-%d").map_err(|_|"date")?.pred_opt().ok_or("date")?.to_string();previous["until"]=Value::String(before);
 tx.execute("UPDATE feature_items SET payload=?1,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND revision=?3",params![previous.to_string(),id,revision]).map_err(error)?;
 tx.execute("INSERT INTO feature_items(kind,name,payload) VALUES ('recurrence',?1,?2)",params![name,payload.to_string()]).map_err(error)?;let new_id=tx.last_insert_rowid();tx.commit().map_err(error)?;Ok(new_id)
}
#[cfg(test)]mod tests{use super::*;#[test]fn missed_occurrences_are_idempotent(){let mut db=Connection::open_in_memory().unwrap();crate::ledger::migrate(&mut db).unwrap();let rule=crate::features::save(&mut db,crate::features::Input{id:None,revision:None,kind:"recurrence".into(),name:"Mensuel".into(),payload:json!({"start":"2026-01-01","frequency":"monthly","calendar":"civil","mode":"auto","kind":"income","interval":1,"amountMicros":"1000000"}),archived:false}).unwrap();let items=vec![Occurrence{rule_id:rule,revision:1,scheduled_on:"2026-01-01".into(),occurred_on:"2026-01-01".into(),amount_micros:None,skip:false}];assert_eq!(record(&mut db,&items).unwrap(),1);assert_eq!(record(&mut db,&items).unwrap(),0);}}
