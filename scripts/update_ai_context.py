#!/usr/bin/env python3
"""Update Devfy AI context tooling in one or more existing projects.

The command runs from a local checkout of the private blueprint repository.
It never deletes target files and never overwrites project-owned files under
`.ai/project/`; missing project templates are seeded and generated files are
left to the bootstrap command.
"""

from __future__ import annotations

import argparse
import filecmp
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple


TOOLCHAIN_PATHS = [
    Path('.ai/catalog.json'),
    Path('.ai/manifest.yaml'),
    Path('.ai/shared'),
    Path('.agents/README.md'),
    Path('.agents/skills/project-bootstrap'),
    Path('.github/skills/project-bootstrap'),
    Path('.kiro/skills/project-bootstrap'),
    Path('scripts/bootstrap_ai_context.py'),
    Path('scripts/doctor_ai_context.py'),
    Path('scripts/sync_agent_skills.py'),
    Path('scripts/update_ai_context.py'),
]

GUIDANCE_PATHS = [
    Path('AGENTS.md'),
    Path('CLAUDE.md'),
    Path('GEMINI.md'),
    Path('.cursor/rules'),
    Path('.docs'),
    Path('.github/agents'),
    Path('.github/copilot-instructions.md'),
    Path('.github/instructions'),
    Path('.github/prompts'),
    Path('.kiro/agents'),
    Path('.kiro/steering'),
]

PROJECT_TEMPLATE_ROOT = Path('.ai/project')
GENERATED_ROOT = PROJECT_TEMPLATE_ROOT / 'generated'
DECISIONS_PATH = PROJECT_TEMPLATE_ROOT / 'context-decisions.json'


def iter_source_files(source_root: Path, entries: Sequence[Path]) -> Iterable[Tuple[Path, Path]]:
    seen = set()
    for relative in entries:
        source = source_root / relative
        if source.is_file():
            candidates = [source]
        elif source.is_dir():
            candidates = sorted(path for path in source.rglob('*') if path.is_file())
        else:
            raise FileNotFoundError(f'blueprint path not found: {relative.as_posix()}')

        for candidate in candidates:
            candidate_relative = candidate.relative_to(source_root)
            if candidate_relative not in seen:
                seen.add(candidate_relative)
                yield candidate, candidate_relative


def project_template_files(source_root: Path) -> Iterable[Tuple[Path, Path]]:
    source = source_root / PROJECT_TEMPLATE_ROOT
    for candidate in sorted(path for path in source.rglob('*') if path.is_file()):
        relative = candidate.relative_to(source_root)
        if GENERATED_ROOT not in relative.parents:
            yield candidate, relative


def classify(source: Path, destination: Path) -> str:
    if not destination.exists():
        return 'add'
    if destination.is_file() and filecmp.cmp(source, destination, shallow=False):
        return 'unchanged'
    return 'update'


def copy_files(
    source_root: Path,
    target_root: Path,
    include_guidance: bool,
    write: bool,
) -> Tuple[int, int, int]:
    entries = list(TOOLCHAIN_PATHS)
    if include_guidance:
        entries.extend(GUIDANCE_PATHS)

    actions: List[Tuple[str, Path, Path]] = []
    for source, relative in iter_source_files(source_root, entries):
        destination = target_root / relative
        actions.append((classify(source, destination), source, destination))

    if not include_guidance:
        for source, relative in iter_source_files(source_root, GUIDANCE_PATHS):
            destination = target_root / relative
            if not destination.exists():
                actions.append(('add', source, destination))

    # Living project documentation belongs to the target. Seed only files that
    # do not exist; never replace existing decisions or manual documentation.
    for source, relative in project_template_files(source_root):
        destination = target_root / relative
        action = 'unchanged' if destination.exists() else 'add'
        actions.append((action, source, destination))

    counts = {'add': 0, 'update': 0, 'unchanged': 0}
    for action, source, destination in actions:
        counts[action] += 1
        relative = destination.relative_to(target_root).as_posix()
        if action == 'unchanged':
            continue
        verb = action if write else f'would {action}'
        print(f'[update] {verb}: {relative}')
        if write:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

    return counts['add'], counts['update'], counts['unchanged']


