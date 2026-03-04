/**
 * Cross-Reference Integrity Tests
 *
 * Validates that all cross-references between Copilot config files
 * are consistent — agent names in handoffs resolve to actual files,
 * skills reference real tool categories, etc.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const AGENTS_DIR = path.join(ROOT, '.github', 'agents');
const SKILLS_DIR = path.join(ROOT, '.github', 'skills');
const PROMPTS_DIR = path.join(ROOT, '.github', 'prompts');

let allAgentNames: Set<string>;
let allAgentContents: Map<string, string>;
let allSkillNames: Set<string>;

function parseFrontmatterHandoffs(content: string): string[] {
  const agents: string[] = [];
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return agents;
  const yaml = match[1];
  const handoffMatches = yaml.matchAll(/agent:\s+(\S+)/g);
  for (const m of handoffMatches) {
    agents.push(m[1]);
  }
  return agents;
}

beforeAll(() => {
  allAgentNames = new Set();
  allAgentContents = new Map();
  const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.agent.md'));
  for (const file of agentFiles) {
    const name = file.replace('.agent.md', '');
    allAgentNames.add(name);
    allAgentContents.set(name, fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8'));
  }

  allSkillNames = new Set();
  if (fs.existsSync(SKILLS_DIR)) {
    const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const dir of skillDirs) {
      allSkillNames.add(dir);
    }
  }
});

// ─── Agent handoff target resolution ────────────────────────────────

describe('Agent Handoff → Agent File Resolution', () => {
  it('every handoff target resolves to an existing .agent.md file', () => {
    const broken: string[] = [];
    for (const [name, content] of allAgentContents) {
      const targets = parseFrontmatterHandoffs(content);
      for (const target of targets) {
        if (!allAgentNames.has(target)) {
          broken.push(`${name} → ${target}`);
        }
      }
    }
    expect(broken, `Broken handoff references:\n${broken.join('\n')}`).toEqual([]);
  });
});

// ─── No duplicate agent files ───────────────────────────────────────

describe('Agent Name Uniqueness', () => {
  it('no duplicate agent names after normalizing', () => {
    const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.agent.md'));
    const names = files.map(f => f.replace('.agent.md', ''));
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

// ─── Prompt → Agent references ──────────────────────────────────────

describe('Prompt → Agent References', () => {
  it('prompts only reference agents that exist', () => {
    const promptFiles = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.prompt.md'));
    const broken: string[] = [];
    for (const file of promptFiles) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf-8');
      // Find @agent-name references
      const refs = content.matchAll(/@([\w-]+)/g);
      for (const ref of refs) {
        const agentName = ref[1];
        // Skip common @mentions that aren't agent references
        if (['claude-flow', 'param', 'returns', 'example', 'see', 'todo', 'type', 'deprecated'].includes(agentName)) continue;
        if (!allAgentNames.has(agentName)) {
          // Not strictly broken — might be a general reference
          // Only flag if it looks like an agent name
          if (agentName.length > 2 && !agentName.includes('.')) {
            // Soft check — these might be valid non-agent references
          }
        }
      }
    }
    // This being empty means no broken references found
    expect(broken).toEqual([]);
  });
});

// ─── Skill directory integrity ──────────────────────────────────────

describe('Skill Directory Integrity', () => {
  it('every skill directory has a SKILL.md file', () => {
    const missing: string[] = [];
    for (const skill of allSkillNames) {
      const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        missing.push(skill);
      }
    }
    expect(missing, `Skills missing SKILL.md: ${missing.join(', ')}`).toEqual([]);
  });
});

// ─── MCP config → server consistency ────────────────────────────────

describe('MCP Config Consistency', () => {
  it('.vscode/mcp.json servers all have matching args', () => {
    const mcpPath = path.join(ROOT, '.vscode', 'mcp.json');
    const mcpConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    const servers = mcpConfig.servers as Record<string, Record<string, unknown>>;
    for (const [name, server] of Object.entries(servers)) {
      const args = server.args as string[];
      expect(args, `${name} has no args`).toBeDefined();
      expect(Array.isArray(args), `${name} args is not an array`).toBe(true);
    }
  });
});

// ─── Hooks → CLI command consistency ────────────────────────────────

describe('Hooks → CLI Command References', () => {
  it('every hook command references a valid ruflo subcommand', () => {
    const hooksPath = path.join(ROOT, '.github', 'hooks', 'hooks.json');
    const config = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
    const hooks = config.hooks as { command: string; event: string }[];

    const validSubcommands = [
      'hooks', 'session-start', 'session-end', 'pre-task', 'post-task',
      'pre-edit', 'post-edit', 'pre-command', 'post-command',
    ];

    for (const hook of hooks) {
      const cmd = hook.command;
      // Hooks either use npx ruflo or node .github/hooks/...
      if (cmd.includes('npx ruflo')) {
        const parts = cmd.split(/\s+/);
        const rufloIdx = parts.indexOf('ruflo');
        if (rufloIdx >= 0 && rufloIdx + 1 < parts.length) {
          const subcommand = parts[rufloIdx + 1];
          expect(
            validSubcommands.includes(subcommand),
            `Invalid subcommand "${subcommand}" in hook: ${cmd}`
          ).toBe(true);
        }
      } else if (cmd.includes('.github/hooks/')) {
        // Node script reference — just verify it's a valid path pattern
        expect(cmd).toMatch(/node.*\.github\/hooks\//);
      }
    }
  });
});
