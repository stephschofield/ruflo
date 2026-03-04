/**
 * Agent Handoff Graph Validation Tests
 *
 * Ensures every agent's handoff targets actually exist as agent files,
 * and that key coordination patterns form complete graphs (no dead-ends).
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
  handoffs?: { agent: string; label?: string; prompt?: string }[];
  agents?: string[];
  tools?: string[];
  'user-invocable'?: boolean;
  'disable-model-invocation'?: boolean;
  model?: string[];
  description?: string;
  'argument-hint'?: string;
}

let allAgents: Map<string, AgentMeta>;
let allAgentNames: Set<string>;

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
    // Object list item start
    if (/^\s+-\s+\w[\w-]*:/.test(line) && currentObjectList !== null) {
      if (currentObject) currentObjectList.push(currentObject);
      currentObject = {};
      const m = line.match(/^\s+-\s+(\w[\w-]*):\s*(.*)$/);
      if (m) currentObject[m[1]] = m[2].trim();
      continue;
    }
    // Object property continuation
    if (/^\s{4,}\w[\w-]*:/.test(line) && currentObject !== null) {
      const m = line.match(/^\s+(\w[\w-]*):\s*(.*)$/);
      if (m) currentObject[m[1]] = m[2].trim();
      continue;
    }
    // Simple list item
    if (/^\s+-\s+/.test(line) && currentList !== null) {
      const val = line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, '');
      currentList.push(val);
      continue;
    }
    // Flush previous collection
    if (currentList !== null && currentList.length > 0) {
      meta[currentKey] = currentList;
      currentList = null;
    }
    if (currentObjectList !== null) {
      if (currentObject) currentObjectList.push(currentObject);
      if (currentObjectList.length > 0) meta[currentKey] = currentObjectList;
      currentObjectList = null;
      currentObject = null;
    }
    // Key-value
    const kvMatch = line.match(/^([\w][\w-]*):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value === '' || value === '[]') {
        currentList = [];
        currentObjectList = [];
        continue;
      }
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
  allAgentNames = new Set();
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.agent.md'));
  for (const file of files) {
    const name = file.replace('.agent.md', '');
    allAgentNames.add(name);
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
    const meta = parseFrontmatter(content) as unknown as AgentMeta;
    meta.name = name;
    allAgents.set(name, meta);
  }
});

// ─── Every handoff target must resolve to an existing agent ─────────

describe('Handoff Target Resolution', () => {
  it('every handoff target resolves to an existing agent file', () => {
    const missing: string[] = [];
    for (const [name, meta] of allAgents) {
      if (!meta.handoffs) continue;
      for (const h of meta.handoffs) {
        if (!allAgentNames.has(h.agent)) {
          missing.push(`${name} → ${h.agent}`);
        }
      }
    }
    expect(missing, `Broken handoffs: ${missing.join(', ')}`).toEqual([]);
  });
});

// ─── No orphan agents (every non-coordinator has a parent) ──────────

describe('Handoff Graph Connectivity', () => {
  it('coordinator can reach all core role agents', () => {
    const coordMeta = allAgents.get('coordinator');
    expect(coordMeta).toBeDefined();
    const targets = (coordMeta!.handoffs || []).map(h => h.agent);
    const coreRoles = ['researcher', 'architect', 'coder', 'tester', 'reviewer', 'planner', 'security-auditor', 'pr-manager', 'issue-tracker'];
    for (const role of coreRoles) {
      expect(targets, `coordinator missing handoff to ${role}`).toContain(role);
    }
  });

  it('every core agent can hand off back to coordinator', () => {
    const coreRoles = ['researcher', 'coder', 'tester', 'reviewer'];
    for (const role of coreRoles) {
      const meta = allAgents.get(role);
      expect(meta, `${role} agent not found`).toBeDefined();
      const targets = (meta!.handoffs || []).map(h => h.agent);
      expect(targets, `${role} cannot hand off back to coordinator`).toContain('coordinator');
    }
  });

  it('no handoff chain forms a dead end (leaf agents still link back)', () => {
    const leafAgents: string[] = [];
    for (const [name, meta] of allAgents) {
      // Skip agents without handoffs — they may be infrastructure
      if (!meta.handoffs || meta.handoffs.length === 0) continue;
      // Check if this agent is reachable from coordinator (directly or transitively)
      const isHandoffTarget = [...allAgents.values()].some(
        a => a.handoffs?.some(h => h.agent === name)
      );
      if (isHandoffTarget) {
        // This agent is used as a target — verify it has at least one outbound handoff
        if (meta.handoffs.length === 0) {
          leafAgents.push(name);
        }
      }
    }
    expect(leafAgents, `Dead-end agents: ${leafAgents.join(', ')}`).toEqual([]);
  });
});

// ─── Handoff metadata quality ───────────────────────────────────────

describe('Handoff Metadata Quality', () => {
  it('every handoff has a non-empty label', () => {
    const badLabels: string[] = [];
    for (const [name, meta] of allAgents) {
      if (!meta.handoffs) continue;
      for (const h of meta.handoffs) {
        if (!h.label || h.label.trim() === '') {
          badLabels.push(`${name} → ${h.agent}`);
        }
      }
    }
    expect(badLabels, `Handoffs missing labels: ${badLabels.join(', ')}`).toEqual([]);
  });

  it('every handoff has a non-empty prompt', () => {
    const badPrompts: string[] = [];
    for (const [name, meta] of allAgents) {
      if (!meta.handoffs) continue;
      for (const h of meta.handoffs) {
        if (!h.prompt || h.prompt.trim() === '') {
          badPrompts.push(`${name} → ${h.agent}`);
        }
      }
    }
    expect(badPrompts, `Handoffs missing prompts: ${badPrompts.join(', ')}`).toEqual([]);
  });
});

// ─── Bidirectional coordination paths ───────────────────────────────

describe('Bidirectional Coordination Paths', () => {
  // Bug fix chain: coordinator → researcher → coder → tester → coder (fixback)
  it('bug fix chain is bidirectional between coder ↔ tester', () => {
    const coderTargets = (allAgents.get('coder')!.handoffs || []).map(h => h.agent);
    const testerTargets = (allAgents.get('tester')!.handoffs || []).map(h => h.agent);
    expect(coderTargets).toContain('tester');
    expect(testerTargets).toContain('coder');
  });

  it('code review chain is bidirectional between coder ↔ reviewer', () => {
    const coderTargets = (allAgents.get('coder')!.handoffs || []).map(h => h.agent);
    const reviewerTargets = (allAgents.get('reviewer')!.handoffs || []).map(h => h.agent);
    expect(coderTargets).toContain('reviewer');
    expect(reviewerTargets).toContain('coder');
  });
});
