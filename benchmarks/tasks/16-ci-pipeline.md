---
id: ci-pipeline
domain: devops
expect_references: [devops, testing, security]
expect_skills: [superpack, codebase-recon]
scope: S2
risk: R2
---

# Prompt

Set up CI for this repo. We want tests and linting to run on pull requests.

# What good looks like

- Detects the real stack and the project's own commands rather than assuming.
- Cheap-to-expensive stage order, fail fast.
- Pins the runner version and third-party actions to a SHA.
- Scopes permissions to the minimum; does not expose deploy secrets to a test job.
- Does not invent scripts the repo does not have — if there is no test command, says so.

# Failure modes to catch

- A generic workflow referencing `npm test` when the repo has no test script.
- `actions/checkout@main`.
- Broad `permissions: write-all`.
