# AGENTS.md

## Mission

Work as an implementation partner for Devfy projects.
Preserve project context, follow existing architecture, and keep docs synchronized with real code.

## Mandatory startup behavior

Before proposing large changes, read in this order whenever the files exist:

1. `.ai/manifest.yaml`
2. `.ai/project/overview.md`
3. `.ai/project/stack/current-stack.md`
4. `.ai/project/architecture/structure.md`
5. `.ai/project/rules/coding.md`
6. `.ai/project/rules/testing.md`
7. `.ai/project/rules/security.md`
8. `.ai/project/context-decisions.json`
9. `.ai/project/generated/project-inventory.md`
10. `.ai/project/generated/missing-context.md`

If the generated files are stale or missing, suggest or run:

```bash
python scripts/bootstrap_ai_context.py --write
```

Use `python scripts/bootstrap_ai_context.py --check` for a read-only freshness check.

## Global operating rules

- Prefer understanding the current repository over inventing a new pattern.
- Reuse installed dependencies before suggesting new ones.
- Keep edits small, reviewable, and easy to revert.
- Never hardcode secrets, tokens, passwords, or environment-specific credentials.
- Never modify `.env*` values with guessed content.
- When a requirement is missing, ask only for the unresolved items.
- When documentation and code diverge, trust the code but report the mismatch.
- When updating AI context files, preserve manual notes outside managed blocks.

## Documentation contract

Treat `.ai/project/` as the living project memory.

### Update these when relevant

- `overview.md`: product and business framing
- `requirements/*.md`: business, technical, and NFR requirements
- `stack/current-stack.md`: real stack in use
- `architecture/*.md`: structure, ADRs, integrations
- `rules/*.md`: coding, testing, security, git workflow

### Generated files

Generated files under `.ai/project/generated/` may be rewritten by scripts.
Do not store business-only decisions there unless explicitly asked.

### Explicit context decisions

Store non-inferable machine-readable decisions in `.ai/project/context-decisions.json`.
Use `undecided` only while the corresponding question is genuinely unresolved.

## Execution strategy

When asked to bootstrap or onboard a project:

1. Read `.ai/manifest.yaml`
2. Run `python scripts/bootstrap_ai_context.py --write` when possible
3. Review generated outputs
4. Fill obvious blanks in `.ai/project/` from repository evidence
5. Ask only the unresolved questions listed in `.ai/project/generated/missing-context.md`

After recording answers, rerun the bootstrap so generated questions and managed blocks cannot remain stale.

## Stack hints

### For Next.js / TypeScript projects

- Prefer App Router patterns when the repo already uses them.
- Prefer server components by default unless interactivity requires client components.
- Co-locate UI concerns with components, domain logic with services/lib, and external integrations with adapters.
- Favor typed boundaries for API responses, config, and domain entities.

### For Flutter projects

- Preserve existing state-management choice rather than migrating casually.
- Keep widgets small and composable.
- Separate UI, application logic, and data/integration layers.
- Keep platform-specific code isolated and documented.

## Definition of done for agent-driven changes

A task is not complete until:

- code changes are coherent with current architecture
- obvious validations/tests were considered
- docs were updated if the change affects behavior, structure, or requirements
- any unresolved assumptions are explicitly called out

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
