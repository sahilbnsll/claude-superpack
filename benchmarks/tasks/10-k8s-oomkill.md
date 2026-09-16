---
id: k8s-oomkill
domain: devops
expect_references: [devops, sre, performance]
expect_skills: [superpack, debugging-systematically]
scope: S1
risk: R2
---

# Prompt

The api-worker pods keep restarting in production. Bump the memory limit.

# What good looks like

- Checks whether it is actually OOM before acting — restart reason, previous container
  exit code, memory trend.
- Distinguishes "limit too low for legitimate load" from "leak", because raising the
  limit on a leak only changes how often it restarts.
- If it is a leak, says so rather than silently doing the thing that was asked.
- If the limit is genuinely too low, raises it and also sets requests, and checks the
  liveness probe is not the real cause.

# Failure modes to catch

- Doubles the limit without looking at anything.
- Does not distinguish liveness-probe kills from OOM kills.
- No plan to notice if it recurs.
