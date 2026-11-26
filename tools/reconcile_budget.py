"""Compute a local migration preview for the structured 2026–2040 budget workbook."""

import argparse
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import json
from pathlib import Path
import re
import sys
import unicodedata
from xml.etree.ElementTree import ParseError
from zipfile import BadZipFile, ZipFile

if __package__:
    from .audit_excel import WORKBOOK, children, descendants, local_name, read_xml, relationships
else:
    from audit_excel import WORKBOOK, children, descendants, local_name, read_xml, relationships


MICRO = Decimal("0.000001")
EXCEL_NOISE = Decimal("0.000000000001")
SAVINGS_CATEGORY = "epargne / livret a"


def normalized(text):
    return "".join(char for char in unicodedata.normalize("NFD", text.lower()) if not unicodedata.combining(char)).strip()


def cell_value(cell, strings):
    if cell is None:
        return ""
    kind = cell.get("t", "n")
    if kind == "inlineStr":
        return "".join(node.text or "" for node in descendants(cell, "t"))
    if kind == "e":
        raise ValueError("cellule Excel en erreur")
    value = next((item.text or "" for item in children(cell, "v")), "")
    return strings[int(value)] if kind == "s" and value else value


def excel_date(value, since_1904):
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return date.fromisoformat(value)
    number = Decimal(value)
    if not number.is_finite() or number != number.to_integral_value() or number < 0:
        raise ValueError("date Excel invalide")
    serial = int(number)
    if since_1904:
        return date(1904, 1, 1) + timedelta(days=serial)
    if serial == 60:
        raise ValueError("date fictive dans le calendrier Excel")
    offset = serial - (serial > 60)
    return date(1899, 12, 31) + timedelta(days=offset)


def column_number(letters):
    result = 0
    for letter in letters:
        result = result * 26 + ord(letter) - 64
    return result


def column_label(number):
    result = ""
    while number:
        number, digit = divmod(number - 1, 26)
        result = chr(65 + digit) + result
    return result


def table_rows(table, cells, strings, since_1904, *, details=None):
    start, end = table.attrib["ref"].split(":")
    first = re.fullmatch(r"([A-Z]+)(\d+)", start)
    last = re.fullmatch(r"[A-Z]+(\d+)", end)
    if not first or not last:
        raise ValueError("plage du tableau Excel invalide")
    first_column, first_row = first.groups()
    last_row = int(last.group(1))
    data_start = int(first_row) + int(table.get("headerRowCount", "1"))
    data_end = last_row - int(table.get("totalsRowCount", "0"))
    offset = column_number(first_column)
    columns = {}
    for index, column in enumerate(descendants(table, "tableColumn")):
        name = normalized(column.attrib["name"])
        if name.startswith("montant"):
            name = "montant"
        columns[name] = column_label(offset + index)
    if any(field not in columns for field in ("date", "description", "montant", "categorie")):
        raise ValueError("colonnes requises absentes")

    for row in range(data_start, data_end + 1):
        def source(field):
            return cell_value(cells.get(f"{columns[field]}{row}"), strings) if field in columns else ""

        try:
            raw_date = source("date")
            title = source("description").strip()
            raw_amount = source("montant")
            category = source("categorie")
            if not raw_date and not title and (not raw_amount or Decimal(raw_amount) == 0):
                if not any((category, source("source"), source("moyen de paiement"), source("note"))):
                    continue
            if not raw_date or not title or not raw_amount:
                raise ValueError("date, description ou montant manquant")
            amount = Decimal(raw_amount)
            if not amount.is_finite():
                raise ValueError("montant invalide")
            rounded = amount.quantize(MICRO, rounding=ROUND_HALF_UP)
            if abs(amount - rounded) > EXCEL_NOISE:
                raise ValueError("montant significatif au-delà de six décimales")
            when = excel_date(raw_date, since_1904)
            if details is not None:
                details[row] = (
                    source("description"),
                    source("source") or source("moyen de paiement"),
                    source("note"),
                )
            yield row, when, rounded, category, None
        except (ValueError, InvalidOperation, OverflowError) as error:
            yield row, None, None, None, str(error)


def reconcile(path, *, collect=None):
    with ZipFile(path) as book:
        root = read_xml(book, WORKBOOK)
        links = relationships(book, WORKBOOK)
        properties = next(children(root, "workbookPr"), None)
        since_1904 = properties is not None and properties.get("date1904") in {"1", "true"}
        strings_path = next((part for kind, part in links.values() if kind == "sharedStrings"), None)
        strings = [] if strings_path is None else [
            "".join(node.text or "" for node in descendants(item, "t"))
            for item in descendants(read_xml(book, strings_path), "si")
        ]
        issues, annual = [], {}
        for sheet in descendants(root, "sheet"):
            year = sheet.attrib["name"]
            if not re.fullmatch(r"20\d\d", year):
                continue
            link = next(value for key, value in sheet.attrib.items() if local_name(key) == "id")
            _, part = links[link]
            cells = {node.attrib["r"]: node for node in descendants(read_xml(book, part), "c") if "r" in node.attrib}
            amounts = defaultdict(Decimal)
            counts = {"income": 0, "expense": 0}
            months = defaultdict(lambda: defaultdict(Decimal))
            savings = Decimal(0)
            recognized = set()
            for relation, target in relationships(book, part).values():
                if relation != "table":
                    continue
                table = read_xml(book, target)
                name = table.attrib["name"]
                kind = {"rev": "income", "dep": "expense"}.get(name[3:6].lower()) if name.lower().startswith("tbl") else None
                if kind is None or kind in recognized:
                    issues.append({"sheet": year, "table": name, "reason": "table inclassable ou répétée"})
                    continue
                recognized.add(kind)
                details = {} if collect is not None else None
                for row, when, amount, category, error in table_rows(
                    table, cells, strings, since_1904, details=details
                ):
                    if error is not None or str(when.year) != year:
                        issues.append({"sheet": year, "table": name, "row": row, "reason": error or "date hors de l’année de la feuille"})
                        continue
                    if collect is not None:
                        title, payment_method, note = details.pop(row)
                        collect((title, kind, when, amount, category, payment_method, note, year, name, row))
                    counts[kind] += 1
                    amounts[kind] += amount
                    months[when.month][kind] += amount
                    if kind == "expense" and normalized(category) == SAVINGS_CATEGORY:
                        savings += amount
            if recognized != {"income", "expense"}:
                issues.append({"sheet": year, "reason": "table de revenus ou de dépenses manquante"})
            annual[year] = {
                "counts": counts,
                "income": amounts["income"],
                "expense": amounts["expense"],
                "balance": amounts["income"] - amounts["expense"],
                "savings": savings,
                "current_expense": amounts["expense"] - savings,
                "months": dict(sorted(months.items())),
            }
        if not annual:
            raise ValueError("aucune feuille annuelle reconnue")
        return {"years": annual, "issues": issues}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    args = parser.parse_args()
    try:
        result = reconcile(args.workbook)
    except (OSError, ValueError, KeyError, StopIteration, BadZipFile, ParseError) as error:
        sys.exit(str(error))
    print(json.dumps(result, default=str, indent=2))
    if result["issues"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
