import hashlib
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

from tools.audit_excel import inventory


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


if __name__ == "__main__":
    unittest.main()
