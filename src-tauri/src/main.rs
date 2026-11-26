#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ledger;
mod data_tools;
mod reporting;
mod catalog;
mod table_tools;
mod features;
mod details;
mod complex;
mod recurrence;
mod backups;
mod files;

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
            if schema>0 && schema<ledger::SCHEMA_VERSION {
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
            ,reporting::restore_revision
            ,data_tools::list_backups
            ,data_tools::restore_backup
            ,catalog::list_catalog
            ,catalog::save_catalog_item
            ,catalog::merge_catalog
            ,catalog::list_titles
            ,catalog::title_habit
            ,data_tools::import_catalog
            ,data_tools::preview_import_rows
            ,data_tools::list_imports
            ,table_tools::save_grid
            ,table_tools::trash_grid
            ,table_tools::purge_transactions
            ,features::list_features
            ,features::save_feature
            ,features::feature_history
            ,details::get_details
            ,details::save_details
            ,complex::create_refund
            ,complex::refund_summary
            ,complex::installment_rows
            ,complex::create_installments
            ,complex::list_installments
            ,recurrence::list_occurrences
            ,recurrence::record_occurrences
            ,recurrence::split_recurrence
            ,recurrence::link_occurrence
            ,backups::automatic_backup
            ,files::save_export
            ,files::export_database
            ,files::import_backup
        ])
        .run(tauri::generate_context!())
        .expect("failed to launch Gestion financière");
}
