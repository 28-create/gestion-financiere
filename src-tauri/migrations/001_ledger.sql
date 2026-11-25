CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
    kind TEXT NOT NULL CHECK(kind IN ('income', 'expense')),
    status TEXT NOT NULL CHECK(status IN ('realized', 'planned', 'pending')),
    occurred_on TEXT NOT NULL CHECK(length(occurred_on) = 10),
    amount_micros INTEGER NOT NULL CHECK(amount_micros BETWEEN -999999999999999 AND 999999999999999),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0)
) STRICT;

CREATE INDEX transactions_by_date
    ON transactions(occurred_on DESC, id DESC) WHERE deleted_at IS NULL;

CREATE TABLE transaction_history (
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    revision INTEGER NOT NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    occurred_on TEXT NOT NULL,
    amount_micros INTEGER NOT NULL,
    deleted_at TEXT,
    recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(transaction_id, revision)
) STRICT;

CREATE TRIGGER transaction_history_after_insert
AFTER INSERT ON transactions
BEGIN
    INSERT INTO transaction_history(
        transaction_id, revision, title, kind, status, occurred_on, amount_micros, deleted_at
    ) VALUES (
        NEW.id, NEW.revision, NEW.title, NEW.kind, NEW.status, NEW.occurred_on, NEW.amount_micros, NEW.deleted_at
    );
END;

CREATE TRIGGER transaction_history_after_update
AFTER UPDATE ON transactions
BEGIN
    INSERT INTO transaction_history(
        transaction_id, revision, title, kind, status, occurred_on, amount_micros, deleted_at
    ) VALUES (
        NEW.id, NEW.revision, NEW.title, NEW.kind, NEW.status, NEW.occurred_on, NEW.amount_micros, NEW.deleted_at
    );
END;
