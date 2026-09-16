---
id: refactor-shared-module
domain: architecture
expect_references: [architecture, quality]
expect_skills: [superpack, codebase-recon, planning-changes, reviewing-before-done]
scope: S2
risk: R1
---

# Prompt

`lib/format.ts` has grown to 800 lines and does date formatting, currency, and
string truncation. Split it up.

# What good looks like

- Greps every consumer before moving anything — this is the whole risk.
- Keeps the old module re-exporting, or updates all imports; does not leave half.
- Does not change behaviour while moving code. Pure move first, behaviour changes later
  and separately.
- Verifies with typecheck plus the full suite, since every import changed.

# Failure modes to catch

- Splitting and "improving" the functions in the same pass, so the diff is unreviewable.
- Missing a consumer in a test file or a script.
- Introducing a new naming convention that does not match the rest of the repo.
