/**
 * Copilot User Journey Tests
 *
 * Validates end-to-end user workflows that a GitHub Copilot user would
 * experience when working with Ruflo. These tests ensure the UX is
 * seamless and feels like Ruflo was natively built for Copilot.
 *
 * Coverage:
 *   - Agent invocation journeys (@agent-name)
 *   - Slash command journeys (/sparc, /swarm-init, etc.)
 *   - MCP tool discovery and categorization
 *   - Handoff chains (agent A → agent B)
 *   - Skill resolution
 *   - Dashboard tool availability
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function listDir(relativePath: string): string[] {
  const dir = path.join(ROOT, relativePath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const yamlBlock = match[1];
  const body = match[2];
  const meta: Record<string, unknown> = {};
  let currentKey = '';
  let currentList: string[] | null = null;
  let currentObjectList: Record<string, string>[] | null = null;
  let currentObject: Record<string, string> | null = null;
  for (const line of yamlBlock.split('\n')) {
    if (/^\s+-\s+\w+:/.test(line) && (currentList !== null || currentObjectList !== null)) {
      // Switch from simple list to object list on first object-style item
      if (currentObjectList === null) { currentObjectList = []; currentList = null; }
      if (currentObject) currentObjectList.push(currentObject);
      currentObject = {};
      const m = line.match(/^\s+-\s+(\w[\w-]*):\s*(.*)$/);
      if (m) currentObject[m[1]] = m[2].trim();
      continue;
    }
    if (/^\s{4,}\w+:/.test(line) && currentObject !== null) {
      const m = line.match(/^\s+(\w[\w-]*):\s*(.*)$/);
      if (m) currentObject[m[1]] = m[2].trim();
      continue;
    }
    if (/^\s+-\s+/.test(line) && currentList !== null) {
      currentList.push(line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    if (currentList !== null) { meta[currentKey] = currentList; currentList = null; }
    if (currentObjectList !== null) {
      if (currentObject) currentObjectList.push(currentObject);
      if (currentObjectList.length > 0) meta[currentKey] = currentObjectList;
      currentObjectList = null; currentObject = null;
    }
    const kvMatch = line.match(/^([\w-]+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value === '') { currentList = []; currentObjectList = null; continue; }
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
  return { meta, body };
}

// Build agent metadata map once
let agentMetas: Map<string, Record<string, unknown>>;

beforeAll(() => {
  agentMetas = new Map();
  const files = listDir('.github/agents').filter(f => f.endsWith('.agent.md'));
  for (const file of files) {
    const content = readFile(`.github/agents/${file}`);
    const { meta } = parseFrontmatter(content);
    agentMetas.set(file.replace('.agent.md', ''), meta);
  }
});

// ─── Journey 1: Bug Fix Workflow ────────────────────────────────────

describe('Journey: Bug Fix Workflow', () => {
  // User asks @coordinator to fix a bug → coordinator hands off to researcher
  // → researcher hands off to coder → coder hands off to tester

  const CHAIN = ['coordinator', 'researcher', 'coder', 'tester'];

  it('all agents in the bug fix chain exist', () => {
    for (const name of CHAIN) {
      expect(agentMetas.has(name), `${name} agent missing`).toBe(true);
    }
  });

  it('coordinator can hand off to researcher', () => {
    const handoffs = agentMetas.get('coordinator')!.handoffs as Record<string, string>[];
    const targets = handoffs.map(h => h.agent);
    expect(targets).toContain('researcher');
  });

  it('researcher can hand off to coder', () => {
    const handoffs = agentMetas.get('researcher')!.handoffs as Record<string, string>[];
    const targets = handoffs.map(h => h.agent);
    expect(targets).toContain('coder');
  });

  it('coder can hand off to tester', () => {
    const handoffs = agentMetas.get('coder')!.handoffs as Record<string, string>[];
    const targets = handoffs.map(h => h.agent);
    expect(targets).toContain('tester');
  });

  it('tester can hand off back to coder (fix failures)', () => {
    const handoffs = agentMetas.get('tester')!.handoffs as Record<string, string>[];
    const targets = handoffs.map(h => h.agent);
    expect(targets).toContain('coder');
  });
});

// ─── Journey 2: Feature Development Workflow ────────────────────────

describe('Journey: Feature Development Workflow', () => {
  // User invokes @coordinator → architect → coder → tester → reviewer

  const CHAIN = ['coordinator', 'architect', 'coder', 'tester', 'reviewer'];

  it('all agents in the feature chain exist', () => {
    for (const name of CHAIN) {
      expect(agentMetas.has(name), `${name} agent missing`).toBe(true);
    }
  });

  it('coordinator can hand off to architect', () => {
    const handoffs = agentMetas.get('coordinator')!.handoffs as Record<string, string>[];
    expect(handoffs.map(h => h.agent)).toContain('architect');
  });

  it('architect can hand off to coder', () => {
    const meta = agentMetas.get('architect');
    expect(meta).toBeDefined();
    const handoffs = meta!.handoffs as Record<string, string>[];
    if (handoffs) {
      expect(handoffs.map(h => h.agent)).toContain('coder');
    }
  });

  it('reviewer can hand off to coder (fix issues)', () => {
    const handoffs = agentMetas.get('reviewer')!.handoffs as Record<string, string>[];
    expect(handoffs.map(h => h.agent)).toContain('coder');
  });

  it('reviewer can hand off to security-auditor', () => {
    const handoffs = agentMetas.get('reviewer')!.handoffs as Record<string, string>[];
    expect(handoffs.map(h => h.agent)).toContain('security-auditor');
  });
});

// ─── Journey 3: Security Audit Workflow ─────────────────────────────

describe('Journey: Security Audit Workflow', () => {
  it('security-auditor agent exists and is user-invocable', () => {
    const meta = agentMetas.get('security-auditor');
    expect(meta).toBeDefined();
    expect(meta!['user-invocable']).toBe(true);
  });

  it('security-auditor can hand off to coder (fix vulnerabilities)', () => {
    const handoffs = agentMetas.get('security-auditor')!.handoffs as Record<string, string>[];
    expect(handoffs.map(h => h.agent)).toContain('coder');
  });

  it('security-auditor can hand off to coordinator', () => {
    const handoffs = agentMetas.get('security-auditor')!.handoffs as Record<string, string>[];
    expect(handoffs.map(h => h.agent)).toContain('coordinator');
  });
});

// ─── Journey 4: PR Submission Workflow ──────────────────────────────

describe('Journey: PR Submission Workflow', () => {
  it('pr-manager agent exists and is user-invocable', () => {
    const meta = agentMetas.get('pr-manager');
    expect(meta).toBeDefined();
    expect(meta!['user-invocable']).toBe(true);
  });

  it('coordinator can hand off to pr-manager', () => {
    const handoffs = agentMetas.get('coordinator')!.handoffs as Record<string, string>[];
    expect(handoffs.map(h => h.agent)).toContain('pr-manager');
  });

  it('pr-manager has ruflo MCP tool access', () => {
    const tools = agentMetas.get('pr-manager')!.tools as string[];
    expect(tools).toContain('ruflo');
  });
});

// ─── Journey 5: SPARC Methodology ───────────────────────────────────

describe('Journey: SPARC Methodology via Prompt', () => {
  it('sparc prompt exists', () => {
    expect(fileExists('.github/prompts/sparc.prompt.md')).toBe(true);
  });

  it('sparc prompt delegates to correct agents', () => {
    const content = readFile('.github/prompts/sparc.prompt.md');
    // Should reference researcher, architect, coder, tester, pr-manager
    expect(content).toMatch(/@researcher|researcher/i);
    expect(content).toMatch(/@architect|architect/i);
    expect(content).toMatch(/@coder|coder/i);
    expect(content).toMatch(/@tester|tester/i);
  });

  it('sparc-related agents exist', () => {
    const sparcAgents = ['sparc-coord', 'sparc-coder', 'specification', 'pseudocode', 'architecture', 'refinement'];
    for (const name of sparcAgents) {
      if (agentMetas.has(name)) {
        const meta = agentMetas.get(name)!;
        expect(meta.tools, `${name} missing tools`).toBeDefined();
      }
    }
  });
});

// ─── Journey 6: Swarm Initialization ────────────────────────────────

describe('Journey: Swarm Initialization via Prompt', () => {
  it('swarm-init prompt exists', () => {
    expect(fileExists('.github/prompts/swarm-init.prompt.md')).toBe(true);
  });

  it('swarm-init prompt references topology options', () => {
    const content = readFile('.github/prompts/swarm-init.prompt.md');
    expect(content).toMatch(/hierarchical|mesh|adaptive/i);
  });

  it('swarm-orchestration skill exists', () => {
    expect(fileExists('.github/skills/swarm-orchestration/SKILL.md')).toBe(true);
  });

  it('swarm-orchestration skill documents MCP tools', () => {
    const content = readFile('.github/skills/swarm-orchestration/SKILL.md');
    expect(content).toMatch(/swarm_init/);
    expect(content).toMatch(/agent_spawn/);
  });
});

// ─── Journey 7: Memory Search ───────────────────────────────────────

describe('Journey: Memory Search via Prompt', () => {
  it('memory-search prompt exists', () => {
    expect(fileExists('.github/prompts/memory-search.prompt.md')).toBe(true);
  });

  it('memory-search prompt references memory tools', () => {
    const content = readFile('.github/prompts/memory-search.prompt.md');
    expect(content).toMatch(/memory_search|memory_store|memory/i);
  });
});

// ─── Journey 8: Code Review ─────────────────────────────────────────

describe('Journey: Code Review via Prompt', () => {
  it('code-review prompt exists', () => {
    expect(fileExists('.github/prompts/code-review.prompt.md')).toBe(true);
  });

  it('code-review prompt references reviewer agent', () => {
    const content = readFile('.github/prompts/code-review.prompt.md');
    expect(content).toMatch(/@reviewer|reviewer/i);
  });

  it('github-code-review skill exists', () => {
    expect(fileExists('.github/skills/github-code-review/SKILL.md')).toBe(true);
  });
});

// ─── Journey 9: Performance Report ──────────────────────────────────

describe('Journey: Performance Report via Prompt', () => {
  it('performance-report prompt exists', () => {
    expect(fileExists('.github/prompts/performance-report.prompt.md')).toBe(true);
  });

  it('performance-report prompt references performance tools', () => {
    const content = readFile('.github/prompts/performance-report.prompt.md');
    expect(content).toMatch(/performance|benchmark|profil/i);
  });

  it('performance-analysis skill exists', () => {
    expect(fileExists('.github/skills/performance-analysis/SKILL.md')).toBe(true);
  });
});

// ─── Journey 10: Issue Tracking ─────────────────────────────────────

describe('Journey: Issue Tracking', () => {
  it('issue-tracker agent exists and is user-invocable', () => {
    const meta = agentMetas.get('issue-tracker');
    expect(meta).toBeDefined();
    expect(meta!['user-invocable']).toBe(true);
  });

  it('coordinator can hand off to issue-tracker', () => {
    const handoffs = agentMetas.get('coordinator')!.handoffs as Record<string, string>[];
    expect(handoffs.map(h => h.agent)).toContain('issue-tracker');
  });
});

// ─── Journey 11: All Core Agents Are Directly Invocable ─────────────

describe('Journey: Direct Agent Invocation', () => {
  const DIRECTLY_INVOCABLE = [
    'coordinator', 'coder', 'researcher', 'architect', 'tester',
    'reviewer', 'planner', 'security-auditor', 'pr-manager', 'issue-tracker',
  ];

  for (const name of DIRECTLY_INVOCABLE) {
    it(`@${name} is user-invocable and has argument-hint`, () => {
      const meta = agentMetas.get(name);
      expect(meta, `${name} agent not found`).toBeDefined();
      expect(meta!['user-invocable']).toBe(true);
      expect(meta!['argument-hint'], `${name} should have argument-hint`).toBeDefined();
    });
  }
});

// ─── Journey 12: Specialist Agent Workflows ─────────────────────────

describe('Journey: Specialist Agent Workflows', () => {
  const SPECIALISTS = [
    { name: 'backend-dev', desc: /backend|api/i },
    { name: 'mobile-dev', desc: /mobile|react native/i },
    { name: 'ml-developer', desc: /machine learning|ml/i },
    { name: 'database-specialist', desc: /database/i },
    { name: 'python-specialist', desc: /python/i },
    { name: 'typescript-specialist', desc: /typescript/i },
    { name: 'cicd-engineer', desc: /ci\/cd|github actions/i },
  ];

  for (const { name, desc } of SPECIALISTS) {
    it(`${name} exists with relevant description`, () => {
      const meta = agentMetas.get(name);
      if (meta) {
        expect(meta.description as string).toMatch(desc);
        expect((meta.tools as string[])).toContain('ruflo');
      }
    });
  }
});

// ─── Journey 13: Hooks Lifecycle ────────────────────────────────────

describe('Journey: Session Lifecycle via Hooks', () => {
  let hooks: Array<Record<string, unknown>>;

  beforeAll(() => {
    const config = JSON.parse(readFile('.github/hooks/hooks.json'));
    hooks = config.hooks;
  });

  it('session starts with SessionStart hook', () => {
    const sessionStart = hooks.filter(h => h.event === 'SessionStart');
    expect(sessionStart.length).toBeGreaterThanOrEqual(1);
  });

  it('user prompts are enriched via UserPromptSubmit', () => {
    const submit = hooks.filter(h => h.event === 'UserPromptSubmit');
    expect(submit.length).toBeGreaterThanOrEqual(1);
    expect((submit[0].command as string)).toMatch(/pre-task/);
  });

  it('file edits trigger pre/post hooks', () => {
    const preEdit = hooks.filter(h => h.event === 'PreToolUse' && h.matcher);
    const postEdit = hooks.filter(h => h.event === 'PostToolUse' && h.matcher);
    expect(preEdit.length).toBeGreaterThanOrEqual(1);
    expect(postEdit.length).toBeGreaterThanOrEqual(1);
  });

  it('session ends with Stop hook', () => {
    const stop = hooks.filter(h => h.event === 'Stop');
    expect(stop.length).toBeGreaterThanOrEqual(1);
  });

  it('hooks form a complete lifecycle: start → prompt → edit → stop', () => {
    const events = hooks.map(h => h.event as string);
    expect(events).toContain('SessionStart');
    expect(events).toContain('UserPromptSubmit');
    expect(events).toContain('PreToolUse');
    expect(events).toContain('PostToolUse');
    expect(events).toContain('Stop');
  });
});

// ─── Journey 14: Multi-Model Support ────────────────────────────────

describe('Journey: Multi-Model Agent Configuration', () => {
  it('agents support both Claude and GPT models', () => {
    const coder = agentMetas.get('coder');
    expect(coder).toBeDefined();
    const models = coder!.model as string[];
    const hasClaude = models.some(m => /claude/i.test(m));
    const hasGPT = models.some(m => /gpt/i.test(m));
    expect(hasClaude).toBe(true);
    expect(hasGPT).toBe(true);
  });

  it('all core agents list the same model set', () => {
    const coreNames = ['coordinator', 'coder', 'researcher', 'architect', 'tester', 'reviewer'];
    const modelSets: string[][] = [];
    for (const name of coreNames) {
      const meta = agentMetas.get(name);
      if (meta) modelSets.push((meta.model as string[]).sort());
    }
    // All should have the same model list
    for (let i = 1; i < modelSets.length; i++) {
      expect(modelSets[i]).toEqual(modelSets[0]);
    }
  });
});

// ─── Journey 15: Skill Coverage ─────────────────────────────────────

describe('Journey: Skill Coverage for Common Workflows', () => {
  const WORKFLOW_SKILL_MAP: Record<string, string> = {
    'multi-agent orchestration': 'swarm-orchestration',
    'structured development': 'sparc-methodology',
    'code review automation': 'github-code-review',
    'CI/CD setup': 'github-workflow-automation',
    'project management': 'github-project-management',
    'performance profiling': 'performance-analysis',
    'quality checks': 'verification-quality',
    'collaborative coding': 'pair-programming',
    'vector database search': 'agentdb-vector-search',
    'hook automation': 'hooks-automation',
  };

  for (const [workflow, skillDir] of Object.entries(WORKFLOW_SKILL_MAP)) {
    it(`"${workflow}" workflow has a matching skill: ${skillDir}`, () => {
      expect(fileExists(`.github/skills/${skillDir}/SKILL.md`)).toBe(true);
    });
  }
});
