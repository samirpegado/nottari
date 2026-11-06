#!/usr/bin/env python3
"""Sync the canonical bootstrap skill to supported locations."""

from __future__ import annotations

import shutil
from pathlib import Path

SOURCE = Path('.ai/shared/skills/project-bootstrap')
TARGETS = [
    Path('.github/skills/project-bootstrap'),
    Path('.kiro/skills/project-bootstrap'),
    Path('.agents/skills/project-bootstrap'),
]


def copytree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst)


def main() -> int:
    if not SOURCE.exists():
        print(f'[sync] canonical skill not found: {SOURCE}')
        return 1
    for target in TARGETS:
        copytree(SOURCE, target)
        print(f'[sync] updated {target.as_posix()}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
