/**
 * Naming Convention Tests
 *
 * Ensures consistent Ruflo branding across all Copilot config files
 * and that Claude Code-specific terminology is not leaked into
 * Copilot-facing files.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

interface FileContent {
  path: string;
  content: string;
}

let copilotFiles: FileContent[];

function collectFiles(dir: string, ext: string): FileContent[] {
  const results: FileContent[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push({
        path: path.relative(ROOT, fullPath),
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
    }
  }
  return results;
}

beforeAll(() => {
  copilotFiles = [
    // Agent files
    ...collectFiles(path.join(ROOT, '.github', 'agents'), '.agent.md'),
    // Skill files
    ...collectFiles(path.join(ROOT, '.github', 'skills'), '.md'),
    // Prompt files
    ...collectFiles(path.join(ROOT, '.github', 'prompts'), '.prompt.md'),
    // Instructions
    ...(fs.existsSync(path.join(ROOT, '.github', 'copilot-instructions.md'))
      ? [{
        path: '.github/copilot-instructions.md',
        content: fs.readFileSync(path.join(ROOT, '.github', 'copilot-instructions.md'), 'utf-8'),
      }]
      : []),
  ];
});

// ─── Consistent branding ────────────────────────────────────────────

describe('Ruflo Branding Consistency', () => {
  it('copilot-instructions.md uses "ruflo" branding', () => {
    const instructions = copilotFiles.find(f => f.path.includes('copilot-instructions'));
    expect(instructions).toBeDefined();
    expect(instructions!.content.toLowerCase()).toMatch(/ruflo/);
  });

  it('agent handoff labels do not use Claude Code terminology', () => {
    const staleTerms = /claude\s+code\s+task\s+tool|TodoWrite|Task\s*\(/i;
    const violations: string[] = [];
    for (const file of copilotFiles) {
      if (file.path.includes('.agent.md')) {
        // Only check frontmatter
        const match = file.content.match(/^---\n([\s\S]*?)\n---/);
        if (match && staleTerms.test(match[1])) {
          violations.push(file.path);
        }
      }
    }
    expect(violations, `Agents with Claude Code terminology: ${violations.join(', ')}`).toEqual([]);
  });
});

// ─── Agent naming conventions ───────────────────────────────────────

describe('Agent Naming Conventions', () => {
  it('agent filenames use kebab-case', () => {
    const agentDir = path.join(ROOT, '.github', 'agents');
    const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.agent.md'));
    const invalid: string[] = [];
    for (const file of files) {
      const name = file.replace('.agent.md', '');
      // kebab-case: lowercase letters, numbers, and hyphens only
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        invalid.push(file);
      }
    }
    expect(invalid, `Non-kebab-case agents: ${invalid.join(', ')}`).toEqual([]);
  });

  it('agent frontmatter name matches filename', () => {
    const agentDir = path.join(ROOT, '.github', 'agents');
    const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.agent.md'));
    const mismatches: string[] = [];
    for (const file of files) {
      const expectedName = file.replace('.agent.md', '');
      const content = fs.readFileSync(path.join(agentDir, file), 'utf-8');
      const match = content.match(/^---\n[\s\S]*?name:\s*(.+)\n/);
      if (match) {
        const actualName = match[1].trim().replace(/^["']|["']$/g, '');
        if (actualName !== expectedName) {
          mismatches.push(`${file}: name="${actualName}" expected="${expectedName}"`);
        }
      }
    }
    expect(mismatches, `Name mismatches:\n${mismatches.join('\n')}`).toEqual([]);
  });
});

// ─── Skill naming conventions ───────────────────────────────────────

describe('Skill Naming Conventions', () => {
  it('skill directories use kebab-case', () => {
    const skillDir = path.join(ROOT, '.github', 'skills');
    if (!fs.existsSync(skillDir)) return;
    const dirs = fs.readdirSync(skillDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    const invalid: string[] = [];
    for (const dir of dirs) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(dir)) {
        invalid.push(dir);
      }
    }
    expect(invalid, `Non-kebab-case skills: ${invalid.join(', ')}`).toEqual([]);
  });
});

// ─── Prompt naming conventions ──────────────────────────────────────

describe('Prompt Naming Conventions', () => {
  it('prompt filenames use kebab-case.prompt.md', () => {
    const promptDir = path.join(ROOT, '.github', 'prompts');
    const files = fs.readdirSync(promptDir).filter(f => f.endsWith('.prompt.md'));
    const invalid: string[] = [];
    for (const file of files) {
      const name = file.replace('.prompt.md', '');
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        invalid.push(file);
      }
    }
    expect(invalid, `Non-kebab-case prompts: ${invalid.join(', ')}`).toEqual([]);
  });
});

// ─── No leaked internal paths ───────────────────────────────────────

describe('No Leaked Internal Paths', () => {
  it('agent files do not reference internal v3/ paths', () => {
    const violations: string[] = [];
    for (const file of copilotFiles) {
      if (file.path.includes('.agent.md')) {
        // Body content (after frontmatter) should not reference v3/ internal paths
        const body = file.content.replace(/^---\n[\s\S]*?\n---\n?/, '');
        if (/v3\/@claude-flow\//.test(body)) {
          violations.push(file.path);
        }
      }
    }
    expect(violations, `Agents referencing internal v3/ paths: ${violations.join(', ')}`).toEqual([]);
  });
});
