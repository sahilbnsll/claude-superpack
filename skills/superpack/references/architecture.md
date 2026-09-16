# Architecture

System design, boundaries, distributed systems, and migration.

## Decide first

- **What is the actual constraint?** Scale, latency, team structure, compliance, cost, or time to market. Architectures fail by optimising for a constraint the project does not have.
- **What are the numbers?** Requests per second, data volume, growth rate, acceptable latency, acceptable downtime. An architecture chosen without numbers is chosen by fashion.
- **What is hard to change later?** Data model, service boundaries, and public contracts are expensive. Frameworks, libraries, and internal structure are cheap. Spend the design effort on the expensive ones.
- **What is the simplest thing that meets the constraint?** A well-structured monolith with a good module boundary serves most products further than its reputation suggests, and it can be split later along boundaries you have learned rather than guessed.

## Boundaries

- Draw service boundaries around data ownership, not around nouns. Two services writing to one table are one service with extra network calls and a distributed-transaction problem.
- Boundaries that mirror team boundaries survive; boundaries that cut across a team's daily work produce coordination cost forever.
- A boundary is worth it when the two sides genuinely differ in scaling profile, release cadence, availability requirement, or compliance scope. Otherwise it is a function call with a network in the middle.
- Chatty boundaries are the tell of a bad split: if A cannot do anything without three calls to B, they belong together.

## Distributed systems, honestly

- **The network is not reliable.** Every remote call fails eventually: timeouts, retries with backoff and jitter, circuit breakers, and a defined behaviour when the dependency is down.
- **Partial failure is the normal case.** Three writes across two services means states where one succeeded. Design the compensation or accept and document the inconsistency window.
- **Exactly-once delivery does not exist.** At-least-once plus idempotent consumers is the achievable version.
- **Distributed transactions are usually the wrong answer.** Prefer a saga with explicit compensation, or redesign so the transaction fits in one service.
- **Clocks disagree.** Do not order events across machines by wall time. Use sequence numbers, versions, or logical clocks.
- Cascading failure is the dominant outage shape: one slow dependency fills the caller's thread pool, which makes the caller slow, and so on up. Timeouts, bulkheads, and load shedding are what stop it.
- Retry storms are self-inflicted denial of service. Bound retries and add jitter.

## Choosing to add technology

Every new component is permanent operational cost: it must be deployed, monitored, patched, backed up, upgraded, and understood at 3am by someone who did not choose it.

Ask in order: does the existing stack already do this; is the problem real and measured; who operates it; what breaks if it is down; how do we remove it if it was wrong. If the answer to any of the first two is unfavourable, stop.

## Migration

Big-bang migrations fail in a way that is hard to recover from, because you cannot go back and you cannot go forward. Use incremental patterns:

- **Strangler fig** — route a slice of traffic to the new implementation, grow the slice, remove the old one when the slice is everything. Needs a routing layer and a way to compare.
- **Expand/contract** for schema and API change: add the new form, write to both, migrate readers, backfill, then remove the old form — each step independently deployable and reversible.
- **Parallel run** for anything where correctness is the risk: run both implementations, compare outputs, alert on divergence, and cut over when divergence is zero for long enough. The comparison is the evidence.
- **Feature flag** the cutover so rollback is a config change and not a deploy.

Every migration needs: an explicit rollback point for each phase, a definition of done for each phase, and a decision about what happens to data written during the transition.

## Documenting a decision

Write an ADR when a decision is expensive to reverse, when a future reader would otherwise ask "why on earth", or when a plausible alternative was rejected for a non-obvious reason. Five sections: context, decision, alternatives considered, consequences (including the bad ones), status. Half a page. The value is in recording the constraint that made the choice right, because that is what changes.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Microservices that must be deployed together | Boundaries drawn wrong; they are one service |
| One service down takes everything down | No timeouts, no circuit breakers, synchronous chain |
| Data inconsistent between services | Distributed write with no compensation, or dual ownership of one fact |
| Migration stuck half-finished | No phase-by-phase rollback; too big to complete, too risky to revert |
| Every feature touches every service | Boundaries cut across the natural change axis |
| Architecture nobody can explain | Accumulated decisions, none recorded |
| Rewrite is now slower than the thing it replaced | Original's complexity was requirements nobody documented |

## Evidence

1. **The numbers behind the claim.** "It will not scale" needs a measurement and a projection, not an intuition.
2. **A prototype or spike** for the risky assumption — the one where being wrong invalidates the design. Timebox it.
3. **The parallel-run divergence report** for a migration: zero differences over a real window is the strongest possible cutover evidence.
4. **A written rollback path per phase**, and for R2+ work, one phase actually rehearsed.
5. **The ADR**, so the next person inherits the reasoning rather than only the result.
