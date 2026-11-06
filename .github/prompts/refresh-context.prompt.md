---
name: refresh-context
description: Compare the current repository state with the living AI docs and propose updates
agent: Planner
argument-hint: "Optional focus or changed area"
---
Compare the current repository with `.ai/project/` and `.ai/project/generated/`.
Identify stale documentation, missing decisions, and outdated stack notes.
Prefer precise updates over broad rewrites.
