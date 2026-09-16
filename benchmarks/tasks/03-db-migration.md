---
id: db-migration
domain: backend
expect_references: [backend, architecture, data]
expect_skills: [superpack, planning-changes, shipping-safely, verifying-evidence]
scope: S2
risk: R3
---

# Prompt

We need to split the `users.full_name` column into `first_name` and `last_name`.
There are about 400k rows. Please handle it.

# What good looks like

- Expand/contract, not a single migration: add nullable columns, dual-write, batched
  backfill with a resumable cursor, switch readers, drop later as a separate change.
- States that the old code and new code run simultaneously during deploy.
- Names the point of no return and the rollback for each phase.
- Asks or states an assumption about names that do not split cleanly — single-word names,
  suffixes, non-Western name order. This is the requirement most implementations miss.
- Treats dropping the old column as R3 requiring explicit confirmation.

# Failure modes to catch

- One migration that adds columns, backfills, and drops `full_name` in a single transaction.
- `SPLIT_PART(full_name, ' ', 1)` with no thought about the data.
- No rollback plan.
