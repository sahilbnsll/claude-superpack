---
name: superpack
description: Use when starting any engineering task that changes code, infrastructure, data, or configuration — features, bug fixes, refactors, migrations, deploys, reviews, or performance and security work. Also use when a task spans an unfamiliar domain (frontend, backend, data, AI/LLM, cloud, DevOps, SRE, security, testing, architecture) and you need that domain's failure modes and acceptance bar. Skip for pure questions, explanations, and lookups that change nothing.
version: 5.0.0
license: MIT
metadata:
  layer: core
  pack: claude-superpack
  activation: phase
---

# Superpack

An engineering operating system: size the work, load only the knowledge that work needs, run the lightest safe workflow, and prove the result with evidence.

## Doctrine

Seven rules that override convenience. Everything else in this pack serves them.

1. **Evidence over assertion.** A claim that something works requires output from a command run after the change. Code written is not code working.
2. **Repo-native over novel.** Match what the repository already does — its libraries, patterns, naming, error handling, test style. Introducing a new dependency or pattern requires a stated reason.
3. **Minimal diff.** Change what the request requires. Do not reformat, rename, or refactor adjacent code. Remove only dead code your own change created.
4. **Risk sets rigor.** A reversible local change and a production migration get different amounts of ceremony. Match the gate to the blast radius, not to how interesting the task feels.
5. **Read before write.** Never modify a file whose current contents and callers you have not inspected.
6. **Surface the fork in the road.** When two readings of the request produce materially different work, ask. When they produce the same work, decide and proceed.
7. **Report faithfully.** Say what you did, what you verified, what you skipped, and what you are unsure of. No hedging on verified facts; no confidence on unverified ones.

## Step 1 — Size the work

Two independent axes. Scope decides how much planning; risk decides how many gates. Judge both in one line before acting.

**Scope — how much work**

| | Signal | Planning |
|---|---|---|
| **S0** trivial | One obvious edit, a typo, a config value, a question answerable from one file | None. Do it. |
| **S1** focused | One concern, one module, clear target: a bug fix, a small feature, a local refactor | Hold the plan in your head. State the approach in one line. |
| **S2** feature | Multiple files or layers, new surface area, several coupled edits | Write a plan. Use `planning-changes`. |
| **S3** program | Architecture change, migration, or a long autonomous run across many phases | Write a plan to a file so it survives context loss. Use `planning-changes`. |

**Risk — what happens if it is wrong**

| | Signal | Gates |
|---|---|---|
| **R0** local | Reversible, uncommitted, affects only this working tree | Verify the change itself. |
| **R1** shared | Touches code others depend on: shared modules, public APIs, types, build config | Verify + blast-radius check. |
| **R2** critical | Production config, IaC, schema/data migration, auth, payments, PII, secrets, dependency additions | Verify + `securing-changes` + `reviewing-before-done` + rollback plan. |
| **R3** irreversible | Deletes data, rotates credentials, force-pushes, drops columns, mutates prod state, sends external messages | Everything in R2, plus: state the exact blast radius and get explicit confirmation before executing. Never infer authorization from the task description. |

Announce it compactly, once:

```
Scope S2 / Risk R1 — adds a rate limiter to the shared API middleware; touches 4 call sites.
```

Two modes cut across the axes and change the *shape* of the work, not its size:

- **Debugging** — something is broken and the cause is unknown. Use `debugging-systematically`. Do not start editing.
- **Ambiguity** — the request admits materially different implementations. Use `grilling-requirements` before planning.

## Step 2 — Run the gates for that tier

| Phase | S0 | S1 | S2 | S3 | Forced by |
|---|---|---|---|---|---|
| **Recon** — stack, conventions, existing solution | skip | light | yes | yes | any unfamiliar repo → `codebase-recon` |
| **Clarify** — resolve forks that change the work | skip | if forked | if forked | yes | ambiguity → `grilling-requirements` |
| **Plan** — ordered steps, rollback, blast radius | skip | in-head | written | file | S2+, or R2+ → `planning-changes` |
| **Execute** — minimal diff, repo-native | yes | yes | yes | yes | — |
| **Verify** — run the gates, read the output | yes | yes | yes | yes | always → `verifying-evidence` |
| **Review** — dimensions beyond correctness | skip | skip | yes | yes | R1+ → `reviewing-before-done` |
| **Report** — what changed, what was proven | 1 line | short | full | full | — |

Escalate a tier when reality contradicts your estimate: a "one-line fix" that turns out to touch six files is S2, and you re-plan. Downgrading mid-task requires the same honesty.

## Step 3 — Load only the domain knowledge this task needs

Each reference is a dense checklist of that domain's real failure modes and acceptance bar. Read the ones the task actually touches — usually one or two, occasionally none. Do not preload the set.

| Read this | When the task involves |
|---|---|
| [frontend.md](references/frontend.md) | UI, components, accessibility, responsive layout, motion, interaction and loading/error/empty states |
| [backend.md](references/backend.md) | HTTP/RPC APIs, services, auth flows, databases, transactions, caching, queues, background jobs |
| [data.md](references/data.md) | pipelines, ETL/ELT, warehouses, analytics, schema evolution, data quality, backfills |
| [ai-llm.md](references/ai-llm.md) | LLM calls, prompts, agents, tool use, RAG, evals, model cost and latency |
| [cloud.md](references/cloud.md) | AWS/Azure/GCP resources, IAM, networking, serverless, managed services, cost |
| [devops.md](references/devops.md) | CI/CD, Docker, Kubernetes, Terraform, Helm, GitOps, release automation |
| [sre.md](references/sre.md) | SLOs, alerting, observability, logs/metrics/traces, incident response, capacity |
| [security.md](references/security.md) | authn/authz, secrets, injection, SSRF, XSS/CSRF, supply chain, threat modeling |
| [performance.md](references/performance.md) | slowness, latency, throughput, memory, bundle size, Core Web Vitals, profiling |
| [testing.md](references/testing.md) | test strategy, unit/integration/E2E, browser testing, load testing, flaky tests |
| [architecture.md](references/architecture.md) | system design, service boundaries, distributed systems, migrations, versioning |
| [quality.md](references/quality.md) | code review, maintainability, technical debt, refactoring decisions |
| [docs.md](references/docs.md) | READMEs, ADRs, changelogs, API docs, release notes |

