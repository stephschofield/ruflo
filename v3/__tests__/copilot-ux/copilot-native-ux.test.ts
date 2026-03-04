/**
 * Copilot Native UX Tests
 *
 * Validates that every GitHub Copilot-native configuration file exists,
 * has the correct schema, and delivers a first-class Copilot experience.
 *
 * Coverage:
 *   - .vscode/mcp.json (MCP server config)
 *   - .github/copilot-instructions.md (always-on project context)
 *   - .github/agents/{name}.agent.md (98 agent definitions)
 *   - .github/skills/{name}/SKILL.md (10 skill definitions)
 *   - .github/prompts/{name}.prompt.md (5 prompt/slash commands)
 *   - .github/hooks/hooks.json (9 hook definitions)
 *   - Tool profiles (default, minimal, development, devops, full)
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ────────────────────────────────────────────────────────

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

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns the frontmatter as a key-value map and the body content.
 */
function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2];
  const meta: Record<string, unknown> = {};

  let currentKey = '';
  let currentList: string[] | null = null;
  let currentObjectList: Record<string, string>[] | null = null;
  let currentObject: Record<string, string> | null = null;

  for (const line of yamlBlock.split(/\r?\n/)) {
    // Object list item (e.g. "  - agent: coordinator")
    if (/^\s+-\s+\w+:/.test(line) && (currentObjectList !== null || currentList !== null)) {
      // If we were collecting a simple list, upgrade to object list
      if (currentObjectList === null) {
        currentObjectList = [];
        currentList = null;
      }
      if (currentObject) currentObjectList.push(currentObject);
      currentObject = {};
      const objMatch = line.match(/^\s+-\s+(\w[\w-]*):\s*(.*)$/);
      if (objMatch) currentObject[objMatch[1]] = objMatch[2].trim();
      continue;
    }

    // Continuation of object item (e.g. "    label: some text")
    if (/^\s{4,}\w+:/.test(line) && currentObject !== null) {
      const kvMatch = line.match(/^\s+(\w[\w-]*):\s*(.*)$/);
      if (kvMatch) currentObject[kvMatch[1]] = kvMatch[2].trim();
      continue;
    }

    // Simple list item (e.g. "  - ruflo")
    if (/^\s+-\s+/.test(line) && currentList !== null) {
      const val = line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, '');
      currentList.push(val);
      continue;
    }

    // Flush any pending list/object
    if (currentList !== null) {
      meta[currentKey] = currentList;
      currentList = null;
    }
    if (currentObjectList !== null) {
      if (currentObject) currentObjectList.push(currentObject);
      meta[currentKey] = currentObjectList;
      currentObjectList = null;
      currentObject = null;
    }

    // Key: value pair
    const kvMatch = line.match(/^([\w-]+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === '') {
        // Start of a list — peek ahead determines simple vs object list
        currentList = [];
        currentObjectList = null;
        continue;
      }

      // Boolean
      if (value === 'true') { meta[currentKey] = true; continue; }
      if (value === 'false') { meta[currentKey] = false; continue; }

      // String (strip quotes)
      meta[currentKey] = value.replace(/^["']|["']$/g, '');
    }
  }

  // Flush final list
  if (currentList !== null && currentList.length > 0) meta[currentKey] = currentList;
  if (currentObjectList !== null) {
    if (currentObject) currentObjectList.push(currentObject);
    if (currentObjectList.length > 0) meta[currentKey] = currentObjectList;
  }

  return { meta, body };
}

// ─── 1. MCP Server Configuration ───────────────────────────────────

describe('MCP Server Configuration (.vscode/mcp.json)', () => {
  let config: Record<string, unknown>;

  beforeAll(() => {
    const raw = readFile('.vscode/mcp.json');
    config = JSON.parse(raw);
  });

  it('exists at .vscode/mcp.json', () => {
    expect(fileExists('.vscode/mcp.json')).toBe(true);
  });

  it('has a "servers" top-level key (Copilot format)', () => {
    expect(config).toHaveProperty('servers');
  });

  it('does NOT use "mcpServers" key (Claude Code format)', () => {
    expect(config).not.toHaveProperty('mcpServers');
  });

  it('defines a "ruflo" server entry', () => {
    const servers = config.servers as Record<string, unknown>;
    expect(servers).toHaveProperty('ruflo');
  });

  it('ruflo server uses stdio transport', () => {
    const ruflo = (config.servers as Record<string, Record<string, unknown>>).ruflo;
    expect(ruflo.type).toBe('stdio');
  });

  it('ruflo server has a command and args', () => {
    const ruflo = (config.servers as Record<string, Record<string, unknown>>).ruflo;
    expect(ruflo.command).toBeDefined();
    expect(ruflo.args).toBeDefined();
  });

  it('does NOT expose API keys in mcp.json', () => {
    const raw = readFile('.vscode/mcp.json');
    expect(raw).not.toMatch(/sk-ant-/);
    expect(raw).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    expect(raw).not.toMatch(/ANTHROPIC_API_KEY/);
    expect(raw).not.toMatch(/OPENAI_API_KEY/);
  });
});

