/**
 * Copilot Instructions UX Tests
 *
 * Validates .github/copilot-instructions.md content quality —
 * ensures it provides proper context for Copilot to understand
 * how to work with Ruflo.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const INSTRUCTIONS_PATH = path.join(ROOT, '.github', 'copilot-instructions.md');

let content: string;

beforeAll(() => {
  content = fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');
});

// ─── File existence and size ────────────────────────────────────────

describe('Instructions File', () => {
  it('.github/copilot-instructions.md exists', () => {
    expect(fs.existsSync(INSTRUCTIONS_PATH)).toBe(true);
  });

  it('has substantial content (>500 chars)', () => {
    expect(content.length).toBeGreaterThan(500);
  });
});

// ─── Core sections ──────────────────────────────────────────────────

describe('Instructions Core Sections', () => {
  it('documents MCP tool categories', () => {
    expect(content).toMatch(/tool.*categor|categor.*tool/i);
  });

  it('documents agent routing or agents', () => {
    expect(content).toMatch(/agent|coordinator|researcher|coder/i);
  });

  it('documents coding standards', () => {
    expect(content).toMatch(/coding|standard|convention|practice/i);
  });

  it('documents file organization', () => {
    expect(content).toMatch(/file.*organiz|director|src|tests/i);
  });
});

// ─── Ruflo branding ─────────────────────────────────────────────────

describe('Instructions Branding', () => {
  it('uses "ruflo" branding', () => {
    expect(content.toLowerCase()).toMatch(/ruflo/);
  });

  it('references MCP server', () => {
    expect(content).toMatch(/mcp|\.vscode\/mcp\.json/i);
  });

  it('references agents directory', () => {
    expect(content).toMatch(/\.github\/agents|agent/i);
  });
});

// ─── Agent guidance ─────────────────────────────────────────────────

describe('Instructions Agent Guidance', () => {
  it('documents when to use swarm orchestration', () => {
    expect(content).toMatch(/swarm|orchestrat|multi-agent/i);
  });

  it('documents task complexity routing', () => {
    // Should explain when to use single agent vs swarm
    expect(content).toMatch(/complex|simple|single|multi/i);
  });
});

// ─── No stale references ────────────────────────────────────────────

describe('Instructions Freshness', () => {
  it('does not reference obsolete "claude-flow" CLI commands', () => {
    // Should use "npx ruflo" not "npx claude-flow"
    const lines = content.split('\n');
    const staleLines = lines.filter(l =>
      /npx\s+claude-flow(?!\s*@)/.test(l) && !/backward|compat|legacy/i.test(l)
    );
    expect(
      staleLines.length,
      `Found stale CLI references:\n${staleLines.join('\n')}`
    ).toBe(0);
  });

  it('does not reference deprecated tool names', () => {
    expect(content).not.toMatch(/ruv-swarm/i);
    expect(content).not.toMatch(/flow-nexus/i);
  });
});
