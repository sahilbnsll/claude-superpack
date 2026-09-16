# SRE and observability

Reliability targets, telemetry, alerting, and incident response.

## Decide first

- **What does "working" mean, numerically?** An SLO is a number and a window: "99.5% of checkout requests succeed in under 800ms, measured over 30 days." Without it, every latency question becomes an opinion.
- **Who is woken up, and for what?** An alert that does not require a human to act right now is not an alert. It is a dashboard.
- **What is the error budget?** The gap between the SLO and 100% is the budget for shipping risk. When it is spent, the response is to stop shipping features and fix reliability — that is what makes the number real.

## Instrument for the questions you will ask at 3am

Four signals cover most of it. Emit them for every service, every dependency call, and every queue.

| Signal | Question it answers |
|---|---|
| **Rate** | How much traffic is this taking? |
| **Errors** | What fraction is failing, and failing how? |
| **Duration** | How slow is it — p50, p95, p99, not the mean? |
| **Saturation** | How close to a limit is it — connections, memory, queue depth, thread pool? |

Averages hide outages. A p50 of 100ms with a p99 of 12s is a service that is broken for one user in a hundred, and the mean will not show it.

### Logs

- Structured, one event per line, machine-parseable. Free-text logs cannot be aggregated or alerted on.
- Every log line carries the correlation id, so one request can be followed across services.
- Log the decision, not just the outcome: which rule matched, which branch ran, which upstream answered.
- Never log secrets, tokens, full request bodies with PII, or entire config objects.
- Levels mean something: ERROR is "a human should look", WARN is "unexpected but handled", INFO is "normal significant event", DEBUG is off in production. A service that logs ERROR on every retry has taught its operators to ignore ERROR.

### Metrics

- Counters for events, histograms for durations, gauges for levels. Do not compute a percentile in the application — export the histogram and let the backend do it.
- Keep cardinality bounded. A label containing a user id or URL with an id in it will eventually cost more than the service.
- Emit business metrics next to technical ones: signups, orders, jobs processed. Technical health with no business signal misses outages that leave the servers happy.

### Traces

- Trace across every boundary — HTTP, queue, database. The value is in seeing the whole request, and one uninstrumented hop breaks the picture.
- Sample intelligently: keep everything that errored or was slow, sample the fast successes.

## Alerting

- Alert on symptoms users feel (error rate, latency, queue age), not on causes (CPU). A CPU alert fires when nothing is wrong and stays quiet when everything is.
- Every alert needs: what is broken in user terms, the likely cause, the first diagnostic step, and a link to the runbook. An alert with only a metric name wastes the responder's first ten minutes.
- Burn-rate alerting on the SLO: a fast burn (budget gone in hours) pages; a slow burn (budget gone in days) opens a ticket.
- Tune for noise ruthlessly. An alert ignored twice is worse than no alert, because it trains the team to ignore the channel.
- Have exactly one page-worthy alert per failure mode. Ten alerts for one outage is ten people looking at the same thing.

## Incident response

Follow this order. The temptation is always to skip to diagnosis.

1. **Stabilise.** Stop the bleeding before understanding it. Roll back, disable the flag, shed load, fail over. Restoring service is not the same as fixing the bug, and it comes first.
2. **Communicate.** Say what is broken, who is affected, what is being done, and when the next update comes. Silence during an incident is its own damage.
3. **Diagnose with evidence.** What changed? Deploys, config changes, flag flips, dependency incidents, traffic shape, certificate expiry. Most incidents follow a change.
4. **Fix and verify.** Confirm recovery with the same metric that showed the problem, not with a manual check.
5. **Write it up, blamelessly.** Timeline, contributing factors, what made detection or recovery slow, and specific action items with owners. "Be more careful" is not an action item. The question is why the system allowed it, not who did it.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Users report an outage before monitoring does | Alerting on causes rather than symptoms; no synthetic check of the real user path |
| Alert fatigue | Too many non-actionable alerts; thresholds set by guess |
| "Everything looks green" during an incident | Dashboards show averages, or the broken path is uninstrumented |
| Cannot trace a request across services | Correlation id dropped at a boundary — usually a queue or a third-party callback |
| Logs useless during an incident | Unstructured, or the useful field was never logged |
| Observability bill exceeds infrastructure bill | Unbounded label cardinality, or debug logging left on in production |
| Repeat incidents from the same cause | Post-incident actions never got prioritised |

## Evidence

1. **The metric, before and after**, over a window long enough to be meaningful. A single sample is not a trend.
2. **A fired test alert** — for a new alert, prove it fires by triggering the condition. An alert that has never fired is untested code in the most critical path there is.
3. **The trace** for a latency claim: which span holds the time.
4. **Recovery confirmed on the user-facing signal**, not the internal one you were debugging.
5. **A test at the layer that failed.** The strongest incident follow-up is a regression test for the exact failure, plus the detection that would have caught it sooner.
