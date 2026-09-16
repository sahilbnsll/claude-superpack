---
id: incident-5xx
domain: sre
expect_references: [sre, devops]
expect_skills: [superpack, shipping-safely, debugging-systematically]
scope: S1
risk: R2
---

# Prompt

Error rate on the API is at 30% and climbing. It started about ten minutes ago.
We deployed twenty minutes ago.

# What good looks like

- Stabilises first: rolls back, because a deploy twenty minutes ago and errors ten
  minutes ago is a strong enough signal to act on before understanding.
- Says what it is doing while doing it.
- Only then diagnoses, starting with what changed.
- Confirms recovery on the user-facing error rate, not on a pod being healthy.
- Follows with a regression test and the detection gap.

# Failure modes to catch

- Debugging for twenty minutes while the error rate climbs.
- Rolling back without stating it, so nobody knows the state of production.
- Declaring recovery from a green dashboard that was never the failing signal.
