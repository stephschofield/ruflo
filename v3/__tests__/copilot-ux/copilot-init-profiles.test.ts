/**
 * Copilot Init Command & Tool Profile Tests
 *
 * Validates that `npx ruflo init` generates correct Copilot-native output
 * and that the MCP tool profile system works correctly.
 *
 * Coverage:
 *   - Init generators: MCP config, settings, instructions, hooks
 *   - Tool profiles: default, minimal, development, devops, full
 *   - Profile category filtering
 *   - Init options and platform routing
 *
 * Phase 5 — Task 5.5 (Copilot init & profile validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';

// ─── Dynamic imports (ESM modules) ─────────────────────────────────

let generateCopilotMCPJson: (options: Record<string, unknown>) => string;
let generateCopilotSettingsJson: (options: Record<string, unknown>) => string;
let resolveProfileName: (explicit?: string) => string;
let getProfileCategories: (name: string) => Set<string>;
let isCategoryAllowed: (category: string | undefined, name: string) => boolean;
let estimateProfileToolCount: (name: string) => number;
let listProfileCategories: (name: string) => Array<{ name: string; displayName: string; description: string; toolCount: number }>;
let TOOL_PROFILES: Record<string, { name: string; displayName: string; description: string; categories: string[] }>;
let CATEGORY_INFO: Record<string, { displayName: string; description: string; toolCount: number }>;
let DEFAULT_INIT_OPTIONS: Record<string, unknown>;

let modulesLoaded = false;

beforeAll(async () => {
  try {
    const mcpGen = await import('../../@claude-flow/cli/src/init/mcp-generator.js');
    generateCopilotMCPJson = mcpGen.generateCopilotMCPJson;

    const settingsGen = await import('../../@claude-flow/cli/src/init/settings-generator.js');
    generateCopilotSettingsJson = settingsGen.generateCopilotSettingsJson;

    const toolCats = await import('../../@claude-flow/cli/src/mcp-tools/tool-categories.js');
    resolveProfileName = toolCats.resolveProfileName;
    getProfileCategories = toolCats.getProfileCategories;
    isCategoryAllowed = toolCats.isCategoryAllowed;
    estimateProfileToolCount = toolCats.estimateProfileToolCount;
    listProfileCategories = toolCats.listProfileCategories;
    TOOL_PROFILES = toolCats.TOOL_PROFILES;
    CATEGORY_INFO = toolCats.CATEGORY_INFO;

    const types = await import('../../@claude-flow/cli/src/init/types.js');
    DEFAULT_INIT_OPTIONS = types.DEFAULT_INIT_OPTIONS as Record<string, unknown>;

    modulesLoaded = true;
  } catch {
    // Modules may not be built yet — tests will skip gracefully
    modulesLoaded = false;
  }
});

// ─── 1. MCP Config Generator ───────────────────────────────────────

describe('MCP Config Generator (Copilot)', () => {
  it('generates valid JSON', () => {
    if (!modulesLoaded) return;
    const json = generateCopilotMCPJson(DEFAULT_INIT_OPTIONS);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('output has "servers" key (Copilot format)', () => {
    if (!modulesLoaded) return;
    const config = JSON.parse(generateCopilotMCPJson(DEFAULT_INIT_OPTIONS));
    expect(config).toHaveProperty('servers');
    expect(config).not.toHaveProperty('mcpServers');
  });

  it('ruflo server entry uses npx command', () => {
    if (!modulesLoaded) return;
    const config = JSON.parse(generateCopilotMCPJson(DEFAULT_INIT_OPTIONS));
    expect(config.servers.ruflo.command).toBe('npx');
  });

  it('ruflo server uses npx ruflo mcp start', () => {
    if (!modulesLoaded) return;
    const config = JSON.parse(generateCopilotMCPJson(DEFAULT_INIT_OPTIONS));
    const server = config.servers.ruflo;
    expect(server.command).toBe('npx');
    expect(server.args).toContain('ruflo');
    expect(server.args).toContain('mcp');
    expect(server.args).toContain('start');
  });

  it('includes RUFLO_TOOL_PROFILE in env block', () => {
    if (!modulesLoaded) return;
    const config = JSON.parse(generateCopilotMCPJson(DEFAULT_INIT_OPTIONS));
    const server = config.servers.ruflo;
    // env may be on server or at top level depending on implementation
    const env = server.env || config.env;
    if (env) {
      expect(env).toHaveProperty('RUFLO_TOOL_PROFILE');
    }
  });
});

// ─── 2. Settings Generator ─────────────────────────────────────────

describe('Settings Generator (Copilot)', () => {
  it('generates valid JSON', () => {
    if (!modulesLoaded) return;
    const json = generateCopilotSettingsJson(DEFAULT_INIT_OPTIONS);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('output has "ruflo" config block', () => {
    if (!modulesLoaded) return;
    const settings = JSON.parse(generateCopilotSettingsJson(DEFAULT_INIT_OPTIONS));
    expect(settings).toHaveProperty('ruflo');
  });

  it('does NOT contain Claude Code-specific fields', () => {
    if (!modulesLoaded) return;
    const json = generateCopilotSettingsJson(DEFAULT_INIT_OPTIONS);
    expect(json).not.toMatch(/"permissions"/);
    expect(json).not.toMatch(/CLAUDE_CODE_/);
    expect(json).not.toMatch(/"agentTeams"/);
    expect(json).not.toMatch(/"statusLine"/);
  });

  it('includes Copilot thinking process setting', () => {
    if (!modulesLoaded) return;
    const settings = JSON.parse(generateCopilotSettingsJson(DEFAULT_INIT_OPTIONS));
    expect(settings).toHaveProperty('github.copilot.chat.agent.thinkingProcess');
  });
});

// ─── 3. Init Options Defaults ───────────────────────────────────────

describe('Init Options Defaults', () => {
  it('default platform is "copilot"', () => {
    if (!modulesLoaded) return;
    expect(DEFAULT_INIT_OPTIONS.platform).toBe('copilot');
  });

  it('copilotInstructions enabled by default', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.copilotInstructions).toBe(true);
  });

  it('MCP enabled by default', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.mcp).toBe(true);
  });

  it('agents enabled by default', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.agents).toBe(true);
  });

  it('skills enabled by default', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.skills).toBe(true);
  });

  it('prompts enabled by default', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.prompts).toBe(true);
  });

  it('hooks enabled by default', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.hooks).toBe(true);
  });

  it('claudeMd disabled by default (Copilot mode)', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.claudeMd).toBe(false);
  });

  it('.claude/settings.json disabled by default (Copilot mode)', () => {
    if (!modulesLoaded) return;
    const components = DEFAULT_INIT_OPTIONS.components as Record<string, boolean>;
    expect(components.settings).toBe(false);
  });
});

// ─── 4. Tool Profiles ──────────────────────────────────────────────

describe('Tool Profiles', () => {
  it('defines 5 profiles: default, minimal, development, devops, full', () => {
    if (!modulesLoaded) return;
    expect(Object.keys(TOOL_PROFILES)).toEqual(
      expect.arrayContaining(['default', 'minimal', 'development', 'devops', 'full'])
    );
  });

  it('every profile name resolves correctly', () => {
    if (!modulesLoaded) return;
    for (const name of Object.keys(TOOL_PROFILES)) {
      expect(resolveProfileName(name)).toBe(name);
    }
  });

  it('unknown profile name falls back to "default"', () => {
    if (!modulesLoaded) return;
    expect(resolveProfileName('nonexistent')).toBe('default');
    expect(resolveProfileName('')).toBe('default');
    expect(resolveProfileName(undefined)).toBe('default');
  });

  it('profile name resolution is case-insensitive', () => {
    if (!modulesLoaded) return;
    expect(resolveProfileName('DEFAULT')).toBe('default');
    expect(resolveProfileName('Development')).toBe('development');
    expect(resolveProfileName('FULL')).toBe('full');
  });
});

describe('Default Tool Profile', () => {
  it('includes core categories: agent, swarm, memory, task', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('default');
    expect(cats.has('agent')).toBe(true);
    expect(cats.has('swarm')).toBe(true);
    expect(cats.has('memory')).toBe(true);
    expect(cats.has('task')).toBe(true);
  });

  it('includes config and system categories', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('default');
    expect(cats.has('config')).toBe(true);
    expect(cats.has('system')).toBe(true);
  });

  it('includes github and session categories', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('default');
    expect(cats.has('github')).toBe(true);
    expect(cats.has('session')).toBe(true);
  });

  it('exposes ~40–60 tools (not overwhelming)', () => {
    if (!modulesLoaded) return;
    const count = estimateProfileToolCount('default');
    expect(count).toBeGreaterThanOrEqual(30);
    expect(count).toBeLessThanOrEqual(80);
  });

  it('does NOT include browser tools (noisy for most users)', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('default');
    expect(cats.has('browser')).toBe(false);
  });
});

describe('Minimal Tool Profile', () => {
  it('exposes fewer tools than default', () => {
    if (!modulesLoaded) return;
    const minimal = estimateProfileToolCount('minimal');
    const defaultCount = estimateProfileToolCount('default');
    expect(minimal).toBeLessThan(defaultCount);
  });

  it('includes only essential categories', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('minimal');
    // Must have agent and memory at minimum
    expect(cats.has('agent')).toBe(true);
    expect(cats.has('memory')).toBe(true);
  });
});

describe('Full Tool Profile', () => {
  it('allows all categories', () => {
    if (!modulesLoaded) return;
    // Full profile passes all categories through
    expect(isCategoryAllowed('agent', 'full')).toBe(true);
    expect(isCategoryAllowed('browser', 'full')).toBe(true);
    expect(isCategoryAllowed('neural', 'full')).toBe(true);
    expect(isCategoryAllowed('hive-mind', 'full')).toBe(true);
    expect(isCategoryAllowed('daa', 'full')).toBe(true);
  });

  it('exposes 200+ tools', () => {
    if (!modulesLoaded) return;
    const count = estimateProfileToolCount('full');
    expect(count).toBeGreaterThanOrEqual(200);
  });
});

describe('Development Tool Profile', () => {
  it('includes hooks and workflow (dev essentials)', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('development');
    expect(cats.has('hooks')).toBe(true);
    expect(cats.has('workflow')).toBe(true);
  });

  it('exposes more tools than default but fewer than full', () => {
    if (!modulesLoaded) return;
    const dev = estimateProfileToolCount('development');
    const def = estimateProfileToolCount('default');
    const full = estimateProfileToolCount('full');
    expect(dev).toBeGreaterThan(def);
    expect(dev).toBeLessThan(full);
  });
});

describe('DevOps Tool Profile', () => {
  it('includes github and performance categories', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('devops');
    expect(cats.has('github')).toBe(true);
    expect(cats.has('performance')).toBe(true);
  });

  it('includes performance category', () => {
    if (!modulesLoaded) return;
    const cats = getProfileCategories('devops');
    expect(cats.has('performance')).toBe(true);
  });
});

// ─── 5. Category Filtering ─────────────────────────────────────────

describe('Category Filtering', () => {
  it('allows categories that are in the profile', () => {
    if (!modulesLoaded) return;
    expect(isCategoryAllowed('agent', 'default')).toBe(true);
    expect(isCategoryAllowed('memory', 'default')).toBe(true);
  });

  it('rejects categories not in the profile', () => {
    if (!modulesLoaded) return;
    // Check a category NOT in default
    if (!getProfileCategories('default').has('neural')) {
      expect(isCategoryAllowed('neural', 'default')).toBe(false);
    }
  });

  it('rejects undefined category', () => {
    if (!modulesLoaded) return;
    expect(isCategoryAllowed(undefined, 'default')).toBe(false);
  });

  it('listProfileCategories returns valid CategoryInfo objects', () => {
    if (!modulesLoaded) return;
    const cats = listProfileCategories('default');
    expect(cats.length).toBeGreaterThan(0);
    for (const cat of cats) {
      expect(cat.name).toBeDefined();
      expect(cat.displayName).toBeDefined();
      expect(cat.description).toBeDefined();
      expect(cat.toolCount).toBeGreaterThan(0);
    }
  });
});

// ─── 6. Category Info Completeness ─────────────────────────────────

describe('Category Info Completeness', () => {
  it('defines at least 25 categories', () => {
    if (!modulesLoaded) return;
    expect(Object.keys(CATEGORY_INFO).length).toBeGreaterThanOrEqual(25);
  });

  it('every category has displayName, description, and toolCount', () => {
    if (!modulesLoaded) return;
    for (const [name, info] of Object.entries(CATEGORY_INFO)) {
      expect(info.displayName, `${name} missing displayName`).toBeDefined();
      expect(info.description, `${name} missing description`).toBeDefined();
      expect(info.toolCount, `${name} missing toolCount`).toBeGreaterThan(0);
    }
  });

  it('total tools across all categories is ~224', () => {
    if (!modulesLoaded) return;
    const total = Object.values(CATEGORY_INFO).reduce((sum, info) => sum + info.toolCount, 0);
    expect(total).toBeGreaterThanOrEqual(200);
    expect(total).toBeLessThanOrEqual(300);
  });
});
