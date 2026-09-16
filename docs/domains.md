# Domain references

Fifteen files under `skills/superpack/references/`. Read on demand, usually one or two per
task, never preloaded. About 92KB of engineering depth at zero always-on cost.

Every file has the same four sections — **Decide first**, **Build right**, **Failure
modes**, **Evidence** — so you can jump to the part you need.

## The library

| Reference | What it covers | Notable |
|---|---|---|
| [routing](../skills/superpack/references/routing.md) | Which reference a task needs, and the multi-domain rule | Signals are written in the words requests actually arrive in |
| [frontend](../skills/superpack/references/frontend.md) | A11y, responsive, states, motion, perceived performance | Five required states including **partial** — the one everyone forgets |
| [backend](../skills/superpack/references/backend.md) | APIs, data access, caching, queues, auth | Idempotency, transaction boundaries, expand/contract migrations |
| [data](../skills/superpack/references/data.md) | Pipelines, ETL/ELT, schema evolution, data quality | Idempotent writes; the freshness check that catches a stopped pipeline |
| [ai-llm](../skills/superpack/references/ai-llm.md) | Prompts, agents, tool use, RAG, evals, cost | Prompt injection as an architectural problem, not a prompt problem |
| [cloud](../skills/superpack/references/cloud.md) | AWS/Azure/GCP, IAM, networking, serverless, cost | Untested backups are a belief, not a control |
| [devops](../skills/superpack/references/devops.md) | CI/CD, containers, Kubernetes, Terraform, deploys | Three different probes; why CPU limits often hurt |
| [sre](../skills/superpack/references/sre.md) | SLOs, telemetry, alerting, incident response | Stabilise before diagnosing; alert on symptoms, not causes |
| [security](../skills/superpack/references/security.md) | Threat modeling, OWASP Top 10:2025, supply chain | Four-question threat model; the current 2025 category ordering |
| [performance](../skills/superpack/references/performance.md) | Latency, throughput, memory, bundle size | Measure → change → measure; Core Web Vitals at p75 |
| [testing](../skills/superpack/references/testing.md) | Strategy, level selection, browser and load testing | A test that has never failed has not been tested |
| [architecture](../skills/superpack/references/architecture.md) | Boundaries, distributed systems, migration, ADRs | Strangler fig, expand/contract, parallel run |
| [quality](../skills/superpack/references/quality.md) | Review dimensions, maintainability, technical debt | Duplicate twice, abstract on the third |
| [docs](../skills/superpack/references/docs.md) | README, ADR, changelog, API docs, comments | Wrong documentation is worse than missing documentation |
| [parallel](../skills/superpack/references/parallel.md) | When to split work across agents, and how to merge | Four conditions that must all hold before parallelising |

## How routing works

Route on evidence from the repository, not on the words in the request — but the request's
words are how a task is *noticed*, so the signals are written in everyday language. Nobody
opens with "this is a Core Web Vitals regression"; they say the page takes forever.

For a multi-domain task:

1. **Name the primary domain** — where the work lands.
2. **Name at most two secondaries** — the ones that set constraints.
3. **Read the primary in full, the relevant section of each secondary.**
4. If a fourth appears, the task is S3 and should be phased.

If you cannot name which section you intend to use, do not open the file. Loading a
reference "just in case" is the failure mode the routing table exists to prevent.

## A worked split

> "Our checkout page is slow on mobile and sometimes double-charges."

That is two problems with different tiers, and reporting them as one "checkout fix" hides
that one is a correctness bug and the other is an optimisation:

- **Double-charge** — primary `backend` (idempotency), secondary `security` (payments).
  Risk R2. Evidence: concurrent requests producing exactly one charge.
- **Mobile slowness** — primary `performance` (Core Web Vitals), secondary `frontend`.
  Risk R0–R1. Evidence: before/after at p75 on real devices.

## Deference

Three references explicitly hand work to better-specialised tools rather than competing:

- `frontend.md` gives visual identity, typography, and aesthetic direction to the
  first-party `frontend-design` plugin, and keeps accessibility, state coverage,
  responsiveness, and perceived performance.
- `security.md` gives deep branch audit to `/security-review`, and keeps design-time threat
  modeling and the fast pre-commit scan.
- `quality.md` gives correctness-bug hunting to `/code-review` and cleanups to `/simplify`,
  and keeps the question of whether the code should exist.

## Editing them

They are plain markdown with no build step — edit and the change is live in your next
session. Two constraints the benchmark enforces:

- 260 lines maximum per reference (one read should not dominate a context window).
- An `## Evidence` section must exist.

`npm run bench` checks both.
