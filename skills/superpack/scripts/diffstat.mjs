#!/usr/bin/env node
// diffstat.mjs — turn the working diff into a risk summary: what changed, what it can break,
// which risk tier the change actually is, and which verification gates it earns.
import { helpAndExit, git, isGitRepo, out, parseArgs, repoRoot } from './lib.mjs';

const HELP = `
diffstat.mjs — risk and blast-radius summary of a diff.

Usage:
  node diffstat.mjs                 # unstaged + staged vs HEAD
  node diffstat.mjs --staged        # staged only
  node diffstat.mjs --base main     # everything since a base ref (branch review)
  node diffstat.mjs --root DIR --compact

Reports: churn per file, touched layers, risk flags (migrations, auth, secrets-adjacent,
infrastructure, dependencies, public API, generated files), the implied risk tier, and the
gates that tier requires.
`;

// Path-shaped risk. Each rule states why it matters, because the reason is the useful part.
const PATH_FLAGS = [
  [/(^|\/)(migrations?|alembic|prisma\/migrations|db\/migrate|liquibase|flyway)\//i,
    'db-migration', 'R3', 'Schema changes are hard to reverse once applied to real data. Needs a tested down-path or a forward-fix plan.'],
  [/\.(tf|tfvars|hcl)$|(^|\/)\.terraform\//i,
    'terraform', 'R2', 'Infrastructure state. Plan output must be read before apply; apply can destroy live resources.'],
  [/(^|\/)(k8s|kubernetes|helm|charts?)\/|(^|\/)Chart\.ya?ml$|(^|\/)values(-\w+)?\.ya?ml$/i,
    'kubernetes', 'R2', 'Cluster workloads. Bad resource limits, probes, or image tags cause rollout failures.'],
  [/(^|\/)(Dockerfile|docker-compose\.ya?ml|\.dockerignore)$/i,
    'container', 'R2', 'Build and runtime image. Affects every environment that pulls it.'],
  [/(^|\/)\.github\/workflows\//i,
    'ci-pipeline', 'R2', 'CI behaviour. Changes here alter the gates that protect every other change.'],
  [/(^|\/)(auth|authn|authz|session|login|signin|oauth|saml|jwt|permission|role|acl|guard|middleware)/i,
    'auth', 'R2', 'Access control. Errors here are privilege escalation, not bugs.'],
  [/(^|\/)(payment|billing|invoice|subscription|checkout|stripe|charge)/i,
    'payments', 'R2', 'Money movement. Needs idempotency and a reconciliation story.'],
  [/(^|\/)(secret|credential|vault|kms|keystore)|\.pem$|\.key$|(^|\/)\.env(\..+)?$/i,
    'secrets-adjacent', 'R3', 'Credential surface. Never commit values; rotation is a separate, explicitly-confirmed action.'],
  [/(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lock.?|requirements\.txt|poetry\.lock|uv\.lock|Cargo\.lock|go\.sum|Gemfile\.lock|composer\.lock)$/i,
    'dependencies', 'R2', 'Supply chain. New or bumped packages bring transitive code and license obligations.'],
  [/(^|\/)(index|public-api|api|exports?|types?|schema|contracts?)\.(ts|tsx|js|py|go|rs)$|\.d\.ts$|\.proto$|(^|\/)openapi\.(ya?ml|json)$|(^|\/)graphql\/|\.graphql$/i,
    'public-api', 'R1', 'Consumer-visible contract. Removing or renaming anything is a breaking change.'],
  [/(^|\/)(config|settings|env|environment)(\.|\/)|\.(ini|toml|properties)$/i,
    'configuration', 'R1', 'Behaviour changes without code changes, and often differs per environment.'],
  [/(^|\/)(terraform\.tfstate|\.next|dist|build|out|coverage|node_modules|__generated__|generated)\//i,
    'generated-or-vendored', 'R0', 'Should usually not be hand-edited or committed. Check whether this belongs in the diff.'],
  [/\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)(tests?|__tests__|spec|e2e)\//i,
    'tests', 'R0', 'Test surface — good. Confirm the tests fail without the fix.'],
  [/(^|\/)(README|CHANGELOG|CONTRIBUTING|docs?)\b|\.mdx?$/i,
    'docs', 'R0', 'Documentation only.'],
];

