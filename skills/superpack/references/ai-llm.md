# AI and LLM integration

Prompts, agents, tool use, RAG, evaluation, cost, latency, and the security properties that are unique to model-driven systems.

## Decide first

- **Does this need a model at all?** Classification with twelve fixed categories, extraction from a rigid format, or routing on a keyword are all cheaper, faster, and more reliable as ordinary code. The model earns its place where the input is genuinely open-ended.
- **What happens when the output is wrong?** Every model output is a maybe. If a wrong answer is expensive, you need validation, a confidence path, or a human in the loop — not a better prompt.
- **What is the latency and cost budget per call?** This decides model tier, context size, whether you can afford multiple passes, and whether you stream.

## Building with models

- **Structure the output.** Ask for JSON against a schema and validate it on receipt. Never regex a prose response into fields — you are writing a parser for a language with no grammar. Use the provider's structured-output or tool-call mechanism where available.
- **Put the instructions in the system prompt and the data in the user turn**, clearly delimited. Mixing them is how injection gets in.
- **Be specific about the failure case.** "If the document does not contain the answer, return `{found: false}`" prevents a confident fabrication far more effectively than "do not hallucinate".
- **Examples beat adjectives.** Two or three examples of the exact output shape outperform a paragraph describing it.
- Set `max_tokens` deliberately, handle the truncation case, and treat a truncated response as an error rather than parsing the fragment.
- Retry with backoff on rate limits and transient errors; do not retry a refusal or a validation failure — fix the input.
- **Cache the stable prefix.** Long system prompts and fixed context are prime candidates for prompt caching; it is the single largest cost lever in most applications.
- Stream when a human is waiting. Perceived latency is dominated by time-to-first-token.
- Version your prompts in the repository like code, with the model id recorded. A prompt that works on one model may not on another, and silent model upgrades change behaviour.

## Agents and tool use

- **Give the fewest tools that can do the job.** Tool selection accuracy falls as the tool count rises. Ten well-named tools beat forty overlapping ones.
- Tool descriptions are prompts. Say when to use it and when not to, and what the arguments mean. Most tool-calling failures are description failures.
- Validate every tool argument server-side. The model is an untrusted caller.
- Bound the loop: maximum iterations, maximum wall time, maximum spend. An agent without a budget will find a way to spend it.
- Make tools idempotent and preferably reversible. The agent will call one twice.
- **Keep destructive capability behind a human confirmation.** The agent proposing a deletion and a person approving it is a different system from the agent deleting.
- Log every call: inputs, outputs, tool calls, tokens, latency, and the final decision. Without traces, debugging an agent is guesswork.

## RAG

Most RAG quality problems are retrieval problems, not generation problems. Debug retrieval first: look at what was actually retrieved before blaming the prompt.

- **Chunking is the highest-leverage decision.** Chunk on semantic boundaries — sections, functions, paragraphs — not fixed character counts that cut sentences in half. Overlap enough to preserve context across boundaries.
- Keep metadata with each chunk: source, title, section, date, permissions. Needed for citation, for filtering, and for access control.
- Hybrid retrieval (vector + keyword) beats pure vector on names, identifiers, error codes, and rare terms — exactly the things users search for.
- Rerank the top-k before generation. Cheap, and usually the biggest single quality win after chunking.
- **Enforce permissions at retrieval time**, filtering by the requesting user. A shared index without per-user filtering leaks documents across tenants — and the leak is invisible because it arrives as fluent prose.
- Require citations and verify they resolve to the retrieved chunks. An unverifiable citation is worse than none.
- Have an explicit "not in the corpus" answer and reward it. The failure mode is confident synthesis from irrelevant chunks.

## Security specific to model systems

Prompt injection has no complete fix. The reliable mitigation is architectural: break the chain.

The dangerous combination is **untrusted content + tool access + privileged capability**. Remove one leg:

- Treat all retrieved and fetched content as data. Never let it change what the system is trying to do.
- Scope the agent's credentials to the requesting user, so injection cannot exceed what that user could already do.
- Put confirmation in front of side-effectful and irreversible actions.
- Treat model output as untrusted input to whatever consumes it: escape it before rendering as HTML, never `eval` it, parameterise any query built from it.
- Watch for exfiltration paths: an image URL, a link, or an outbound request the model can influence can carry data out.
- Rate-limit and budget per user. Model calls cost money, which makes them an abuse target.
- Log prompts and outputs with the same PII discipline as any other log.

## Evaluation

Vibes do not survive a model upgrade. If output quality matters, you need a test set.

- Build a dataset from real inputs, including the failures that motivated the work. Fifty well-chosen cases beat a thousand synthetic ones.
- Grade with the cheapest method that works: exact match and schema validation where possible, then heuristics, then a model judge — and validate the judge against human labels before trusting it.
- Track regressions on every prompt or model change. This is a CI job, not an occasional review.
- Measure cost and latency alongside quality. A 2% quality gain for 4× the cost is a decision, not an improvement.
- Report the distribution, not just the mean. The tail is where the product breaks.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Works in testing, fails on real inputs | Test inputs were clean; real ones are messy, long, multilingual, adversarial |
| Occasional malformed JSON | No schema validation and no retry on parse failure |
| Confident wrong answers in RAG | Retrieval returned nothing relevant and generation filled the gap |
| Quality dropped without a code change | Model version changed, or the prompt is near a context limit and is being truncated |
| Cost far above estimate | No prompt caching, context growing per turn, or retries on a failing path |
| Agent loops | No iteration cap; a tool that always returns "try again" |
| One user sees another's documents | Retrieval index not filtered by permission |
| Injection through a fetched page | Retrieved content treated as instructions rather than data |

## Evidence

1. **Eval set results** before and after, with the same dataset, and cost and latency alongside.
2. **Real outputs, not described outputs.** Paste what the model actually returned for representative inputs, including a hard one.
3. **The retrieved chunks** for a RAG claim. "Improved retrieval" without showing what came back is unverifiable.
4. **Schema validation passing** on adversarial and edge-case inputs, not just the happy path.
5. **A negative test for injection**: content that attempts to redirect the system, and the system refusing to follow it.
