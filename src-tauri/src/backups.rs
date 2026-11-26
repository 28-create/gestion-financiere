use std::{fs,path::{Path,PathBuf},sync::Mutex};
use rusqlite::{params,Connection,OptionalExtension};
use serde::Serialize;
use serde_json::{Value,json};
use tauri::Manager;
type Result<T>=std::result::Result<T,String>;
fn error(e:impl std::fmt::Display)->String{e.to_string()}
fn config(db:&Connection)->Value{db.query_row("SELECT payload FROM feature_items WHERE kind='settings' AND name='general' AND archived=0 ORDER BY id DESC LIMIT 1",[],|r|r.get::<_,String>(0)).ok().and_then(|s|serde_json::from_str(&s).ok()).unwrap_or_else(||json!({}))}
pub(crate) fn folder(db:&Connection)->Result<PathBuf>{let settings=config(db);let configured=settings["backupFolder"].as_str().unwrap_or("").trim();let path=if configured.is_empty(){PathBuf::from(db.path().ok_or("database")?).parent().ok_or("database")?.join("backups")}else{let p=PathBuf::from(configured);if !p.is_absolute(){return Err("backup_path".into());}p};Ok(path)}
fn mirror(db:&Connection,source:&Path)->Result<Option<String>>{let settings=config(db);let value=settings["cloudFolder"].as_str().unwrap_or("").trim();if value.is_empty(){return Ok(None);}let directory=PathBuf::from(value);if !directory.is_absolute(){return Err("cloud_path".into());}fs::create_dir_all(&directory).map_err(error)?;if directory.canonicalize().map_err(error)?==source.parent().ok_or("backup")?.canonicalize().map_err(error)?{return Ok(Some(source.to_string_lossy().into_owned()));}let target=directory.join(source.file_name().ok_or("backup")?);let pending=target.with_extension("pending");fs::copy(source,&pending).map_err(error)?;fs::rename(&pending,&target).map_err(error)?;Ok(Some(target.to_string_lossy().into_owned()))}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct BackupInfo {pub path:Option<String>,pub date:Option<String>,pub error:Option<String>,pub cloud_path:Option<String>,pub created:bool}
pub(crate) fn run(db:&Connection,force:bool)->Result<BackupInfo>{
 let settings=config(db);let frequency=settings["backupFrequency"].as_str().unwrap_or("daily");let now=chrono::Local::now();let day=now.format("%Y-%m-%d").to_string();
 let stored:Option<String>=db.query_row("SELECT value FROM app_metadata WHERE key='last_backup'",[],|r|r.get(0)).optional().map_err(error)?;
 let old:Value=stored.and_then(|s|serde_json::from_str(&s).ok()).unwrap_or_else(||json!({}));
 let due=match frequency{"off"=>false,"weekly"=>now.timestamp()-old["epoch"].as_i64().unwrap_or(0)>=7*86400,_=>old["date"].as_str()!=Some(day.as_str())};
 if !force&&!due{return Ok(BackupInfo{path:old["path"].as_str().map(str::to_string),date:old["date"].as_str().map(str::to_string),error:None,cloud_path:old["cloudPath"].as_str().map(str::to_string),created:false});}
 let source=PathBuf::from(crate::data_tools::snapshot(db)?);let directory=source.parent().ok_or("backup")?.to_path_buf();
 let target=if force{source.clone()}else{let file=source.file_name().ok_or("backup")?.to_string_lossy().replacen("ledger-","ledger-auto-",1);let path=directory.join(file);fs::rename(&source,&path).map_err(error)?;path};
 let (cloud_path,cloud_error)=match mirror(db,&target){Ok(path)=>(path,None),Err(message)=>(None,Some(message))};
 let path=target.to_string_lossy().into_owned();let payload=json!({"path":path,"date":day,"epoch":now.timestamp(),"cloudPath":cloud_path});
 db.execute("INSERT INTO app_metadata(key,value) VALUES ('last_backup',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[payload.to_string()]).map_err(error)?;
 let retain=settings["backupRetention"].as_u64().unwrap_or(30).clamp(1,365)as usize;let canonical=directory.canonicalize().map_err(error)?;
 let mut files=fs::read_dir(&directory).map_err(error)?.filter_map(|e|e.ok()).filter(|e|e.file_type().is_ok_and(|t|t.is_file())&&e.file_name().to_string_lossy().starts_with("ledger-auto-")&&e.path().extension().is_some_and(|e|e=="sqlite3")).map(|e|e.path()).collect::<Vec<_>>();files.sort();files.reverse();
 for file in files.into_iter().skip(retain){if file.parent().and_then(|p|p.canonicalize().ok()).as_ref()==Some(&canonical){fs::remove_file(file).map_err(error)?;}}
 Ok(BackupInfo{path:Some(path),date:Some(day),error:cloud_error,cloud_path,created:true})
}
#[tauri::command]
pub async fn automatic_backup(app:tauri::AppHandle,force:bool)->Result<BackupInfo>{tauri::async_runtime::spawn_blocking(move||{let state=app.state::<Mutex<Connection>>();let db=state.lock().map_err(|_|"database")?;run(&db,force)}).await.map_err(error)?}
