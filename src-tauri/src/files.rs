use std::{fs,io::Write,path::Path,sync::Mutex,time::{SystemTime,UNIX_EPOCH}};
use rusqlite::Connection;
use tauri::Manager;
type Result<T>=std::result::Result<T,String>;
fn error(e:impl std::fmt::Display)->String{e.to_string()}
fn write_new(path:&Path,bytes:&[u8])->Result<()>{let mut file=fs::OpenOptions::new().write(true).create_new(true).open(path).map_err(|_|"export_exists_or_unwritable")?;if let Err(e)=file.write_all(bytes).and_then(|_|file.sync_all()){drop(file);let _=fs::remove_file(path);return Err(error(e));}Ok(())}
#[tauri::command]
pub async fn save_export(filename:String,bytes:Vec<u8>)->Result<Option<String>>{
 if bytes.len()>100_000_000||filename.len()>200||filename.contains(['/', '\\', ':']){return Err("export".into());}
 let extension=Path::new(&filename).extension().and_then(|s|s.to_str()).unwrap_or("").to_ascii_lowercase();if !matches!(extension.as_str(),"csv"|"xlsx"|"png"|"svg"|"json"){return Err("export".into());}
 tauri::async_runtime::spawn_blocking(move||{let Some(path)=rfd::FileDialog::new().set_file_name(&filename).add_filter(&extension,&[extension.as_str()]).save_file()else{return Ok(None);};if path.extension().and_then(|s|s.to_str()).is_none_or(|e|!e.eq_ignore_ascii_case(&extension)){return Err("export_extension".into());}write_new(&path,&bytes)?;Ok(Some(path.to_string_lossy().into_owned()))}).await.map_err(error)?
}
#[tauri::command]
pub async fn export_database(app:tauri::AppHandle)->Result<Option<String>>{
 tauri::async_runtime::spawn_blocking(move||{let Some(path)=rfd::FileDialog::new().set_file_name("gestion-financiere-complete.sqlite3").add_filter("SQLite",&["sqlite3"]).save_file()else{return Ok(None);};if path.extension().and_then(|s|s.to_str())!=Some("sqlite3"){return Err("export_extension".into());}let state=app.state::<Mutex<Connection>>();let db=state.lock().map_err(|_|"database")?;let source=crate::data_tools::snapshot(&db)?;let bytes=fs::read(source).map_err(error)?;write_new(&path,&bytes)?;Ok(Some(path.to_string_lossy().into_owned()))}).await.map_err(error)?
}
#[tauri::command]
pub async fn import_backup(app:tauri::AppHandle)->Result<Option<String>>{
 tauri::async_runtime::spawn_blocking(move||{
  let Some(source_path)=rfd::FileDialog::new().add_filter("SQLite",&["sqlite3"]).pick_file()else{return Ok(None);};
  let database=app.state::<Mutex<Connection>>();
  let name={let db=database.lock().map_err(|_|"database")?;let current=Path::new(db.path().ok_or("database")?).canonicalize().map_err(error)?;if source_path.canonicalize().map_err(error)?==current{return Err("live_database".into());}
   let source=Connection::open_with_flags(&source_path,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(error)?;source.busy_timeout(std::time::Duration::from_secs(5)).map_err(error)?;
   let folder=crate::backups::folder(&db)?;fs::create_dir_all(&folder).map_err(error)?;let name=format!("ledger-import-{}.sqlite3",SystemTime::now().duration_since(UNIX_EPOCH).map_err(error)?.as_nanos());let path=folder.join(&name);write_new(&path,&[])?;
   let mut destination=Connection::open(&path).map_err(error)?;{let copy=rusqlite::backup::Backup::new(&source,&mut destination).map_err(error)?;copy.run_to_completion(64,std::time::Duration::from_millis(5),None).map_err(error)?;}name
  };
  crate::data_tools::restore_backup(database,name).map(Some)
 }).await.map_err(error)?
}
