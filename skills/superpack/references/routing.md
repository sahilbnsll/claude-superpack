# Domain routing

How to decide which references a task needs, and what to do when it needs several.

## Detection signals

Route on evidence from the repository, not on the words in the request. A request that says "make the dashboard faster" is a performance task; whether it is also a frontend task depends on what the profile says.

Signals are written in the words requests actually arrive in, not in the words a specialist would use. Nobody opens with "this is a Core Web Vitals regression"; they say the page takes forever.

| Reference | Path and file signals | Dependency signals | Request signals |
|---|---|---|---|
| `frontend.md` | `components/`, `app/`, `pages/`, `src/ui/`, `*.tsx`, `*.vue`, `*.svelte`, `*.css` | react, vue, svelte, next, nuxt, angular, tailwind | UI, screen, page, view, component, button, modal, dialog, form, input, list, table, dashboard, layout, blank, empty, spinner, accessible, accessibility, keyboard, focus, screen reader, responsive, mobile, animation, hover, click |
| `backend.md` | `api/`, `routes/`, `controllers/`, `handlers/`, `services/`, `models/`, `*.sql` | express, fastify, nestjs, django, rails, spring, prisma, drizzle, sqlalchemy | endpoint, API, route, handler, service, request, response, database, query, column, schema, migration, transaction, cache, queue, job, webhook, pagination, idempotent, retry, duplicate, twice, double, charge, charged, payment, checkout, order, session, login |
| `data.md` | `dags/`, `pipelines/`, `dbt/`, `etl/`, `notebooks/`, `*.sql` in a warehouse layout | airflow, dagster, dbt, spark, pandas, polars, kafka | pipeline, ETL, ELT, warehouse, backfill, ingestion, analytics, dataset, report, dashboard numbers, revenue, daily, aggregate, rows, duplicate rows, dedupe, finance, reconcile, partition, freshness |
| `ai-llm.md` | `prompts/`, `agents/`, `chains/`, `rag/`, `evals/` | openai, @anthropic-ai/sdk, langchain, llamaindex, vercel ai, pinecone, chroma | prompt, LLM, model, completion, chat, embedding, RAG, retrieval, hallucinate, hallucinating, eval, tool call, token cost, context window, assistant |
| `cloud.md` | `infra/`, `.tf`, `cdk/`, `serverless.yml`, `template.yaml` | aws-sdk, aws-cdk-lib, @azure/*, @google-cloud/* | AWS, Azure, GCP, IAM, role, policy, VPC, subnet, security group, lambda, S3, bucket, RDS, instance, region, quota, bill, cost |
| `devops.md` | `Dockerfile`, `.github/workflows/`, `k8s/`, `charts/`, `*.tf` | — | CI, pull request, workflow, action, runner, build, pipeline, deploy, release, rollout, container, image, docker, Kubernetes, pod, cluster, node, replica, limit, Terraform, Helm, GitOps |
| `sre.md` | `alerts/`, `dashboards/`, `slo/`, otel config | opentelemetry, prometheus, sentry, datadog, pino, winston | SLO, alert, paging, on-call, incident, outage, down, error rate, 5xx, 500s, restarting, crash loop, flapping, latency budget, observability, logging, metrics, tracing, runbook |
| `security.md` | auth paths, `*.pem`, `.env*`, IAM policy files | passport, jsonwebtoken, bcrypt, argon2, helmet, oauth libs | auth, login, permission, role, access, tenant, secret, credential, key, token, password, leak, exposed, commit, vulnerability, injection, XSS, CSRF, SSRF, pentest, CVE, audit |
| `performance.md` | benchmark files, profiler output, bundle config | — | slow, slowly, sluggish, laggy, takes forever, hangs, faster, speed up, optimise, load time, latency, p95, p99, throughput, memory, leak, bundle size, LCP, INP, CLS, profile |
| `testing.md` | `tests/`, `__tests__/`, `e2e/`, `cypress/`, `*.test.*` | vitest, jest, pytest, playwright, cypress, k6 | test, spec, suite, coverage, flaky, intermittent, fails randomly, green, red, E2E, browser test, load test, regression, fixture, mock |
| `architecture.md` | `adr/`, `docs/architecture`, many service directories | — | design, architecture, structure, refactor, restructure, reorganise, migrate, migration, split, extract, module, boundary, coupling, scale, service, monolith, versioning, breaking change |
| `quality.md` | — | — | review, cleanup, tidy, tech debt, maintainability, readable, confusing, grown too big, duplication, simplify, dead code, naming |
| `docs.md` | `README`, `docs/`, `CHANGELOG`, `adr/` | — | document, docs, README, changelog, release notes, ADR, API docs, comment, stale, outdated, instructions, onboarding |
| `parallel.md` | — | — | parallel, concurrently, at the same time, multiple agents, subagents, workers, split the work, worktree, faster by splitting |

## Multi-domain tasks

Most real tasks touch two or three domains. Loading all of them defeats the purpose.

1. **Name the primary domain** — the one where the work actually lands. "Add rate limiting to the login endpoint" is primary backend.
2. **Name at most two secondary domains** — the ones that set constraints. Here: security (it is an auth path and an abuse control) and sre (limits need metrics to tune).
3. **Read the primary in full. Read only the relevant section of each secondary.** Every reference is sectioned so you can jump.
4. If a fourth domain shows up, that is a signal the task is S3 and should be planned as phases, each with its own narrower domain set.

**Worked example.** "Our checkout page is slow on mobile and sometimes double-charges."

- Two problems, not one. Split them.
- Double-charge is primary `backend.md` (idempotency), secondary `security.md` (payments). Risk R2.
- Mobile slowness is primary `performance.md` (Core Web Vitals), secondary `frontend.md` (rendering and states). Risk R0–R1.
- Different tiers, different evidence, different gates. Reporting them as one "checkout fix" hides that one is a correctness bug and the other is an optimisation.

## When no reference applies

Plenty of good work needs none of these: renaming a variable, fixing a typo, answering a question about existing code, adjusting a log message. Loading a reference "just in case" is the failure mode this routing table exists to prevent. If you cannot name which section you intend to use, do not open the file.

## Reference conventions

Each domain file follows the same shape, so you can predict where to look:

- **Decide first** — the choices that are expensive to reverse later.
- **Build right** — the concrete acceptance bar for the work.
- **Failure modes** — what actually goes wrong in this domain, and the tell for each.
- **Evidence** — what counts as proof that the work is correct in this domain.

Read *Evidence* even when you skip the rest. It is what turns "I changed the code" into "I know it works."
