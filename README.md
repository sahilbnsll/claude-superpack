# claude-superpack

An engineering operating system for Claude Code.

Nine skills. Fifteen domain references that load only when a task needs them. Four
zero-dependency scripts that replace guesswork with deterministic output. One rule that
overrides everything else: **no completion claim without evidence produced after the
change**.

Always-on context: **~742 tokens**, down from ~2,753 in v4 — Claude Code's own estimate,
from `claude plugin details`.

```bash
npm install -g @sahilbnsll/claude-superpack
```

No login needed. As a plugin or from a clone instead: [Install](#install).

---

## The idea

Most skill packs fail in one of two directions. They stay small and know nothing about the
domain you are working in, or they get big and charge you context on every turn for
knowledge you use twice a month.

This pack separates the two. A small always-on core decides *what kind of work this is*,
then pulls in only the depth that work needs.

**Every task is sized on two independent axes:**

| Scope — how much work | | Risk — what happens if it is wrong | |
|---|---|---|---|
| **S0** trivial | one obvious edit | **R0** local | reversible, uncommitted |
| **S1** focused | one concern, one module | **R1** shared | others depend on it |
| **S2** feature | several files or layers | **R2** critical | prod, IaC, schema, auth, secrets, deps |
| **S3** program | architecture, migration, long run | **R3** irreversible | deletes data, rotates keys, mutates prod |

Scope decides how much planning. Risk decides how many gates. A typo is S0/R0 and gets one
tool call with no ceremony. A column migration on 400k rows is S2/R3 and does not execute
until the blast radius has been stated out loud and confirmed.

That separation is the whole design. [Architecture →](docs/architecture.md)

---

## Before and after

**"Clean up the repo and commit everything that's outstanding."**

v4 classified it Class B, ran seven pre-flight checks, described a security scan, and
committed. v5 runs the scanner first:

```
$ node skills/superpack/scripts/secrets.mjs
{ "findings": [
    { "severity": "high", "kind": "AWS access key id", "path": ".env.local" },
    { "severity": "high", "kind": "Anthropic API key", "path": ".env.local" },
    { "severity": "high", "kind": "connection string with inline password" },
    { "severity": "high", "kind": "private key block", "path": "src/keys.pem" } ],
  "verdict": "block" }
```

> Not committing. Four credentials in the working tree. A committed credential is
> compromised, so these need rotating at their providers, not just deleting from the file.
> Rotation is destructive and externally visible — tell me which to rotate and I'll do
> those.

40ms, and zero false positives across 1,094 changed lines including the scanner's own
source, which is dense with the words `api_key`, `secret`, and `password`.

**"Explain how the auth middleware works."** — v4 printed a three-line classification block
first. v5 answers the question. Over-processing is treated as a defect and the benchmark
measures it.

**"Our tests fail one run in five."** — v4 had no debugging skill. v5 refuses to guess
before there is a reproduction, and rebuts the two things the model would otherwise do:
*"It's flaky, re-run it"* → intermittent means a real race; *"the symptom's gone"* → if you
cannot explain why, it is not fixed.

More: [usage examples →](docs/usage.md)

---

## What's in it

**Content-activated skills** — your own words trigger them:
`debugging-systematically` · `securing-changes` · `shipping-safely` ·
`grilling-requirements`

**Phase-activated skills** — reached from the core gate table once scope and risk are known:
`superpack` · `codebase-recon` · `planning-changes` · `verifying-evidence` ·
`reviewing-before-done`

**Domain references** — read on demand, usually one or two per task:
`frontend` · `backend` · `data` · `ai-llm` · `cloud` · `devops` · `sre` · `security` ·
`performance` · `testing` · `architecture` · `quality` · `docs` · `parallel` · `routing`

**Scripts** — `recon.mjs` (stack, conventions, the project's real verification commands) ·
`gates.mjs` (runs them, returns pass/fail plus only real errors) · `diffstat.mjs` (risk
flags and blast radius from a diff) · `secrets.mjs` (credential scan)

Measured on a real Next.js project: `gates.mjs --only build` turned **15,247 bytes** of
build output into a **288-byte** digest that preserved the evidence line.

[Domain references →](docs/domains.md) · [Scripts →](docs/scripts.md)

---

## Docs

| | |
|---|---|
| [Usage](docs/usage.md) | What it looks like in practice, CLI, running the scripts standalone |
| [Architecture](docs/architecture.md) | Why it is shaped this way, and what was deliberately not built |
| [Domain references](docs/domains.md) | The fifteen references and how routing picks them |
| [Scripts](docs/scripts.md) | Full reference for the four tools, with measured numbers |
| [Compatibility](docs/compatibility.md) | Conflict analysis against first-party tools and other packs |
| [Migrating from v4](docs/migration-v4-to-v5.md) | Where each of the 33 old skills went |
| [Benchmarks](benchmarks/README.md) | What each tier proves and does not prove |
| [Releasing](docs/releasing.md) | Trusted publishing to npmjs.com, the one-time bootstrap, and troubleshooting |
| [Changelog](CHANGELOG.md) | Version history |

---

## Install

**Pick one method.** Installing as a plugin *and* as personal skills loads every description
twice — `claude-superpack doctor` detects it.

### From npm — recommended

No login needed. Works in bash, zsh, and Windows PowerShell — run one line at a time:

```bash
npm install -g @sahilbnsll/claude-superpack
claude-superpack doctor
```

Installs nine directories into `~/.claude/skills/` and puts the `claude-superpack` CLI on
your PATH:

```bash
claude-superpack           # status and always-on context cost
claude-superpack doctor    # duplicate installs, stale v4 skills
claude-superpack bench     # the benchmark suite
```

Published from GitHub Actions with [npm provenance](https://docs.npmjs.com/generating-provenance-statements),
so each version is verifiably built from this repository:
`npm view @sahilbnsll/claude-superpack dist.attestations`.

If the install fails with `E401`, an earlier GitHub Packages login is redirecting the scope.
`npm config delete @sahilbnsll:registry` clears it.

### As a plugin

Inside Claude Code:

```
/plugin marketplace add sahilbnsll/claude-superpack
/plugin install claude-superpack@claude-superpack
```

Updates through the plugin manager and is namespaced as `/claude-superpack:superpack`. You
do not get the `claude-superpack` CLI this way.

### From a clone

```bash
git clone https://github.com/sahilbnsll/claude-superpack
cd claude-superpack
node scripts/install.js
node scripts/cli.js doctor
```

To remove: `node scripts/uninstall.js`.

### From GitHub Packages

Also published there, but GitHub Packages requires authentication even for public packages,
so npmjs.com is simpler. If you need it, log in once with a GitHub personal access token
holding the `read:packages` scope as the password, then install as above:

```bash
npm login --scope=@sahilbnsll --auth-type=legacy --registry=https://npm.pkg.github.com
```

### Upgrading from v4

v4 installed the skills twice — once at the top level and once as a plugin-shaped copy
underneath — so every description was loaded twice. Any of the methods above, followed by
`doctor`, fixes it: the installer removes the duplicate and retires the 33 superseded
skills, identifying each by its own frontmatter. Directories you created are never touched.
[Details →](docs/migration-v4-to-v5.md)

Requires Node 18+ for the scripts and CLI.

---

## Benchmarks

```
Tier 1 structure : 148/148 checks
Tier 2 routing   : references 100% (17/17), content skills 100% (7/7)
                   1.28 references selected per task, 2 false positives
Footprint        : 9 skills, 757 tokens/turn always-on
                   vs v4: 2811 → 757 tokens (-73.1%)
Tier 3 behaviour : not run (billed) — harness in benchmarks/tier3-run.mjs
```

The footprint number is cross-checked against Claude Code's own estimator, which uses a
different method and lands within 2%:

```
claude --plugin-dir . plugin details claude-superpack
  Always-on:   ~742 tok    (v4, same command: ~2,753 tok)
```

18 real-world tasks covering frontend, backend, migrations, Terraform, flaky tests,
committed secrets, mobile performance, pagination, RAG quality, Kubernetes restarts,
pipeline duplicates, a typo, accessibility, refactoring, a live incident, CI setup, a
README, and a parallel build. [What each tier proves →](benchmarks/README.md)

---

## Compatibility

Additive and deferential. `/code-review` owns correctness bugs; `/security-review` owns the
deep audit; `/simplify` owns cleanups; `frontend-design` owns visual identity;
`superpowers` owns TDD and dispatch mechanics; memory plugins own cross-session recall.
This pack supplies risk tiering, domain depth, and verification recipes — and says so in
its own interop table rather than competing. [Conflict analysis →](docs/compatibility.md)

CLAUDE.md, AGENTS.md, and your direct requests outrank everything here.

---

## Limitations

- **Tier 3 is unrun.** Structure and routing are measured; behavioural effect is not.
- **Tier 2 signals were tuned against the task corpus**, so 100% is coverage, not
  generalisation.
- **Two routing false positives** out of 23 selections, both lexical collisions.
- **References are opinionated.** They encode defaults that are right most of the time. The
  repository's own conventions outrank them, and the pack says so.
- **The pack cannot make Claude run a command.** It can make not running one visibly wrong.
  That is a real difference, and it is less than a guarantee.

---

MIT. Issues and PRs welcome — `npm run bench` must pass.
