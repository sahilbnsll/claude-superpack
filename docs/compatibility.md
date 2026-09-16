# Compatibility

The pack is additive and deferential. Where a better-specialised tool exists, it routes
there instead of duplicating it. This page is the conflict analysis behind that.

## Precedence

```
your direct request  >  CLAUDE.md / AGENTS.md  >  this pack  >  default behaviour
```

Nothing here overrides a project's own instructions. Where a repository's conventions
contradict a domain reference, the repository wins and the references say so.

## First-party Claude Code tools

| Tool | Owns | Superpack supplies | Overlap risk |
|---|---|---|---|
| `/code-review` | Correctness bugs in a diff | Requirement coverage, scope discipline, consequence — in `reviewing-before-done` | **Resolved.** `reviewing-before-done` explicitly is not a bug hunter and says to run `/code-review` for that. |
| `/security-review` | Deep security audit of a branch | Design-time threat modeling, secure defaults, fast pre-commit scan | **Resolved.** `securing-changes` covers build time; the audit is delegated. |
| `/simplify` | Applying quality cleanups to changed code | Whether the code should exist at all (minimalism ladder) | **Resolved.** Different stage: one decides, the other cleans. |
| `frontend-design` | Visual identity, typography, palette, aesthetic risk | A11y mechanics, five states, responsiveness, perceived performance | **Resolved.** `frontend.md` opens by handing aesthetics over. Genuinely complementary — neither covers the other's ground. |
| `webapp-testing`, `playwright` | Driving a browser | What to assert and when browser evidence is required | **Resolved.** No browser automation is reimplemented. |
| `/init` | Writing a `CLAUDE.md` | Stack and convention detection for a task already in flight | **Low.** Different outputs; `recon.mjs` writes nothing. |
| `/run` | Launching the app | — | **None.** |
| Native memory, `/context` | Cross-session recall, real token counts | In-task durable state via plan files | **Resolved.** v4's token estimator and memory store were removed precisely because these exist. |

## Community packs

| Pack | Overlap | How it resolves |
|---|---|---|
| **superpowers** | `verification-before-completion` ↔ `verifying-evidence`; `systematic-debugging` ↔ `debugging-systematically`; `writing-plans` ↔ `planning-changes`; `dispatching-parallel-agents` ↔ `parallel.md` | **Real, and deliberate.** Superpowers owns process discipline — TDD, brainstorming, worktrees, subagent dispatch. Superpack owns risk tiering, domain depth, and per-domain verification recipes. If both are installed, let superpowers' process skills set the approach and use superpack for what kind of work this is and what proves it. The pack's interop table says exactly that. Names differ, so nothing shadows. |
| **ECC** | Skills, rules, hooks, memory vault | **Low.** ECC is a whole harness configuration; superpack is nine skills. They coexist, but running both plus superpowers means a large always-on description budget — check `claude-superpack doctor` for the total. |
| **claude-mem, Engram** | Cross-session memory | **None.** Superpack has no memory store and defers to these explicitly. |
| **Context Mode, RTK** | Compressing tool output | **Partial.** `gates.mjs` does the same thing for verification commands specifically, without an MCP server. If you run Context Mode, use whichever you prefer; they do not conflict, they duplicate. |
| **agent-skills (addyosmani)**, **GSD** | Full-lifecycle workflows | **Moderate conceptual overlap, no name collisions.** Both are more prescriptive about phase sequencing. Running both means two opinions about process; pick one as primary. |
| **Design/UX skill marketplaces** | `frontend.md` | **Low.** Those are design-craft skills; `frontend.md` is engineering correctness. |

## Name collisions

None of the nine names collide with anything in the first-party marketplace, superpowers
6.x, or the Anthropic skills repo, as of this release. The names are verb-first and
specific for exactly that reason (`reviewing-before-done`, not `code-review`).

If a collision does appear, Claude Code resolves it by precedence — enterprise, then
personal, then project — and plugin skills stay namespaced as `/plugin:skill`. Installing
superpack as a plugin rather than as personal skills sidesteps collisions entirely.

## Activation cost

The honest cost of any pack is not its size on disk but its always-on description budget.

| | Skills | Always-on (`claude plugin details`) |
|---|---|---|
| superpack v5 | 9 | ~742 tokens |
| superpack v4 | 33 | ~2,753, roughly doubled by the v4 double-install bug |

Installing v5 both as a plugin and as personal skills recreates that doubling;
`claude-superpack doctor` flags it.

Under auto-compaction Claude Code re-attaches only the most recent five skills within a
25,000-token budget, so a large installed surface is not just expensive — it is unreliable.
`claude-superpack doctor` reports the total number of skill directories on your machine
across all packs, which is the number that actually matters.

## Turning parts off

Nine independent directories. Delete any you do not want from `~/.claude/skills/`;
`superpack` is what makes the rest cohere, and the others degrade gracefully alone.

To keep a skill but quiet it, add `user-invocable: false` (Claude can still use it, it
leaves your `/` menu) or `disable-model-invocation: true` (manual only).
