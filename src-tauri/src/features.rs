use std::sync::Mutex;
use rusqlite::{params,Connection};
use serde::{Deserialize,Serialize};
use serde_json::Value;
use tauri::State;
type Db<'a>=State<'a,Mutex<Connection>>;
type Result<T>=std::result::Result<T,String>;
fn error(_:rusqlite::Error)->String{"database".into()}
pub(crate) fn date(value:&str)->Result<()>{let parsed=chrono::NaiveDate::parse_from_str(value,"%Y-%m-%d").map_err(|_|"date")?;if value.len()!=10||value.starts_with("0000")||parsed.to_string()!=value{return Err("date".into());}Ok(())}
fn text<'a>(v:&'a Value,key:&str)->Result<&'a str>{v[key].as_str().filter(|s|!s.trim().is_empty()).ok_or_else(||"validation".into())}
pub(crate) fn amount(v:&Value,key:&str)->Result<i64>{let n=text(v,key)?.parse::<i64>().map_err(|_|"amount")?;if !(-999_999_999_999_999..=999_999_999_999_999).contains(&n){return Err("amount".into());}Ok(n)}
fn kind(value:&str)->bool{matches!(value,"budget"|"recurrence"|"project"|"tag"|"template"|"classification"|"settings")}
pub(crate) fn validate(kind:&str,payload:&Value)->Result<()>{
 if !payload.is_object()||payload.to_string().len()>262144{return Err("validation".into());}
 match kind {
  "budget"=>{date(text(payload,"from")?)?;date(text(payload,"to")?)?;if text(payload,"from")?>text(payload,"to")?||amount(payload,"amountMicros")?<=0{return Err("budget".into());}},
  "recurrence"=>{
   date(text(payload,"start")?)?;
   if !matches!(text(payload,"frequency")?,"daily"|"weekly"|"monthly"|"quarterly"|"yearly")||!matches!(text(payload,"calendar")?,"civil"|"hebrew")||!matches!(text(payload,"mode")?,"auto"|"manual")||!matches!(text(payload,"kind")?,"income"|"expense"){return Err("recurrence".into());}
   if !payload["amountMicros"].is_null(){amount(payload,"amountMicros")?;}
   let interval=payload["interval"].as_i64().ok_or("recurrence")?;if !(1..=120).contains(&interval){return Err("recurrence".into());}
   if let Some(count)=payload["count"].as_i64(){if !(1..=1000000).contains(&count){return Err("recurrence".into());}}
   if let Some(effective)=payload["effectiveFrom"].as_str(){date(effective)?;}
   if let Some(policy)=payload["policy"].as_str(){if !matches!(policy,"fixed"|"last"|"firstBusiness"|"lastBusiness"|"weekday"){return Err("recurrence".into());}}
   if payload["policy"].as_str()==Some("weekday"){let weekday=payload["weekday"].as_i64().ok_or("recurrence")?;let ordinal=payload["ordinal"].as_i64().ok_or("recurrence")?;if !(0..=6).contains(&weekday)||![-1,1,2,3,4,5].contains(&ordinal){return Err("recurrence".into());}}
   if let Some(exceptions)=payload["exceptions"].as_array(){if exceptions.len()>10000{return Err("size".into());}let mut dates=std::collections::HashSet::new();for exception in exceptions{let on=text(exception,"on")?;date(on)?;if !dates.insert(on){return Err("recurrence".into());}if let Some(when)=exception["date"].as_str(){date(when)?;}if !exception["amountMicros"].is_null(){amount(exception,"amountMicros")?;}}}
   if let Some(until)=payload["until"].as_str(){if !until.is_empty(){date(until)?;if until<text(payload,"start")?{return Err("recurrence".into());}}}
  },
  "classification"=>{let needle=text(payload,"match")?;if needle.chars().count()<3||!matches!(text(payload,"mode")?,"exact"|"contains"){return Err("rule".into());}},
  "template"=>{let mut input:crate::ledger::EntryInput=serde_json::from_value(payload.clone()).map_err(|_|"template")?;if input.amount_micros.is_empty(){input.amount_micros="0".into();}crate::ledger::validate_input(&input).map_err(str::to_string)?;},
  "project"|"tag"|"settings"=>{},
  _=>return Err("kind".into())
 }Ok(())
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Item {pub id:i64,pub kind:String,pub name:String,pub payload:Value,pub revision:i64,pub archived:bool}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Input {pub id:Option<i64>,pub revision:Option<i64>,pub kind:String,pub name:String,pub payload:Value,pub archived:bool}
#[tauri::command]
pub fn list_features(database:Db<'_>,kind:Option<String>)->Result<Vec<Item>>{
 if kind.as_ref().is_some_and(|k|!self::kind(k)){return Err("kind".into());}
 let db=database.lock().map_err(|_|"database")?;
 let mut statement=db.prepare("SELECT id,kind,name,payload,revision,archived FROM feature_items WHERE (?1 IS NULL OR kind=?1) ORDER BY id").map_err(error)?;
 let rows=statement.query_map([kind],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,i64>(4)?,r.get::<_,bool>(5)?))).map_err(error)?;
 rows.map(|row|{let(id,kind,name,payload,revision,archived)=row.map_err(error)?;Ok(Item{id,kind,name,payload:serde_json::from_str(&payload).map_err(|_|"database")?,revision,archived})}).collect()
}
pub(crate) fn save(db:&mut Connection,input:Input)->Result<i64>{
 if !kind(&input.kind)||input.name.trim().is_empty()||input.name.chars().count()>200{return Err("validation".into());}validate(&input.kind,&input.payload)?;
 if input.kind=="budget" {if let Some(id)=input.payload["projectId"].as_i64(){let exists:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM feature_items WHERE id=?1 AND kind='project')",[id],|r|r.get(0)).map_err(error)?;if !exists{return Err("project".into());}}}
 let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(error)?;
 let id=match(input.id,input.revision){
  (None,None)=>{tx.execute("INSERT INTO feature_items(kind,name,payload,archived) VALUES (?1,?2,?3,?4)",params![input.kind,input.name.trim(),input.payload.to_string(),input.archived]).map_err(error)?;tx.last_insert_rowid()},
  (Some(id),Some(revision))=>{let count=tx.execute("UPDATE feature_items SET name=?1,payload=?2,archived=?3,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?4 AND revision=?5 AND kind=?6",params![input.name.trim(),input.payload.to_string(),input.archived,id,revision,input.kind]).map_err(error)?;if count!=1{return Err("conflict".into());}id},
  _=>return Err("conflict".into())
 };tx.commit().map_err(error)?;Ok(id)
}
#[tauri::command]
pub fn save_feature(database:Db<'_>,input:Input)->Result<i64>{let mut db=database.lock().map_err(|_|"database")?;save(&mut db,input)}
#[tauri::command]
pub fn feature_history(database:Db<'_>,id:i64)->Result<Vec<Value>>{
 let db=database.lock().map_err(|_|"database")?;let mut stmt=db.prepare("SELECT revision,name,payload,archived,recorded_at FROM feature_history WHERE feature_id=?1 ORDER BY revision DESC").map_err(error)?;
 let rows=stmt.query_map([id],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,bool>(3)?,r.get::<_,String>(4)?))).map_err(error)?;
 rows.map(|r|{let(revision,name,payload,archived,recorded_at)=r.map_err(error)?;Ok(serde_json::json!({"revision":revision,"name":name,"payload":serde_json::from_str::<Value>(&payload).map_err(|_|"database")?,"archived":archived,"recordedAt":recorded_at}))}).collect()
}
#[cfg(test)]
mod tests{
 use super::*;
 #[test]fn budget_validation_and_revision_history(){let mut db=Connection::open_in_memory().unwrap();crate::ledger::migrate(&mut db).unwrap();let payload=serde_json::json!({"from":"2026-01-01","to":"2026-01-31","amountMicros":"500000000"});let id=save(&mut db,Input{id:None,revision:None,kind:"budget".into(),name:"Janvier".into(),payload:payload.clone(),archived:false}).unwrap();assert!(save(&mut db,Input{id:Some(id),revision:Some(99),kind:"budget".into(),name:"Test".into(),payload,archived:false}).is_err());let count:i64=db.query_row("SELECT count(*) FROM feature_history WHERE feature_id=?1",[id],|r|r.get(0)).unwrap();assert_eq!(count,1);assert!(validate("budget",&serde_json::json!({"from":"2026-02-30","to":"2026-03-01","amountMicros":"1"})).is_err());}
}
