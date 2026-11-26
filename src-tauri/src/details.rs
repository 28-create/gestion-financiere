use std::sync::Mutex;
use rusqlite::{params,Connection,OptionalExtension};
use serde::{Deserialize,Serialize};
use tauri::State;
use crate::ledger::{EntryInput,write_transaction};
type Result<T>=std::result::Result<T,String>;
fn error(_:rusqlite::Error)->String{"database".into()}
#[derive(Serialize,Deserialize,Clone)]
#[serde(rename_all="camelCase")]
pub struct Split {pub category:String,pub amount_micros:String}
#[derive(Serialize,Deserialize,Clone)]
#[serde(rename_all="camelCase")]
pub struct Details {
 pub project_id:Option<i64>,pub tags:Vec<i64>,pub currency:String,pub original_micros:String,
 pub rate_micros:Option<String>,pub rate_date:Option<String>,pub rate_source:Option<String>,
 pub nature:Option<String>,pub necessity:Option<String>,pub splits:Vec<Split>
}
pub(crate) fn converted(original:i64,rate:i64)->Result<i64>{
 if rate<=0||rate>999_999_999_999_999{return Err("rate".into());}
 let value=i128::from(original)*i128::from(rate);let negative=value<0;let n=value.abs();let result=n/1_000_000+if n%1_000_000>=500_000{1}else{0};let signed=if negative{-result}else{result};
 if !(-999_999_999_999_999..=999_999_999_999_999).contains(&signed){return Err("amount".into());}Ok(signed as i64)
}
pub(crate) fn read(db:&Connection,id:i64)->Result<Details>{
 let amount:i64=db.query_row("SELECT amount_micros FROM transactions WHERE id=?1",[id],|r|r.get(0)).map_err(error)?;
 let detail=db.query_row("SELECT project_id,currency,original_micros,rate_micros,rate_date,rate_source,nature,necessity FROM transaction_details WHERE transaction_id=?1",[id],|r|Ok(Details{project_id:r.get(0)?,currency:r.get(1)?,original_micros:r.get::<_,Option<i64>>(2)?.unwrap_or(amount).to_string(),rate_micros:r.get::<_,Option<i64>>(3)?.map(|v|v.to_string()),rate_date:r.get(4)?,rate_source:r.get(5)?,nature:r.get(6)?,necessity:r.get(7)?,tags:vec![],splits:vec![]})).optional().map_err(error)?;
 let mut result=detail.unwrap_or(Details{project_id:None,currency:"ILS".into(),original_micros:amount.to_string(),rate_micros:Some("1000000".into()),rate_date:None,rate_source:None,nature:None,necessity:None,tags:vec![],splits:vec![]});
 if result.currency=="ILS"{result.original_micros=amount.to_string();result.rate_micros=Some("1000000".into());}
 let mut stmt=db.prepare("SELECT tag_id FROM transaction_tags WHERE transaction_id=?1 ORDER BY tag_id").map_err(error)?;result.tags=stmt.query_map([id],|r|r.get(0)).map_err(error)?.collect::<rusqlite::Result<_>>().map_err(error)?;
 let mut stmt=db.prepare("SELECT category,amount_micros FROM transaction_splits WHERE transaction_id=?1 ORDER BY position").map_err(error)?;result.splits=stmt.query_map([id],|r|Ok(Split{category:r.get(0)?,amount_micros:r.get::<_,i64>(1)?.to_string()})).map_err(error)?.collect::<rusqlite::Result<_>>().map_err(error)?;Ok(result)
}
#[tauri::command]
pub fn get_details(database:State<'_,Mutex<Connection>>,id:i64)->Result<Details>{let db=database.lock().map_err(|_|"database")?;read(&db,id)}
fn check_feature(db:&Connection,id:i64,kind:&str)->Result<()>{let exists:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM feature_items WHERE id=?1 AND kind=?2)",params![id,kind],|r|r.get(0)).map_err(error)?;if exists{Ok(())}else{Err("reference".into())}}
pub(crate) fn save(db:&mut Connection,id:i64,revision:i64,input:Details)->Result<()> {
 let original=input.original_micros.parse::<i64>().map_err(|_|"amount")?;
 if !(-999_999_999_999_999..=999_999_999_999_999).contains(&original)||input.currency.len()!=3||!input.currency.bytes().all(|c|c.is_ascii_uppercase()){return Err("currency".into());}
 let rate=if input.currency=="ILS"{1_000_000}else{input.rate_micros.as_ref().ok_or("rate_required")?.parse::<i64>().map_err(|_|"rate")?};let amount=converted(original,rate)?;
 if input.currency!="ILS"{crate::features::date(input.rate_date.as_deref().ok_or("date")?)?;}
 if input.tags.len()>100||input.splits.len()>100{return Err("size".into());}
 if input.nature.as_deref().is_some_and(|v|!matches!(v,"fixed"|"variable"))||input.necessity.as_deref().is_some_and(|v|!matches!(v,"essential"|"optional")){return Err("validation".into());}
 let mut sum=0_i128;let mut split_amounts=vec![];for split in &input.splits{if split.category.trim().is_empty(){return Err("category".into());}let value=split.amount_micros.parse::<i64>().map_err(|_|"amount")?;sum+=i128::from(value);split_amounts.push(value);}if !input.splits.is_empty()&&sum!=i128::from(amount){return Err("splits".into());}
 let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(error)?;
 let (title,kind,status,date,category,payment,note):(String,String,String,String,Option<String>,Option<String>,Option<String>)=tx.query_row("SELECT title,kind,status,occurred_on,category,payment_method,note FROM transactions WHERE id=?1 AND revision=?2 AND deleted_at IS NULL",params![id,revision],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?))).map_err(|_|"conflict")?;
 if let Some(project)=input.project_id{check_feature(&tx,project,"project")?;}for tag in &input.tags{check_feature(&tx,*tag,"tag")?;}
 let previous=read(&tx,id)?;tx.execute("INSERT OR IGNORE INTO detail_history(transaction_id,revision,payload) VALUES (?1,?2,?3)",params![id,revision,serde_json::to_string(&previous).map_err(|_|"database")?]).map_err(error)?;
 tx.execute("INSERT INTO transaction_details(transaction_id,project_id,currency,original_micros,rate_micros,rate_date,rate_source,nature,necessity) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(transaction_id) DO UPDATE SET project_id=excluded.project_id,currency=excluded.currency,original_micros=excluded.original_micros,rate_micros=excluded.rate_micros,rate_date=excluded.rate_date,rate_source=excluded.rate_source,nature=excluded.nature,necessity=excluded.necessity",params![id,input.project_id,input.currency,original,rate,input.rate_date,input.rate_source,input.nature,input.necessity]).map_err(error)?;
 tx.execute("DELETE FROM transaction_tags WHERE transaction_id=?1",[id]).map_err(error)?;for tag in &input.tags{tx.execute("INSERT OR IGNORE INTO transaction_tags(transaction_id,tag_id) VALUES (?1,?2)",params![id,tag]).map_err(error)?;}
 tx.execute("DELETE FROM transaction_splits WHERE transaction_id=?1",[id]).map_err(error)?;for (position,(split,value)) in input.splits.iter().zip(split_amounts).enumerate(){tx.execute("INSERT INTO transaction_splits(transaction_id,position,category,amount_micros) VALUES (?1,?2,?3,?4)",params![id,position as i64,split.category,value]).map_err(error)?;tx.execute("INSERT OR IGNORE INTO catalog_items(kind,name) VALUES (?1,?2)",params![kind,split.category]).map_err(error)?;}
 let entry=EntryInput{title:title.clone(),kind,status,occurred_on:date,amount_micros:amount.to_string(),category,payment_method:payment,note};write_transaction(&tx,&entry,Some(id),Some(revision),amount,&title).map_err(str::to_string)?;
 tx.execute("INSERT INTO detail_history(transaction_id,revision,payload) VALUES (?1,?2,?3)",params![id,revision+1,serde_json::to_string(&input).map_err(|_|"database")?]).map_err(error)?;
 tx.commit().map_err(error)
}
#[tauri::command]
pub fn save_details(database:State<'_,Mutex<Connection>>,id:i64,revision:i64,input:Details)->Result<()>{let mut db=database.lock().map_err(|_|"database")?;save(&mut db,id,revision,input)}
#[cfg(test)]
mod tests{use super::*;#[test]fn conversion_rounds_once_including_negative_half(){assert_eq!(converted(1,500000).unwrap(),1);assert_eq!(converted(-1,500000).unwrap(),-1);assert_eq!(converted(1000000,3700000).unwrap(),3700000);assert!(converted(1,0).is_err());assert!(converted(999999999999999,999999999999999).is_err());}}
