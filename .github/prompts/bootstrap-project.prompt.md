---
name: bootstrap-project
description: Bootstrap or refresh the repository AI context
agent: Bootstrap
argument-hint: "Optional focus or scope"
---
Read `AGENTS.md`, then `.ai/manifest.yaml`.
Run `python scripts/bootstrap_ai_context.py --write` if the environment allows terminal execution.
Review `.ai/project/generated/project-inventory.md`, `.ai/project/generated/stack-detection.md`, and `.ai/project/generated/missing-context.md`.
Update the living docs under `.ai/project/` using repository evidence.
Ask me only the unresolved questions.
