---
name: planning-changes
description: Use when a change spans several files or layers, when it carries production, data, security, or infrastructure risk, when it will run long enough to outlive the current context window, or when the user asks for a plan, phases, or a breakdown before implementation.
version: 5.0.0
license: MIT
metadata:
  layer: planning
  pack: claude-superpack
  activation: phase
---

# Planning changes

A plan exists to make the work orderable, reversible, and resumable. If it does not do those three things, it is decoration.

## Size the plan to the work

- **S2 (multi-file feature)** — a written plan in the conversation. Steps, order, verification per step.
- **S3 (architecture, migration, long autonomous run)** — a plan **file** in the repository, because the conversation will not survive. `docs/plans/<date>-<slug>.md` or wherever the repo already keeps them.
- **R2+ regardless of size** — always written, always including the rollback path.

A plan for an S1 task is one sentence stated before you start.

## What a plan contains

```markdown
# <Change>

**Goal** — one sentence, in outcome terms.
**Not doing** — the adjacent things deliberately excluded.
**Risk** — tier and why; what breaks if this is wrong.

## Steps
1. <Action> → verified by: <command or observation>
2. ...

## Rollback
How to undo each step, and the point after which undo is no longer possible.

## Open questions
Things that could still change the plan, and who answers them.
```

The `verified by` on every step is the part that matters. A step with no verification is a step you will claim is finished without knowing.

## Ordering

1. **Reversible before irreversible.** Get everything undoable done and verified before the migration, the deletion, or the deploy.
2. **Dependencies first** — schema before the code that reads it, types before consumers, contract before both sides of it.
3. **Keep it green.** Each step should leave the repository in a working, committable state. A plan whose steps 1–4 leave the build broken cannot be paused, reviewed, or abandoned safely.
4. **Riskiest assumption early.** If step 7 might invalidate the whole design, find out at step 2. A short spike is cheaper than six steps of wasted work.

## Blast radius

Before writing the steps, know what the change can reach:

```
node "${CLAUDE_SKILL_DIR}/../superpack/scripts/diffstat.mjs"
```

on an existing diff, or grep the consumers of every interface you intend to change. Name, explicitly: the callers, the data touched, the environments affected, and who notices if it goes wrong. If you cannot name them, the plan is not ready.

## Rollback

Every plan states it, and for R2+ it must be specific enough to execute under pressure:

- Code: revert the commit; is the deploy of the old version still possible?
- Schema: is there a down migration, and has it been run? If not, what is the forward fix?
- Data: what was mutated, and is there a copy?
- Config and flags: what is the previous value, and who can set it?
- **The point of no return**: name the step after which rollback stops being possible, and confirm before crossing it.

"We can revert the commit" is only true if nothing downstream has consumed the change.

## Keeping state across context loss

For S3 work, the plan file is the durable memory. The conversation is not: compaction
drops it, a crash ends it, and a fresh session never had it.

Start from [plan-template.md](plan-template.md) — it has the sections that turn out to
matter on resume: status and current step, decisions with their reasons, open questions
with owners, and an append-only log.

Three habits make it actually work:

- **Write the decision and the reason at the moment you take it.** Reconstructing why you
  chose something is the expensive part, and it is exactly what is lost.
- **Update status before each risky step, not after.** If the step is what kills the
  session, the file must already say you were about to take it.
- **Record what surprised you.** A resuming session re-learns the codebase quickly and
  re-learns the surprises slowly.

This is in-task state, deliberately scoped. Cross-session recall of preferences and past
decisions belongs to a memory plugin or Claude Code's own memory if you run one — this
skill does not duplicate them, and a plan file that has outlived its change should be
deleted or moved into an ADR rather than kept as a second memory store.

## Red flags

- The plan has no verification per step.
- The plan has no rollback and the change touches production, data, or infrastructure.
- Step 1 breaks the build and step 6 fixes it.
- The plan is longer than the change.
- You are planning something you have not reconnoitred — the plan is built on a guess about the codebase.
