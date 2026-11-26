CREATE TABLE catalog_items (
 id INTEGER PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('income','expense','payment')),
 name TEXT NOT NULL CHECK(length(trim(name))>0),
 archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(kind,name)
) STRICT;
CREATE INDEX transactions_by_category ON transactions(kind,category) WHERE deleted_at IS NULL;
CREATE INDEX transactions_by_payment ON transactions(payment_method) WHERE deleted_at IS NULL;

INSERT OR IGNORE INTO catalog_items(kind,name)
 SELECT kind,category FROM transactions WHERE category IS NOT NULL AND length(trim(category))>0 ORDER BY occurred_on,id;
INSERT OR IGNORE INTO catalog_items(kind,name)
 SELECT 'payment',payment_method FROM transactions WHERE payment_method IS NOT NULL AND length(trim(payment_method))>0 ORDER BY occurred_on,id;

CREATE TRIGGER catalog_after_transaction_insert AFTER INSERT ON transactions BEGIN
 INSERT OR IGNORE INTO catalog_items(kind,name) SELECT NEW.kind,NEW.category WHERE NEW.category IS NOT NULL AND length(trim(NEW.category))>0;
 INSERT OR IGNORE INTO catalog_items(kind,name) SELECT 'payment',NEW.payment_method WHERE NEW.payment_method IS NOT NULL AND length(trim(NEW.payment_method))>0;
END;
CREATE TRIGGER catalog_after_transaction_update AFTER UPDATE OF kind,category,payment_method ON transactions BEGIN
 INSERT OR IGNORE INTO catalog_items(kind,name) SELECT NEW.kind,NEW.category WHERE NEW.category IS NOT NULL AND length(trim(NEW.category))>0;
 INSERT OR IGNORE INTO catalog_items(kind,name) SELECT 'payment',NEW.payment_method WHERE NEW.payment_method IS NOT NULL AND length(trim(NEW.payment_method))>0;
END;
