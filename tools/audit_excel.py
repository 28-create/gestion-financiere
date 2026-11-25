"""Read-only inventory of an Excel migration source using Python's standard library."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
import zipfile


MAX_XML_BYTES = 32 * 1024 * 1024
WORKBOOK = "xl/workbook.xml"


def local_name(name):
    return name.rsplit("}", 1)[-1]


def children(element, name):
    return (child for child in element if local_name(child.tag) == name)


def descendants(element, name):
    return (child for child in element.iter() if local_name(child.tag) == name)


def read_xml(book, part):
    info = book.getinfo(part)
    if info.file_size > MAX_XML_BYTES:
        raise ValueError(f"Partie XML trop volumineuse : {part}")
    data = book.read(info)
    if re.search(br"<!DOCTYPE|<!ENTITY", data.replace(b"\0", b""), re.IGNORECASE):
        raise ValueError(f"Déclaration XML interdite : {part}")
    return ET.fromstring(data)


def relationships(book, part):
    source = PurePosixPath(part)
    path = source.parent / "_rels" / (source.name + ".rels")
    try:
        root = read_xml(book, str(path))
    except KeyError:
        return {}
    result = {}
    for link in children(root, "Relationship"):
        if link.get("TargetMode") == "External":
            continue
        target = link.attrib["Target"]
        if target.startswith("/"):
            destination = posixpath.normpath(target.lstrip("/"))
        else:
            destination = posixpath.normpath(str(source.parent / target))
        if destination == ".." or destination.startswith("../"):
            raise ValueError("Relation XML hors du classeur")
        result[link.attrib["Id"]] = (link.attrib["Type"].rsplit("/", 1)[-1], destination)
    return result


def sheet_inventory(book, sheet, part):
    root = read_xml(book, part)
    links = relationships(book, part)
    cells = list(descendants(root, "c"))
    formulas = []
    for cell in cells:
        for formula in children(cell, "f"):
            formulas.append({
                "cell": cell.get("r"),
                "kind": formula.get("t", "normal"),
                "has_cached_value": any(value.text is not None for value in children(cell, "v")),
            })
    tables = []
    charts = 0
    for kind, destination in links.values():
        if kind == "table":
            table = read_xml(book, destination)
            tables.append({
                "name": table.get("name"),
                "range": table.get("ref"),
                "columns": [column.get("name") for column in descendants(table, "tableColumn")],
            })
        if kind == "drawing":
            charts += sum(kind == "chart" for kind, _ in relationships(book, destination).values())
    return {
        "name": sheet.attrib["name"],
        "state": sheet.get("state", "visible"),
        "cell_types": dict(Counter(cell.get("t", "n") for cell in cells)),
        "formulas": formulas,
        "hidden_rows": [row.get("r") for row in descendants(root, "row") if row.get("hidden") in {"1", "true"}],
        "hidden_columns": [[col.get("min"), col.get("max")] for col in descendants(root, "col") if col.get("hidden") in {"1", "true"}],
        "validation_ranges": [rule.get("sqref") for rule in descendants(root, "dataValidation")],
        "tables": tables,
        "charts": charts,
    }


def inventory(path):
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
        stream.seek(0)
        with zipfile.ZipFile(stream) as book:
            root = read_xml(book, WORKBOOK)
            links = relationships(book, WORKBOOK)
            sheets = []
            for sheet in descendants(root, "sheet"):
                relation_id = next(value for key, value in sheet.attrib.items() if local_name(key) == "id")
                kind, part = links[relation_id]
                if kind == "worksheet":
                    sheets.append(sheet_inventory(book, sheet, part))
                else:
                    sheets.append({"name": sheet.attrib["name"], "state": sheet.get("state", "visible"), "kind": kind})
            return {
                "filename": path.name,
                "sha256": digest,
                "sheets": sheets,
                "defined_names": [item.get("name") for item in descendants(root, "definedName")],
                "has_macros": any(kind == "vbaProject" for kind, _ in links.values()),
            }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", type=Path, nargs="+")
    args = parser.parse_args()
    try:
        results = [inventory(path) for path in args.files]
    except (OSError, ValueError, KeyError, StopIteration, zipfile.BadZipFile, ET.ParseError) as error:
        sys.exit(str(error))
    json.dump(results, sys.stdout, ensure_ascii=True, indent=2)
    print()


if __name__ == "__main__":
    main()
