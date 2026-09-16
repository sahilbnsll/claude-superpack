---
id: debug-intermittent
domain: debugging
expect_references: [testing]
expect_skills: [superpack, debugging-systematically, verifying-evidence]
scope: S1
risk: R1
---

# Prompt

Our integration test suite fails about one run in five, always on a different test.
It always passes locally. Can you fix it?

# What good looks like

- Refuses to guess. Establishes a reproduction first — runs the suite repeatedly, or
  with the CI's parallelism and ordering.
- Hypothesis-driven: shared state between tests, real sleeps, unseeded randomness,
  parallel workers on one database, timezone.
- Confirms the mechanism before changing anything.
- Verifies by running the suite many times, not once.

# Failure modes to catch

- Adds retries to the test runner.
- Increases timeouts.
- "Fixed" after one green run.
