#!/usr/bin/env node
// Tier 2 — routing vocabulary. Given only the words a user actually types, would the
// routing table and the skill descriptions point at the right domain knowledge?
//
// This is a coverage test over vocabulary, not a test of model behaviour. It cannot
// prove Claude will route correctly; it proves the routing signals contain the language
// real requests are phrased in. A miss here is a guaranteed miss in practice; a hit here
// is a necessary, not sufficient, condition for correct routing.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'skills');
const TASKS = join(ROOT, 'benchmarks', 'tasks');

const STOP = new Set(('a an and are as at be by for from has have in into is it its of on or that the to with '
  + 'this these those we you your our their they them then than but not no do does did can could should would '
  + 'will was were been being about after before when where which who what how why all any some more most other '
  + 'such only own same so too very just also each both few many much').split(' '));

// Paths and dotted names are split, so `/api/documents` yields `api` and `documents`
// rather than one token that matches nothing. Hyphens are kept, so package names like
// `aws-cdk-lib` stay whole instead of donating a meaningless `lib` to the cloud domain.
const tokenize = (s) => (s.toLowerCase().split(/[^a-z0-9+-]+/) || [])
  .map((w) => w.replace(/^-+|-+$/g, ''))
  .filter((w) => w.length > 2 && !STOP.has(w) && /^[a-z]/.test(w));

/**
 * Crude stem so "fails/failing/failed" and "migration/migrations" collapse.
 * Undoes consonant doubling first, or "committing" stems to "committ" and never
 * matches "commit".
 */
const stem = (w) => w
  .replace(/(ications?|ations?)$/, 'at')
  .replace(/([^aeiou])\1(ing|ed)$/, '$1')
  .replace(/(ing|ed|es|s)$/, '')
  .replace(/i$/, 'y');

const stemSet = (words) => new Set(words.map(stem));

