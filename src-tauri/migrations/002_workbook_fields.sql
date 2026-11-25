ALTER TABLE transactions ADD COLUMN category TEXT;
ALTER TABLE transaction_history ADD COLUMN category TEXT;
ALTER TABLE transactions ADD COLUMN payment_method TEXT;
ALTER TABLE transaction_history ADD COLUMN payment_method TEXT;
ALTER TABLE transactions ADD COLUMN note TEXT;
ALTER TABLE transaction_history ADD COLUMN note TEXT;
ALTER TABLE transactions ADD COLUMN source_sheet TEXT;
ALTER TABLE transactions ADD COLUMN source_table TEXT;
ALTER TABLE transactions ADD COLUMN source_row INTEGER;

CREATE UNIQUE INDEX workbook_row ON transactions(source_sheet, source_table, source_row)
    WHERE source_sheet IS NOT NULL;

DROP TRIGGER transaction_history_after_insert;
DROP TRIGGER transaction_history_after_update;
CREATE TRIGGER transaction_history_after_insert
AFTER INSERT ON transactions
BEGIN
    INSERT INTO transaction_history(
        transaction_id, revision, title, kind, status, occurred_on, amount_micros, deleted_at,
        category, payment_method, note
    ) VALUES (
        NEW.id, NEW.revision, NEW.title, NEW.kind, NEW.status, NEW.occurred_on, NEW.amount_micros,
        NEW.deleted_at, NEW.category, NEW.payment_method, NEW.note
    );
END;

CREATE TRIGGER transaction_history_after_update
AFTER UPDATE ON transactions
BEGIN
    INSERT INTO transaction_history(
        transaction_id, revision, title, kind, status, occurred_on, amount_micros, deleted_at,
        category, payment_method, note
    ) VALUES (
        NEW.id, NEW.revision, NEW.title, NEW.kind, NEW.status, NEW.occurred_on, NEW.amount_micros,
        NEW.deleted_at, NEW.category, NEW.payment_method, NEW.note
    );
END;
