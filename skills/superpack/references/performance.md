# Performance

Latency, throughput, memory, and size — with measurement first.

## The rule that prevents most wasted work

**Measure, then change, then measure again.** An optimisation without a before-number is a guess, and most guesses are wrong: the bottleneck is usually somewhere nobody suspected. If you cannot measure it, the first task is making it measurable, not making it faster.

State the target before starting. "Faster" is unfalsifiable. "p95 under 300ms" is a finish line.

## Decide first

- **Is it actually slow, or slow for someone?** p50 fine and p99 terrible is a different problem — usually a cold cache, a large tenant, or a lock — and needs a different fix.
- **Is it latency or throughput?** One request being slow and the system collapsing under load have almost disjoint causes and fixes.
- **What is the budget?** Some slowness is acceptable. Spending a week to take a background job from 9s to 6s is a bad trade unless something depends on it.

## Frontend

Core Web Vitals, measured at the 75th percentile of real users — lab numbers on a fast laptop are not the thing Google or your users measure.

| Metric | Good | Usually caused by |
|---|---|---|
| **LCP** (loading) | ≤ 2.5s | Unoptimised hero image, render-blocking CSS/JS, slow server response, client-side-only rendering |
| **INP** (responsiveness) | ≤ 200ms | Long tasks blocking the main thread, expensive re-render on input, heavy third-party scripts |
| **CLS** (stability) | ≤ 0.1 | Images without dimensions, late-injected banners, fonts swapping metrics, ads |

Where the wins actually are, in rough order:

1. **Ship less JavaScript.** Bundle size is the dominant lever on mid-range phones. Check what the largest dependencies are before micro-optimising your own code.
2. **Images.** Modern formats, correct dimensions, lazy-load below the fold, eager + high priority for the LCP element. Usually the single biggest byte win.
3. **Fonts.** `font-display: swap`, preload the one face used above the fold, subset it. Match fallback metrics to avoid layout shift.
4. **Render path.** Server-render or statically generate what can be; stream the rest. A spinner while the client fetches is the slowest possible pattern.
5. **Third parties.** Analytics, chat widgets, tag managers. Measure their cost — it is often larger than your whole application bundle.
6. **Long tasks.** Break up work over 50ms; move real computation to a worker.

React specifically: unnecessary re-render is usually caused by a new object or function identity passed as a prop, or context that changes too broadly. Profile before reaching for `memo` — memoisation applied by guess adds cost and complexity for nothing.

## Backend

Typical order of magnitude, worth remembering before optimising the wrong layer: in-process cache ~100ns, in-memory ~µs, local network ~0.5ms, indexed database query ~1–10ms, cross-region ~50–150ms, cold serverless start ~100ms–2s.

- **Database first.** Most "slow API" problems are one query. Get `EXPLAIN ANALYZE` for the slow path before touching application code.
- **N+1** is the most common single cause. It looks like "the ORM is slow" and is actually 400 round trips.
- Missing or wrong index: an index whose column order does not match the query's filter and sort order does not help.
- Serialisation of large payloads is a real cost — check whether the endpoint returns fields nobody reads.
- Connection pool sizing: too small serialises requests, too large exhausts the database. Pool saturation looks exactly like "the database got slow".
- Cache only after you understand the cost you are avoiding. A cache in front of a fixable query is permanent complexity buying a temporary win.
- Parallelise independent I/O. Sequential awaits on unrelated calls is free latency thrown away.

## Memory

- A leak shows as monotonically rising memory with flat traffic. Take two heap snapshots under steady load and compare retained sets.
- Usual causes: unbounded caches and maps, event listeners never removed, closures capturing large objects, accumulating arrays in a long-lived object.
- Cap every cache. An unbounded in-process cache is a leak with a friendly name.
- In containers, a memory limit turns a leak into a restart loop — which is how most leaks are discovered.

## Load testing

- Model realistic traffic shape, not a flat line: bursts, a mix of endpoints, realistic payload sizes, cold and warm caches.
- Ramp to find the knee — the point where latency rises non-linearly. That is the capacity number worth having.
- Watch saturation during the run (connections, queue depth, CPU steal, GC pauses), not just response times.
- Never load-test production without explicit agreement. It is indistinguishable from an attack and it can cause a real outage.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Fast locally, slow in production | Data volume, network hops, cold caches, shared contention — none of which exist locally |
| Optimisation had no effect | The bottleneck was elsewhere; there was no baseline to notice |
| Fine at p50, terrible at p99 | Lock contention, GC pause, cold start, or one very large tenant |
| Gets slower over time | Leak, unbounded table without an index, or a cache that never evicts |
| Fast until N users, then collapses | A hard limit reached: connections, file descriptors, thread pool, rate limit |
| Bundle grew without a feature landing | A dependency pulled in a heavy transitive; check the bundle report per build |

## Evidence

1. **Before and after, same conditions, same measurement.** State both numbers and how they were taken. Anything else is a story.
2. **A profile** identifying where time or memory actually goes — flame graph, `EXPLAIN ANALYZE`, Chrome performance trace, heap diff.
3. **Field data over lab data** for web vitals: real-user monitoring at p75 beats a Lighthouse score from one run on one machine.
4. **Load test output** for a throughput or capacity claim, including the saturation signals.
5. **A regression guard** where it matters: a budget in CI (bundle size, query count, benchmark threshold) so the win does not quietly erode.
