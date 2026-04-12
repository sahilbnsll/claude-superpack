---
name: security-scanner
description: This skill should be used before committing code, when the user asks "is this secure?", "check for vulnerabilities", "scan for secrets", or when pre-flight runs security validation. It scans for hardcoded secrets, injection vulnerabilities, OWASP top 10 risks, and insecure patterns — all using Grep/Read with zero external dependencies.
version: 4.0.0
---

# Security Scanner

Scan code for secrets, injection risks, and insecure patterns. Zero dependencies — just Grep and Read.

## Why This Exists

Security issues are the most expensive bugs. A leaked API key costs more than a month of development time. An SQL injection in production can compromise an entire database. This skill catches the most common security mistakes before they reach a commit.

## When to Activate

- Before committing code (especially new files or config changes)
- When the user asks about security, vulnerabilities, or secrets
- During pre-flight checks for orchestrated execution
- When post-review validates merged changes
- When reviewing code changes that touch auth, database, API, or user input

## Scan Categories

### 1. Secret Detection

Grep for patterns that indicate hardcoded secrets:

| Pattern | What It Catches |
|---|---|
| `(?i)(api[_-]?key\|secret[_-]?key\|access[_-]?token)\s*[:=]\s*['"][A-Za-z0-9+/=]{16,}` | API keys, secret keys, access tokens |
| `(?i)(password\|passwd\|pwd)\s*[:=]\s*['"][^'"]{4,}` | Hardcoded passwords |
| `AKIA[0-9A-Z]{16}` | AWS Access Key IDs |
| `(?i)(sk-[a-zA-Z0-9]{20,}\|sk_live_[a-zA-Z0-9]{24,})` | OpenAI / Stripe secret keys |
| `ghp_[a-zA-Z0-9]{36}` | GitHub personal access tokens |
| `(?i)bearer\s+[a-zA-Z0-9\-._~+/]+=*` | Bearer tokens in code |
| `-----BEGIN (RSA\|DSA\|EC\|OPENSSH) PRIVATE KEY-----` | Private keys |
| `mongodb(\+srv)?://[^/\s]+:[^/\s]+@` | Database connection strings with credentials |

**Exclusions:**
- `.env.example` files (template values)
- Test files with obviously fake values (`test-key-123`, `password123`)
- Comments explaining what a key looks like

### 2. Injection Vulnerabilities

**SQL Injection:**
```
# String concatenation in queries
(?i)(query|execute|raw)\s*\(\s*[`'"].*\$\{|.*\+\s*\w+
# Missing parameterized queries
(?i)(?:SELECT|INSERT|UPDATE|DELETE).*['"].*\+
```

**Command Injection:**
```
# User input in shell commands
(?i)(exec|spawn|system|popen|subprocess)\s*\(.*\$\{|.*\+\s*\w+
# eval with dynamic input
(?i)eval\s*\((?!['"].*['"]\))
```

**XSS (Cross-Site Scripting):**
```
# dangerouslySetInnerHTML with dynamic content
dangerouslySetInnerHTML.*\$\{
# innerHTML assignment
\.innerHTML\s*=(?!.*sanitize|.*escape|.*DOMPurify)
# Unescaped template rendering
\{\{[^}]*\}\}.*\|(?!.*escape|.*safe)
```

**Path Traversal:**
```
# User input in file paths without validation
(?i)(readFile|writeFile|createReadStream|open)\s*\(.*\$\{|.*\+\s*(req|params|query|body)
```

### 3. OWASP Top 10 Patterns

| Risk | What to Check |
|---|---|
| Broken Authentication | Weak password validation, missing rate limiting, session fixation |
| Sensitive Data Exposure | Logging sensitive data, unencrypted storage, missing HTTPS enforcement |
| Security Misconfiguration | CORS `*`, debug mode in production, default credentials |
| Insecure Deserialization | `JSON.parse` on untrusted input without validation, `pickle.loads` |
| Insufficient Logging | Auth events without logging, failed login attempts not tracked |

### 4. Dependency Security

Cross-reference with dep-analyzer:
- Check if known-vulnerable packages are imported in changed files
- Flag `npm install` with `--ignore-scripts` disabled for untrusted packages

## Scan Process

### Step 1: Scope

Determine what to scan:
- **Pre-commit**: `git diff --cached --name-only` (staged files only)
- **Full scan**: all tracked source files via `git ls-files`
- **Targeted**: specific files mentioned in the request

### Step 2: Filter

Skip files that don't need security scanning:
- Binary files, images, fonts
- Lockfiles (package-lock.json, yarn.lock)
- Generated code (dist/, build/, .next/)
- Vendor code (node_modules/, vendor/)

### Step 3: Scan

Run Grep patterns against each file category:
- All files: secret detection
- Source files: injection patterns
- Config files: misconfiguration patterns
- Changed files: focused OWASP checks

### Step 4: Report

```
## Security Scan Results

Scanned: 12 files (staged changes)

### Critical (1)
- **Hardcoded API key** in src/lib/api.ts:23
  Pattern: `const API_KEY = "sk-proj-abc123..."` 
  Fix: Move to environment variable. Use `process.env.API_KEY`

### High (1)
- **SQL injection risk** in src/routes/users.ts:45
  Pattern: `db.query("SELECT * FROM users WHERE id = " + req.params.id)`
  Fix: Use parameterized query: `db.query("SELECT * FROM users WHERE id = $1", [req.params.id])`

### Medium (2)
- **CORS wildcard** in src/server.ts:12
  Pattern: `cors({ origin: '*' })`
  Fix: Restrict to specific origins

- **Missing rate limiting** on /api/auth/login
  No rate limiter detected on auth endpoint
  Fix: Add rate limiting middleware

### Low (0)

### Clean (8 files)
No issues found in remaining files.

Summary: 1 critical, 1 high, 2 medium — block commit until critical/high resolved.
```

## Severity Levels

| Level | Action | Examples |
|---|---|---|
| Critical | Block commit | Hardcoded secrets, private keys |
| High | Block commit | SQL injection, command injection, XSS |
| Medium | Warn, don't block | CORS misconfiguration, missing rate limiting |
| Low | Informational | Missing security headers, verbose error messages |

## Integration

- **pre-flight**: security scan is part of environment validation
- **post-review**: scan merged changes for introduced vulnerabilities
- **error-catalog**: security fixes are cataloged for future reference
- **graph-reviewer**: blast-radius analysis considers security-critical paths
- **dep-analyzer**: cross-reference vulnerable dependencies with import usage

## Rules

1. **Zero false positives on secrets.** If in doubt, flag it — a false positive costs 5 seconds, a leaked key costs days.
2. **Don't scan test fixtures.** Files named `*.fixture.*`, `*.mock.*`, or in `__mocks__/` get lighter scanning.
3. **Present severity clearly.** Critical and high issues go at the top with specific line numbers and fixes.
4. **Never print the actual secret.** Truncate to first 8 characters + `...` in the report.
5. **Scan is advisory, not blocking.** The user decides whether to proceed — but always recommend blocking on critical/high.
6. **No external tools required.** Everything runs with Grep and Read. No `semgrep`, `snyk`, or `trivy` needed.