def set_decision(target_root: Path, assignment: str, write: bool) -> None:
    if '=' not in assignment:
        raise ValueError(f'invalid decision {assignment!r}; expected KEY=VALUE')
    key, value = (part.strip() for part in assignment.split('=', 1))
    allowed = {'environment.example_file', 'flutter.state_management'}
    if key not in allowed:
        raise ValueError(f'unsupported decision {key!r}; allowed: {", ".join(sorted(allowed))}')
    if key == 'environment.example_file' and value not in {'undecided', 'required', 'not-required'}:
        raise ValueError('environment.example_file must be undecided, required, or not-required')
    if not value:
        raise ValueError(f'decision {key!r} requires a non-empty value')

    path = target_root / DECISIONS_PATH
    try:
        decisions = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'version': 1}
    except json.JSONDecodeError as error:
        raise ValueError(f'cannot update invalid {DECISIONS_PATH.as_posix()}: {error}') from error

    section, field = key.split('.', 1)
    current_section = decisions.setdefault(section, {})
    if not isinstance(current_section, dict):
        raise ValueError(f'{section!r} must be an object in {DECISIONS_PATH.as_posix()}')
    previous = current_section.get(field)
    if previous == value:
        print(f'[update] unchanged decision: {key}={value}')
        return

    verb = 'set' if write else 'would set'
    print(f'[update] {verb} decision: {key}={value}')
    if write:
        current_section[field] = value
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(decisions, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def run_refresh(target_root: Path) -> int:
    commands = [
        [sys.executable, 'scripts/bootstrap_ai_context.py', '--write'],
        [sys.executable, 'scripts/doctor_ai_context.py'],
    ]
    for command in commands:
        print(f'[update] run in {target_root}: {" ".join(command)}')
        result = subprocess.run(command, cwd=target_root, check=False)
        if result.returncode != 0:
            return result.returncode
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Update Devfy AI context tooling from this local blueprint checkout.',
    )
    parser.add_argument('--target', action='append', required=True, help='Project root to update; repeat for multiple projects')
    parser.add_argument('--write', action='store_true', help='Apply changes; the default is a dry run')
    parser.add_argument('--include-guidance', action='store_true', help='Also update shared AGENTS/editor guidance files')
    parser.add_argument('--set-decision', action='append', default=[], metavar='KEY=VALUE', help='Persist a supported project context decision')
    parser.add_argument('--refresh', action='store_true', help='Run bootstrap --write and doctor after updating')
    args = parser.parse_args()

    if args.refresh and not args.write:
        parser.error('--refresh requires --write')

    source_root = Path(__file__).resolve().parent.parent
    exit_code = 0
    for raw_target in args.target:
        target_root = Path(raw_target).expanduser().resolve()
        if not target_root.is_dir():
            print(f'[update] target is not a directory: {target_root}')
            exit_code = 1
            continue
        if target_root == source_root:
            print(f'[update] target is the blueprint source itself; skipped: {target_root}')
            exit_code = 1
            continue

        print(f'[update] source={source_root}')
        print(f'[update] target={target_root}')
        try:
            added, updated, unchanged = copy_files(
                source_root,
                target_root,
                include_guidance=args.include_guidance,
                write=args.write,
            )
            for assignment in args.set_decision:
                set_decision(target_root, assignment, args.write)
        except (FileNotFoundError, OSError, ValueError) as error:
            print(f'[update] ERROR: {error}')
            exit_code = 1
            continue

        mode = 'applied' if args.write else 'dry-run'
        print(f'[update] {mode}: add={added} update={updated} unchanged={unchanged}')
        if args.refresh and run_refresh(target_root) != 0:
            exit_code = 1

    return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
