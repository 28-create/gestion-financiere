import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import test from "node:test";
import { decimalAmount, formatIls, parseAmount } from "../src/domain/money.ts";

const migration = readFileSync(new URL("../src-tauri/migrations/001_ledger.sql", import.meta.url), "utf8");

test("exact signed decimal amounts and input limits", () => {
  assert.equal(parseAmount(" -123,456789 "), -123_456_789n);
  assert.equal(parseAmount("0"), 0n);
  assert.equal(parseAmount("0.1") + parseAmount("0.2"), parseAmount("0.3"));
  assert.equal(decimalAmount(-2_000_010n), "-2.00001");
  for (const value of ["1e6", "2.1234567", "7 * 10", "1000000000", "1,2.3", ""]) {
    assert.throws(() => parseAmount(value), /amount/);
  }
});

test("rounds half cents away from zero even when the displayed whole part is zero", () => {
  assert.equal(formatIls(parseAmount("0.005"), "en-GB"), "₪0.01");
  assert.equal(formatIls(parseAmount("-0.005"), "en-GB"), "-₪0.01");
  assert.equal(formatIls(parseAmount("-0.0049"), "en-GB"), "₪0.00");
  assert.equal(formatIls(parseAmount("1234.995"), "en-GB"), "₪1,235.00");
});

test("migration enforces transaction constraints and tracks edit, trash and restore", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(migration);
    const add = db.prepare(`INSERT INTO transactions(title, kind, status, occurred_on, amount_micros)
      VALUES (?, ?, ?, ?, ?)`);
    const id = add.run("Exemple", "expense", "realized", "2026-04-10", 123_456_789).lastInsertRowid;
    add.run("Planifiée", "expense", "planned", "2026-04-10", 5_000_000);
    assert.throws(() => add.run("Invalide", "something", "realized", "2026-04-10", 1), /CHECK/);
    assert.throws(() => add.run("Fraction", "expense", "realized", "2026-04-10", 1.5), /cannot store/);
    assert.equal(db.prepare("SELECT SUM(amount_micros) AS total FROM transactions WHERE status = 'realized' AND deleted_at IS NULL").get().total, 123_456_789);
    db.prepare("UPDATE transactions SET amount_micros = ?, revision = revision + 1 WHERE id = ? AND revision = ?").run(120_000_000, id, 1);
    db.prepare("UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP, revision = revision + 1 WHERE id = ? AND revision = ?").run(id, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE status = 'realized' AND deleted_at IS NULL").get().count, 0);
    const stale = db.prepare("UPDATE transactions SET deleted_at = NULL, revision = revision + 1 WHERE id = ? AND revision = ?").run(id, 2);
    assert.equal(stale.changes, 0);
    db.prepare("UPDATE transactions SET deleted_at = NULL, revision = revision + 1 WHERE id = ? AND revision = ?").run(id, 3);
    const revisions = db.prepare("SELECT revision, deleted_at IS NOT NULL AS deleted FROM transaction_history WHERE transaction_id = ? ORDER BY revision").all(id);
    assert.deepEqual(revisions.map(({ revision, deleted }) => [revision, deleted]), [[1, 0], [2, 0], [3, 1], [4, 0]]);
  } finally {
    db.close();
  }
});
