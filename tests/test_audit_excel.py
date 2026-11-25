import hashlib
from datetime import date
from decimal import Decimal
from pathlib import Path
import tempfile
import unittest
from xml.etree.ElementTree import fromstring
from zipfile import ZipFile

from tools.audit_excel import inventory
from tools.reconcile_budget import excel_date, table_rows


class WorkbookInventoryTest(unittest.TestCase):
    def test_hidden_sheet_formulas_tables_validations_and_charts(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "example.xlsx"
            with ZipFile(path, "w") as book:
                book.writestr("xl/workbook.xml", """
                <workbook xmlns:r="rels"><sheets>
                  <sheet name="Budget" state="veryHidden" sheetId="1" r:id="sheet"/>
                </sheets><definedNames><definedName name="Tax">42</definedName></definedNames></workbook>
                """)
                book.writestr("xl/_rels/workbook.xml.rels", """
                <Relationships><Relationship Id="sheet" Type="test/worksheet" Target="worksheets/sheet1.xml"/></Relationships>
                """)
                book.writestr("xl/worksheets/sheet1.xml", """
                <worksheet><cols><col min="5" max="6" hidden="1"/></cols>
                  <sheetData><row r="8" hidden="1"><c r="G8"><f>5+7</f><v>12</v></c></row></sheetData>
                  <dataValidations><dataValidation sqref="G8:G12"/></dataValidations>
                </worksheet>
                """)
                book.writestr("xl/worksheets/_rels/sheet1.xml.rels", """
                <Relationships>
                  <Relationship Id="table" Type="test/table" Target="../tables/table1.xml"/>
                  <Relationship Id="drawing" Type="test/drawing" Target="../drawings/drawing1.xml"/>
                </Relationships>
                """)
                book.writestr("xl/tables/table1.xml", """
                <table name="Journal" ref="A1:G12"><tableColumns><tableColumn name="Amount"/></tableColumns></table>
                """)
                book.writestr("xl/drawings/_rels/drawing1.xml.rels", """
                <Relationships><Relationship Id="chart" Type="test/chart" Target="../charts/chart1.xml"/></Relationships>
                """)
            original = hashlib.sha256(path.read_bytes()).hexdigest()
            report = inventory(path)
            sheet = report["sheets"][0]
            self.assertEqual(report["sha256"], original)
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), original)
            self.assertEqual(sheet["state"], "veryHidden")
            self.assertEqual(sheet["hidden_rows"], ["8"])
            self.assertEqual(sheet["hidden_columns"], [["5", "6"]])
            self.assertEqual(sheet["formulas"], [{"cell": "G8", "kind": "normal", "has_cached_value": True}])
            self.assertEqual(sheet["validation_ranges"], ["G8:G12"])
            self.assertEqual(sheet["tables"][0]["columns"], ["Amount"])
            self.assertEqual(sheet["charts"], 1)
            self.assertEqual(report["defined_names"], ["Tax"])


class TransactionTableTest(unittest.TestCase):
    def test_preview_distinguishes_operations_templates_and_total_rows(self):
        table = fromstring("""
        <table name="TblRev2026" ref="J14:M20" totalsRowCount="1"><tableColumns>
          <tableColumn name="Date"/><tableColumn name="Description"/>
          <tableColumn name="Montant (ILS)"/><tableColumn name="Catégorie"/>
        </tableColumns></table>
        """)
        sheet = fromstring("""
        <sheetData>
          <c r="J15" t="d"><v>2026-01-01</v></c><c r="K15" t="inlineStr"><is><t>Exemple</t></is></c>
          <c r="L15"><v>-123.45678900000004</v></c>
          <c r="L16"><v>0</v></c>
          <c r="L17"><v>100</v></c>
          <c r="J18" t="d"><v>2026-01-02</v></c><c r="K18" t="inlineStr"><is><t>Exemple</t></is></c>
          <c r="L18"><v>123.4567891</v></c>
          <c r="J19" t="d"><v>2026-01-03</v></c><c r="K19" t="inlineStr"><is><t>Exemple</t></is></c>
          <c r="L19"><v>0</v></c>
          <c r="L20"><f>SUBTOTAL(109,L15:L19)</f><v>99</v></c>
        </sheetData>
        """)
        cells = {cell.attrib["r"]: cell for cell in sheet}
        rows = list(table_rows(table, cells, [], False))
        self.assertEqual([row[0] for row in rows], [15, 17, 18, 19])
        self.assertEqual(rows[0][1:3], (date(2026, 1, 1), Decimal("-123.456789")))
        self.assertIn("manquant", rows[1][-1])
        self.assertIn("six décimales", rows[2][-1])
        self.assertEqual(rows[3][2], Decimal(0))

    def test_excel_calendar_conventions(self):
        self.assertEqual(excel_date("61", False), date(1900, 3, 1))
        self.assertEqual(excel_date("0", True), date(1904, 1, 1))
        with self.assertRaisesRegex(ValueError, "fictive"):
            excel_date("60", False)


if __name__ == "__main__":
    unittest.main()
