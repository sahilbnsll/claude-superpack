#!/usr/bin/env node
// footprint.mjs — measure the context cost of the pack.
//
// Two numbers matter and they behave differently:
//   always-on  — every skill's name + description is in the prompt on every turn of every
//                session, whether or not the skill is used. This is the tax.
//   on-demand  — a skill body or reference is paid only when it is actually read.
//
// Compares against any git ref, so the effect of a change is measurable rather than claimed.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Characters per token for English prose with markdown. Deliberately conservative:
// the comparison between versions is what matters, and both sides use the same divisor.
const CHARS_PER_TOKEN = 3.8;
const tok = (chars) => Math.round(chars / CHARS_PER_TOKEN);

function frontmatterOf(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; out[key] = kv[2]; } else if (key && /^\s+\S/.test(line)) out[key] += ` ${line.trim()}`;
  }
  return out;
}

function measureWorkingTree() {
  const dir = join(ROOT, 'skills');
  const skills = readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory());
  let alwaysOn = 0;
  let bodies = 0;
  const per = [];
  for (const s of skills) {
    const p = join(dir, s, 'SKILL.md');
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    const fm = frontmatterOf(text);
    const a = (fm.name || s).length + (fm.description || '').length + 8;
    alwaysOn += a;
    bodies += text.length;
    per.push({ skill: s, always_on_chars: a, body_chars: text.length });
  }
  let refs = 0;
  let refCount = 0;
  const refDir = join(dir, 'superpack', 'references');
  if (existsSync(refDir)) {
    for (const f of readdirSync(refDir).filter((x) => x.endsWith('.md'))) {
      refs += readFileSync(join(refDir, f), 'utf8').length;
      refCount++;
    }
  }
  return { skills: per.length, alwaysOn, bodies, refs, refCount, per };
}

function measureRef(ref) {
  const at = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 });
  let files;
  try {
    files = at(['ls-tree', '-r', '--name-only', ref, 'skills/']).split('\n').filter((f) => f.endsWith('SKILL.md'));
  } catch {
    return null;
  }
  let alwaysOn = 0;
  let bodies = 0;
  for (const f of files) {
    const text = at(['show', `${ref}:${f}`]);
    const fm = frontmatterOf(text);
    alwaysOn += (fm.name || '').length + (fm.description || '').length + 8;
    bodies += text.length;
  }
  return { skills: files.length, alwaysOn, bodies, refs: 0, refCount: 0 };
}

const compareRef = process.argv.find((a) => a.startsWith('--compare='))?.split('=')[1];
const now = measureWorkingTree();
const before = compareRef ? measureRef(compareRef) : null;

const report = {
  current: {
    skills: now.skills,
    always_on_chars: now.alwaysOn,
    always_on_tokens: tok(now.alwaysOn),
    skill_bodies_chars: now.bodies,
    skill_bodies_tokens_if_all_loaded: tok(now.bodies),
    references: now.refCount,
    reference_chars: now.refs,
    typical_task_load_tokens: tok(now.alwaysOn + (now.bodies / Math.max(now.skills, 1)) * 2 + (now.refs / Math.max(now.refCount, 1)) * 1.3),
  },
  heaviest_always_on: now.per.sort((a, b) => b.always_on_chars - a.always_on_chars).slice(0, 3)
    .map((p) => `${p.skill}: ${p.always_on_chars} chars`),
};

if (before) {
  report.baseline = {
    ref: compareRef,
    skills: before.skills,
    always_on_chars: before.alwaysOn,
    always_on_tokens: tok(before.alwaysOn),
    skill_bodies_chars: before.bodies,
  };
  const d = (a, b) => (b === 0 ? null : +(((a - b) / b) * 100).toFixed(1));
  report.delta = {
    skills: `${before.skills} → ${now.skills}`,
    always_on_tokens: `${tok(before.alwaysOn)} → ${tok(now.alwaysOn)}`,
    always_on_change_pct: d(now.alwaysOn, before.alwaysOn),
    note: 'Negative percentages are reductions in per-turn cost.',
  };
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write('Context footprint\n');
  process.stdout.write(`  current: ${report.current.skills} skills, always-on ${report.current.always_on_chars} chars ≈ ${report.current.always_on_tokens} tokens/turn\n`);
  process.stdout.write(`  ${report.current.references} references, ${report.current.reference_chars} chars, loaded only on demand\n`);
  if (before) {
    process.stdout.write(`  baseline ${compareRef}: ${before.skills} skills, ${tok(before.alwaysOn)} tokens/turn\n`);
    process.stdout.write(`  change: ${report.delta.always_on_change_pct}% always-on\n`);
  }
}
