# Changelog

All notable changes to `claude-superpack`.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Written for the person
deciding whether to upgrade — breaking changes first, with the migration step.

---

## [5.0.2] — 2026-09-16

### Breaking

- **No install scripts.** `postinstall` and `preuninstall` are removed. Install the skills
  explicitly:

  ```bash
  npx @sahilbnsll/claude-superpack install
  ```

  Why: current npm blocks package install scripts by default, so in 5.0.1
  `npm install -g @sahilbnsll/claude-superpack` downloaded the package and **silently did not
  install the skills** — the only sign was an `allow-scripts` warning. A package that writes
  into your home directory merely by being downloaded is also a supply-chain smell.

### Fixed

- **Published tarballs are reproducible from their commit.** `prepublishOnly` ran the
  benchmarks, which rewrote `benchmarks/results/latest.json` with a fresh timestamp — so every
  publish packed different bytes than the commit and left the working tree dirty. It now runs
  with `--no-write`.
- **The npmjs.com skip check could misfire.** It used `npm view`, which can return 401 when
  setup-node's placeholder token is present, making an existing version look absent. It now
  uses an unauthenticated registry read.
- `install` and `uninstall` exit non-zero on failure; as lifecycle scripts they had
  deliberately swallowed errors.

### Changed

- README and docs lead with `npx`, which needs no global install and no PATH setup.
- `docs/releasing.md` adds the prerequisite a new npm account hits first — publishing requires
  2FA on the account — and the browser authentication prompt during `npm publish`.

---

## [5.0.1] — 2026-09-16

### Added

- **Published to npmjs.com**, so `npm install -g @sahilbnsll/claude-superpack` works with no
  login. Previously the only registry was GitHub Packages, which rejects unauthenticated
  installs even for public packages.
- **Trusted publishing with provenance.** The npmjs.com release authenticates through GitHub
  Actions OIDC — no npm token exists to leak or expire — and every version carries a signed
  attestation tying it to the workflow run that built it. See [docs/releasing.md](docs/releasing.md).
- **`prepublishOnly` runs the benchmarks**, so a manual publish cannot ship a failing pack
  either.

### Changed

- **The publish workflow is now three jobs** — `verify`, `npmjs`, `github-packages`. The two
  publish jobs are independent, and each skips a version that already exists, so re-running
  a release is always safe.
- Workflow runs on Node 24, meeting trusted publishing's Node ≥ 22.14 and npm ≥ 11.5.1
  requirements.

### Removed

- **The repository `.npmrc` and `publishConfig.registry`.** Both forced every publish and
  every in-repo install to GitHub Packages; the in-repo install is what produced a `401` for
  anyone running `npm install` inside a clone. Registries are now set explicitly per job.

---

## [5.0.0] — 2026-09-16

Rebuilt around a different premise: a skill pack's job is to improve decisions, and
context spent on knowledge you are not currently using makes decisions worse, not better.
Thirty-three always-loaded skills became nine, with the engineering depth moved into
references that load only when a task needs them.

### Breaking

- **33 skills removed, 9 added.** Every v4 skill name is gone. The installer retires the
  old directories automatically; nothing you created yourself is touched. See
  [docs/migration-v4-to-v5.md](docs/migration-v4-to-v5.md) for where each capability went.
- **`~/.claude/memory/` is no longer created or written.** The five memory skills are
  gone. Existing files are left alone but nothing reads them. Cross-session recall belongs
  to a memory plugin or Claude Code's native memory; in-task state now lives in plan files.
  Migration: if you relied on it, install `claude-mem` or enable native memory.
- **`~/.claude/graphs/` is no longer created or written.** The persistent codebase graph
  is gone. Blast radius is computed fresh from the diff and from grep instead. Migration:
  none needed — delete the directory. `node skills/superpack/scripts/diffstat.mjs` replaces
  the blast-radius query.
- **`bin/safe-summon` and `scripts/consolidate-memory.js` removed.** Both served the memory
  system.
- **CLI commands `memory` and `graph` removed**, replaced by `doctor` and `bench`.
- **Node 18+ required**, declared in `engines`.

