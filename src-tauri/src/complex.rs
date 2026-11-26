use std::sync::Mutex;
use chrono::{Datelike,NaiveDate};
use rusqlite::{params,Connection,OptionalExtension};
use serde::{Deserialize,Serialize};
use tauri::State;
type Result<T>=std::result::Result<T,String>;
fn error(_:rusqlite::Error)->String{"database".into()}
pub(crate) fn validate_visibility(db:&Connection)->Result<()>{
 let invalid:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM transaction_links l JOIN transactions t ON t.id=l.transaction_id JOIN transactions o ON o.id=l.original_id WHERE t.deleted_at IS NULL AND (o.deleted_at IS NOT NULL OR o.status<>'realized' OR t.status<>'realized'))",[],|r|r.get(0)).map_err(error)?;
 if invalid{return Err("refund_link".into());}Ok(())
}
#[tauri::command]
pub fn refund_summary(database:State<'_,Mutex<Connection>>,id:i64)->Result<serde_json::Value>{
 let db=database.lock().map_err(|_|"database")?;
 let original:i64=db.query_row("SELECT coalesce((SELECT original_id FROM transaction_links WHERE transaction_id=?1),?1)",[id],|r|r.get(0)).map_err(error)?;
 let (title,amount):(String,i64)=db.query_row("SELECT title,amount_micros FROM transactions WHERE id=?1",[original],|r|Ok((r.get(0)?,r.get(1)?))).map_err(error)?;
 let mut statement=db.prepare("SELECT t.id,t.occurred_on,t.amount_micros,t.deleted_at IS NOT NULL FROM transaction_links l JOIN transactions t ON t.id=l.transaction_id WHERE l.original_id=?1 ORDER BY t.occurred_on,t.id").map_err(error)?;
 let mut refunded=0_i128;let mut rows=vec![];for row in statement.query_map([original],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,i64>(2)?,r.get::<_,bool>(3)?))).map_err(error)?{let(id,date,value,deleted)=row.map_err(error)?;if !deleted{refunded-=i128::from(value);}rows.push(serde_json::json!({"id":id,"date":date,"amountMicros":(-i128::from(value)).to_string(),"deleted":deleted}));}
 Ok(serde_json::json!({"originalId":original,"title":title,"originalMicros":amount.to_string(),"refundedMicros":refunded.to_string(),"netMicros":(i128::from(amount)-refunded).to_string(),"rows":rows}))
}
#[tauri::command]
pub fn installment_rows(database:State<'_,Mutex<Connection>>,id:i64)->Result<Vec<serde_json::Value>>{
 let db=database.lock().map_err(|_|"database")?;let mut statement=db.prepare("SELECT id,revision,occurred_on,amount_micros,status,deleted_at IS NOT NULL FROM transactions WHERE installment_plan_id=?1 ORDER BY installment_position").map_err(error)?;
 statement.query_map([id],|r|Ok(serde_json::json!({"id":r.get::<_,i64>(0)?,"revision":r.get::<_,i64>(1)?,"date":r.get::<_,String>(2)?,"amountMicros":r.get::<_,i64>(3)?.to_string(),"status":r.get::<_,String>(4)?,"deleted":r.get::<_,bool>(5)?}))).map_err(error)?.collect::<rusqlite::Result<_>>().map_err(error)
}
pub(crate) fn validate_links(db:&Connection,id:i64,kind:&str,amount:i64)->Result<()>{
 let link:Option<(i64,i64,String)>=db.query_row("SELECT l.original_id,o.amount_micros,o.kind FROM transaction_links l JOIN transactions o ON o.id=l.original_id WHERE l.transaction_id=?1",[id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional().map_err(error)?;
 if let Some((original,total,original_kind))=link{let other:i64=db.query_row("SELECT coalesce(sum(-t.amount_micros),0) FROM transactions t JOIN transaction_links l ON l.transaction_id=t.id WHERE l.original_id=?1 AND t.id<>?2 AND t.deleted_at IS NULL",params![original,id],|r|r.get(0)).map_err(error)?;if kind!="expense"||original_kind!="expense"||amount>=0||i128::from(-amount)+i128::from(other)>i128::from(total){return Err("refund".into());}}
 let refunded:i64=db.query_row("SELECT coalesce(sum(-t.amount_micros),0) FROM transactions t JOIN transaction_links l ON l.transaction_id=t.id WHERE l.original_id=?1 AND t.deleted_at IS NULL",[id],|r|r.get(0)).map_err(error)?;
 if refunded>0&&(kind!="expense"||amount<refunded){return Err("refund".into());}Ok(())
}
#[tauri::command]
pub fn create_refund(database:State<'_,Mutex<Connection>>,id:i64,revision:i64,amount_micros:String,occurred_on:String)->Result<i64>{
 crate::features::date(&occurred_on)?;let amount=amount_micros.parse::<i64>().map_err(|_|"amount")?;if amount<=0||amount>999_999_999_999_999{return Err("amount".into());}
 let mut db=database.lock().map_err(|_|"database")?;let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(error)?;
 let (title,total,category,payment):(String,i64,Option<String>,Option<String>)=tx.query_row("SELECT title,amount_micros,category,payment_method FROM transactions WHERE id=?1 AND revision=?2 AND kind='expense' AND amount_micros>0 AND deleted_at IS NULL",params![id,revision],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).map_err(|_|"conflict")?;
 let refunded:i64=tx.query_row("SELECT coalesce(sum(-t.amount_micros),0) FROM transactions t JOIN transaction_links l ON l.transaction_id=t.id WHERE l.original_id=?1 AND t.deleted_at IS NULL",[id],|r|r.get(0)).map_err(error)?;if i128::from(amount)+i128::from(refunded)>i128::from(total){return Err("refund".into());}
 tx.execute("INSERT INTO transactions(title,kind,status,occurred_on,amount_micros,category,payment_method,note) VALUES (?1,'expense','realized',?2,?3,?4,?5,?6)",params![title,occurred_on,-amount,category,payment,format!("Refund #{}",id)]).map_err(error)?;let refund=tx.last_insert_rowid();tx.execute("INSERT INTO transaction_links(transaction_id,original_id,kind) VALUES (?1,?2,'refund')",params![refund,id]).map_err(error)?;tx.commit().map_err(error)?;Ok(refund)
}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
pub struct PlanInput {title:String,total_micros:String,count:u32,start:String,category:Option<String>,payment_method:Option<String>}
pub(crate) fn month_date(start:NaiveDate,offset:u32)->Result<NaiveDate>{let months=i64::from(start.year())*12+i64::from(start.month0())+i64::from(offset);let year=(months/12)as i32;let month=(months%12+1)as u32;for day in (1..=start.day()).rev(){if let Some(date)=NaiveDate::from_ymd_opt(year,month,day){return Ok(date);}}Err("date".into())}
#[tauri::command]
pub fn create_installments(database:State<'_,Mutex<Connection>>,input:PlanInput)->Result<i64>{
 crate::features::date(&input.start)?;let start=NaiveDate::parse_from_str(&input.start,"%Y-%m-%d").map_err(|_|"date")?;
 let total=input.total_micros.parse::<i64>().map_err(|_|"amount")?;
 if !(2..=120).contains(&input.count)||total<i64::from(input.count)||total>999_999_999_999_999||input.title.trim().is_empty()||input.title.chars().count()>200{return Err("installment".into());}
 let mut dates=vec![];for offset in 0..input.count{let date=month_date(start,offset)?;crate::features::date(&date.to_string())?;dates.push(date);}
 let mut db=database.lock().map_err(|_|"database")?;let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).map_err(error)?;
 tx.execute("INSERT INTO installment_plans(title,total_micros,count) VALUES (?1,?2,?3)",params![input.title,total,input.count]).map_err(error)?;let id=tx.last_insert_rowid();let base=total/i64::from(input.count);
 for (index,date) in dates.iter().enumerate(){let amount=if index+1==dates.len(){total-base*i64::from(input.count-1)}else{base};tx.execute("INSERT INTO transactions(title,kind,status,occurred_on,amount_micros,category,payment_method,installment_plan_id,installment_position) VALUES (?1,'expense','planned',?2,?3,?4,?5,?6,?7)",params![input.title,date.to_string(),amount,input.category,input.payment_method,id,index as i64+1]).map_err(error)?;}
 tx.commit().map_err(error)?;Ok(id)
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Installment {id:i64,title:String,total_micros:String,count:i64,paid_micros:String,active_micros:String}
#[tauri::command]
pub fn list_installments(database:State<'_,Mutex<Connection>>)->Result<Vec<Installment>>{
 let db=database.lock().map_err(|_|"database")?;let mut stmt=db.prepare("SELECT p.id,p.title,p.total_micros,p.count,coalesce(sum(CASE WHEN t.deleted_at IS NULL AND t.status='realized' THEN t.amount_micros ELSE 0 END),0),coalesce(sum(CASE WHEN t.deleted_at IS NULL THEN t.amount_micros ELSE 0 END),0) FROM installment_plans p LEFT JOIN transactions t ON t.installment_plan_id=p.id GROUP BY p.id ORDER BY p.id DESC").map_err(error)?;
 let rows=stmt.query_map([],|r|Ok(Installment{id:r.get(0)?,title:r.get(1)?,total_micros:r.get::<_,i64>(2)?.to_string(),count:r.get(3)?,paid_micros:r.get::<_,i64>(4)?.to_string(),active_micros:r.get::<_,i64>(5)?.to_string()})).map_err(error)?;rows.collect::<rusqlite::Result<Vec<_>>>().map_err(error)
}
#[cfg(test)]mod tests{use super::*;#[test]fn monthly_dates_do_not_drift_after_february(){let start=NaiveDate::from_ymd_opt(2026,1,31).unwrap();assert_eq!(month_date(start,1).unwrap().to_string(),"2026-02-28");assert_eq!(month_date(start,2).unwrap().to_string(),"2026-03-31");}}
