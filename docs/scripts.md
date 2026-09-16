# Scripts

Four tools under `skills/superpack/scripts/`. Zero dependencies, Node 18+, Windows and
POSIX. Each takes `--help` and `--compact`.

They exist because deterministic work should not be done by a language model. Detecting a
package manager, distilling a build log, or matching a credential pattern gives the same
answer every time when a script does it, and a slightly different one every time when a
model does it.

---

## `recon.mjs` — what is this project, and how do I verify a change to it?

```bash
node recon.mjs [--root DIR] [--compact] [--no-git]
```

One call replaces a dozen speculative file reads. Returns JSON:

- Languages by file count, package manager, frameworks and platforms detected from
  dependencies and marker files.
- **The project's real verification commands** — read from `package.json` scripts,
  `pyproject.toml`, `Cargo.toml`, `go.mod`, or the `Makefile`, not guessed.
- Monorepo layout, workspace patterns, and concrete package roots.
- Test layout: count, colocated vs separate-directory, naming samples.
- Conventions: TypeScript strictness and path aliases, module system, formatter,
  `.editorconfig`, and the directory vocabulary this repo uses for its own layers.
- CI systems, branch, dirty file count, and the files with the most churn in 90 days.
- **Gaps** — no test command, no linter, no `CLAUDE.md` — because an absent gate changes
  how you should work and what you may claim.

Real output on a Next.js app:

```json
{
  "languages": ["typescript (207)", "javascript (26)"],
  "frameworks": ["next.js", "react", "supabase", "llm", "tailwind", "zustand", "zod"],
  "verification_commands": {
    "lint": "npm run lint",
    "typecheck": "npx tsc --noEmit",
    "build": "npm run build"
  },
  "conventions": { "typescript": { "strict": true, "path_aliases": ["@/*"] } },
  "agent_instructions": ["AGENTS.md", "CONTRIBUTING.md"],
  "gaps": ["no test command detected — behavioural verification needs another form of evidence"]
}
```

---

## `gates.mjs` — run the verification and report only the signal

```bash
node gates.mjs [--only lint,typecheck,test,build] [--skip LIST] [--keep-going]
node gates.mjs --cmd "npm run test:e2e" --label e2e
node gates.mjs --list
```

Detects the project's gates, runs them cheap-to-expensive, stops on the first failure
unless `--keep-going`, and returns pass/fail with the **real error lines** rather than the
raw stream. Exits 0 when everything that ran passed, so it works in CI or a git hook.

Measured on a real Next.js build: **15,247 bytes of output → 288 bytes**, preserving the
evidence line `✓ Compiled successfully`. That is a 98% reduction on the case that matters —
verbose tools and failing runs.

Honest caveat: on a gate that passes silently the digest is *larger* than the raw output
(255 bytes vs 32 for a clean lint). The value there is the reliable verdict and the
stop-early orchestration, not compression.

When nothing is detected it says so explicitly rather than implying a pass:

```json
{
  "verdict": "no-gates",
  "note": "No verification commands detected. Behavioural evidence must come from another
           source — a script run, an HTTP call, a browser check. Say so explicitly rather
           than claiming verification."
}
```

---

## `diffstat.mjs` — what can this change break?

```bash
node diffstat.mjs                # working tree vs HEAD
node diffstat.mjs --staged
node diffstat.mjs --base main    # whole branch, for review
```

Turns a diff into a risk summary: churn per file, touched layers, and flags from both the
**paths** changed and the **lines added**, each with the reason it matters. It then derives
the implied risk tier and the gates that tier earns.

Path flags: db migrations, Terraform, Kubernetes, containers, CI pipelines, auth, payments,
secrets-adjacent, dependencies/lockfiles, public API surfaces, configuration, generated or
vendored files, tests, docs.

Content flags on added lines: destructive SQL, destructive shell, dynamic execution,
HTML-injection surfaces, string-built SQL, SSRF surfaces, permissive CORS, disabled TLS
verification, wide-open network or IAM, inline credential defaults, added suppressions,
focused or skipped tests, debug output, new TODOs.

On a fixture containing all of them it detected 9 of 9 and correctly derived `R3` with the
confirmation gate attached. Flags are heuristics: they tell you where to look, not whether
the code is correct.

---

## `secrets.mjs` — is there a credential in here?

```bash
node secrets.mjs               # added lines in the working diff, plus untracked files
node secrets.mjs --staged
node secrets.mjs --base main
node secrets.mjs --all         # every tracked text file
node secrets.mjs --files a.ts,b.env
```

Tuned for **precision over recall**, deliberately. A scanner that cries wolf gets ignored,
which is worse than no scanner.

- **High** — provider-specific token shapes (AWS, Anthropic, OpenAI, Google, GitHub,
  GitLab, Slack, Stripe, SendGrid, Twilio, npm, DigitalOcean, Shopify, Hugging Face),
  private key blocks, signed JWTs, and connection strings with an inline password.
- **Medium** — credential-shaped assignments, gated on Shannon entropy ≥ 3.0 and a
  benign-value filter that drops placeholders, prose, env references, URLs, paths, and
  colours.

Values are never printed in full. Findings in test and fixture paths are annotated rather
than dropped — a real key in a fixture is still a leak.

Measured: 6 of 6 true positives on a fixture, **0 false positives** across 1,094 lines that
include this repository's own scanner source, which is dense with the words `api_key`,
`secret`, and `password`. Exits 1 on any high finding.

---

## Using them outside Claude

Nothing about these depends on an agent. As a pre-commit hook:

```bash
#!/bin/sh
node ~/.claude/skills/superpack/scripts/secrets.mjs --staged || exit 1
node ~/.claude/skills/superpack/scripts/gates.mjs --only lint,typecheck || exit 1
```

In CI:

```yaml
- run: node skills/superpack/scripts/secrets.mjs --base ${{ github.base_ref }}
```

## Adding one

Put it in `skills/superpack/scripts/`, import shared helpers from `lib.mjs`, support
`--help`, and emit JSON via `out()`. The benchmark enforces two rules: `--help` must work,
and there must be no third-party imports. The pack stays installable with no build step and
no network.