### Fixed

- **The plugin marketplace install path never worked.** The README documented
  `/plugin marketplace add`, but the repository had no `.claude-plugin/marketplace.json`.
  Added, and validated with `claude plugin validate`.
- **npm install instructions omitted GitHub Packages authentication**, which is required
  even for public packages. Documented, with a clone-based install that needs no auth.
- **Skills were installed twice.** v4 copied each skill to `~/.claude/skills/<name>/` *and*
  left a plugin-shaped copy at `~/.claude/skills/claude-superpack/skills/<name>/`. Claude
  Code discovered both, so every description was loaded twice on every turn — roughly
  5,600 tokens per turn rather than 2,800. The installer now installs one copy and deletes
  the duplicate if a previous version left one. `claude-superpack doctor` detects it.
- **Uninstall removed directories it did not own.** It now uses an install manifest and
  leaves anything you created alone.
- **26 of 33 skill descriptions summarised their own workflow.** A description that
  describes the process gives the model a shortcut it takes instead of reading the skill.
  All descriptions now state triggering conditions only, and the benchmark fails the build
  if one regresses.

### Added

- **Two-axis task sizing.** Scope (S0–S3: how much work) and risk (R0–R3: what happens if
  it is wrong) are independent. Scope sets planning depth, risk sets the gate count. v4's
  single A/B/C/D axis conflated "big" with "dangerous".
- **`verifying-evidence`** — the gate between changing code and claiming it works, with a
  claim/evidence table naming what proves what, and an explicit protocol for the honest
  case where no automated gate exists.
- **15 domain references**, read on demand: frontend, backend, data, ai-llm, cloud, devops,
  sre, security, performance, testing, architecture, quality, docs, parallel, routing.
  Each shaped *Decide first · Build right · Failure modes · Evidence*. v4 had no domain
  knowledge at all.
- **Four zero-dependency scripts** — `recon.mjs` (stack, conventions, the project's real
  verification commands), `gates.mjs` (runs them, returns pass/fail plus only real errors),
  `diffstat.mjs` (risk flags and blast radius from a diff), `secrets.mjs` (high-precision
  credential scan). Deterministic work moved out of prose and into code.
- **`debugging-systematically`** — v4 had no debugging skill despite debugging being among
  the most common tasks.
- **`shipping-safely`** — explicit confirmation gate for irreversible actions, and the
  statement that an earlier "go ahead" does not authorise a later destructive step.
- **`securing-changes`** with the current OWASP Top 10:2025 ordering, including the two new
  categories (Software Supply Chain Failures, Mishandling of Exceptional Conditions) and
  SSRF's move under Broken Access Control.
- **`grilling-requirements`** — interrogation that carries a recommendation per question
  and resolves from the codebase anything the codebase can answer.
- **Durable plan files** with a [template](skills/planning-changes/plan-template.md):
  status, decisions with reasons, open questions, append-only log. Files survive
  compaction; conversation does not.
- **Three-tier benchmark suite** — structure (148 checks), routing vocabulary (18
  real-world tasks), and a paired live-evaluation harness with a documented protocol.
  `npm run bench`. v4 had no tests of any kind.
- **Explicit interoperation table.** The pack defers to `/code-review`, `/security-review`,
  `/simplify`, `frontend-design`, `webapp-testing`, `superpowers`, and memory plugins
  rather than duplicating them.
- **`claude-superpack doctor`** — finds duplicate installs (including plugin-plus-skills),
  stale v4 skills, and reports how many skill directories are competing for context.
- **Rationalizations and Red flags tables** in every skill, rebutting the specific excuses
  that precede skipping a step.

### Changed

- **Always-on context: ~2,753 → ~742 tokens (−73%)** by Claude Code's own estimator
  (`claude plugin details`), and 2,811 → 757 by `node benchmarks/footprint.mjs
  --compare=<ref>` — two methods agreeing within 2%. Against a v4 install with the
  duplication bug, −86%.
- **Context-budget tracking removed.** v4 asked the model to maintain a running token tally
  from a table of estimates. Self-reported bookkeeping does not survive real work, and
  `/context` reports the real number. Replaced by concrete context discipline and by
  scripts that emit digests instead of raw output.
