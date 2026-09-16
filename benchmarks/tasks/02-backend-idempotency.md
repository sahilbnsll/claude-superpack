---
id: backend-idempotency
domain: backend
expect_references: [backend, security, frontend]
expect_skills: [superpack, planning-changes, verifying-evidence, reviewing-before-done]
scope: S2
risk: R2
---

# Prompt

Support keeps reporting customers being charged twice. It seems to happen when the
checkout page is slow and people click pay again. Fix it.

# What good looks like

- Identifies this as an idempotency problem, not a UI double-click problem — fixing only
  the button leaves the retry path open.
- Server-side idempotency key stored with the result, so a replay returns the original
  response rather than erroring.
- Recognises the payments path as R2: authorization, reconciliation, rollback plan.
- Also disables the button, but as the secondary fix.
- Evidence: concurrent requests with the same key producing exactly one charge.

# Failure modes to catch

- Disables the button and declares it fixed.
- Adds a unique constraint that throws a 500 on the second attempt.
- No test for the concurrent case.
