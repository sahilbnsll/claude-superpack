#!/usr/bin/env node

/**
 * claude-superpack uninstall
 *
 * Run explicitly — `npx @sahilbnsll/claude-superpack uninstall`. Not an npm preuninstall
 * script, for the same reasons install is not a postinstall.
 *
 * Removes only the skill directories this package installed, using the manifest written
 * at install time. Directories the user created or edited are left alone.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const LEGACY_DIR = path.join(SKILLS_DIR, 'claude-superpack');
const MANIFEST = path.join(CLAUDE_DIR, '.claude-superpack-installed.json');

function uninstall() {
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch {
    // No manifest: fall back to the names this version ships, and nothing else.
  }

  const names = manifest?.skills?.length
    ? manifest.skills
    : ['superpack', 'codebase-recon', 'grilling-requirements', 'planning-changes',
      'debugging-systematically', 'verifying-evidence', 'reviewing-before-done',
      'securing-changes', 'shipping-safely'];

  let removed = 0;
  for (const name of names) {
    const dir = path.join(SKILLS_DIR, name);
    if (!fs.existsSync(dir)) continue;
    fs.rmSync(dir, { recursive: true, force: true });
    removed++;
  }

  if (fs.existsSync(LEGACY_DIR)) {
    fs.rmSync(LEGACY_DIR, { recursive: true, force: true });
    removed++;
  }
  fs.rmSync(MANIFEST, { force: true });

  console.log(`\nclaude-superpack — removed ${removed} skill director${removed === 1 ? 'y' : 'ies'} from ${SKILLS_DIR}\n`);
}

try {
  uninstall();
} catch (err) {
  console.error(`\nclaude-superpack: could not remove automatically — ${err.message}`);
  console.error(`Delete the skill directories under ${SKILLS_DIR} manually.\n`);
  process.exit(1);
}
