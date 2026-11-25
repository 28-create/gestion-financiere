$ErrorActionPreference = 'Stop'

if ($env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'Ce test installe et désinstalle le programme sous un compte CI jetable.'
}

$setup = @(Get-ChildItem -LiteralPath 'src-tauri/target/release/bundle/nsis' -Filter '*-setup.exe')
if ($setup.Count -ne 1) { throw 'Un seul installateur NSIS est attendu.' }
$configuration = Get-Content -Raw -Encoding utf8 'src-tauri/tauri.conf.json' | ConvertFrom-Json
$installDir = Join-Path $env:RUNNER_TEMP 'gestion-financiere-smoke'
$application = Join-Path $installDir 'gestion-financiere.exe'
$database = Join-Path $env:APPDATA "$($configuration.identifier)/ledger.sqlite3"
if (Test-Path -LiteralPath $database) { throw 'Le profil de test possède déjà un registre.' }

function Invoke-Setup([string]$Flags) {
    $process = Start-Process -FilePath $setup[0].FullName -ArgumentList "$Flags /D=$installDir" -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "NSIS a retourné le code $($process.ExitCode)." }
    if (-not (Test-Path -LiteralPath $application -PathType Leaf)) { throw 'Exécutable installé introuvable.' }
}

function Wait-ForCondition([scriptblock]$Condition, [string]$Message) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (& $Condition) { return }
        Start-Sleep -Seconds 1
    }
    throw $Message
}

Invoke-Setup '/S'
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$programs = [Environment]::GetFolderPath('Programs')
$desktopShortcut = Join-Path $desktop "$($configuration.productName).lnk"
$menuShortcut = @(Get-ChildItem -LiteralPath $programs -Filter "$($configuration.productName).lnk" -Recurse)
if (-not (Test-Path -LiteralPath $desktopShortcut) -or $menuShortcut.Count -ne 1) {
    throw 'Raccourcis Bureau ou Démarrer introuvables.'
}
$shell = New-Object -ComObject WScript.Shell
foreach ($shortcut in @($desktopShortcut, $menuShortcut[0].FullName)) {
    if ($shell.CreateShortcut($shortcut).TargetPath -ine $application) {
        throw "Le raccourci ne vise pas l'exécutable installé."
    }
}

$running = Start-Process -FilePath $application -PassThru
try {
    Wait-ForCondition { Test-Path -LiteralPath $database -PathType Leaf } 'La base locale n’a pas été créée.'
    $seed = @'
import sqlite3
import sys
from contextlib import closing
with closing(sqlite3.connect(sys.argv[1], timeout=10)) as db:
    with db:
        db.execute("INSERT INTO transactions (title, kind, status, occurred_on, amount_micros) VALUES ('Smoke test', 'income', 'realized', '2026-01-01', 123000000)")
'@
    $seed | python - $database
    if ($LASTEXITCODE -ne 0) { throw 'L’écriture de contrôle SQLite a échoué.' }
} finally {
    $running.Refresh()
    if (-not $running.HasExited) {
        if (-not $running.CloseMainWindow() -or -not $running.WaitForExit(5000)) {
            Stop-Process -Id $running.Id
        }
    }
}

function Assert-DataPreserved {
    $check = @'
import sqlite3
import sys
from contextlib import closing
from pathlib import Path
uri = Path(sys.argv[1]).as_uri() + "?mode=ro"
with closing(sqlite3.connect(uri, uri=True)) as db:
    assert db.execute("PRAGMA integrity_check").fetchone() == ("ok",)
    assert db.execute("SELECT title, amount_micros FROM transactions").fetchall() == [("Smoke test", 123000000)]
'@
    $check | python - $database
    if ($LASTEXITCODE -ne 0) { throw 'La base de contrôle n’a pas été préservée.' }
}

Invoke-Setup '/S /UPDATE'
Assert-DataPreserved
$uninstaller = Join-Path $installDir 'uninstall.exe'
$uninstall = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru
if ($uninstall.ExitCode -ne 0) { throw "Désinstallation échouée ($($uninstall.ExitCode))." }
Wait-ForCondition {
    -not (Test-Path -LiteralPath $application) -and
    -not (Test-Path -LiteralPath $desktopShortcut) -and
    -not (Test-Path -LiteralPath $menuShortcut[0].FullName)
} 'La désinstallation n’a pas retiré le programme et ses raccourcis.'
Assert-DataPreserved