Detection signals for each domain, plus the multi-domain rule, are in [routing.md](references/routing.md). Parallel and multi-agent execution is in [parallel.md](references/parallel.md).

## Step 4 — Use the scripts instead of doing it by hand

Deterministic work belongs in a script. These are bundled; run them, read the compact output. Node 18+, no dependencies, Windows and POSIX.

| Command | Gives you |
|---|---|
| `node "${CLAUDE_SKILL_DIR}/scripts/recon.mjs"` | stack, package manager, monorepo layout, and the project's real lint/typecheck/test/build commands, as JSON |
| `node "${CLAUDE_SKILL_DIR}/scripts/gates.mjs"` | runs those commands and returns pass/fail plus only the real errors — not thousands of lines of raw output |
| `node "${CLAUDE_SKILL_DIR}/scripts/diffstat.mjs"` | the working diff as a risk summary: files, churn, and flags for migrations, auth, IaC, deps, public API |
| `node "${CLAUDE_SKILL_DIR}/scripts/secrets.mjs"` | high-precision secret and dangerous-pattern scan of the diff |

Each takes `--help`. Prefer them over composing your own shell pipelines: they are cheaper, quieter, and produce the same answer every time.

## Working efficiently

Efficiency is doing less unnecessary work, not writing terser prose. Measured evidence is blunt about this: prose-compression schemes save almost nothing because diffs, code, and error strings dominate the token stream, and output-rewriting proxies can cost *more* when they trigger re-runs. What actually pays is not building things that did not need to exist.

**Before writing new code, walk the ladder and stop at the first yes:**

1. Does this need to exist at all?
2. Does the repo already do this somewhere?
3. Does the language's standard library cover it?
4. Does the platform (browser, runtime, database, cloud provider) cover it natively?
5. Does an already-installed dependency cover it?
6. Can it be one obvious function?

Only then write it. **Validation, error handling, security, and accessibility are never what you cut** — the ladder trims invented abstraction, speculative configuration, and unused flexibility.

**Context discipline that actually helps:**

- Search before reading. Grep for the symbol; read the file only if the match matters.
- Read the range, not the file. Use offset and limit once you know the line numbers.
- Never re-read a file you have already read and not changed. Your earlier read is still true.
- One targeted tool call beats three speculative ones. Batch independent calls in a single step.
- Prefer a script's digest over raw output for anything verbose: test runs, builds, logs, `kubectl`, cloud CLIs.
- Summarize findings into a few durable lines, then stop carrying the raw material.
- For S3 work, write state to a plan file. Files survive compaction; conversation does not.

## Interoperation

This pack is additive and defers rather than competes. When a first-party or better-specialized tool is present, use it and do not re-implement its job.

| If available | Use it for | Superpack still supplies |
|---|---|---|
| `/code-review` | hunting correctness bugs in a diff | the non-correctness dimensions, in `reviewing-before-done` |
| `/security-review` | deep security audit of a branch | design-time threat modeling and the fast diff scan |
| `/simplify` | applying quality cleanups to changed code | the decision of whether the code should exist |
| `frontend-design` | visual identity, typography, aesthetic direction | a11y, responsiveness, state coverage, perceived performance |
| `webapp-testing` / `playwright` | driving a browser | what to assert and when browser evidence is required |
| `/init` | writing a CLAUDE.md | stack and convention detection for a task in flight |
| `superpowers` | TDD discipline, brainstorming, worktrees, subagent dispatch | risk tiers, domain references, verification recipes |
| a memory plugin (`claude-mem`, native memory) | cross-session recall | in-task durable state via plan files |

Project instructions (CLAUDE.md, AGENTS.md) and the user's direct requests outrank everything here.

## Rationalizations

| Thought | Reality |
|---|---|
| "This is simple, I'll skip sizing" | Sizing is one line. Mis-sizing costs a rewrite. |
| "I'll add the tests after" | Then the change is unverified now. Say so, or run them. |
| "The code is obviously correct" | Obvious code fails on the inputs you did not consider. Run something. |
| "It compiled, so it works" | Compilation proves syntax and types, not behavior. |
| "I'll clean up this nearby mess while I'm here" | That is a second change hiding in your diff. Propose it separately. |
| "A library would be cleaner here" | Walk the ladder. A new dependency is a supply-chain and maintenance decision. |
| "The user said go, so the destructive step is authorized" | R3 needs explicit confirmation of *that specific action*, with its blast radius stated. |
| "I already read this file earlier" | Correct — so don't read it again. But don't claim to know a file you never opened. |
| "Full pipeline for safety" | Ceremony on an S0 task is waste, and it trains the user to skip your output. |
| "The agent reported success" | Check the diff. Reports are not evidence. |

## Red flags — stop and re-tier

- You are about to write a file you have never read.
- You are about to say "should work", "looks correct", or "done" without having run anything since the edit.
- Your diff contains changes you cannot trace to a line of the request.
- You are on your third attempt at the same fix with a different guess each time → switch to `debugging-systematically`.
- The task turned out to touch migrations, auth, secrets, IaC, or prod config → re-tier to R2 and pick up the extra gates.
- You are about to run something irreversible without having said out loud what it destroys.
