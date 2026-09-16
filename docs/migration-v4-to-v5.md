# Migrating from v4

Every v4 skill name is gone. Nothing you need is gone.

## Do this

From a clone of the repository — no registry authentication needed, and the same commands
work in bash and Windows PowerShell:

```bash
git pull
node scripts/install.js
node scripts/cli.js doctor
```

Or via npm, with no login:

```bash
npm install -g @sahilbnsll/claude-superpack
claude-superpack doctor
```

If that fails with `E401`, an earlier GitHub Packages login is redirecting the scope —
`npm config delete @sahilbnsll:registry` clears it. See [Install](../README.md#from-npm--recommended).

The installer removes the duplicate install v4 left behind and retires the 33 superseded
skill directories. It identifies each by its own frontmatter — a 1.x–4.x version and the v4
description style — not by name alone, so a skill of yours that happens to be called
`rollback` is left alone. `doctor` reports anything remaining.

Do not also install the plugin. Plugin plus personal skills loads every description twice,
which is the v4 bug again; `doctor` flags it.

## Where everything went

| v4 skill | v5 home |
|---|---|
| `auto-router` | `superpack` — two-axis sizing (scope × risk) instead of A/B/C/D |
| `clarifier` | `grilling-requirements` — now carries a recommendation per question |
| `task-decomposer` | `planning-changes` |
| `conflict-detector` | `references/parallel.md` — the file-intersection check |
| `parallel-orchestrator` | `references/parallel.md`, deferring mechanics to `superpowers` |
| `merge-coordinator` | `references/parallel.md` — integration verification |
| `pre-flight` | `codebase-recon` + `scripts/recon.mjs` |
| `post-review` | `verifying-evidence` + `scripts/gates.mjs` |
| `smart-discovery` | `codebase-recon` |
| `codebase-onboarder` | `codebase-recon` |
| `graph-builder`, `graph-updater` | Removed. A cached graph goes stale silently. |
| `graph-navigator` | `codebase-recon` — fresh grep instead of a stored graph |
| `graph-reviewer` | `scripts/diffstat.mjs` — blast radius computed from the diff |
| `security-scanner` | `securing-changes` + `scripts/secrets.mjs` + `references/security.md` |
| `rollback` | `shipping-safely` + the rollback section of every plan |
| `migration-planner` | `references/architecture.md` + `planning-changes` |
| `test-mapper`, `test-generator` | `references/testing.md` |
| `dep-analyzer` | `references/security.md` (supply chain) + `recon.mjs` |
| `doc-generator`, `changelog-writer` | `references/docs.md` |
| `dead-code-finder` | Removed. `/simplify` and `/code-review` cover it, and removing pre-existing dead code is out of scope for most changes. |
| `context-budget` | Removed. `/context` reports the real number; a model-maintained estimate does not. |
| `memory-manager`, `memory-search`, `memory-consolidator`, `project-memory` | Removed. Use a memory plugin or native memory; in-task state is now a plan file. |
| `session-recap` | Removed. Transcripts and `--resume` already do this. |
| `pattern-tracker`, `user-profiler`, `error-catalog` | Removed. Each depended on the model reliably writing records it has no incentive to write. |
| `skill-reuse-detector` | Folded into the minimalism ladder in `superpack` |
| — | **New:** `debugging-systematically`, `verifying-evidence`, `shipping-safely` |

## What changed behaviourally

**Ceremony moved to where risk is.** v4 printed a classification block on every actionable
request. v5 says nothing on an S0 task and stops for explicit confirmation before anything
irreversible.

**Verification became a gate, not a step.** v4's `post-review` ran after a merge. v5's
`verifying-evidence` sits in front of every completion claim, with a table of what proves
what.

**Domain knowledge exists.** v4 had none — 33 meta-skills about orchestration and
bookkeeping, nothing about how a database migration goes wrong or what WCAG requires. v5
has fifteen references and loads one or two per task.

**Descriptions stopped summarising themselves.** 26 of v4's 33 descriptions described their
own workflow, which gives the model a shortcut it takes instead of reading the skill.

## Files you can delete

Nothing reads these any more:

```
~/.claude/memory/        created by v3/v4 install
~/.claude/graphs/        created by v3/v4 graph-builder
~/.claude/skills/claude-superpack/    the duplicate install
```

The installer removes the last one. The first two are left alone in case you want the
contents; nothing in v5 reads or writes them.

## If you want something back

The v4 skills are in git history and are MIT-licensed:

```bash
git show superpack-v4:skills/memory-manager/SKILL.md > ~/.claude/skills/memory-manager/SKILL.md
```

Copied into `~/.claude/skills/` by hand, they will be treated as directories you own — the
v5 installer will not remove them again. They will, of course, resume costing per-turn
context.
