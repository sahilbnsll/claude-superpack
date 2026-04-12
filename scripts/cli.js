#!/usr/bin/env node

/**
 * Claude Superpack CLI
 * 
 * CLI for managing the skill pack installation, memory system, and graph.
 * 
 * Usage:
 *   claude-superpack install              — Install/reinstall skills
 *   claude-superpack uninstall            — Remove skills
 *   claude-superpack status               — Check installation status
 *   claude-superpack memory status        — Show memory stats
 *   claude-superpack memory consolidate   — Run memory consolidation
 *   claude-superpack skills list          — List all installed skills
 *   claude-superpack version              — Show version
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const pkg = require('../package.json');

const TARGET_DIR = path.join(os.homedir(), '.claude', 'skills', 'claude-superpack');
const SKILLS_DIR = path.join(TARGET_DIR, 'skills');
const MEMORY_DIR = path.join(os.homedir(), '.claude', 'memory');
const GRAPHS_DIR = path.join(os.homedir(), '.claude', 'graphs');

const command = process.argv[2] || 'status';
const subcommand = process.argv[3] || '';

function getSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR).filter(d =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
  );
}

function getSkillDescription(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return '';
  const content = fs.readFileSync(skillPath, 'utf-8');
  const match = content.match(/^description:\s*(.+)$/m);
  return match ? match[1].substring(0, 80) : '';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function memoryStatus() {
  console.log(`\n🧠 Memory System\n`);

  if (!fs.existsSync(MEMORY_DIR)) {
    console.log('   Status: ❌ Not initialized');
    console.log(`   Run: claude-superpack install\n`);
    return;
  }

  console.log(`   Status: ✅ Active`);
  console.log(`   Location: ${MEMORY_DIR}`);

  // Recent memory
  const recentPath = path.join(MEMORY_DIR, 'recent.md');
  if (fs.existsSync(recentPath)) {
    const stat = fs.statSync(recentPath);
    const content = fs.readFileSync(recentPath, 'utf-8');
    const entryCount = (content.match(/^### /gm) || []).length;
    console.log(`   Recent: ${entryCount} entries (${formatBytes(stat.size)})`);
  }

  // Long-term memory
  const ltPath = path.join(MEMORY_DIR, 'long-term.md');
  if (fs.existsSync(ltPath)) {
    const stat = fs.statSync(ltPath);
    const content = fs.readFileSync(ltPath, 'utf-8');
    const entryCount = (content.match(/^- /gm) || []).length;
    console.log(`   Long-term: ${entryCount} entries (${formatBytes(stat.size)})`);
  }

  // Projects
  const projectsDir = path.join(MEMORY_DIR, 'projects');
  if (fs.existsSync(projectsDir)) {
    const projects = fs.readdirSync(projectsDir).filter(f => f.endsWith('.md'));
    console.log(`   Projects: ${projects.length}`);
    for (const p of projects) {
      console.log(`     • ${p.replace('.md', '')}`);
    }
  }

  // Index
  const indexPath = path.join(MEMORY_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    if (index.last_consolidation) {
      console.log(`   Last consolidation: ${index.last_consolidation}`);
    } else {
      console.log(`   Last consolidation: never`);
    }
  }

  console.log();
}

function memoryConsolidate() {
  const scriptPath = path.join(__dirname, 'consolidate-memory.js');
  if (!fs.existsSync(scriptPath)) {
    console.error('❌ consolidate-memory.js not found');
    process.exit(1);
  }
  require(scriptPath);
}

function skillsList() {
  const skills = getSkills();
  console.log(`\n📦 Installed Skills (${skills.length})\n`);

  // Group skills by category
  const categories = {
    'Orchestration': ['auto-router', 'clarifier', 'task-decomposer', 'conflict-detector', 'parallel-orchestrator', 'merge-coordinator'],
    'Memory': ['memory-manager', 'project-memory', 'memory-search', 'memory-consolidator'],
    'Knowledge Graph': ['graph-builder', 'graph-reviewer', 'graph-navigator', 'graph-updater', 'codebase-onboarder'],
    'Security': ['security-scanner'],
    'Token Efficiency': ['context-budget', 'smart-discovery', 'skill-reuse-detector'],
    'Quality & Testing': ['test-mapper', 'test-generator', 'dep-analyzer'],
    'Workflow': ['pre-flight', 'post-review', 'rollback'],
    'Documentation': ['doc-generator', 'changelog-writer'],
    'Migration & Maintenance': ['migration-planner', 'dead-code-finder'],
    'Communication': ['session-recap'],
    'Learning': ['pattern-tracker', 'user-profiler', 'error-catalog'],
  };

  const categorized = new Set();

  for (const [category, members] of Object.entries(categories)) {
    const installed = members.filter(m => skills.includes(m));
    if (installed.length === 0) continue;

    console.log(`   ${category}:`);
    for (const skill of installed) {
      console.log(`     ✅ ${skill}`);
      categorized.add(skill);
    }
  }

  // Show uncategorized skills
  const uncategorized = skills.filter(s => !categorized.has(s));
  if (uncategorized.length > 0) {
    console.log(`   Other:`);
    for (const skill of uncategorized) {
      console.log(`     ✅ ${skill}`);
    }
  }

  console.log();
}

function graphStatus() {
  console.log(`\n🗺️  Knowledge Graph\n`);

  if (!fs.existsSync(GRAPHS_DIR)) {
    console.log('   Status: No graphs built yet');
    console.log(`   Graphs are built automatically when you work on a project.\n`);
    return;
  }

  const projects = fs.readdirSync(GRAPHS_DIR).filter(d =>
    fs.statSync(path.join(GRAPHS_DIR, d)).isDirectory()
  );

  console.log(`   Location: ${GRAPHS_DIR}`);
  console.log(`   Projects: ${projects.length}`);

  for (const project of projects) {
    const graphPath = path.join(GRAPHS_DIR, project, 'graph.json');
    if (fs.existsSync(graphPath)) {
      const stat = fs.statSync(graphPath);
      console.log(`     • ${project} (${formatBytes(stat.size)}, updated: ${stat.mtime.toISOString().split('T')[0]})`);
    } else {
      console.log(`     • ${project} (empty)`);
    }
  }

  console.log();
}

switch (command) {
  case 'install':
  case 'reinstall':
    require('./install');
    break;

  case 'uninstall':
  case 'remove':
    require('./uninstall');
    break;

  case 'status': {
    console.log(`\n🔌 Claude Superpack v${pkg.version}\n`);

    if (!fs.existsSync(TARGET_DIR)) {
      console.log('   Status: ❌ Not installed');
      console.log(`   Run: claude-superpack install\n`);
      break;
    }

    const skills = getSkills();
    console.log(`   Status: ✅ Installed`);
    console.log(`   Location: ${TARGET_DIR}`);
    console.log(`   Skills: ${skills.length}`);
    console.log(`   Memory: ${fs.existsSync(MEMORY_DIR) ? '✅ Active' : '❌ Not initialized'}`);
    console.log(`   Graphs: ${fs.existsSync(GRAPHS_DIR) ? fs.readdirSync(GRAPHS_DIR).length + ' projects' : 'None built'}`);
    console.log();
    break;
  }

  case 'memory':
    if (subcommand === 'consolidate') {
      memoryConsolidate();
    } else {
      memoryStatus();
    }
    break;

  case 'graph':
    graphStatus();
    break;

  case 'skills':
    skillsList();
    break;

  case 'version':
  case '-v':
  case '--version':
    console.log(pkg.version);
    break;

  case 'help':
  case '-h':
  case '--help':
    console.log(`
🔌 Claude Superpack v${pkg.version}

Usage:
  claude-superpack install              Install/reinstall skills
  claude-superpack uninstall            Remove skills
  claude-superpack status               Overall status
  claude-superpack skills               List all installed skills
  claude-superpack memory               Memory system status
  claude-superpack memory consolidate   Run memory consolidation
  claude-superpack graph                Knowledge graph status
  claude-superpack version              Show version
`);
    break;

  default:
    console.error(`Unknown command: ${command}\nRun: claude-superpack help`);
    process.exit(1);
}
