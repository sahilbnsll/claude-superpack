---
name: shipping-safely
description: Use before running anything that changes state outside the working tree — deploying, applying infrastructure or Terraform, running a schema change, column migration, or backfill, rotating a credential, deleting data, force-pushing, or sending something external. Also use when planning how a risky change will reach production.
version: 5.0.0
license: MIT
metadata:
  layer: delivery
  pack: claude-superpack
  activation: content
---

# Shipping safely

The gate in front of anything you cannot quietly undo.

## Irreversible actions need explicit confirmation

Before executing any of these, state what it does in concrete terms and get a clear yes for **that specific action**:

deleting data or resources · applying a schema migration to a shared environment · running a backfill that mutates existing rows · rotating or revoking a credential · `terraform apply` with a destroy or replace in the plan · force-push or history rewrite · deploying to production · sending email, messages, or webhooks to real recipients · publishing a package · changing DNS or certificates.

**"Go ahead", "do it", or "ship it" earlier in the conversation is not authorization for a specific destructive step later.** Neither is the task description implying it. Say the blast radius out loud and ask:

> `terraform apply` will replace `aws_db_instance.primary` — that destroys the current instance and its data, and creates a new empty one. The plan shows 1 to add, 0 to change, 1 to destroy. Confirm before I run this?

If the user has already confirmed this exact action with its blast radius stated, proceed and say you are proceeding.

## Before shipping anything

- **Verified?** The gates passed since the last edit. `verifying-evidence`.
- **Reviewed?** The diff read, dimensions checked. `reviewing-before-done`.
- **Reversible how, and how fast?** Name the command or the config change, and who can run it.
- **Ordering constraints?** Migration before or after the deploy? A config value or secret that must exist first? Both versions of the code run at once during a rolling deploy — is the change compatible with that?
- **Who notices if it is wrong?** A metric, an alert, a log — or a customer. If it is a customer, say so; that is a finding.
- **Point of no return?** Name the step after which rollback stops working.

## Deploy

- Build once, promote the same artifact. Rebuilding per environment ships something you never tested.
- Watch it land: rollout status, error rate, and latency for a few minutes after, compared against before. A deploy is not done when the pipeline is green; it is done when the service is healthy.
- Feature flags decouple deploy from release and make rollback a config change. Give every flag a removal date when you add it.
- Have the rollback command ready before starting, not after something goes wrong.

## Migrations and backfills

The safe sequence, each step deployable and reversible on its own:

1. Add the new structure, nullable and unused.
2. Deploy code that writes both old and new.
3. Backfill in bounded, resumable batches — never one statement across the whole table.
4. Deploy code that reads new.
5. Later, as its own change, remove the old.

Rehearse on a copy of realistic data. An empty-table test proves the syntax and nothing about the duration or the lock.

## When it goes wrong

1. **Restore service first.** Roll back, disable the flag, shed load. Understanding comes after the bleeding stops.
2. **Say what is happening** while it is happening.
3. **Then diagnose** — `debugging-systematically`. Start with what changed.
4. **Confirm recovery on the user-facing signal**, not on the internal one you were watching.
5. **Write down what made it slow to detect or slow to recover.** That is the durable fix.

## Rationalizations

| Thought | Reality |
|---|---|
| "They said go ahead" | Not for an action whose blast radius they have not heard. |
| "It's just staging" | Someone is demoing from staging right now. |
| "The migration is simple" | Simple migrations lock tables too. |
| "We can always roll back" | Only if the data is still compatible. Check. |
| "I'll deploy and watch" | Watch what, specifically? Name the signal first. |
| "It's a small backfill" | On a table you have not counted. |
| "Force-push is fine, it's my branch" | Confirm it is not someone else's base. |

## Red flags

- About to run something irreversible without having named what it destroys.
- No rollback path, and the change touches production, data, or infrastructure.
- Deploying without having read the plan or diff output.
- A migration that is not backwards compatible with the currently-running code.
- Treating an earlier general approval as authorization for a specific destructive step.
