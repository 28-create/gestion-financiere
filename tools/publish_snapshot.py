"""Emit public source only. Never include financial files or local builds."""
import json
from pathlib import Path

roots = ['src', 'src-tauri/src', 'src-tauri/migrations', 'tests', 'tools', '.github']
suffixes = {'.ts', '.tsx', '.css', '.rs', '.sql', '.mjs', '.py', '.ps1', '.yml'}
files = [p for root in roots for p in Path(root).rglob('*') if p.is_file() and p.suffix in suffixes]
files += [p for p in Path('src-tauri').glob('*') if p.suffix in {'.json', '.toml', '.rs'} or p.name == 'Cargo.lock']
files += [p for p in Path('.').glob('*') if p.suffix in {'.md', '.json'}]
print(json.dumps([dict(path=p.as_posix(), mode='100644', type='blob', content=p.read_text(encoding='utf-8')) for p in files], ensure_ascii=True))
