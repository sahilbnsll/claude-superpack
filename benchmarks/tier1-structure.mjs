#!/usr/bin/env node
// Tier 1 — structure. Deterministic checks that the pack is well-formed and stays
// within its context budget. Runs in CI; no model involved.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'skills');

// Budgets. These are the constraints that keep the pack cheap; breaking one is a failure,
// not a warning, because context cost is paid on every turn of every session.
const BUDGET = {
  descriptionChars: 500,        // per skill; the always-on cost
  totalDescriptionChars: 3500,  // whole pack, always-on
  skillBodyLines: 500,          // Claude Code's documented recommendation
  referenceLines: 260,          // on-demand, but still one read
};

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      fm[key] = kv[2];
    } else if (key && /^\s+\S/.test(line)) {
      fm[key] += ` ${line.trim()}`;
    }
  }
  return fm;
}

const skillDirs = existsSync(SKILLS)
  ? readdirSync(SKILLS).filter((d) => statSync(join(SKILLS, d)).isDirectory())
  : [];

check('skills directory exists', skillDirs.length > 0, `${skillDirs.length} skills`);

const skills = [];
for (const d of skillDirs) {
  const p = join(SKILLS, d, 'SKILL.md');
  if (!existsSync(p)) {
    check(`${d}: has SKILL.md`, false);
    continue;
  }
  const text = readFileSync(p, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) {
    check(`${d}: valid frontmatter`, false);
    continue;
  }
  skills.push({ dir: d, fm, text, path: p, lines: text.split(/\r?\n/).length });
}

// --- Required fields and naming ---------------------------------------------------
for (const s of skills) {
  check(`${s.dir}: name matches directory`, s.fm.name === s.dir, `name=${s.fm.name}`);
  check(`${s.dir}: has description`, Boolean(s.fm.description));
  check(`${s.dir}: name is lowercase-hyphenated`, /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.fm.name || ''));
  check(`${s.dir}: declares version`, Boolean(s.fm.version));
  check(`${s.dir}: declares license`, Boolean(s.fm.license));
}

