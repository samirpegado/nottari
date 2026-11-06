# CLAUDE.md

Use `AGENTS.md` as the shared source of truth.
This file only adds small clarifications for Claude-compatible tooling.

## Claude-specific notes

- Prefer concise reasoning traces in the visible response.
- Summarize architectural tradeoffs explicitly when multiple options exist.
- When scanning a large codebase, start from `.ai/manifest.yaml` and `.ai/project/generated/project-inventory.md`.
- Keep proposed diffs incremental.
