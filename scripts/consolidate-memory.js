#!/usr/bin/env node

/**
 * Claude Superpack — Memory Consolidation Script
 *
 * Reads ~/.claude/memory/recent.md, identifies entries for promotion
 * to long-term.md, prunes expired entries, and updates index.json.
 *
 * Usage:
 *   node consolidate-memory.js              # Interactive run
 *   node consolidate-memory.js --quiet      # Cron-friendly (no prompts)
 *
 * Cron example (run nightly at 2am):
 *   0 2 * * * node ~/.claude/skills/claude-superpack/scripts/consolidate-memory.js --quiet
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MEMORY_DIR = path.join(os.homedir(), '.claude', 'memory');
const RECENT_PATH = path.join(MEMORY_DIR, 'recent.md');
const LONG_TERM_PATH = path.join(MEMORY_DIR, 'long-term.md');
const INDEX_PATH = path.join(MEMORY_DIR, 'index.json');
const LOG_PATH = path.join(MEMORY_DIR, 'consolidation.log');

const QUIET = process.argv.includes('--quiet');
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

function log(msg) {
  if (!QUIET) console.log(msg);
  fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${msg}\n`);
}

function ensureFiles() {
  fs.mkdirSync(path.join(MEMORY_DIR, 'projects'), { recursive: true });

  if (!fs.existsSync(RECENT_PATH)) {
    fs.writeFileSync(RECENT_PATH,
      '# Recent Memory\nRolling 48-hour context. Auto-pruned entries older than 48 hours.\n');
  }

  if (!fs.existsSync(LONG_TERM_PATH)) {
    fs.writeFileSync(LONG_TERM_PATH, [
      '# Long-Term Memory',
      'Distilled facts, preferences, and patterns.',
      '',
      '## Preferences',
      '',
      '## Patterns',
      '',
      '## Facts',
      '',
      '## Recurring Errors',
      '',
    ].join('\n'));
  }
}

/**
 * Parse recent.md into structured entries
 * Format: ### YYYY-MM-DD HH:MM [tag]\n summary\n Context: ...
 */
function parseEntries(content) {
  const entries = [];
  const lines = content.split('\n');
  let current = null;

  for (const line of lines) {
    const headerMatch = line.match(/^### (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \[(\w+)\]/);
    if (headerMatch) {
      if (current) entries.push(current);
      current = {
        timestamp: headerMatch[1],
        tag: headerMatch[2],
        header: line,
        summary: '',
        context: '',
        raw: line + '\n',
      };
    } else if (current) {
      current.raw += line + '\n';
      if (line.startsWith('Context:')) {
        current.context = line;
      } else if (line.trim() && !current.summary) {
        current.summary = line.trim();
      }
    }
  }

  if (current) entries.push(current);
  return entries;
}

function parseDate(ts) {
  // Parse "YYYY-MM-DD HH:MM" as local time
  const [datePart, timePart] = ts.split(' ');
  return new Date(`${datePart}T${timePart}:00`);
}

function isExpired(entry) {
  const entryDate = parseDate(entry.timestamp);
  return Date.now() - entryDate.getTime() > MAX_AGE_MS;
}

function shouldPromote(entry) {
  // Always promote preferences and patterns
  if (['preference', 'pattern'].includes(entry.tag)) return true;
  // Promote errors (for the error catalog)
  if (entry.tag === 'error') return true;
  // Don't auto-promote context (ephemeral) or single decisions
  return false;
}

function getSectionForTag(tag) {
  const map = {
    preference: '## Preferences',
    pattern: '## Patterns',
    fact: '## Facts',
    error: '## Recurring Errors',
    decision: '## Facts', // Promoted decisions become facts
  };
  return map[tag] || '## Facts';
}

function isDuplicate(longTermContent, summary) {
  // Simple dedup: check if the summary text already appears
  return longTermContent.includes(summary.trim());
}

function consolidate() {
  ensureFiles();

  const recentContent = fs.readFileSync(RECENT_PATH, 'utf-8');
  let longTermContent = fs.readFileSync(LONG_TERM_PATH, 'utf-8');

  const entries = parseEntries(recentContent);

  if (entries.length === 0) {
    log('No entries to consolidate.');
    return;
  }

  log(`\n🧠 Memory Consolidation`);
  log(`   Scanned: ${entries.length} recent entries`);

  const expired = entries.filter(isExpired);
  const fresh = entries.filter(e => !isExpired(e));
  const toPromote = expired.filter(shouldPromote);
  // Also check fresh entries for promotion-worthy tags
  const freshPromotable = fresh.filter(e => shouldPromote(e) && !isExpired(e));

  let promoted = 0;
  const promotionsBySection = {};

  for (const entry of [...toPromote, ...freshPromotable]) {
    if (isDuplicate(longTermContent, entry.summary)) {
      continue;
    }

    const section = getSectionForTag(entry.tag);
    if (!promotionsBySection[section]) promotionsBySection[section] = [];

    const bullet = `- ${entry.summary} (observed: ${entry.timestamp}, tag: ${entry.tag})`;
    promotionsBySection[section].push(bullet);
    promoted++;
  }

  // Append promoted entries to long-term
  for (const [section, bullets] of Object.entries(promotionsBySection)) {
    const sectionIdx = longTermContent.indexOf(section);
    if (sectionIdx === -1) {
      // Section doesn't exist, add it
      longTermContent += `\n${section}\n${bullets.join('\n')}\n`;
    } else {
      // Insert after section header
      const insertIdx = longTermContent.indexOf('\n', sectionIdx) + 1;
      longTermContent =
        longTermContent.slice(0, insertIdx) +
        bullets.join('\n') + '\n' +
        longTermContent.slice(insertIdx);
    }
  }

  fs.writeFileSync(LONG_TERM_PATH, longTermContent);

  // Rebuild recent.md with only fresh, non-promoted entries
  const remaining = fresh.filter(e => !freshPromotable.includes(e));
  let newRecent = '# Recent Memory\nRolling 48-hour context. Auto-pruned entries older than 48 hours.\n\n';
  for (const entry of remaining) {
    newRecent += entry.raw + '\n';
  }
  fs.writeFileSync(RECENT_PATH, newRecent);

  // Update index
  const index = {
    recent: { entries: remaining.length, last_updated: new Date().toISOString() },
    long_term: {
      entries: (longTermContent.match(/^- /gm) || []).length,
      last_updated: new Date().toISOString(),
    },
    last_consolidation: new Date().toISOString(),
    projects: {},
  };

  // Scan project files
  const projectsDir = path.join(MEMORY_DIR, 'projects');
  if (fs.existsSync(projectsDir)) {
    for (const file of fs.readdirSync(projectsDir)) {
      if (file.endsWith('.md')) {
        const stat = fs.statSync(path.join(projectsDir, file));
        index.projects[file.replace('.md', '')] = stat.mtime.toISOString();
      }
    }
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n');

  log(`   Promoted to long-term: ${promoted}`);
  log(`   Pruned (expired): ${expired.length - toPromote.length}`);
  log(`   Remaining in recent: ${remaining.length}`);
  log(`   Long-term total: ${index.long_term.entries} entries`);
  log('');
}

try {
  consolidate();
} catch (err) {
  log(`❌ Consolidation failed: ${err.message}`);
  process.exit(1);
}
