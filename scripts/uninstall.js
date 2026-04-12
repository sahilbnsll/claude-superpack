#!/usr/bin/env node

/**
 * Claude Superpack - Preuninstall Script
 * 
 * Removes skill files from ~/.claude/skills/claude-superpack
 * when the user runs npm uninstall.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_DIR_NAME = 'claude-superpack';

function uninstall() {
  const targetDir = path.join(os.homedir(), '.claude', 'skills', SKILL_DIR_NAME);

  if (!fs.existsSync(targetDir)) {
    console.log(`\n🔌 Claude Superpack — Already removed.\n`);
    return;
  }

  // Remove symlinks from ~/.claude/skills/ that point into the superpack
  const skillsDir = path.join(targetDir, 'skills');
  const topLevelSkillsDir = path.join(os.homedir(), '.claude', 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir)) {
      const linkPath = path.join(topLevelSkillsDir, skill);
      try {
        const stat = fs.lstatSync(linkPath);
        if (stat.isSymbolicLink()) {
          const target = fs.readlinkSync(linkPath);
          if (target.includes(SKILL_DIR_NAME)) {
            fs.unlinkSync(linkPath);
          }
        }
      } catch {
        // Not found — already clean
      }
    }
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  console.log(`\n🔌 Claude Superpack — Uninstalled from ${targetDir}`);
  console.log(`   Skills will no longer appear in Claude Code.\n`);
}

try {
  uninstall();
} catch (err) {
  console.error(`\n⚠️  Could not auto-remove: ${err.message}`);
  console.error(`   Manually delete ~/.claude/skills/${SKILL_DIR_NAME}\n`);
  process.exit(0);
}
