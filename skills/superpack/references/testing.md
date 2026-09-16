# Testing

Strategy, level selection, browser and load testing, and keeping the suite trustworthy.

## Decide first

- **What is the risk this test buys down?** Tests exist to catch regressions in behaviour that matters. A test asserting that a getter returns the value the setter set buys nothing and costs maintenance forever.
- **At which level?** Push tests to the lowest level that can actually catch the bug. A pricing rule belongs in a unit test; "checkout works" belongs in one E2E test, not thirty.
- **Does the repo have a convention?** Match its framework, file location, naming, and assertion style. A second testing idiom in one repo is worse than the one you dislike.

## Level selection

| Level | Covers | Keep it |
|---|---|---|
| **Unit** | Pure logic, branches, edge cases, error paths | Fast, no I/O, many |
| **Integration** | Real database, real HTTP boundary, real queue | Realistic, moderate count — this is where most real bugs are caught |
| **E2E** | The handful of journeys whose failure is unacceptable | Few, stable, on real browsers |
| **Contract** | Producer/consumer compatibility across services | One per integration point |
| **Load** | Behaviour under realistic concurrency | Before capacity decisions, not continuously |

The common failure is a large pile of unit tests over mocked dependencies, which passes while the system is broken, because everything real was replaced.

## Write tests that can fail

- **A test that has never failed has not been tested.** After writing a regression test, break the fix and confirm the test goes red, then restore. Without that cycle you have written an assertion, not a test.
- Test behaviour through the public interface. Tests coupled to internal structure break on every refactor and catch nothing.
- One reason to fail per test. When it goes red, the name should tell you what broke.
- Assert on outcomes, not on calls. `expect(save).toHaveBeenCalled()` passes when save throws.
- Cover the boundaries: empty, one, many, maximum, null/undefined, unicode, negative, zero, the timezone that breaks dates, the concurrent case.
- **Test the error paths.** They are the ones with the fewest eyes and the worst consequences, and they are where fail-open bugs live.
- Mock at the system boundary — network, clock, filesystem, randomness — not your own modules. Mocking your own code tests your mock.
- Independent and order-agnostic. Shared mutable state between tests produces failures that move when you look at them.

## Browser and E2E

- Query by accessible role and name. `getByRole('button', { name: 'Save' })` asserts correctness and accessibility at once; a test id asserts neither.
- **Never wait for time. Wait for a condition.** `sleep(2000)` is the single largest source of flakiness — it is simultaneously too slow and not long enough.
- Control the data. Seed known state, or create it through the app, and clean up after. Tests depending on whatever is in the environment fail on Mondays.
- Isolate from third parties. Intercept network calls at the boundary so an external outage does not fail your build.
- On failure, capture a screenshot, the DOM, console output, and network log. A CI failure with only "expected true, got false" costs an hour.
- Keep the suite small enough to run on every PR. An E2E suite people skip protects nothing.

## Flaky tests

A flaky test is a broken test — it destroys trust in the whole suite and trains people to re-run rather than read. Treat it as a defect, not weather.

Usual causes, in order: waiting on time rather than condition, shared state between tests, real clock or timezone dependence, unseeded randomness, animation not settled, unhandled async in setup, test-order dependence, parallel workers contending on one database.

Quarantine only with a linked issue and an owner. A permanently skipped test is a deleted test that still costs CI time.

## Coverage

Coverage tells you what was executed, not what was verified. 100% coverage with no assertions is a statistic, not a safety net. Use it to find untested files, not to set a target — a coverage gate invites tests written to satisfy the gate.

What is worth checking: are the error paths covered, is the new logic covered, did coverage drop sharply on a critical module.

## Load testing

- Realistic mix and shape, warm-up, then a ramp to find the knee.
- Assert on what matters: error rate and p95/p99, not average throughput.
- Record the saturation signals during the run, or you will not know what limit you hit.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Tests pass, production breaks | Everything real was mocked; no integration coverage |
| Tests break on every refactor | Asserting internals instead of behaviour |
| Flaky in CI, fine locally | Timing assumptions, parallelism, or shared state |
| Suite too slow to run | Too many E2E, no parallelism, real sleeps |
| A test that cannot fail | No red-green cycle; assertion tautological or unreachable |
| Test passes because it silently skipped | A `.only` left in, or a conditional skip that always skips |

## Evidence

1. **The test run output** — counts, names of failures, exit code. Via `node scripts/gates.mjs --only test` for a compact digest.
2. **The red-green cycle** for any regression test: it failed before the fix, passes after. State both.
3. **The failing case reproduced first** for a bug fix. A fix without a reproduction is a guess that happened to change the symptom.
4. **Browser evidence** — screenshot or trace — for UI behaviour claims.
5. **What you did not test**, explicitly. "Covered the validation path; the payment-provider callback is not covered because it needs sandbox credentials" is a useful report. Silence is not.
