#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ledger;

use std::{fs, sync::Mutex, time::Duration};

use rusqlite::Connection;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let directory = app.path().app_data_dir()?;
            fs::create_dir_all(&directory)?;
            let mut connection = Connection::open(directory.join("ledger.sqlite3"))?;
            connection.busy_timeout(Duration::from_secs(5))?;
            connection.pragma_update(None, "foreign_keys", true)?;
            connection.pragma_update(None, "journal_mode", "WAL")?;
            ledger::migrate(&mut connection)?;
            app.manage(Mutex::new(connection));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ledger::read_ledger,
            ledger::save_transaction,
            ledger::set_deleted
        ])
        .run(tauri::generate_context!())
        .expect("failed to launch Gestion financière");
}
