#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ledger;
mod data_tools;
mod reporting;
mod catalog;
mod table_tools;

use std::{env, fs, sync::Mutex, time::Duration};

use rusqlite::Connection;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let executable = env::current_exe()?;
            let directory = match executable.parent() {
                Some(directory) if directory.join("portable-mode").is_file() => directory.join("data"),
                _ => app.path().app_data_dir()?,
            };
            fs::create_dir_all(&directory)?;
            let mut connection = Connection::open(directory.join("ledger.sqlite3"))?;
            connection.busy_timeout(Duration::from_secs(5))?;
            connection.pragma_update(None, "foreign_keys", true)?;
            connection.pragma_update(None, "journal_mode", "WAL")?;
            let schema:i64=connection.pragma_query_value(None,"user_version",|row|row.get(0))?;
            if schema>0 && schema<4 {
                data_tools::snapshot(&connection).map_err(std::io::Error::other)?;
            }
            ledger::migrate(&mut connection)?;
            app.manage(Mutex::new(connection));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ledger::read_ledger,
            ledger::save_transaction,
            ledger::set_deleted,
            data_tools::create_backup,
            data_tools::import_rows,
            data_tools::undo_import
            ,reporting::report_rows
            ,reporting::transaction_history
            ,data_tools::list_backups
            ,data_tools::restore_backup
            ,catalog::list_catalog
            ,catalog::save_catalog_item
            ,catalog::list_titles
            ,data_tools::import_catalog
            ,table_tools::save_grid
            ,table_tools::trash_grid
        ])
        .run(tauri::generate_context!())
        .expect("failed to launch Gestion financière");
}