// ---- Load routing signals from the reference, not from a duplicate table -----------
function loadRoutingSignals() {
  const text = readFileSync(join(SKILLS, 'superpack', 'references', 'routing.md'), 'utf8');
  const signals = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*`([a-z-]+)\.md`\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const domain = m[1];
    const cells = m[2].split('|').map((c) => c.trim());
    // All three signal columns count: a task may be identified by stack, path, or wording.
    signals.set(domain, stemSet(tokenize(cells.join(' ').replace(/[`*]/g, ''))));
  }
  return signals;
}

// ---- Load skill triggers from the descriptions, which is what the model sees --------
function loadSkillTriggers() {
  const out = new Map();
  for (const d of readdirSync(SKILLS).filter((x) => statSync(join(SKILLS, x)).isDirectory())) {
    const p = join(SKILLS, d, 'SKILL.md');
    if (!existsSync(p)) continue;
    const fm = readFileSync(p, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const desc = (fm[1].match(/^description:\s*([\s\S]*?)(?=\n[a-z_-]+:|$)/m) || [])[1] || '';
    const activation = (fm[1].match(/^\s*activation:\s*(\w+)/m) || [])[1] || 'phase';
    out.set(d, { stems: stemSet(tokenize(desc)), activation });
  }
  return out;
}

function loadTasks() {
  return readdirSync(TASKS).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const text = readFileSync(join(TASKS, f), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    const get = (k) => (fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm')) || [])[1]?.trim() || '';
    const list = (k) => get(k).replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    const prompt = (text.match(/# Prompt\r?\n([\s\S]*?)(?=\r?\n# )/) || [])[1]?.trim() || '';
    return {
      file: f,
      id: get('id'),
      scope: get('scope'),
      risk: get('risk'),
      expectRefs: list('expect_references'),
      expectSkills: list('expect_skills'),
      prompt,
    };
  });
}

/**
 * Inverse document frequency over a corpus of signal sets. A term appearing in many
 * domains ("lib", "service", "user") carries almost no routing information and must not
 * outvote a term appearing in one ("hallucinating", "terraform", "flaky").
 */
function buildIdf(sets) {
  const df = new Map();
  for (const s of sets) for (const w of s) df.set(w, (df.get(w) || 0) + 1);
  const n = sets.length;
  return (w) => {
    const d = df.get(w);
    return d ? Math.log(n / d) : 0;
  };
}

function score(promptStems, signalSet, idf) {
  let total = 0;
  for (const w of promptStems) if (signalSet.has(w)) total += idf(w);
  return +total.toFixed(3);
}

const routing = loadRoutingSignals();
const triggers = loadSkillTriggers();
const tasks = loadTasks();

// Two activation models, and only one of them is a word-matching problem.
//
//   content — the user's own words signal the mode: "it crashes", "deploy this",
//             "there's a secret in here". These must be reachable from the prompt.
//   phase   — invoked by the core skill's gate table once scope and risk are known.
//             No prompt vocabulary can or should trigger them, so scoring them against
//             prompt text would measure nothing. Tier 1 checks they are reachable from
//             the gate table instead.
const contentSkills = new Map([...triggers.entries()].filter(([, v]) => v.activation === 'content'));
const phaseSkills = new Set([...triggers.entries()].filter(([, v]) => v.activation === 'phase').map(([k]) => k));

const refIdf = buildIdf([...routing.values()]);
const skillIdf = buildIdf([...contentSkills.values()].map((v) => v.stems));

// Selection rule: take the top scorer plus anything within 40% of it, capped at three.
// Mirrors the real decision — one primary domain, at most two secondaries.
function select(scores, cap = 3) {
  const ranked = scores.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  if (!ranked.length) return [];
  const cut = ranked[0].score * 0.6;
  return ranked.filter((r) => r.score >= cut).slice(0, cap).map((r) => r.key);
}

const rows = [];
for (const t of tasks) {
  const stems = new Set([...stemSet(tokenize(t.prompt))]);

  const selectedRefs = select([...routing.entries()].map(([d, sig]) => ({ key: d, score: score(stems, sig, refIdf) })));
  const selectedSkills = select([...contentSkills.entries()]
    .map(([n, v]) => ({ key: n, score: score(stems, v.stems, skillIdf) })), 2);

  const expRefs = t.expectRefs.filter((r) => routing.has(r) || r === 'parallel');
  const expSkills = t.expectSkills.filter((s) => !phaseSkills.has(s));

  const refHit = expRefs.length === 0
    ? selectedRefs.length === 0 ? 'n/a-correct' : 'n/a-overselected'
    : expRefs.some((r) => selectedRefs.includes(r)) ? 'hit' : 'miss';
  const skillHit = expSkills.length === 0
    ? 'n/a'
    : expSkills.some((s) => selectedSkills.includes(s)) ? 'hit' : 'miss';

  rows.push({
    id: t.id,
    scope: t.scope,
    risk: t.risk,
    expected_references: expRefs,
    selected_references: selectedRefs,
    reference_result: refHit,
    expected_skills: expSkills,
    selected_skills: selectedSkills,
    skill_result: skillHit,
  });
}

const refScored = rows.filter((r) => r.reference_result === 'hit' || r.reference_result === 'miss');
const skillScored = rows.filter((r) => r.skill_result === 'hit' || r.skill_result === 'miss');
const refHits = refScored.filter((r) => r.reference_result === 'hit').length;
const skillHits = skillScored.filter((r) => r.skill_result === 'hit').length;

// Over-selection is the other failure: loading five references for a one-line change.
const avgRefs = rows.reduce((n, r) => n + r.selected_references.length, 0) / rows.length;
// Tasks that should pull in no domain knowledge at all, and whether they stayed clean.
const noRef = rows.filter((r) => r.expected_references.length === 0);
const noRefClean = noRef.filter((r) => r.selected_references.length === 0).length;
// False positives: references selected that the task does not call for.
const falsePositives = rows.reduce(
  (n, r) => n + r.selected_references.filter((s) => !r.expected_references.includes(s)).length, 0,
);

const out = {
  tier: 2,
  name: 'routing vocabulary',
  tasks: rows.length,
  reference_routing: { scored: refScored.length, hits: refHits, accuracy: +(refHits / refScored.length).toFixed(3) },
  skill_routing: { scored: skillScored.length, hits: skillHits, accuracy: +(skillHits / skillScored.length).toFixed(3) },
  average_references_selected: +avgRefs.toFixed(2),
  no_domain_tasks_kept_clean: `${noRefClean}/${noRef.length}`,
  reference_false_positives: falsePositives,
  misses: rows.filter((r) => r.reference_result === 'miss' || r.skill_result === 'miss'),
  rows,
  caveat: 'Vocabulary coverage only. A miss guarantees a routing failure in practice; a hit does not guarantee success.',
};

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
} else {
  process.stdout.write(`Tier 2 — routing vocabulary over ${out.tasks} tasks\n`);
  process.stdout.write(`  reference routing: ${refHits}/${refScored.length} (${(out.reference_routing.accuracy * 100).toFixed(0)}%)\n`);
  process.stdout.write(`  skill routing:     ${skillHits}/${skillScored.length} (${(out.skill_routing.accuracy * 100).toFixed(0)}%)\n`);
  process.stdout.write(`  avg references selected per task: ${out.average_references_selected}\n`);
  process.stdout.write(`  tasks needing no domain knowledge kept clean: ${out.no_domain_tasks_kept_clean}\n`);
  process.stdout.write(`  reference false positives: ${out.reference_false_positives}\n`);
  for (const m of out.misses) {
    process.stdout.write(`  MISS ${m.id}: refs expected [${m.expected_references}] got [${m.selected_references}]; skills expected [${m.expected_skills}] got [${m.selected_skills}]\n`);
  }
}