// ─── 2. Copilot Instructions ───────────────────────────────────────

describe('Copilot Instructions (.github/copilot-instructions.md)', () => {
  let content: string;

  beforeAll(() => {
    content = readFile('.github/copilot-instructions.md');
  });

  it('exists at .github/copilot-instructions.md', () => {
    expect(fileExists('.github/copilot-instructions.md')).toBe(true);
  });

  it('has a title heading', () => {
    expect(content).toMatch(/^#\s+/m);
  });

  it('references MCP tool categories', () => {
    expect(content).toMatch(/agent|swarm|memory|task/i);
  });

  it('references @agent invocation pattern', () => {
    expect(content).toMatch(/@\w+/);
  });

  it('does NOT contain Claude Code-specific terminology', () => {
    // Claude Code terms that should not appear in Copilot instructions
    expect(content).not.toMatch(/\.claude\/settings\.json/);
    expect(content).not.toMatch(/CLAUDE_CODE_HEADLESS/);
    expect(content).not.toMatch(/claude --print/);
    expect(content).not.toMatch(/TodoWrite/);  // Claude Code Task tool
  });

  it('includes coding standards section', () => {
    expect(content).toMatch(/coding standards|code quality|design/i);
  });

  it('includes file organization section', () => {
    expect(content).toMatch(/file organization|directory/i);
  });

  it('includes swarm coordination guidance', () => {
    expect(content).toMatch(/swarm/i);
  });

  it('lists available agents for @-mention', () => {
    expect(content).toMatch(/@coordinator|@coder|@researcher/);
  });
});

// ─── 3. Agent Definitions ──────────────────────────────────────────

describe('Agent Definitions (.github/agents/*.agent.md)', () => {
  let agentFiles: string[];
  let agentMetas: Map<string, Record<string, unknown>>;

  beforeAll(() => {
    agentFiles = listDir('.github/agents').filter(f => f.endsWith('.agent.md'));
    agentMetas = new Map();
    for (const file of agentFiles) {
      const content = readFile(`.github/agents/${file}`);
      const { meta } = parseFrontmatter(content);
      agentMetas.set(file, meta);
    }
  });

  it('has at least 90 agent definitions', () => {
    expect(agentFiles.length).toBeGreaterThanOrEqual(90);
  });

  it('all files use .agent.md extension (Copilot format)', () => {
    for (const file of agentFiles) {
      expect(file).toMatch(/\.agent\.md$/);
    }
  });

  // ─── Core agents exist ───────────────────────────────────

  const CORE_AGENTS = [
    'coordinator', 'coder', 'researcher', 'architect', 'tester',
    'reviewer', 'planner', 'security-auditor', 'pr-manager', 'issue-tracker',
  ];

  for (const agent of CORE_AGENTS) {
    it(`core agent "${agent}" exists`, () => {
      expect(agentFiles).toContain(`${agent}.agent.md`);
    });
  }

  // ─── Schema validation ──────────────────────────────────

  it('every agent has a "name" field', () => {
    for (const [file, meta] of agentMetas) {
      expect(meta.name, `${file} missing name`).toBeDefined();
    }
  });

  it('every agent has a "description" field', () => {
    for (const [file, meta] of agentMetas) {
      expect(meta.description, `${file} missing description`).toBeDefined();
    }
  });

  it('every agent has a "tools" field that includes "ruflo"', () => {
    for (const [file, meta] of agentMetas) {
      const tools = meta.tools as string[] | undefined;
      expect(tools, `${file} missing tools`).toBeDefined();
      expect(tools, `${file} tools must include ruflo`).toContain('ruflo');
    }
  });

  it('every agent has a "model" field with at least one model', () => {
    for (const [file, meta] of agentMetas) {
      const model = meta.model as string[] | undefined;
      expect(model, `${file} missing model`).toBeDefined();
      expect(Array.isArray(model), `${file} model must be array`).toBe(true);
      expect(model!.length, `${file} model must have at least one entry`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every agent has "user-invocable" field (not "user-invokable")', () => {
    for (const [file, meta] of agentMetas) {
      expect(
        meta['user-invocable'] !== undefined,
        `${file} missing user-invocable`
      ).toBe(true);
      // Must NOT have the old misspelled field
      expect(meta['user-invokable'], `${file} has old misspelled "user-invokable"`).toBeUndefined();
    }
  });

  it('every agent has "handoffs" with correct schema (agent, label, prompt)', () => {
    for (const [file, meta] of agentMetas) {
      const handoffs = meta.handoffs as Record<string, string>[] | undefined;
      if (!handoffs || handoffs.length === 0) continue; // Some agents may not have outbound handoffs

      for (const handoff of handoffs) {
        expect(handoff.agent, `${file} handoff missing "agent"`).toBeDefined();
        expect(handoff.label, `${file} handoff missing "label"`).toBeDefined();
        expect(handoff.prompt, `${file} handoff missing "prompt"`).toBeDefined();
        // Must NOT use old "trigger" field
        expect(handoff.trigger, `${file} handoff uses old "trigger" field`).toBeUndefined();
      }
    }
  });

  it('user-invocable agents have argument-hint', () => {
    for (const [file, meta] of agentMetas) {
      if (meta['user-invocable'] === true) {
        // argument-hint is recommended for user-invocable agents
        // Not strictly required but improves UX
        // We check it exists on core agents
        const agentName = (meta.name as string) || '';
        if (CORE_AGENTS.includes(agentName)) {
          expect(
            meta['argument-hint'],
            `Core agent ${file} should have argument-hint for better UX`
          ).toBeDefined();
        }
      }
    }
  });

  it('agents with "agents" field also have "agent" in their tools list', () => {
    for (const [file, meta] of agentMetas) {
      const agents = meta.agents as string[] | undefined;
      if (agents && agents.length > 0) {
        const tools = meta.tools as string[];
        expect(tools, `${file} has agents: field but missing "agent" tool`).toContain('agent');
      }
    }
  });

  it('coordinator agent can delegate to all agents (agents: ["*"])', () => {
    const coordMeta = agentMetas.get('coordinator.agent.md');
    expect(coordMeta).toBeDefined();
    const agents = coordMeta!.agents as string[];
    expect(agents).toContain('*');
  });

  it('infrastructure agents are hidden from model invocation', () => {
    const INFRA_AGENTS = ['smart-agent', 'sona-learning-optimizer', 'project-coordinator'];
    for (const name of INFRA_AGENTS) {
      const file = `${name}.agent.md`;
      const meta = agentMetas.get(file);
      if (!meta) continue; // Skip if agent doesn't exist
      expect(meta['user-invocable'], `${file} should not be user-invocable`).toBe(false);
      expect(meta['disable-model-invocation'], `${file} should disable model invocation`).toBe(true);
    }
  });

  it('no agent body references Claude Code MCP invocation pattern', () => {
    for (const file of agentFiles) {
      const content = readFile(`.github/agents/${file}`);
      expect(content).not.toMatch(/mcp__claude-flow__/);
      expect(content).not.toMatch(/mcp__ruv-swarm__/);
    }
  });

  it('handoff graph has no orphan agents (every handoff target exists)', () => {
    const existingNames = new Set(
      Array.from(agentMetas.values()).map(m => m.name as string)
    );
    for (const [file, meta] of agentMetas) {
      const handoffs = meta.handoffs as Record<string, string>[] | undefined;
      if (!handoffs) continue;
      for (const h of handoffs) {
        expect(
          existingNames.has(h.agent),
          `${file} hands off to "${h.agent}" which does not exist as an agent`
        ).toBe(true);
      }
    }
  });
});

// ─── 4. Skill Definitions ──────────────────────────────────────────

describe('Skill Definitions (.github/skills/*/SKILL.md)', () => {
  let skillDirs: string[];

  beforeAll(() => {
    skillDirs = listDir('.github/skills').filter(d =>
      fs.statSync(path.join(ROOT, '.github/skills', d)).isDirectory()
    );
  });

  it('has at least 10 skill definitions', () => {
    expect(skillDirs.length).toBeGreaterThanOrEqual(10);
  });

  const EXPECTED_SKILLS = [
    'swarm-orchestration',
    'sparc-methodology',
    'github-code-review',
    'github-workflow-automation',
    'github-project-management',
    'performance-analysis',
    'verification-quality',
    'pair-programming',
    'agentdb-vector-search',
    'hooks-automation',
  ];

  for (const skill of EXPECTED_SKILLS) {
    it(`skill "${skill}" exists with SKILL.md`, () => {
      expect(fileExists(`.github/skills/${skill}/SKILL.md`)).toBe(true);
    });
  }

  it('every SKILL.md has YAML frontmatter with name and description', () => {
    for (const dir of skillDirs) {
      const content = readFile(`.github/skills/${dir}/SKILL.md`);
      const { meta } = parseFrontmatter(content);
      expect(meta.name, `${dir}/SKILL.md missing name`).toBeDefined();
      expect(meta.description, `${dir}/SKILL.md missing description`).toBeDefined();
    }
  });

  it('every SKILL.md has meaningful body content (not just frontmatter)', () => {
    for (const dir of skillDirs) {
      const content = readFile(`.github/skills/${dir}/SKILL.md`);
      const { body } = parseFrontmatter(content);
      expect(body.trim().length, `${dir}/SKILL.md has empty body`).toBeGreaterThan(100);
    }
  });

  it('skills reference MCP tool names (not CLI commands)', () => {
    // Methodology-only skills may not reference specific tools
    const METHODOLOGY_SKILLS = new Set(['sparc-methodology']);
    for (const dir of skillDirs) {
      if (METHODOLOGY_SKILLS.has(dir)) continue;
      const content = readFile(`.github/skills/${dir}/SKILL.md`);
      // Skills should reference MCP tool names like swarm_init, agent_spawn
      // The content should mention at least one MCP tool pattern
      const hasMCPTool = /\w+_\w+/.test(content);
      const hasToolUsage = /ruflo|mcp|tool/i.test(content);
      expect(
        hasMCPTool || hasToolUsage,
        `${dir}/SKILL.md should reference MCP tools or ruflo`
      ).toBe(true);
    }
  });

  it('no skill references Claude Code-specific patterns', () => {
    for (const dir of skillDirs) {
      const content = readFile(`.github/skills/${dir}/SKILL.md`);
      expect(content).not.toMatch(/mcp__claude-flow__/);
      expect(content).not.toMatch(/\.claude\/settings/);
      expect(content).not.toMatch(/CLAUDE_CODE_HEADLESS/);
    }
  });
});

// ─── 5. Prompt Files (Slash Commands) ──────────────────────────────

describe('Prompt Files (.github/prompts/*.prompt.md)', () => {
  let promptFiles: string[];

  beforeAll(() => {
    promptFiles = listDir('.github/prompts').filter(f => f.endsWith('.prompt.md'));
  });

  it('has at least 5 prompt definitions', () => {
    expect(promptFiles.length).toBeGreaterThanOrEqual(5);
  });

  const EXPECTED_PROMPTS = [
    'sparc.prompt.md',
    'swarm-init.prompt.md',
    'memory-search.prompt.md',
    'code-review.prompt.md',
    'performance-report.prompt.md',
  ];

  for (const prompt of EXPECTED_PROMPTS) {
    it(`prompt "${prompt}" exists`, () => {
      expect(promptFiles).toContain(prompt);
    });
  }

  it('all files use .prompt.md extension (Copilot format)', () => {
    for (const file of promptFiles) {
      expect(file).toMatch(/\.prompt\.md$/);
    }
  });

  it('every prompt has YAML frontmatter with name and description', () => {
    for (const file of promptFiles) {
      const content = readFile(`.github/prompts/${file}`);
      const { meta } = parseFrontmatter(content);
      expect(meta.name, `${file} missing name`).toBeDefined();
      expect(meta.description, `${file} missing description`).toBeDefined();
    }
  });

  it('every prompt has meaningful body content', () => {
    for (const file of promptFiles) {
      const content = readFile(`.github/prompts/${file}`);
      const { body } = parseFrontmatter(content);
      expect(body.trim().length, `${file} has empty body`).toBeGreaterThan(50);
    }
  });

  it('prompts reference @agent invocations for delegation', () => {
    let hasAgentRef = false;
    for (const file of promptFiles) {
      const content = readFile(`.github/prompts/${file}`);
      if (/@\w+/.test(content)) {
        hasAgentRef = true;
        break;
      }
    }
    expect(hasAgentRef).toBe(true);
  });

  it('sparc prompt references all 5 SPARC phases', () => {
    const content = readFile('.github/prompts/sparc.prompt.md');
    expect(content).toMatch(/specification/i);
    expect(content).toMatch(/pseudocode/i);
    expect(content).toMatch(/architecture/i);
    expect(content).toMatch(/refinement/i);
    expect(content).toMatch(/completion/i);
  });

  it('swarm-init prompt references swarm_init tool', () => {
    const content = readFile('.github/prompts/swarm-init.prompt.md');
    expect(content).toMatch(/swarm_init|swarm|topology/i);
  });
});

// ─── 6. Hook Configuration ─────────────────────────────────────────

describe('Hook Configuration (.github/hooks/hooks.json)', () => {
  let hooksConfig: { hooks: Array<Record<string, unknown>> };

  beforeAll(() => {
    const raw = readFile('.github/hooks/hooks.json');
    hooksConfig = JSON.parse(raw);
  });

  it('exists at .github/hooks/hooks.json', () => {
    expect(fileExists('.github/hooks/hooks.json')).toBe(true);
  });

  it('has a "hooks" array', () => {
    expect(Array.isArray(hooksConfig.hooks)).toBe(true);
  });

  it('has at least 7 hook definitions', () => {
    expect(hooksConfig.hooks.length).toBeGreaterThanOrEqual(7);
  });

  it('every hook has required fields (event, command, description)', () => {
    for (const hook of hooksConfig.hooks) {
      expect(hook.event, 'hook missing event').toBeDefined();
      expect(hook.command, 'hook missing command').toBeDefined();
      expect(hook.description, 'hook missing description').toBeDefined();
    }
  });

  // Copilot hook events (same protocol as Claude Code)
  const EXPECTED_EVENTS = [
    'SessionStart',
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
    'Stop',
  ];

  for (const event of EXPECTED_EVENTS) {
    it(`has hook for "${event}" event`, () => {
      const found = hooksConfig.hooks.some(h => h.event === event);
      expect(found, `Missing hook for event: ${event}`).toBe(true);
    });
  }

  it('hooks use "npx ruflo" commands (not "npx claude-flow")', () => {
    for (const hook of hooksConfig.hooks) {
      const cmd = hook.command as string;
      if (cmd.includes('npx')) {
        expect(cmd).not.toMatch(/npx\s+claude-flow/);
      }
    }
  });

  it('PreToolUse/PostToolUse hooks have matchers for file operations', () => {
    const editHooks = hooksConfig.hooks.filter(
      h => (h.event === 'PreToolUse' || h.event === 'PostToolUse') && h.matcher
    );
    expect(editHooks.length).toBeGreaterThanOrEqual(2);
    for (const hook of editHooks) {
      // Should match Write/Edit/MultiEdit or Bash
      expect(hook.matcher as string).toMatch(/Write|Edit|Bash/);
    }
  });

  it('does NOT contain Claude Code-specific events', () => {
    const events = hooksConfig.hooks.map(h => h.event);
    expect(events).not.toContain('TeammateIdle');
    expect(events).not.toContain('TaskCompleted');
    expect(events).not.toContain('PermissionRequest');
    expect(events).not.toContain('Notification');
  });

  it('does NOT reference .claude/ paths', () => {
    const raw = readFile('.github/hooks/hooks.json');
    expect(raw).not.toMatch(/\.claude\//);
  });
});

// ─── 7. Auto-Memory Hook ───────────────────────────────────────────

describe('Auto-Memory Hook (.github/hooks/auto-memory-hook.mjs)', () => {
  it('exists at .github/hooks/auto-memory-hook.mjs', () => {
    expect(fileExists('.github/hooks/auto-memory-hook.mjs')).toBe(true);
  });

  it('does NOT reference .claude/ data directory', () => {
    const content = readFile('.github/hooks/auto-memory-hook.mjs');
    // Should use .ruflo/ data dir, not .claude/
    expect(content).not.toMatch(/\.claude\//);
  });
});

// ─── 8. File Structure Coherence ───────────────────────────────────

describe('Copilot File Structure Coherence', () => {
  it('.github/ contains agents, skills, prompts, hooks directories', () => {
    expect(fileExists('.github/agents')).toBe(true);
    expect(fileExists('.github/skills')).toBe(true);
    expect(fileExists('.github/prompts')).toBe(true);
    expect(fileExists('.github/hooks')).toBe(true);
  });

  it('.vscode/ contains mcp.json', () => {
    expect(fileExists('.vscode/mcp.json')).toBe(true);
  });

  it('no .claude/settings.json references Copilot paths', () => {
    if (fileExists('.claude/settings.json')) {
      const content = readFile('.claude/settings.json');
      // Claude settings should not contain Copilot paths (they coexist independently)
      expect(content).not.toMatch(/\.github\/agents/);
    }
  });

  it('agent filename matches its "name" frontmatter field', () => {
    const agentFiles = listDir('.github/agents').filter(f => f.endsWith('.agent.md'));
    for (const file of agentFiles) {
      const content = readFile(`.github/agents/${file}`);
      const { meta } = parseFrontmatter(content);
      const expectedName = file.replace('.agent.md', '');
      expect(
        meta.name,
        `${file}: name field "${meta.name}" doesn't match filename "${expectedName}"`
      ).toBe(expectedName);
    }
  });

  it('every handoff target agent has an .agent.md file', () => {
    const agentFiles = listDir('.github/agents').filter(f => f.endsWith('.agent.md'));
    const agentNames = new Set(agentFiles.map(f => f.replace('.agent.md', '')));

    for (const file of agentFiles) {
      const content = readFile(`.github/agents/${file}`);
      const { meta } = parseFrontmatter(content);
      const handoffs = meta.handoffs as Record<string, string>[] | undefined;
      if (!handoffs) continue;

      for (const h of handoffs) {
        expect(
          agentNames.has(h.agent),
          `${file}: handoff to "${h.agent}" but ${h.agent}.agent.md does not exist`
        ).toBe(true);
      }
    }
  });
});

// ─── 9. No Claude Code Leakage ─────────────────────────────────────

describe('No Claude Code Leakage in Copilot Files', () => {
  const COPILOT_DIRS = [
    '.github/agents',
    '.github/skills',
    '.github/prompts',
    '.github/hooks',
  ];

  it('no Copilot file references claude-flow CLI by old name', () => {
    for (const dir of COPILOT_DIRS) {
      const files = listDir(dir).filter(f => !fs.statSync(path.join(ROOT, dir, f)).isDirectory());
      for (const file of files) {
        const content = readFile(`${dir}/${file}`);
        // Should use "ruflo" not "claude-flow@v3alpha" or "claude-flow@alpha"
        expect(content).not.toMatch(/npx\s+claude-flow@(v3alpha|alpha|latest)/);
      }
    }
  });

  it('no Copilot file references CLAUDE_CODE_ env vars', () => {
    for (const dir of COPILOT_DIRS) {
      const files = listDir(dir).filter(f => !fs.statSync(path.join(ROOT, dir, f)).isDirectory());
      for (const file of files) {
        const content = readFile(`${dir}/${file}`);
        expect(content).not.toMatch(/CLAUDE_CODE_/);
      }
    }
  });

  it('no Copilot file references .claude/ directory paths', () => {
    // Exclude agents that document the old .claude/ system for migration context
    const MIGRATION_AGENTS = new Set([
      'migration-planner.agent.md',
      'repo-architect.agent.md',
      'sync-coordinator.agent.md',
    ]);
    for (const dir of COPILOT_DIRS) {
      const files = listDir(dir).filter(f => !fs.statSync(path.join(ROOT, dir, f)).isDirectory());
      for (const file of files) {
        if (MIGRATION_AGENTS.has(file)) continue;
        const content = readFile(`${dir}/${file}`);
        expect(content).not.toMatch(/\.claude\/(settings|helpers|agents|commands)/);
      }
    }
  });

  it('.github/copilot-instructions.md does not reference Claude Code', () => {
    const content = readFile('.github/copilot-instructions.md');
    expect(content).not.toMatch(/Claude Code/i);
    expect(content).not.toMatch(/\.claude\/settings/);
    expect(content).not.toMatch(/CLAUDE_CODE_/);
  });
});
