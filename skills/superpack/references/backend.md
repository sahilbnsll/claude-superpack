# Backend

APIs, services, databases, caching, queues, and background work.

## Decide first

- **Is this endpoint idempotent?** Any operation a client can retry — and every client retries — must be safe to run twice. Non-idempotent writes need an idempotency key stored with the result, not just a uniqueness constraint that throws on the second attempt.
- **What is the consistency requirement?** Read-after-write for the acting user is usually mandatory; global strong consistency usually is not. Naming this prevents accidental distributed transactions.
- **Where does the transaction boundary sit?** One business operation, one transaction. Calling an external API inside an open transaction holds locks for the duration of someone else's outage.
- **Who is allowed to do this?** Write the authorization rule before the handler. Authorization added afterwards gets applied to the endpoints you remembered.
- **What happens on partial failure?** Two writes and one network call means three failure points. Decide now: compensate, retry, or fail the whole thing.

## Build right

### API surface

- Validate at the boundary, once, with a schema. Parse into a typed value rather than checking fields ad hoc — after the boundary, the data should be trustworthy by construction.
- Never trust client-supplied identity, role, price, or ownership. Re-derive them server-side from the session.
- Error responses: a stable machine-readable code, a human message safe to display, and a correlation id. Internal exception text and stack traces do not go over the wire.
- Status codes carry meaning: 400 malformed, 401 unauthenticated, 403 authenticated but not permitted, 404 absent *or* hidden by permission, 409 conflict, 422 semantically invalid, 429 throttled with `Retry-After`, 5xx our fault.
- Paginate every list endpoint from day one. Cursor pagination survives inserts; offset pagination silently skips and duplicates rows under concurrent writes.
- Versioning: additive changes are free; removals and renames are breaking. Publish a deprecation window before removing anything a consumer can reach.
- Set timeouts on every outbound call. A default of "infinite" turns one slow dependency into a full outage.

### Data access

- Parameterised queries only. String-built SQL is the injection vector, including in "internal" and "admin" tools.
- Know the query plan for anything on a hot path. An index on the wrong column order is the same as no index.
- `SELECT` the columns you use. `SELECT *` couples you to schema changes and moves blobs you do not read.
- Fix N+1 at the query layer, not with a cache. Batch or join; a cache over an N+1 hides it until the cache misses.
- Migrations must be backwards compatible with the currently-deployed code, because both versions run at once during a deploy. The safe sequence is: add nullable column → deploy code that writes both → backfill in batches → deploy code that reads new → drop old, later, as its own change.
- Long-running backfills run in bounded batches with a resumable cursor, not one statement that locks a table for an hour.
- Soft delete or hard delete is a product decision with legal consequences. Do not choose it silently.

### Caching

- Name the invalidation strategy before adding the cache. "We will figure out invalidation later" produces stale-data bugs that are reported as random.
- Cache keys include everything that varies the result — tenant, user, locale, permission scope. A key missing the tenant is a data-leak bug, not a performance bug.
- Set a TTL even when you also invalidate explicitly. Explicit invalidation will be missed somewhere.
- Guard against stampede: jittered TTLs, or single-flight so one miss does not become a thousand concurrent recomputes.

### Queues and background work

- At-least-once delivery is the norm, so consumers must be idempotent. Design for duplicates rather than hoping for exactly-once.
- Every queue needs a dead-letter destination and someone who looks at it. A DLQ nobody monitors is a silent data-loss channel.
- Bound retries with exponential backoff and jitter. Immediate infinite retry is a self-inflicted denial of service against your own dependency.
- Keep messages small — pass an id, not a payload. Large messages make replay and inspection painful.
- Jobs must be safe to run concurrently with themselves, or hold an explicit lock. Cron plus a slow run equals two copies.

### Auth

- Sessions: rotate the identifier on privilege change, set `HttpOnly`, `Secure`, and `SameSite`, and support server-side revocation. A stateless JWT you cannot revoke is a design decision to live with for its whole TTL.
- Passwords: argon2id or bcrypt with a current cost factor. Never a fast general-purpose hash.
- Enforce authorization at the data-access layer, not only in the route. Object-level checks — "is this row's owner the caller?" — are what broken access control actually looks like in practice.
- Rate-limit authentication endpoints per account *and* per IP. Per-IP alone is defeated by a botnet; per-account alone allows enumeration.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Duplicate records after a retry | No idempotency key; uniqueness enforced only by an exception |
| Intermittent timeouts under load | Connection pool exhausted — often a leaked connection on an error path |
| Works alone, fails under concurrency | Read-modify-write without a transaction or optimistic version check |
| Slow endpoint that profiles as "database" | N+1, or a missing index on a filter that grew with the table |
| Deploy causes 500s for a few minutes | Migration not backwards compatible with the old code still serving |
| Data from another tenant appears | Cache key or query filter missing the tenant scope |
| Queue backlog grows without errors | Consumer slower than producer, no autoscale signal, no lag alert |
| "Random" logouts | Session store eviction, or clock skew on token validation |

## Evidence

1. **Integration test against a real database** — the behaviour lives in the interaction with the store, so an in-memory fake proves little about transactions, constraints, or migrations.
2. **The request itself.** `curl` the endpoint and paste the status and body. For auth changes, show the negative case too: the unauthorized caller getting 403 is the more important half.
3. **Migration rehearsal** — apply forward, exercise the app, apply the reverse (or state explicitly that there is no reverse and what the forward-fix is). On a copy of realistic data, not an empty table.
4. **Concurrency check** for anything you claimed is idempotent or race-free: fire the operation N times in parallel and assert exactly one effect.
5. **Query plan** for a performance claim — `EXPLAIN ANALYZE` output, not a timing you observed once on a warm cache.