// Content-shaped risk: things whose presence in added lines changes the tier.
const CONTENT_FLAGS = [
  [/^\+.*\b(DROP\s+(TABLE|COLUMN|DATABASE)|TRUNCATE|DELETE\s+FROM\s+\w+\s*;)/im,
    'destructive-sql', 'R3', 'Destroys data. Requires an explicit confirmation naming the affected table.'],
  [/^\+.*\b(rm\s+-rf|--force|force-push|git\s+push\s+.*-f\b|reset\s+--hard)/im,
    'destructive-command', 'R3', 'Irreversible shell operation.'],
  [/^\+.*(?:eval\(|new\s+Function\(|exec\(|child_process|os\.system|subprocess\.(call|run|Popen))/im,
    'dynamic-execution', 'R2', 'Code execution surface. Check every input that can reach it.'],
  [/^\+.*(?:innerHTML|dangerouslySetInnerHTML|v-html|\|\s*safe\b|Markup\()/im,
    'html-injection-surface', 'R2', 'Unescaped HTML. Needs sanitisation or a trusted-source argument.'],
  [/^\+.*\b(SELECT|INSERT|UPDATE|DELETE)\b[^\n]*(\+\s*\w+|\$\{|%s|f")/im,
    'sql-string-building', 'R2', 'Looks like string-built SQL. Use parameterised queries.'],
  [/^\+.*\b(fetch|axios|requests\.(get|post)|http\.(get|request)|urlopen)\s*\(\s*(?:[^'")\n]*(?:req|request|params|query|body|input|url)\b)/im,
    'ssrf-surface', 'R2', 'Outbound request built from input. Allow-list the destination.'],
  [/^\+.*(?:Access-Control-Allow-Origin['"\s:=]+\*|cors\(\s*\)|origin:\s*['"]\*)/im,
    'permissive-cors', 'R2', 'Wildcard CORS. Confirm the endpoint carries no credentials or private data.'],
  [/^\+.*\b(verify\s*[:=]\s*false|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true|ssl_verify\s*=\s*False)/im,
    'tls-verification-disabled', 'R2', 'Disables certificate checking.'],
  [/^\+.*\b(0\.0\.0\.0\/0|publicly_accessible\s*=\s*true|"Effect":\s*"Allow"[^}]*"Action":\s*"\*")/im,
    'open-network-or-iam', 'R2', 'Wide-open network or IAM grant. Narrow to what is needed.'],
  [/^\+.*\b(process\.env\.\w+\s*\|\|\s*['"][^'"]{8,}|api[_-]?key\s*[:=]\s*['"][^'"]{12,})/im,
    'inline-credential-default', 'R3', 'A literal that looks like a credential fallback.'],
  [/^\+.*\b(TODO|FIXME|HACK|XXX)\b/im, 'todo-added', 'R0', 'Unfinished work left in the diff.'],
  [/^\+.*\b(console\.log|print\(|println!|fmt\.Print|debugger)\b/im, 'debug-output', 'R0', 'Debug output. Intentional or leftover?'],
  [/^\+.*\.(only|skip)\s*\(/im, 'focused-or-skipped-test', 'R1', 'A `.only` or `.skip` will silently narrow the suite in CI.'],
  [/^\+.*@ts-(ignore|expect-error|nocheck)|^\+.*# type:\s*ignore|^\+.*eslint-disable/im,
    'suppression-added', 'R1', 'A check was silenced rather than satisfied. State why.'],
];

const LAYER = [
  [/(^|\/)(components?|ui|views?|pages?|app)\//i, 'frontend'],
  [/(^|\/)(api|routes?|controllers?|handlers?|server|services?|resolvers?)\//i, 'backend'],
  [/(^|\/)(models?|entities|schema|db|database|repositories)\//i, 'data-model'],
  [/(^|\/)(lib|utils?|helpers?|shared|common|core)\//i, 'shared'],
  [/(^|\/)(infra|infrastructure|deploy|ops|terraform|k8s|charts?)\//i, 'infrastructure'],
  [/(^|\/)(scripts?|tools?|bin)\//i, 'tooling'],
  [/(^|\/)(prompts?|agents?|chains?|rag)\//i, 'ai'],
];

function parseNumstat(text) {
  const files = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!m) continue;
    const [, addRaw, delRaw, pathRaw] = m;
    // Rename form: "old => new" or "dir/{old => new}/rest"
    let path = pathRaw;
    if (path.includes('=>')) {
      path = path.replace(/\{([^{}]*) => ([^{}]*)\}/, '$2').replace(/^.*\s=>\s/, '').trim();
    }
    files.push({
      path,
      added: addRaw === '-' ? null : Number(addRaw),
      deleted: delRaw === '-' ? null : Number(delRaw),
      binary: addRaw === '-',
      renamed: pathRaw.includes('=>'),
    });
  }
  return files;
}

const TIERS = ['R0', 'R1', 'R2', 'R3'];
const GATES = {
  R0: ['verify the change itself'],
  R1: ['verify', 'blast-radius check on every consumer of the changed surface'],
  R2: ['verify', 'blast radius', 'security pass (securing-changes)', 'dimension review (reviewing-before-done)', 'written rollback plan'],
  R3: ['everything R2 requires', 'state exactly what is destroyed or mutated', 'explicit user confirmation of this specific action before executing'],
};

function main() {
  const { flags } = parseArgs(process.argv.slice(2), { booleans: ['staged'] });
  if (flags.help || flags.h) helpAndExit(HELP);
  const root = typeof flags.root === 'string' ? flags.root : repoRoot();

  if (!isGitRepo(root)) {
    out({ error: 'not a git repository', note: 'Risk must be assessed by reading the changes directly.' });
    process.exit(0);
  }

  const range = typeof flags.base === 'string' ? [`${flags.base}...HEAD`] : flags.staged ? ['--cached'] : ['HEAD'];
  const numstat = git(['diff', ...range, '--numstat', '--find-renames'], root);
  const patch = git(['diff', ...range, '--unified=0', '--find-renames'], root);
  const untracked = flags.base || flags.staged
    ? { stdout: '' }
    : git(['ls-files', '--others', '--exclude-standard'], root);

  const files = parseNumstat(numstat.stdout);
  const untrackedFiles = untracked.stdout.split(/\r?\n/).filter(Boolean);

  const allPaths = [...files.map((f) => f.path), ...untrackedFiles];
  if (!allPaths.length) {
    out({ scope: range.join(' '), files: 0, verdict: 'no changes' });
    return;
  }

  const flagged = new Map();
  const addFlag = (name, tier, why, where) => {
    const cur = flagged.get(name) || { flag: name, tier, why, paths: [] };
    if (where && cur.paths.length < 6 && !cur.paths.includes(where)) cur.paths.push(where);
    flagged.set(name, cur);
  };

  for (const p of allPaths) {
    for (const [re, name, tier, why] of PATH_FLAGS) if (re.test(p)) addFlag(name, tier, why, p);
  }
  // Content rules run per-file hunk so the reported path is useful.
  const perFile = patch.stdout.split(/^diff --git /m).slice(1);
  for (const chunk of perFile) {
    const path = (chunk.match(/^a\/(.+?) b\//) || [])[1] || (chunk.match(/^\+\+\+ b\/(.+)$/m) || [])[1] || '?';
    const added = chunk.split(/\r?\n/).filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
    for (const [re, name, tier, why] of CONTENT_FLAGS) if (re.test(added)) addFlag(name, tier, why, path);
  }

  const layers = [...new Set(allPaths.flatMap((p) => LAYER.filter(([re]) => re.test(p)).map(([, l]) => l)))];
  const realFlags = [...flagged.values()].filter((f) => !['docs', 'tests'].includes(f.flag));
  const tier = realFlags.reduce((max, f) => (TIERS.indexOf(f.tier) > TIERS.indexOf(max) ? f.tier : max), 'R0');

  const churn = files
    .map((f) => ({ ...f, total: (f.added || 0) + (f.deleted || 0) }))
    .sort((a, b) => b.total - a.total);
  const totalAdded = files.reduce((s, f) => s + (f.added || 0), 0);
  const totalDeleted = files.reduce((s, f) => s + (f.deleted || 0), 0);

  out({
    scope: typeof flags.base === 'string' ? `${flags.base}...HEAD` : flags.staged ? 'staged' : 'working tree vs HEAD',
    files: allPaths.length,
    lines: { added: totalAdded, deleted: totalDeleted },
    largest: churn.slice(0, 10).map((f) => `${f.path} (+${f.added ?? '?'}/-${f.deleted ?? '?'}${f.renamed ? ', renamed' : ''}${f.binary ? ', binary' : ''})`),
    untracked: untrackedFiles.slice(0, 15),
    layers,
    risk_flags: [...flagged.values()],
    implied_risk_tier: tier,
    required_gates: GATES[tier],
    scope_hint: allPaths.length <= 1 ? 'S0-S1' : allPaths.length <= 5 ? 'S1-S2' : allPaths.length <= 20 ? 'S2' : 'S2-S3',
    note: 'Flags are heuristics over paths and added lines. They tell you where to look; they do not decide whether the code is correct.',
  }, { pretty: !flags.compact });
}

main();
