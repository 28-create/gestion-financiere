CREATE TABLE feature_items (
 id INTEGER PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('budget','recurrence','project','tag','template','classification','settings')),
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 revision INTEGER NOT NULL DEFAULT 1,
 archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE INDEX features_by_kind ON feature_items(kind,archived,id);
CREATE TABLE feature_history (
 feature_id INTEGER NOT NULL REFERENCES feature_items(id), revision INTEGER NOT NULL,
 name TEXT NOT NULL,payload TEXT NOT NULL,archived INTEGER NOT NULL,
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(feature_id,revision)
) STRICT;
CREATE TRIGGER feature_insert AFTER INSERT ON feature_items BEGIN
 INSERT INTO feature_history(feature_id,revision,name,payload,archived) VALUES (NEW.id,NEW.revision,NEW.name,NEW.payload,NEW.archived);
END;
CREATE TRIGGER feature_update AFTER UPDATE ON feature_items BEGIN
 INSERT INTO feature_history(feature_id,revision,name,payload,archived) VALUES (NEW.id,NEW.revision,NEW.name,NEW.payload,NEW.archived);
END;
CREATE TABLE recurring_occurrences (
 id INTEGER PRIMARY KEY,rule_id INTEGER NOT NULL REFERENCES feature_items(id),
 scheduled_on TEXT NOT NULL,transaction_id INTEGER REFERENCES transactions(id),
 state TEXT NOT NULL CHECK(state IN ('recorded','skipped')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(rule_id,scheduled_on)
) STRICT;
CREATE TABLE transaction_details (
 transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id),
 project_id INTEGER REFERENCES feature_items(id),
 currency TEXT NOT NULL DEFAULT 'ILS',original_micros INTEGER,rate_micros INTEGER,
 rate_date TEXT,rate_source TEXT,
 nature TEXT CHECK(nature IS NULL OR nature IN ('fixed','variable')),
 necessity TEXT CHECK(necessity IS NULL OR necessity IN ('essential','optional'))
) STRICT;
CREATE TABLE transaction_tags (
 transaction_id INTEGER NOT NULL REFERENCES transactions(id),tag_id INTEGER NOT NULL REFERENCES feature_items(id),
 PRIMARY KEY(transaction_id,tag_id)
) STRICT;
CREATE TABLE transaction_splits (
 transaction_id INTEGER NOT NULL REFERENCES transactions(id),position INTEGER NOT NULL,
 category TEXT NOT NULL,amount_micros INTEGER NOT NULL,
 PRIMARY KEY(transaction_id,position)
) STRICT;
CREATE TABLE transaction_links (
 transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id),
 original_id INTEGER NOT NULL REFERENCES transactions(id),
 kind TEXT NOT NULL CHECK(kind='refund'), CHECK(transaction_id<>original_id)
) STRICT;
CREATE TABLE installment_plans (
 id INTEGER PRIMARY KEY,title TEXT NOT NULL,total_micros INTEGER NOT NULL CHECK(total_micros>0),
 count INTEGER NOT NULL CHECK(count BETWEEN 2 AND 120),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
ALTER TABLE transactions ADD COLUMN installment_plan_id INTEGER REFERENCES installment_plans(id);
ALTER TABLE transactions ADD COLUMN installment_position INTEGER;
CREATE UNIQUE INDEX installment_position ON transactions(installment_plan_id,installment_position) WHERE installment_plan_id IS NOT NULL;
CREATE TABLE detail_history (
 transaction_id INTEGER NOT NULL REFERENCES transactions(id),revision INTEGER NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)),recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(transaction_id,revision)
) STRICT;
ALTER TABLE catalog_items ADD COLUMN parent_id INTEGER REFERENCES catalog_items(id);
ALTER TABLE catalog_items ADD COLUMN color TEXT NOT NULL DEFAULT '#087f78';
ALTER TABLE catalog_items ADD COLUMN icon TEXT NOT NULL DEFAULT '';
ALTER TABLE catalog_items ADD COLUMN translations TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(translations));
ALTER TABLE catalog_items ADD COLUMN sort_order INTEGER;
CREATE TABLE app_metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL) STRICT;
CREATE UNIQUE INDEX one_settings_key ON feature_items(name) WHERE kind='settings';
ALTER TABLE transactions ADD COLUMN source_key TEXT;
CREATE UNIQUE INDEX source_identity ON transactions(source_key) WHERE source_key IS NOT NULL;
DROP INDEX workbook_row;
CREATE INDEX workbook_row ON transactions(source_sheet,source_table,source_row) WHERE source_sheet IS NOT NULL;
CREATE INDEX duplicate_lookup ON transactions(title,kind,occurred_on,amount_micros);
ALTER TABLE import_batches ADD COLUMN report TEXT CHECK(report IS NULL OR json_valid(report));