// --- Description discipline -------------------------------------------------------
// A description that summarises the workflow gives the model a shortcut it will take
// instead of reading the body. Descriptions must state triggering conditions only.
const WORKFLOW_SUMMARY = /\bIt (generates|identifies|maintains|scans|builds|manages|runs|creates|analyzes|analyses|tracks|searches|validates|replaces|asks|classifies|distills|observes|maps|checks|produces|writes|applies|routes|spawns|merges)\b/;
const FIRST_PERSON = /\b(I |I'll|I can|my )\b/;

for (const s of skills) {
  const d = s.fm.description || '';
  check(`${s.dir}: description <= ${BUDGET.descriptionChars} chars`, d.length <= BUDGET.descriptionChars, `${d.length} chars`);
  check(`${s.dir}: description states triggers, not workflow`, !WORKFLOW_SUMMARY.test(d));
  check(`${s.dir}: description is third person`, !FIRST_PERSON.test(d));
  check(`${s.dir}: description starts with a trigger phrase`, /^Use (when|before|after)\b/i.test(d.trim()), d.slice(0, 40));
}

const totalDesc = skills.reduce((n, s) => n + (s.fm.name?.length || 0) + (s.fm.description?.length || 0) + 8, 0);
check(
  `always-on footprint <= ${BUDGET.totalDescriptionChars} chars`,
  totalDesc <= BUDGET.totalDescriptionChars,
  `${totalDesc} chars ≈ ${Math.round(totalDesc / 3.8)} tokens per turn`,
);

// --- Size budgets -----------------------------------------------------------------
for (const s of skills) {
  check(`${s.dir}: body <= ${BUDGET.skillBodyLines} lines`, s.lines <= BUDGET.skillBodyLines, `${s.lines} lines`);
}

// --- Link integrity ---------------------------------------------------------------
// Every relative markdown link must resolve, and no link may use @-syntax, which
// force-loads the target and burns context before it is needed.
let brokenLinks = [];
let atLinks = [];
function checkLinks(file, text) {
  for (const m of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|#|mailto:)/.test(target)) continue;
    const resolved = resolve(dirname(file), target.split('#')[0]);
    if (!existsSync(resolved)) brokenLinks.push(`${file.replace(ROOT, '.')} -> ${target}`);
  }
  for (const m of text.matchAll(/(^|\s)@(skills|references)\//g)) atLinks.push(file.replace(ROOT, '.'));
}
for (const s of skills) checkLinks(s.path, s.text);

const refDir = join(SKILLS, 'superpack', 'references');
const refs = existsSync(refDir) ? readdirSync(refDir).filter((f) => f.endsWith('.md')) : [];
check('reference library exists', refs.length > 0, `${refs.length} references`);
for (const r of refs) {
  const p = join(refDir, r);
  const text = readFileSync(p, 'utf8');
  const lines = text.split(/\r?\n/).length;
  checkLinks(p, text);
  check(`references/${r}: <= ${BUDGET.referenceLines} lines`, lines <= BUDGET.referenceLines, `${lines} lines`);
  check(`references/${r}: has an Evidence section`, /^##+\s+Evidence/m.test(text) || r === 'routing.md');
}
check('all relative links resolve', brokenLinks.length === 0, brokenLinks.join('; '));
check('no @-prefixed force-loading links', atLinks.length === 0, [...new Set(atLinks)].join('; '));

// --- Scripts ----------------------------------------------------------------------
const scriptDir = join(SKILLS, 'superpack', 'scripts');
const scripts = existsSync(scriptDir) ? readdirSync(scriptDir).filter((f) => f.endsWith('.mjs')) : [];
check('scripts present', scripts.length >= 4, scripts.join(', '));
for (const f of scripts) {
  const text = readFileSync(join(scriptDir, f), 'utf8');
  if (f === 'lib.mjs') continue;
  check(`scripts/${f}: supports --help`, /--help|helpAndExit/.test(text));
  check(`scripts/${f}: zero third-party imports`, !/from '(?!node:|\.)/.test(text));
}

// --- Cross-references name real skills --------------------------------------------
const names = new Set(skills.map((s) => s.fm.name));
const referencedSkills = new Set();
for (const s of skills) {
  for (const m of s.text.matchAll(/`([a-z][a-z0-9-]{4,})`/g)) {
    if (m[1].includes('-') && !m[1].endsWith('.md') && !m[1].endsWith('.mjs')) referencedSkills.add(m[1]);
  }
}
const KNOWN_EXTERNAL = new Set([
  'code-review', 'security-review', 'frontend-design', 'webapp-testing', 'claude-mem',
  'dispatching-parallel-agents', 'using-git-worktrees', 'prefers-reduced-motion',
  'font-display', 'aria-describedby', 'aria-labelledby', 'aria-invalid', 'text-overflow',
  'focus-visible', 'find-renames', 'keep-going', 'no-git', 'test-driven-development',
  // External tool names the pack deliberately mentions.
  'pip-audit', 'cargo-audit', 'npm-audit', 'golangci-lint', 'testing-library',
]);
const unknown = [...referencedSkills].filter((n) => !names.has(n) && !KNOWN_EXTERNAL.has(n));
check('skill cross-references resolve', unknown.length === 0, unknown.join(', '));

// --- Activation model -------------------------------------------------------------
// Every skill declares how it is reached. Content-activated skills are triggered by the
// user's own words and are measured in tier 2. Phase-activated skills are reached from
// the core skill's gate table, so that table must actually name them — otherwise they
// are unreachable in practice, which no amount of good writing fixes.
const core = skills.find((s) => s.dir === 'superpack');
for (const s of skills) {
  const act = (s.text.match(/^\s*activation:\s*(\w+)/m) || [])[1];
  check(`${s.dir}: declares an activation model`, act === 'content' || act === 'phase', act || 'missing');
  if (act === 'phase' && s.dir !== 'superpack' && core) {
    check(`${s.dir}: reachable from the core gate table`, core.text.includes(`\`${s.dir}\``));
  }
}

// --- Report -----------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
const out = {
  tier: 1,
  name: 'structure',
  checks: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  always_on_chars: totalDesc,
  always_on_tokens_estimate: Math.round(totalDesc / 3.8),
  skills: skills.length,
  references: refs.length,
  scripts: scripts.length,
  failures: failed.map((f) => `${f.name}${f.detail ? ` — ${f.detail}` : ''}`),
};

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
} else {
  process.stdout.write(`Tier 1 — structure: ${out.passed}/${out.checks} checks passed\n`);
  process.stdout.write(`  ${out.skills} skills, ${out.references} references, ${out.scripts} scripts\n`);
  process.stdout.write(`  always-on footprint: ${out.always_on_chars} chars ≈ ${out.always_on_tokens_estimate} tokens/turn\n`);
  for (const f of out.failures) process.stdout.write(`  FAIL ${f}\n`);
}
process.exit(failed.length ? 1 : 0);
