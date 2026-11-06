#!/usr/bin/env python3
"""Bootstrap and refresh AI project context for the blueprint.

Standard-library only script.

What it does:
- detects project flavor (nextjs, flutter, generic)
- inventories top-level files/folders
- extracts metadata from package.json and pubspec.yaml when present
- writes generated reports under .ai/project/generated/
- updates managed blocks in a few living docs
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

CONTEXT_DECISIONS_PATH = Path('.ai/project/context-decisions.json')

MANAGED_BLOCKS = {
    Path('.ai/project/overview.md'): ('AUTO-SUMMARY', None),
    Path('.ai/project/stack/current-stack.md'): ('AUTO-STACK', None),
    Path('.ai/project/architecture/structure.md'): ('AUTO-STRUCTURE', None),
    Path('.ai/project/requirements/technical.md'): ('AUTO-TECH-BASELINE', None),
}


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding='utf-8')
    except FileNotFoundError:
        return ''
    except UnicodeDecodeError:
        return path.read_text(encoding='utf-8', errors='ignore')


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + '\n', encoding='utf-8')


def normalized_text(content: str) -> str:
    return content.rstrip() + '\n'


def load_context_decisions(root: Path) -> Dict[str, object]:
    path = root / CONTEXT_DECISIONS_PATH
    if not path.exists():
        return {}
    try:
        data = json.loads(read_text(path) or '{}')
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def markdown_field_is_todo(text: str, field: str) -> bool:
    pattern = rf'^\s*-\s*\*\*{re.escape(field)}\*\*:\s*`?TODO`?\s*$'
    return re.search(pattern, text, re.MULTILINE) is not None


def markdown_section_contains_todo(text: str, heading: str) -> bool:
    pattern = rf'^##\s+{re.escape(heading)}\s*$\n(?P<body>.*?)(?=^##\s+|\Z)'
    match = re.search(pattern, text, re.MULTILINE | re.DOTALL)
    return bool(match and '`TODO`' in match.group('body'))


def inventory_ignored_names(root: Path) -> set[str]:
    ignored = {'.git', '.dart_tool', '.next', '.playwright-mcp', 'node_modules', 'build', '.idea'}
    path = root / '.ai/inventory-ignore'
    for line in read_text(path).splitlines():
        name = line.strip()
        if name and not name.startswith('#'):
            ignored.add(name.rstrip('/\\'))
    return ignored


def list_top_level(root: Path) -> Tuple[List[str], List[str]]:
    dirs, files = [], []
    ignored = inventory_ignored_names(root)
    for item in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if item.name in ignored:
            continue
        if item.is_dir():
            dirs.append(item.name + '/')
        else:
            files.append(item.name)
    return dirs, files


def detect_flavors(root: Path) -> Dict[str, bool]:
    package_json = root / 'package.json'
    pubspec = root / 'pubspec.yaml'
    next_config = any((root / name).exists() for name in ['next.config.js', 'next.config.mjs', 'next.config.ts'])
    app_router = (root / 'app').exists()
    flutter_dirs = [(root / d).exists() for d in ['lib', 'android', 'ios', 'web', 'macos', 'linux', 'windows']]
    return {
        'has_package_json': package_json.exists(),
        'has_pubspec': pubspec.exists(),
        'is_nextjs': package_json.exists() and ('"next"' in read_text(package_json) or next_config or app_router),
        'is_flutter': pubspec.exists() and ((root / 'lib').exists() or any(flutter_dirs)),
    }


def parse_package_json(root: Path) -> Dict[str, object]:
    package_path = root / 'package.json'
    if not package_path.exists():
        return {}
    try:
        data = json.loads(read_text(package_path) or '{}')
    except json.JSONDecodeError:
        return {'parse_error': True}
    return {
        'name': data.get('name'),
        'private': data.get('private'),
        'packageManager': data.get('packageManager'),
        'scripts': data.get('scripts', {}),
        'dependencies': data.get('dependencies', {}),
        'devDependencies': data.get('devDependencies', {}),
    }


def parse_pubspec(root: Path) -> Dict[str, object]:
    path = root / 'pubspec.yaml'
    if not path.exists():
        return {}
    text = read_text(path)
    result: Dict[str, object] = {'dependencies': [], 'dev_dependencies': []}
    name_match = re.search(r'^name:\s*(.+)$', text, re.MULTILINE)
    sdk_match = re.search(r"sdk:\s*['\"]?([^'\"\n]+)", text)
    result['name'] = name_match.group(1).strip() if name_match else None
    result['sdk'] = sdk_match.group(1).strip() if sdk_match else None

    current = None
    for line in text.splitlines():
        stripped = line.rstrip()
        if stripped.startswith('dependencies:'):
            current = 'dependencies'
            continue
        if stripped.startswith('dev_dependencies:'):
            current = 'dev_dependencies'
            continue
        if not stripped or stripped.lstrip().startswith('#'):
            continue
        if current and re.match(r'^\s{2}[A-Za-z0-9_\-]+:', stripped):
            dep = stripped.strip().split(':', 1)[0]
            result[current].append(dep)
    return result


def detect_variant(flavors: Dict[str, bool], explicit: str) -> str:
    if explicit != 'auto':
        return explicit
    if flavors.get('is_nextjs'):
        return 'nextjs-web'
    if flavors.get('is_flutter'):
        return 'flutter-app'
    return 'generic'


def summarize_stack(variant: str, pkg: Dict[str, object], pubspec: Dict[str, object], root: Path) -> str:
    lines: List[str] = []
    lines.append(f'- **Detected variant**: `{variant}`')
    if variant == 'nextjs-web':
        lines.append('- **Primary runtime**: Node.js')
        lines.append('- **Primary language**: TypeScript/JavaScript')
    elif variant == 'flutter-app':
        lines.append('- **Primary runtime**: Flutter / Dart toolchain')
        lines.append('- **Primary language**: Dart')
    else:
        lines.append('- **Primary runtime**: not confidently detected')

    if pkg:
        name = pkg.get('name')
        pm = pkg.get('packageManager')
        if name:
            lines.append(f'- **package.json name**: `{name}`')
        if pm:
            lines.append(f'- **Package manager hint**: `{pm}`')
        deps = list((pkg.get('dependencies') or {}).keys())
        dev = list((pkg.get('devDependencies') or {}).keys())
        if deps:
            lines.append(f'- **Key dependencies**: {", ".join(sorted(deps)[:12])}')
        if dev:
            lines.append(f'- **Key devDependencies**: {", ".join(sorted(dev)[:12])}')
    if pubspec:
        if pubspec.get('name'):
            lines.append(f'- **pubspec name**: `{pubspec["name"]}`')
        if pubspec.get('sdk'):
            lines.append(f'- **Dart/Flutter SDK constraint**: `{pubspec["sdk"]}`')
        if pubspec.get('dependencies'):
            lines.append('- **Key pubspec dependencies**: ' + ', '.join(pubspec['dependencies'][:15]))
        if pubspec.get('dev_dependencies'):
            lines.append('- **Key pubspec dev_dependencies**: ' + ', '.join(pubspec['dev_dependencies'][:15]))

    lockfiles = [name for name in ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb'] if (root / name).exists()]
    if lockfiles:
        lines.append(f'- **Lockfiles**: {", ".join(lockfiles)}')
    return '\n'.join(lines)


def summarize_structure(root: Path) -> str:
    dirs, files = list_top_level(root)
    lines = ['## Detected top-level directories']
    if dirs:
        for name in dirs[:25]:
            lines.append(f'- `{name}`')
    else:
        lines.append('- none detected')
    lines.append('')
    lines.append('## Detected top-level files')
    if files:
        for name in files[:25]:
            lines.append(f'- `{name}`')
    else:
        lines.append('- none detected')
    return '\n'.join(lines)


def summarize_inventory(root: Path, variant: str, pkg: Dict[str, object], pubspec: Dict[str, object]) -> str:
    dirs, files = list_top_level(root)
    lines = ['# Project Inventory', '']
    lines.append(f'- **Detected variant**: `{variant}`')
    # Keep generated inventory portable across developer machines and CI runners.
    lines.append('- **Repository root**: `.`')
    lines.append('')
    lines.append('## Top-level directories')
    for d in dirs[:40]:
        lines.append(f'- `{d}`')
    if not dirs:
        lines.append('- none')
    lines.append('')
    lines.append('## Top-level files')
    for f in files[:40]:
        lines.append(f'- `{f}`')
    if not files:
        lines.append('- none')
    if pkg:
        lines.append('')
        lines.append('## package.json snapshot')
        if pkg.get('name'):
            lines.append(f'- name: `{pkg["name"]}`')
        if pkg.get('packageManager'):
            lines.append(f'- packageManager: `{pkg["packageManager"]}`')
        scripts = pkg.get('scripts') or {}
        if scripts:
            lines.append('- scripts:')
            for key in sorted(list(scripts.keys()))[:20]:
                lines.append(f'  - `{key}` => `{scripts[key]}`')
    if pubspec:
        lines.append('')
        lines.append('## pubspec snapshot')
        if pubspec.get('name'):
            lines.append(f'- name: `{pubspec["name"]}`')
        if pubspec.get('sdk'):
            lines.append(f'- sdk: `{pubspec["sdk"]}`')
        if pubspec.get('dependencies'):
            lines.append('- dependencies: ' + ', '.join(pubspec['dependencies'][:25]))
    return '\n'.join(lines)


def build_missing_context_questions(root: Path, variant: str) -> List[str]:
    questions: List[str] = []
    overview_text = read_text(root / '.ai/project/overview.md')
    business_text = read_text(root / '.ai/project/requirements/business.md')
    nfr_text = read_text(root / '.ai/project/requirements/non-functional.md')
    decisions = load_context_decisions(root)

    if (
        markdown_field_is_todo(overview_text, 'Project name')
        or markdown_field_is_todo(overview_text, 'Internal codename')
    ):
        questions.append('Qual é o nome oficial do projeto e, se existir, o codinome interno?')
    if (
        markdown_field_is_todo(overview_text, 'Primary users')
        or markdown_field_is_todo(overview_text, 'Central problem')
    ):
        questions.append('Quem são os usuários principais e qual problema central este produto resolve?')
    if (
        markdown_section_contains_todo(business_text, 'Goals')
        or markdown_section_contains_todo(business_text, 'Success metrics')
    ):
        questions.append('Quais são os objetivos de negócio e como o sucesso será medido?')
    if '`TODO`' in nfr_text:
        questions.append('Há metas explícitas de performance, segurança, confiabilidade, acessibilidade ou observabilidade?')

    environment = decisions.get('environment') if isinstance(decisions.get('environment'), dict) else {}
    env_example_policy = environment.get('example_file', 'undecided')
    if (
        variant == 'nextjs-web'
        and not (root / '.env.example').exists()
        and env_example_policy == 'undecided'
    ):
        questions.append('Este projeto deveria expor um `.env.example` com as variáveis necessárias?')

    flutter = decisions.get('flutter') if isinstance(decisions.get('flutter'), dict) else {}
    state_management = flutter.get('state_management', 'undecided')
    if variant == 'flutter-app' and state_management == 'undecided':
        questions.append('Qual state management foi escolhido para o app Flutter e isso já é decisão consolidada?')

    deduped = []
    seen = set()
    for q in questions:
        if q not in seen:
            deduped.append(q)
            seen.add(q)

    return deduped


def render_missing_context(questions: List[str], include_heading: bool = True) -> str:
    lines: List[str] = []
    if include_heading:
        lines.extend([
            '# Missing Context',
            '',
            'Perguntas que o agente deve fazer apenas se não conseguir inferir do repositório:',
            '',
        ])
    if questions:
        for idx, question in enumerate(questions, 1):
            lines.append(f'{idx}. {question}')
    else:
        lines.append('- Nenhuma lacuna crítica detectada pelo bootstrap automático.')
    return '\n'.join(lines)


def build_missing_context(root: Path, variant: str) -> str:
    return render_missing_context(build_missing_context_questions(root, variant))


def replace_managed_block(text: str, tag: str, new_body: str) -> str:
    pattern = re.compile(
        rf'<!-- BEGIN: {re.escape(tag)} -->.*?<!-- END: {re.escape(tag)} -->',
        re.DOTALL,
    )
    replacement = f'<!-- BEGIN: {tag} -->\n{new_body.strip()}\n<!-- END: {tag} -->'
    if pattern.search(text):
        return pattern.sub(replacement, text)
    return text.rstrip() + '\n\n' + replacement + '\n'


def build_managed_docs(
    root: Path,
    variant: str,
    stack_summary: str,
    structure_summary: str,
    missing_questions: List[str],
    inventory_excerpt: str,
) -> Dict[Path, str]:
    outputs: Dict[Path, str] = {}

    # overview
    overview_path = root / '.ai/project/overview.md'
    overview_text = read_text(overview_path)
    auto_summary = (
        'Resumo inferido automaticamente a partir do repositório:\n\n'
        f'- Variante detectada: `{variant}`\n'
        f'{inventory_excerpt}'
    )
    outputs[overview_path] = replace_managed_block(overview_text, 'AUTO-SUMMARY', auto_summary)

    stack_path = root / '.ai/project/stack/current-stack.md'
    stack_text = read_text(stack_path)
    outputs[stack_path] = replace_managed_block(stack_text, 'AUTO-STACK', stack_summary)

    struct_path = root / '.ai/project/architecture/structure.md'
    struct_text = read_text(struct_path)
    outputs[struct_path] = replace_managed_block(struct_text, 'AUTO-STRUCTURE', structure_summary)

    tech_path = root / '.ai/project/requirements/technical.md'
    tech_text = read_text(tech_path)
    auto_tech = (
        'Baseline técnico inferido automaticamente:\n\n'
        f'{stack_summary}\n\n'
        'Lacunas restantes:\n\n'
        f'{render_missing_context(missing_questions, include_heading=False)}'
    )
    outputs[tech_path] = replace_managed_block(tech_text, 'AUTO-TECH-BASELINE', auto_tech)
    return outputs


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true', help='Write generated files and update managed blocks')
    mode.add_argument('--check', action='store_true', help='Fail when generated files or managed blocks are stale')
    parser.add_argument('--variant', default='auto', choices=['auto', 'nextjs-web', 'flutter-app', 'generic'])
    args = parser.parse_args()

    root = Path(args.root).resolve()
    flavors = detect_flavors(root)
    pkg = parse_package_json(root)
    pubspec = parse_pubspec(root)
    variant = detect_variant(flavors, args.variant)

    stack_summary = summarize_stack(variant, pkg, pubspec, root)
    structure_summary = summarize_structure(root)
    inventory = summarize_inventory(root, variant, pkg, pubspec)
    missing_questions = build_missing_context_questions(root, variant)
    missing = render_missing_context(missing_questions)
    detection = '# Stack Detection\n\n' + stack_summary + '\n'

    inventory_excerpt = ''
    top_dirs, top_files = list_top_level(root)
    if top_dirs:
        inventory_excerpt += '- Diretórios principais: ' + ', '.join(f'`{d}`' for d in top_dirs[:8]) + '\n'
    if top_files:
        inventory_excerpt += '- Arquivos principais: ' + ', '.join(f'`{f}`' for f in top_files[:8]) + '\n'

    generated_outputs = {
        root / '.ai/project/generated/project-inventory.md': inventory,
        root / '.ai/project/generated/stack-detection.md': detection,
        root / '.ai/project/generated/missing-context.md': missing,
    }
    managed_outputs = build_managed_docs(
        root,
        variant,
        stack_summary,
        structure_summary,
        missing_questions,
        inventory_excerpt or '- Sem evidências suficientes.\n',
    )

    print(f'[bootstrap] root={root}')
    print(f'[bootstrap] variant={variant}')

    if args.check:
        stale = []
        for path, expected in {**generated_outputs, **managed_outputs}.items():
            if normalized_text(read_text(path)) != normalized_text(expected):
                stale.append(path)
        if stale:
            for path in stale:
                print(f'[bootstrap] STALE: {path.relative_to(root).as_posix()}')
            print('[bootstrap] run: python scripts/bootstrap_ai_context.py --write')
            return 1
        print('[bootstrap] generated context is current')
    elif args.write:
        for path, content in {**generated_outputs, **managed_outputs}.items():
            write_text(path, content)
        print('[bootstrap] generated files updated')
    else:
        print(detection)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
