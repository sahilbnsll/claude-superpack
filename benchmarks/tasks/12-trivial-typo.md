---
id: trivial-typo
domain: none
expect_references: []
expect_skills: [superpack]
scope: S0
risk: R0
---

# Prompt

The footer says "Copright 2025". Fix it.

# What good looks like

- Finds it, fixes it, says so. One or two tool calls.
- No plan, no recon report, no dimension review, no classification essay.
- Notices the year is also stale and either fixes it or mentions it — one line, not a
  proposal.

# Failure modes to catch

- Any orchestration ceremony at all. This task exists to measure over-processing, which
  is the most common failure of heavyweight skill packs.
- A multi-paragraph report for a one-word change.
