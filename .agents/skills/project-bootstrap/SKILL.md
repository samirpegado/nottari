---
name: project-bootstrap
description: bootstrap and refresh repository AI context by reading AGENTS.md, scanning the codebase, generating inventory and stack summaries, updating the living docs under .ai/project, and asking only for missing business context. use when onboarding a project, setting up AI guidance, refreshing stale context, or preparing a repository for consistent agent work.
---

# Project Bootstrap Skill

Use this skill when the repository needs to be onboarded or its AI context needs to be refreshed.

## Workflow

1. Read `AGENTS.md` and `.ai/manifest.yaml` first.
2. Read `.ai/project/context-decisions.json` when it exists.
3. Run `python scripts/bootstrap_ai_context.py --write` when terminal/script execution is available.
4. Review:
   - `.ai/project/generated/project-inventory.md`
   - `.ai/project/generated/stack-detection.md`
   - `.ai/project/generated/missing-context.md`
5. Update the living docs in `.ai/project/` with facts supported by the repository.
6. Record non-inferable decisions in `.ai/project/context-decisions.json`.
7. Rerun the bootstrap after answers so generated context is current.
8. Preserve manual content outside managed blocks.
9. Ask the user only the unresolved questions listed in `.ai/project/generated/missing-context.md`.

## When script execution is not available

- Read `.ai/manifest.yaml` and inspect the repository manually.
- Recreate the same outputs conceptually:
  - detected stack
  - key directories and configs
  - unresolved business/product gaps
- Update docs carefully and mark inferred statements as inferred.

## Output quality bar

- Base statements on code/config evidence first.
- Keep summaries concise and useful.
- Distinguish detected facts from assumptions.
- Do not invent missing integrations, environments, or product goals.
- Use `python scripts/bootstrap_ai_context.py --check` or the doctor to detect stale generated context.
