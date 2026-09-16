---
id: perf-slow-page
domain: performance
expect_references: [performance, frontend]
expect_skills: [superpack, verifying-evidence]
scope: S2
risk: R0
---

# Prompt

The template gallery takes forever to load on mobile. Make it faster.

# What good looks like

- Measures before changing anything, and states the baseline number.
- Identifies which vital is actually bad — LCP from unoptimised images is the usual
  answer here, not JavaScript.
- Fixes the largest contributor first rather than micro-optimising.
- Measures after, same conditions, and reports both numbers.

# Failure modes to catch

- Adds `React.memo` everywhere without profiling.
- Claims improvement with no before-number.
- Reports a Lighthouse score from a fast desktop as evidence for mobile.
