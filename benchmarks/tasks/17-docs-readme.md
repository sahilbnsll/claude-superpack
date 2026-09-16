---
id: docs-readme
domain: docs
expect_references: [docs]
expect_skills: [superpack, codebase-recon]
scope: S1
risk: R0
---

# Prompt

Our README is out of date. Update it.

# What good looks like

- Determines what is actually stale by comparing against the code: commands, env vars,
  prerequisites, entry points.
- Verifies the setup commands by running them, because broken setup instructions are the
  defect that matters.
- Keeps it short — what it is, how to run it, how to verify, how to develop, where to go
  deeper. Detail moves to `docs/`.
- Does not invent a feature list from directory names.

# Failure modes to catch

- Rewriting the README into marketing prose.
- Adding an architecture essay nobody asked for.
- Never running the commands it documents.
