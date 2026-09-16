# Security

Threat modeling, secure defaults, and the vulnerability classes that actually appear.

**Division of labour:** if `/security-review` is available, it audits a branch diff in depth — use it for that. This file is for the decisions made *while* building, and for the fast scan you run before anything leaves your machine.

## Threat model in four questions

Answer these before designing anything that handles identity, money, or user data. Four sentences is a sufficient threat model for most features; the failure is skipping it entirely.

1. **What are we protecting?** Name the data and the operations. "Users' resumes and the ability to bill them."
2. **Who is the adversary?** An anonymous internet scanner, a logged-in user reaching for another tenant, an insider, a compromised dependency. Each implies different controls.
3. **Where is the trust boundary?** Every point where data crosses from less-trusted to more-trusted is a validation point: the network edge, the browser/server line, the tenant line, the queue, a third-party callback.
4. **What is the worst single failure?** If one control fails, what is the blast radius? If the answer is "everything", add a second layer.

## OWASP Top 10:2025 — what to check, in the current ordering

| | Category | The check that matters |
|---|---|---|
| A01 | Broken Access Control | Object-level authorization on every read and write. Can user A pass user B's id and get a 200? SSRF now lives here: does any URL the server fetches come from user input? |
| A02 | Security Misconfiguration | Default credentials, debug mode in production, permissive CORS, directory listing, verbose errors, missing security headers, unauthenticated admin surfaces. |
| A03 | Software Supply Chain Failures | Where do dependencies, build tooling, CI actions, and base images come from? Are they pinned? Is the lockfile committed and reviewed? Does CI run with more privilege than it needs? |
| A04 | Cryptographic Failures | TLS everywhere including internal hops. No home-made crypto. Password hashing with argon2id/bcrypt. Secrets never in code, logs, URLs, or error messages. |
| A05 | Injection | Parameterised queries; no shell string concatenation; contextual output encoding for HTML/JS/URL/CSS; no `eval` on untrusted input. Includes template, LDAP, NoSQL, and prompt injection. |
| A06 | Insecure Design | The flaw is in the flow, not the code: password reset that leaks account existence, a checkout that trusts a client-supplied price, no rate limit on an expensive operation. |
| A07 | Authentication Failures | Credential stuffing protection, MFA where it matters, session rotation on privilege change, secure recovery flows, no user enumeration via timing or message differences. |
| A08 | Software or Data Integrity Failures | Unsigned updates, deserialising untrusted data, CI that runs unreviewed code with production credentials. |
| A09 | Logging & Alerting Failures | Are auth failures, access-control denials, and admin actions logged with enough context to investigate — and does anything alert? Are secrets and PII kept *out* of those logs? |
| A10 | Mishandling of Exceptional Conditions | Errors swallowed, fail-open defaults, partial failures left inconsistent, error paths that skip the authorization check. A `catch {}` that hides a denied permission is this category. |

## Secure defaults

- Deny by default. New endpoints, new routes, new queue consumers, new cloud resources start closed and get opened deliberately.
- Least privilege for everything with an identity: service accounts, CI tokens, database users, IAM roles. A token that can do anything is the same as no token.
- Secrets live in the environment or a secret manager, are injected at runtime, and are never logged. `.env` files belong in `.gitignore` and never in the image.
- Validate on the server even when the client already validated. Client validation is a usability feature.
- Set the standard headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- Rate-limit anything expensive or abusable: login, password reset, search, file upload, export, LLM calls, outbound email.
- Time-box and scope every credential. Prefer short-lived tokens over long-lived keys wherever the platform supports it.

## Specific traps

- **SSRF** — the server fetching a URL derived from user input. An allow-list of hosts is the only reliable control; blocklists lose to redirects, DNS rebinding, and IPv6 forms of `169.254.169.254`.
- **XSS** — rendering unescaped user content. `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, and template `|safe` filters are the places to look. Sanitise with a maintained library, never a regex.
- **CSRF** — state-changing requests authenticated only by a cookie. `SameSite=Lax` covers most of it; token-based protection covers the rest. Not an issue for `Authorization`-header APIs.
- **Path traversal** — any filename derived from input. Resolve, then assert the result is inside the intended directory. `..` filtering alone loses to encoding.
- **Mass assignment** — binding a request body straight onto a model, letting a caller set `isAdmin`. Allow-list the writable fields.
- **Insecure deserialisation** — `pickle`, Java serialisation, and YAML `load` on untrusted input execute code. Use JSON, or a safe loader.
- **Timing and enumeration** — "user not found" versus "wrong password" tells an attacker which accounts exist. Same message, same timing.
- **Prompt injection** — content retrieved from the web, files, or other users' data is *data*, never instructions. An LLM with tool access plus untrusted input plus privileged capability is the dangerous combination; break one leg of it. See `ai-llm.md`.

## Supply chain

- Pin versions and commit the lockfile. Review what a dependency bump actually pulls in.
- Prefer fewer dependencies. Each one is code you ship without reading, plus its transitive set.
- New dependency checklist: is it maintained, how many transitive packages, what licence, does it need network or filesystem access at install time, is the name a typo of something popular.
- CI is production: it holds credentials and can publish artifacts. Pin actions to a commit SHA, restrict what secrets each job sees, and never run untrusted pull-request code with write-scoped tokens.

## Evidence

1. `node scripts/secrets.mjs` on the diff — clean, or every finding explained.
2. `node scripts/diffstat.mjs` — read the risk flags and address each, or say why it does not apply.
3. The dependency audit the ecosystem provides (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`) with its output, for any dependency change.
4. **A negative test.** The strongest evidence for an access-control fix is a test where the wrong user gets refused. Write it as a test, not a manual check, so it holds.
5. `/security-review` for R2+ changes when it is available.

Never claim a change is secure because you thought about security. Name the class you addressed and show the check.
