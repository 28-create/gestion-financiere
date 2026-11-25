use std::sync::Mutex;

use chrono::NaiveDate;
use rusqlite::{params, Connection, TransactionBehavior};
use serde::{Deserialize, Serialize};
use tauri::State;

type Database<'a> = State<'a, Mutex<Connection>>;
type CommandResult<T> = Result<T, &'static str>;
const PAGE_SIZE: u32 = 50;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryInput {
    title: String,
    kind: String,
    status: String,
    occurred_on: String,
    amount_micros: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    id: i64,
    revision: i64,
    title: String,
    kind: String,
    status: String,
    occurred_on: String,
    amount_micros: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerPage {
    entries: Vec<Entry>,
    count: u64,
    income_micros: String,
    expense_micros: String,
    page_size: u32,
}

pub fn migrate(connection: &mut Connection) -> rusqlite::Result<()> {
    let tx = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let version: i64 = tx.pragma_query_value(None, "user_version", |row| row.get(0))?;
    match version {
        0 => {
            tx.execute_batch(include_str!("../migrations/001_ledger.sql"))?;
            tx.pragma_update(None, "user_version", 1)?;
        }
        1 => {}
        _ => return Err(rusqlite::Error::InvalidQuery),
    }
    tx.commit()
}

fn parse_date(value: &str) -> CommandResult<()> {
    let date = NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| "date")?;
    if value.len() != 10 || value.starts_with("0000") || date.to_string() != value {
        return Err("date");
    }
    Ok(())
}

fn validate_kind(kind: &str) -> CommandResult<()> {
    if matches!(kind, "income" | "expense") {
        Ok(())
    } else {
        Err("kind")
    }
}

#[tauri::command]
pub fn read_ledger(
    database: Database<'_>,
    from: String,
    to: String,
    kind: Option<String>,
    search: String,
    page: u32,
    trash: bool,
) -> CommandResult<LedgerPage> {
    parse_date(&from)?;
    parse_date(&to)?;
    if from > to || search.chars().count() > 200 {
        return Err("filter");
    }
    if let Some(kind) = &kind {
        validate_kind(kind)?;
    }
    let mut connection = database.lock().map_err(|_| "database")?;
    let snapshot = connection.transaction().map_err(|_| "database")?;
    let conditions = "FROM transactions
        WHERE occurred_on BETWEEN ?1 AND ?2
          AND (?3 IS NULL OR kind = ?3)
          AND (?4 = '' OR instr(lower(title), lower(?4)) > 0)
          AND (deleted_at IS NOT NULL) = ?5";
    let entries = {
        let query = format!("SELECT id, revision, title, kind, status, occurred_on, amount_micros
            {conditions} ORDER BY occurred_on DESC, id DESC LIMIT ?6 OFFSET ?7");
        let mut statement = snapshot.prepare(&query).map_err(|_| "database")?;
        let rows = statement.query_map(
            params![from, to, kind, search, trash, PAGE_SIZE, i64::from(page) * i64::from(PAGE_SIZE)],
            |row| {
                Ok(Entry {
                    id: row.get(0)?,
                    revision: row.get(1)?,
                    title: row.get(2)?,
                    kind: row.get(3)?,
                    status: row.get(4)?,
                    occurred_on: row.get(5)?,
                    amount_micros: row.get::<_, i64>(6)?.to_string(),
                })
            }
        ).map_err(|_| "database")?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|_| "database")?
    };
    let query = format!("SELECT kind, status, amount_micros {conditions}");
    let mut statement = connection.prepare(&query).map_err(|_| "database")?;
    let mut rows = statement.query(params![from, to, kind, search, trash]).map_err(|_| "database")?;
    let (mut income_micros, mut expense_micros, mut count) = (0_i128, 0_i128, 0_u64);
    while let Some(row) = rows.next().map_err(|_| "database")? {
        count += 1;
        let status: String = row.get(1).map_err(|_| "database")?;
        if !trash && status == "realized" {
            let kind: String = row.get(0).map_err(|_| "database")?;
            let amount = i128::from(row.get::<_, i64>(2).map_err(|_| "database")?);
            if kind == "income" {
                income_micros += amount;
            } else {
                expense_micros += amount;
            }
        }
    }
    Ok(LedgerPage {
        entries,
        count,
        income_micros: income_micros.to_string(),
        expense_micros: expense_micros.to_string(),
        page_size: PAGE_SIZE,
    })
}

#[tauri::command]
pub fn save_transaction(
    database: Database<'_>,
    input: EntryInput,
    id: Option<i64>,
    revision: Option<i64>,
) -> CommandResult<()> {
    let title = input.title.trim();
    if title.is_empty() || title.chars().count() > 200 {
        return Err("title");
    }
    validate_kind(&input.kind)?;
    parse_date(&input.occurred_on)?;
    if !matches!(input.status.as_str(), "realized" | "planned" | "pending") {
        return Err("status");
    }
    let amount = input.amount_micros.parse::<i64>().map_err(|_| "amount")?;
    if !(-999_999_999_999_999..=999_999_999_999_999).contains(&amount) {
        return Err("amount");
    }
    let connection = database.lock().map_err(|_| "database")?;
    let affected = match (id, revision) {
        (None, None) => connection.execute(
            "INSERT INTO transactions (title, kind, status, occurred_on, amount_micros)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![title, input.kind, input.status, input.occurred_on, amount],
        ),
        (Some(id), Some(revision)) => connection.execute(
            "UPDATE transactions SET title = ?1, kind = ?2, status = ?3,
                occurred_on = ?4, amount_micros = ?5, revision = revision + 1,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?6 AND revision = ?7 AND deleted_at IS NULL",
            params![title, input.kind, input.status, input.occurred_on, amount, id, revision],
        ),
        _ => return Err("conflict"),
    }.map_err(|_| "database")?;
    if affected != 1 {
        return Err("conflict");
    }
    Ok(())
}

#[tauri::command]
pub fn set_deleted(
    database: Database<'_>,
    id: i64,
    revision: i64,
    deleted: bool,
) -> CommandResult<()> {
    let connection = database.lock().map_err(|_| "database")?;
    let affected = connection.execute(
        "UPDATE transactions
         SET deleted_at = CASE WHEN ?1 THEN CURRENT_TIMESTAMP ELSE NULL END,
             revision = revision + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?2 AND revision = ?3 AND (deleted_at IS NULL) = ?1",
        params![deleted, id, revision],
    ).map_err(|_| "database")?;
    if affected != 1 {
        return Err("conflict");
    }
    Ok(())
}
