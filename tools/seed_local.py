"""Create a fresh, local portable ledger from the audited Excel budget."""

import argparse
from contextlib import closing
from decimal import Decimal
import hashlib
import os
from pathlib import Path
import sqlite3
import sys
import tempfile

from reconcile_budget import MICRO, reconcile


def seed_ledger(workbook, portable_directory):
    migrations = Path(__file__).resolve().parents[1] / "src-tauri" / "migrations"
    data_directory = portable_directory / "data"
    destination = data_directory / "ledger.sqlite3"
    if destination.exists():
        raise FileExistsError("Le registre existe déjà.")

    before = hashlib.sha256(workbook.read_bytes()).digest()
    operations = []
    summary = reconcile(workbook, collect=operations.append)
    if summary["issues"]:
        raise ValueError(f"{len(summary['issues'])} ligne(s) ou tableau(x) à vérifier avant import.")
    if hashlib.sha256(workbook.read_bytes()).digest() != before:
        raise ValueError("Le classeur a changé pendant la lecture.")

    data_directory.mkdir(parents=True, exist_ok=True)
    handle, path = tempfile.mkstemp(dir=data_directory, suffix=".sqlite3")
    os.close(handle)
    pending = Path(path)
    try:
        expected = [
            (title, kind, when.isoformat(), int(amount / MICRO), category or None,
             payment or None, note or None, sheet, table, row)
            for title, kind, when, amount, category, payment, note, sheet, table, row in operations
        ]
        with closing(sqlite3.connect(pending)) as connection:
            connection.execute("PRAGMA foreign_keys = ON")
            for migration in ("001_ledger.sql", "002_workbook_fields.sql"):
                connection.executescript((migrations / migration).read_text(encoding="utf-8"))
            with connection:
                connection.execute("PRAGMA user_version = 2")
                connection.executemany(
                    "INSERT INTO transactions(title, kind, occurred_on, amount_micros, category, payment_method, "
                    "note, source_sheet, source_table, source_row, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'realized')",
                    expected,
                )
                saved = connection.execute(
                    "SELECT title, kind, occurred_on, amount_micros, category, payment_method, "
                    "note, source_sheet, source_table, source_row FROM transactions ORDER BY id"
                ).fetchall()
                if saved != expected or connection.execute("PRAGMA integrity_check").fetchone() != ("ok",):
                    raise ValueError("La base SQLite ne concorde pas avec la source.")
                totals = connection.execute(
                    "SELECT source_sheet, kind, COUNT(*), SUM(amount_micros) FROM transactions "
                    "GROUP BY source_sheet, kind"
                ).fetchall()
                controls = {
                    (year, kind): (annual["counts"][kind], annual[kind])
                    for year, annual in summary["years"].items()
                    for kind in ("income", "expense")
                    if annual["counts"][kind] > 0
                }
                if {(year, kind): (count, Decimal(total) * MICRO) for year, kind, count, total in totals} != controls:
                    raise ValueError("Les totaux SQLite ne concordent pas avec le classeur.")
        if os.name == "nt":
            pending.rename(destination)
        else:
            os.link(pending, destination)
        (portable_directory / "portable-mode").touch(exist_ok=True)
    finally:
        pending.unlink(missing_ok=True)
    return len(operations)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("portable_directory", type=Path)
    args = parser.parse_args()
    try:
        print(f"{seed_ledger(args.workbook, args.portable_directory)} opérations importées.")
    except (OSError, ValueError, sqlite3.Error) as error:
        sys.exit(str(error))


if __name__ == "__main__":
    main()