- **Pattern-tracking, error-cataloguing, and user-profiling removed** for the same reason:
  each depended on the model reliably writing records it has no incentive to write.
- **Parallel orchestration** collapsed from five skills into one reference, reframed
  decision-first: the four conditions that must all hold before splitting work, and the
  shared files that reliably cause merge pain.
- **README split into focused docs.** Architecture, domains, scripts, usage, benchmarks,
  compatibility, and migration each have their own page under `docs/`.

### Known limitations

- Tier 3 behavioural evaluation is not run; the harness ships, the numbers do not.
- Tier 2 routing signals were tuned against the task corpus, so 100% is coverage, not
  generalisation.
- Two lexical routing false positives remain out of 23 selections.

---

## [4.0.0] — 2026-04-12

Tagged `superpack-v4` (`2a2e72e`).

### Added

Eleven skills, taking the pack from 22 to 33: `changelog-writer`, `clarifier`,
`codebase-onboarder`, `dead-code-finder`, `dep-analyzer`, `doc-generator`,
`migration-planner`, `security-scanner`, `session-recap`, `test-generator`, `test-mapper`.

This brought the first documentation, testing, and security capabilities to the pack, and
the first onboarding and clarification skills.

### Changed

- Skill count in the plugin manifest, package description, and README updated to 33 across
  11 categories.
- All skills bumped to version 4.0.0.

---

## [3.0.0] — 2026-04-10

Tagged in the manifest only (`56a6167`).

### Added

Seventeen skills, taking the pack from 5 to 22 across six categories:

- **Memory** — `memory-manager`, `memory-search`, `memory-consolidator`, `project-memory`,
  writing to `~/.claude/memory/` with a 48-hour rolling recent file and a distilled
  long-term file.
- **Knowledge graph** — `graph-builder`, `graph-navigator`, `graph-reviewer`,
  `graph-updater`, storing a structural map under `~/.claude/graphs/` built with only
  built-in tools.
- **Token efficiency** — `context-budget`, `smart-discovery`, `skill-reuse-detector`.
- **Workflow** — `pre-flight`, `post-review`, `rollback`.
- **Learning** — `pattern-tracker`, `user-profiler`, `error-catalog`.

### Changed

- `auto-router` gained blast-radius awareness via the graph.
- Install script began creating the memory directory structure.

---

## [2.0.0] — 2026-04-10

Tagged `superpack-v2` (`853faa6`).

### Added

- **`auto-router`** — A/B/C/D request classification, routing to the lightest workflow that
  could deliver the outcome.
- **`merge-coordinator`** — integration and validation of parallel worker output.
- **GitHub Packages distribution** — `npm install` support, a postinstall that copied
  skills into `~/.claude/skills/`, a `claude-superpack` CLI, and a publish workflow.

### Changed

- `conflict-detector`, `parallel-orchestrator`, and `task-decomposer` rewritten around the
  new router.

### Fixed

- `repository.url` normalised to suppress an npm publish warning (`8627623`).

---

## [1.0.0] — 2026-04-07

Initial plugin scaffold (`f1e705e`, merged in `4801496`).

### Added

- **`task-decomposer`** — split a request into workstreams.
- **`conflict-detector`** — check whether workstreams can run in parallel.
- **`parallel-orchestrator`** — run low-conflict subagents in isolated worktrees.
- `bin/safe-summon`, plugin manifest, docs, and examples.

---

[5.0.2]: https://github.com/sahilbnsll/claude-superpack/compare/v5.0.1...v5.0.2
[5.0.1]: https://github.com/sahilbnsll/claude-superpack/compare/v5.0.0...v5.0.1
[5.0.0]: https://github.com/sahilbnsll/claude-superpack/compare/superpack-v4...v5.0.0
[4.0.0]: https://github.com/sahilbnsll/claude-superpack/compare/superpack-v2...superpack-v4
[2.0.0]: https://github.com/sahilbnsll/claude-superpack/releases/tag/superpack-v2
