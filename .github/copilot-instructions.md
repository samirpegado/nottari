# Repository-wide Copilot instructions

- Read `AGENTS.md` first for shared cross-tool guidance.
- Use `.ai/manifest.yaml` as the map of project AI assets.
- Prefer updating existing patterns instead of generating a parallel architecture.
- When the request is about onboarding, setup, architecture refresh, or project understanding, inspect `.ai/project/generated/` and suggest running `python scripts/bootstrap_ai_context.py --write` if needed.
- Keep answers and changes aligned with the repository's actual stack.
- Update docs in `.ai/project/` when behavior, requirements, or structure changes materially.
