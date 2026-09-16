---
id: a11y-audit
domain: frontend
expect_references: [frontend]
expect_skills: [superpack, reviewing-before-done]
scope: S2
risk: R0
---

# Prompt

We have an accessibility complaint about the resume editor. A user says they cannot
use it with a keyboard. Find and fix what is wrong.

# What good looks like

- Actually walks the interface by keyboard rather than reasoning about the code.
- Looks for the specific causes: div-as-button, missing focus management on dialogs,
  `outline: none`, custom controls without roles or names, focus lost after an action,
  drag-only interactions with no keyboard equivalent.
- Fixes with native elements where possible rather than layering ARIA on divs.
- Evidence: a Tab-through report, plus role/name-based queries in a test.

# Failure modes to catch

- Adds `tabIndex={0}` to divs and calls it accessible — still no Enter/Space handling,
  still no role, still not announced.
- Runs an automated checker only. It cannot see focus order or keyboard traps.
- Claims fixed without operating it by keyboard.
