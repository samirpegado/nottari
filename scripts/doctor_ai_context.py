#!/usr/bin/env python3
"""Validate blueprint presence, decisions, and generated-context freshness."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.', help='Project root to validate')
    args = parser.parse_args()

    root = Path(args.root).resolve()
    catalog_path = root / '.ai/catalog.json'
    if not catalog_path.exists():
        print('[doctor] missing .ai/catalog.json')
        return 1

    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    missing_required = [p for p in catalog.get('required', []) if not (root / p).exists()]
    missing_recommended = [p for p in catalog.get('recommended', []) if not (root / p).exists()]

    print('[doctor] required files')
    if missing_required:
        for item in missing_required:
            print(f'  - MISSING: {item}')
    else:
        print('  - OK')

    print('[doctor] recommended files')
    if missing_recommended:
        for item in missing_recommended:
            print(f'  - missing recommended: {item}')
    else:
        print('  - OK')

    has_errors = bool(missing_required)

    print('[doctor] context decisions')
    decisions_path = root / '.ai/project/context-decisions.json'
    decisions = {}
    if not decisions_path.exists():
        print('  - MISSING: .ai/project/context-decisions.json')
        has_errors = True
    else:
        try:
            decisions = json.loads(decisions_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as error:
            print(f'  - INVALID JSON: {error}')
            has_errors = True

    if decisions:
        environment = decisions.get('environment', {})
        env_policy = environment.get('example_file') if isinstance(environment, dict) else None
        allowed_env_policies = {'undecided', 'required', 'not-required'}
        if env_policy not in allowed_env_policies:
            print('  - INVALID: environment.example_file must be undecided, required, or not-required')
            has_errors = True
        elif env_policy == 'required' and not (root / '.env.example').exists():
            print('  - MISSING: .env.example is required by context-decisions.json')
            has_errors = True
        else:
            print(f'  - environment.example_file={env_policy}')

        flutter = decisions.get('flutter', {})
        state_management = flutter.get('state_management') if isinstance(flutter, dict) else None
        if not isinstance(state_management, str) or not state_management.strip():
            print('  - INVALID: flutter.state_management must be a non-empty string')
            has_errors = True
        else:
            print(f'  - flutter.state_management={state_management}')

    print('[doctor] todo markers')
    todo_hits = []
    for path in (root / '.ai/project').rglob('*.md'):
        text = path.read_text(encoding='utf-8', errors='ignore')
        if '`TODO`' in text:
            todo_hits.append(path.relative_to(root).as_posix())
    if todo_hits:
        for item in todo_hits:
            print(f'  - TODOs present: {item}')
    else:
        print('  - no TODO markers found')

    print('[doctor] generated context')
    bootstrap_path = root / 'scripts/bootstrap_ai_context.py'
    if bootstrap_path.exists() and not missing_required:
        result = subprocess.run(
            [sys.executable, str(bootstrap_path), '--root', str(root), '--check'],
            capture_output=True,
            text=True,
            check=False,
        )
        output = (result.stdout + result.stderr).strip()
        if output:
            for line in output.splitlines():
                print(f'  {line}')
        if result.returncode != 0:
            has_errors = True
    else:
        print('  - SKIPPED: bootstrap script or required files are missing')
        has_errors = True

    return 1 if has_errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
