#!/usr/bin/env node
// run.mjs — run every benchmark that does not cost money, and write the report.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function runJson(script, extra = []) {
  const res = spawnSync(process.execPath, [join(HERE, script), '--json', ...extra], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6,
  });
  try {
    return { ok: res.status === 0, data: JSON.parse(res.stdout) };
  } catch {
    return { ok: false, data: { error: (res.stderr || res.stdout || 'no output').slice(0, 600) } };
  }
}

const compare = process.argv.find((a) => a.startsWith('--compare='));
const tier1 = runJson('tier1-structure.mjs');
const tier2 = runJson('tier2-routing.mjs');
const footprint = runJson('footprint.mjs', compare ? [compare] : []);

const report = {
  generated: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  tier1: tier1.data,
  tier2: tier2.data,
  footprint: footprint.data,
  tier3: 'Not run — requires billed live runs. Protocol: benchmarks/tier3-behavior.md, harness: benchmarks/tier3-run.mjs',
  verdict: tier1.ok && tier2.data?.reference_routing?.accuracy >= 0.9 ? 'pass' : 'fail',
};

const outDir = join(ROOT, 'benchmarks', 'results');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);

process.stdout.write('claude-superpack benchmarks\n');
process.stdout.write('───────────────────────────\n');
process.stdout.write(`Tier 1 structure : ${tier1.data.passed}/${tier1.data.checks} checks\n`);
for (const f of tier1.data.failures || []) process.stdout.write(`    FAIL ${f}\n`);
process.stdout.write(`Tier 2 routing   : references ${(tier2.data.reference_routing.accuracy * 100).toFixed(0)}% (${tier2.data.reference_routing.hits}/${tier2.data.reference_routing.scored}), `
  + `content skills ${(tier2.data.skill_routing.accuracy * 100).toFixed(0)}% (${tier2.data.skill_routing.hits}/${tier2.data.skill_routing.scored})\n`);
process.stdout.write(`                   ${tier2.data.average_references_selected} references selected per task, ${tier2.data.reference_false_positives} false positives\n`);
process.stdout.write(`Footprint        : ${footprint.data.current.skills} skills, ${footprint.data.current.always_on_tokens} tokens/turn always-on\n`);
if (footprint.data.delta) {
  process.stdout.write(`                   vs ${footprint.data.baseline.ref}: ${footprint.data.delta.always_on_tokens} tokens (${footprint.data.delta.always_on_change_pct}%)\n`);
}
process.stdout.write(`Tier 3 behaviour : not run (billed) — see benchmarks/tier3-behavior.md\n`);
process.stdout.write(`\nVerdict: ${report.verdict}\nWrote benchmarks/results/latest.json\n`);

process.exit(report.verdict === 'pass' ? 0 : 1);
