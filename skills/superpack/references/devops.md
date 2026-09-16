# DevOps

CI/CD, containers, Kubernetes, Terraform, and release automation.

## Decide first

- **Is this change reversible, and how fast?** Rollback time is the number that matters. A deploy you can undo in 60 seconds justifies far less ceremony than a migration you cannot undo at all.
- **Does it need to be this complex?** Kubernetes for a service with one instance and no scaling requirement is operational cost with no return. Prefer the simplest thing the team can actually run at 3am.
- **Who runs this at 3am?** Every piece of infrastructure has an operator. If the answer is "nobody knows", that is the finding.

## CI/CD

- The pipeline is the quality gate. If a check is not in CI, it does not hold — it only holds for whoever remembered to run it.
- Order stages cheap to expensive: format → lint → typecheck → unit → build → integration → E2E → deploy. Fail fast on the cheap ones.
- Builds must be reproducible: pinned toolchain versions, committed lockfiles, no `latest`. A pipeline whose result depends on the day it ran cannot be debugged.
- Pin third-party actions to a commit SHA, not a tag. Tags move.
- Separate build from deploy. Build the artifact once; promote the same artifact through environments. Rebuilding per environment means you never tested what you shipped.
- Scope secrets per job. A test job does not need the production deploy key.
- Keep the main-branch pipeline under ~10 minutes or people will route around it.

## Containers

- Multi-stage builds: the final image contains the runtime and the artifact, not the compiler and the package cache.
- Pin the base image by digest, and rebuild on a schedule to pick up patches. `FROM node:latest` means your build is not reproducible and your patching is accidental.
- Run as a non-root user. Set it explicitly; the default is root.
- One process per container. Init systems and process managers inside containers usually signal a design that wants to be two containers.
- Order layers by change frequency: dependency manifests and install first, application source last, so a code change does not invalidate the dependency layer.
- `.dockerignore` must exclude `.git`, `node_modules`, `.env`, and build output. Leaking `.git` into an image leaks history and sometimes credentials.
- Declare a healthcheck that tests something real, not just that the process is alive.

## Kubernetes

- **Set requests and limits on everything.** No requests means the scheduler is guessing; no memory limit means one leak evicts its neighbours. Memory limit ≈ request. CPU limits are often harmful — throttling shows up as unexplained latency.
- **Three different probes.** Liveness restarts a wedged process — make it cheap and never dependent on downstreams, or one dependency outage restarts your whole fleet. Readiness gates traffic and *should* reflect dependencies. Startup probes protect slow-booting apps from liveness kills.
- Set `terminationGracePeriodSeconds` and handle `SIGTERM`: stop accepting new work, drain in-flight requests, exit. Without this every deploy drops requests.
- PodDisruptionBudgets so a node drain does not take the whole service.
- Config in ConfigMaps, secrets in a secret manager (External Secrets, Vault, cloud-native). Base64 is not encryption.
- Anti-affinity so replicas do not all land on one node. Three replicas on one node is one replica.
- Set `imagePullPolicy` and use immutable tags or digests. `latest` plus a restart equals an unplanned deploy.

## Terraform and IaC

- Remote state with locking, always. Local state on someone's laptop is a single point of total failure.
- Separate state per environment. One state file for prod and staging means one mistake takes both.
- **Read the plan. Every time.** The plan is the review. Any `destroy` or `replace` line in a plan you did not expect stops the apply.
- `prevent_destroy` on stateful resources: databases, buckets, disks.
- Never edit resources by hand in the console. Drift makes the next plan dangerous, because the plan will "correct" reality.
- Pin provider and module versions. Providers introduce breaking changes in minor releases more often than you would like.
- No secrets in `.tfvars` committed to the repo, and remember that state files contain resource attributes including some secrets — treat state as sensitive.
- Modules for genuine repetition, not for abstraction's own sake. A module used once is indirection.

## Deploy strategy

| Strategy | Use when | Cost |
|---|---|---|
| Rolling | Stateless service, backwards-compatible change | Two versions run at once — the change must tolerate that |
| Blue/green | Need instant rollback, can afford double capacity | Expensive; database still shared |
| Canary | Risky change, enough traffic for the signal to be real | Needs per-version metrics and an automatic abort rule |
| Feature flag | Decoupling deploy from release, gradual rollout | Flag debt — set a removal date when you add it |

Whatever you choose: the rollback path must be tested, not assumed.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Green CI, broken production | CI environment differs from production — different versions, different config, mocked dependency |
| Deploy drops requests | No graceful shutdown, or readiness flipped before the process could serve |
| Pods restart under load | Memory limit hit, or a liveness probe that depends on a slow downstream |
| Terraform wants to destroy something | Drift from manual changes, or a resource identifier changed in the config |
| Image works locally, fails in cluster | Architecture mismatch (arm64 vs amd64), or config present locally and absent in cluster |
| Rollback does not restore behaviour | The database migration went forward and was not backwards compatible |
| Secret appears in logs | Whole config object logged at startup |

## Evidence

1. **The plan or dry run.** `terraform plan`, `kubectl diff`, `helm diff upgrade`, `kubectl apply --dry-run=server`. Paste what it says it will change.
2. **A pipeline run on the actual change** — not a local run. CI is what enforces it.
3. **Post-deploy health**: rollout status, pod state, error rate and latency for a few minutes after, compared to before.
4. **The rollback, rehearsed** for R2+ changes. "We can roll back" is a claim; the command you ran in staging is evidence.
5. **Container reality check**: `docker run` the built image and exercise it. A successful build proves it compiled, not that it starts.
