CREATE TABLE import_batches (
 id INTEGER PRIMARY KEY,
 filename TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 undone_at TEXT
) STRICT;
ALTER TABLE transactions ADD COLUMN import_batch_id INTEGER REFERENCES import_batches(id);
CREATE INDEX transactions_by_batch ON transactions(import_batch_id);
