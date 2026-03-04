/**
 * Agent Delegation and Subagent Tests
 *
 * Validates that agents with the `agents:` field (delegators) are
 * properly configured and that infrastructure agents are hidden
 * from direct user invocation.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const AGENTS_DIR = path.join(ROOT, '.github', 'agents');

interface AgentMeta {
  name: string;
  tools?: string[];
  agents?: string[];
  handoffs?: { agent: string }[];
  'user-invocable'?: boolean;
  'disable-model-invocation'?: boolean;
  'argument-hint'?: string;
  description?: string;
}

let allAgents: Map<string, AgentMeta>;

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const meta: Record<string, unknown> = {};
  let currentKey = '';
  let currentList: unknown[] | null = null;
  let currentObjectList: Record<string, string>[] | null = null;
  let currentObject: Record<string, string> | null = null;

  for (const line of yaml.split('\n')) {
    if (/^\s+-\s+\w[\w-]*:/.test(line) && currentObjectList !== null) {
      if (currentObject) currentObjectList.push(currentObject);
      currentObject = {};
      const m = line.match(/^\s+-\s+(\w[\w-]*):\s*(.*)$/);
      if (m) currentObject[m[1]] = m[2].trim();
      continue;
    }
    if (/^\s{4,}\w[\w-]*:/.test(line) && currentObject !== null) {
      const m = line.match(/^\s+(\w[\w-]*):\s*(.*)$/);
      if (m) currentObject[m[1]] = m[2].trim();
      continue;
    }
    if (/^\s+-\s+/.test(line) && currentList !== null) {
      const val = line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, '');
      currentList.push(val);
      continue;
    }
    if (currentList !== null && currentList.length > 0) { meta[currentKey] = currentList; currentList = null; }
    if (currentObjectList !== null) {
      if (currentObject) currentObjectList.push(currentObject);
      if (currentObjectList.length > 0) meta[currentKey] = currentObjectList;
      currentObjectList = null; currentObject = null;
    }
    const kvMatch = line.match(/^([\w][\w-]*):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value === '' || value === '[]') { currentList = []; currentObjectList = []; continue; }
      if (value === 'true') { meta[currentKey] = true; continue; }
      if (value === 'false') { meta[currentKey] = false; continue; }
      meta[currentKey] = value.replace(/^["']|["']$/g, '');
    }
  }
  if (currentList !== null && currentList.length > 0) meta[currentKey] = currentList;
  if (currentObjectList !== null) {
    if (currentObject) currentObjectList.push(currentObject);
    if (currentObjectList.length > 0) meta[currentKey] = currentObjectList;
  }
  return meta;
}

beforeAll(() => {
  allAgents = new Map();
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.agent.md'));
  for (const file of files) {
    const name = file.replace('.agent.md', '');
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
    const meta = parseFrontmatter(content) as unknown as AgentMeta;
    meta.name = name;
    allAgents.set(name, meta);
  }
});

// ─── Delegator agents must have agent tool ──────────────────────────

describe('Delegator Agent Configuration', () => {
  it('coordinator has agents: ["*"] for universal delegation', () => {
    const coord = allAgents.get('coordinator');
    expect(coord).toBeDefined();
    expect(coord!.agents).toBeDefined();
    expect(coord!.agents).toContain('*');
  });

  it('coordinator has the "agent" tool for spawning subagents', () => {
    const coord = allAgents.get('coordinator');
    expect(coord!.tools).toContain('agent');
  });

  it('delegator agents with agents: ["*"] also have "agent" tool', () => {
    const missing: string[] = [];
    for (const [name, meta] of allAgents) {
      if (meta.agents && meta.agents.includes('*')) {
        if (!meta.tools || !meta.tools.includes('agent')) {
          missing.push(name);
        }
      }
    }
    expect(missing, `Delegators missing "agent" tool: ${missing.join(', ')}`).toEqual([]);
  });
});

// ─── User-invocable vs infrastructure agents ────────────────────────

describe('Agent Visibility Configuration', () => {
  // Core user-facing agents MUST be user-invocable
  const USER_FACING = [
    'coordinator', 'coder', 'researcher', 'architect', 'tester',
    'reviewer', 'planner', 'security-auditor', 'pr-manager', 'issue-tracker',
  ];

  for (const name of USER_FACING) {
    it(`@${name} is user-invocable`, () => {
      const meta = allAgents.get(name);
      expect(meta, `${name} not found`).toBeDefined();
      expect(meta!['user-invocable']).toBe(true);
    });
  }

  it('core user-invocable agents have argument-hint', () => {
    const CORE_AGENTS = [
      'coordinator', 'coder', 'researcher', 'architect', 'tester',
      'reviewer', 'planner', 'security-auditor', 'pr-manager', 'issue-tracker',
    ];
    const missing: string[] = [];
    for (const name of CORE_AGENTS) {
      const meta = allAgents.get(name);
      if (meta && meta['user-invocable'] === true && !meta['argument-hint']) {
        missing.push(name);
      }
    }
    expect(missing, `Core user-invocable agents missing argument-hint: ${missing.join(', ')}`).toEqual([]);
  });

  it('infrastructure agents have disable-model-invocation: true', () => {
    // Codex-specific agents should be hidden from model invocation
    const INFRA_AGENTS = ['codex-coordinator', 'codex-worker', 'dual-orchestrator'];
    for (const name of INFRA_AGENTS) {
      const meta = allAgents.get(name);
      if (meta) {
        expect(
          meta['disable-model-invocation'],
          `${name} should have disable-model-invocation: true`
        ).toBe(true);
      }
    }
  });
});

// ─── Specialist agents have ruflo MCP access ────────────────────────

describe('Specialist Agent Tool Access', () => {
  it('all agents with handoffs have ruflo MCP tool access', () => {
    const missing: string[] = [];
    for (const [name, meta] of allAgents) {
      if (meta.handoffs && meta.handoffs.length > 0) {
        if (!meta.tools || !meta.tools.includes('ruflo')) {
          missing.push(name);
        }
      }
    }
    expect(missing, `Agents with handoffs missing ruflo tool: ${missing.join(', ')}`).toEqual([]);
  });
});
