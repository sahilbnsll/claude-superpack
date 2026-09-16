# Data engineering

Pipelines, ETL/ELT, warehouses, schema evolution, and data quality.

## Decide first

- **Is this pipeline idempotent?** Re-running for the same window must produce the same result, not duplicates. This is the single property that makes a pipeline operable: without it, every failure becomes a manual cleanup.
- **Batch or streaming?** Streaming costs an order of magnitude more in complexity — exactly-once semantics, watermarks, late data, state stores. Choose it when the freshness requirement genuinely demands it, not because it sounds better.
- **Who consumes this, and what breaks if it is wrong?** A dashboard nobody reads and a table feeding billing get different rigor.
- **What is the grain?** One row equals what, exactly? Ambiguous grain is the root of most double-counting bugs.

## Build right

### Correctness

- **Partition by event time, process by ingestion time**, and handle the gap explicitly. Late-arriving data is normal, not exceptional.
- Write idempotently: delete-and-insert the partition, or `MERGE` on a stable key. Append-only plus retries equals duplicates.
- Make backfills first-class from the start. Every pipeline needs a documented way to reprocess a date range, and it must use the same code path as the normal run.
- Track lineage: which source produced this table, which transformations, which run. When a number is questioned, lineage is the answer.
- Handle timezones deliberately. Store UTC, convert at presentation, and record which definition of "day" a daily aggregate uses. This is the most common source of off-by-one-day disputes.
- Never silently drop rows. Bad records go to a quarantine table with the reason; a pipeline that logs "skipped 400 rows" and continues hides a source outage.

### Schema evolution

- Additive changes — new nullable columns — are safe. Renames, type narrowing, and drops are breaking.
- Consumers read specific columns; adding one is free, removing one breaks them. Announce, deprecate, then remove.
- Enforce the schema at ingestion. Schema-on-read means every consumer independently rediscovers the same surprise.
- Version contracts for data that crosses a team boundary the same way you would version an API.

### Data quality

Check these as part of the pipeline, not as a separate thing someone remembers:

- **Freshness** — is the latest partition where it should be? The most valuable single check, because a stopped pipeline looks exactly like quiet data.
- **Volume** — is the row count within the expected band? A 90% drop is an upstream outage; a 10× spike is usually a join fanout.
- **Nulls and uniqueness** — on the columns where they matter, especially the key.
- **Referential integrity** — do foreign keys resolve? Orphans point at ordering problems.
- **Distribution** — did a categorical column suddenly gain a new value, or a numeric column shift range?

Failing checks must stop downstream processing. A quality check that only logs lets bad data propagate to the dashboard anyway.

### Cost and performance

- Partition and cluster on the columns people actually filter by. A full scan of a large table on every query is the usual warehouse cost problem.
- Push filters down; project only the columns needed. Warehouses bill for bytes scanned.
- Incremental models over full refresh once the table is large. Full refresh is simple and correct, and eventually unaffordable.
- Watch for join fanout — a many-to-many join that silently multiplies rows is both a cost and a correctness bug.
- Set retention deliberately. "Keep everything forever" is a decision with a recurring invoice.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Duplicate rows after a retry | Append-only write without idempotent merge or partition replacement |
| Numbers do not match the source system | Different grain, different timezone boundary, or silently dropped rows |
| Pipeline succeeded, table is empty | Source returned nothing and nothing checked; no volume assertion |
| Backfill produces different results than the original run | Logic changed, or the job depends on "now" rather than the partition date |
| Costs rising steadily | Full refresh on a growing table, missing partition pruning, unbounded retention |
| Downstream breaks after an upstream deploy | Column renamed or type narrowed with no contract |
| Metric changed overnight with no deploy | Upstream definition changed, or late data landed in a closed partition |

## Evidence

1. **Row counts and a checksum** before and after, for the same window. "The job succeeded" is not evidence that the data is right.
2. **A reconciliation query** against the source of truth for a sample window, with the difference explained or shown to be zero.
3. **Idempotency proof**: run the same window twice and show the output is identical.
4. **Quality checks passing** as part of the run, with the actual assertion output.
5. **A backfill rehearsal** on a narrow historical range before running the full one, especially where the destination is already in use.
