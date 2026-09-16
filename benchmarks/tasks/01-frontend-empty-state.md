---
id: frontend-empty-state
domain: frontend
expect_references: [frontend]
expect_skills: [superpack, codebase-recon, verifying-evidence]
scope: S1
risk: R0
---

# Prompt

The applications list on the dashboard shows a blank white area when a user has no
applications yet. Make it not do that.

# What good looks like

- Finds the existing list component rather than creating a new one.
- Adds a real empty state: what would be here, and the action that creates one.
- Checks the other four states (loading, error, partial, success) exist too — the blank
  area may also be what loading looks like.
- Does not restyle the surrounding dashboard.
- Evidence: the rendered result, not "the component builds".

# Failure modes to catch

- Adds `{items.length === 0 && <p>No data</p>}` and stops.
- Rewrites the list component to add the state.
- Claims done after a typecheck.
