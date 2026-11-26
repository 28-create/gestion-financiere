"""Stage and verify a GitHub Actions portable executable beside an imported local ledger."""

import argparse
from contextlib import closing
import hashlib
from pathlib import Path
import os
import sqlite3
import sys
import tempfile
from zipfile import ZipFile


def stage(archive, expected_sha256, directory):
    with archive.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != expected_sha256.lower():
            raise ValueError("L’archive ne correspond pas à la compilation vérifiée.")
        stream.seek(0)
        with ZipFile(stream) as bundle:
            if bundle.namelist() != ["gestion-financiere.exe"] or bundle.testzip() is not None:
                raise ValueError("L’archive n’est pas le paquet portable Windows attendu.")
            executable = bundle.read("gestion-financiere.exe")
    if executable[:2] != b"MZ":
        raise ValueError("Format exécutable Windows invalide.")

    database = (directory / "data" / "ledger.sqlite3").resolve()
    if not (directory / "portable-mode").is_file():
        raise ValueError("Le dossier portable n’a pas été initialisé.")
    with closing(sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)) as ledger:
        if ledger.execute("PRAGMA user_version").fetchone() != (2,):
            raise ValueError("Le registre local ne correspond pas à cette version.")
        if ledger.execute("PRAGMA integrity_check").fetchone() != ("ok",):
            raise ValueError("Le registre local est endommagé.")

    target = directory / "gestion-financiere.exe"
    if target.exists():
        if target.read_bytes() != executable:
            raise FileExistsError("Un exécutable différent est déjà présent.")
        return
    handle, staged_file = tempfile.mkstemp(dir=directory, suffix=".exe")
    pending = Path(staged_file)
    try:
        with os.fdopen(handle, "wb") as stream:
            stream.write(executable)
        if os.name == "nt":
            pending.rename(target)
        else:
            os.link(pending, target)
    finally:
        pending.unlink(missing_ok=True)


def main():
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("sha256")
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    try:
        stage(args.archive, args.sha256, args.directory)
    except (OSError, ValueError, sqlite3.Error) as error:
        sys.exit(str(error))


if __name__ == "__main__":
    main()
