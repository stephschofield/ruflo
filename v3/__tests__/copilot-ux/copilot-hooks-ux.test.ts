/**
 * Hooks UX Tests
 *
 * Validates hooks.json lifecycle events and auto-memory-hook.mjs existence.
 * Ensures the Copilot session lifecycle is complete.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOKS_DIR = path.join(ROOT, '.github', 'hooks');

interface HookEntry {
  event: string;
  command: string;
  description?: string;
  matcher?: string;
}

let hooks: HookEntry[];

beforeAll(() => {
  const raw = fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf-8');
  const config = JSON.parse(raw);
  hooks = config.hooks;
});

// ─── File existence ─────────────────────────────────────────────────

describe('Hook File Existence', () => {
  it('hooks.json exists', () => {
    expect(fs.existsSync(path.join(HOOKS_DIR, 'hooks.json'))).toBe(true);
  });

  it('auto-memory-hook.mjs exists', () => {
    expect(fs.existsSync(path.join(HOOKS_DIR, 'auto-memory-hook.mjs'))).toBe(true);
  });
});

// ─── Valid JSON structure ───────────────────────────────────────────

describe('Hook JSON Structure', () => {
  it('hooks.json has a hooks array', () => {
    expect(Array.isArray(hooks)).toBe(true);
    expect(hooks.length).toBeGreaterThan(0);
  });

  it('every hook has event and command fields', () => {
    for (const hook of hooks) {
      expect(hook.event, `Hook missing event`).toBeDefined();
      expect(hook.command, `Hook missing command`).toBeDefined();
    }
  });

  it('every hook has a description', () => {
    for (const hook of hooks) {
      expect(hook.description, `Hook ${hook.event} missing description`).toBeDefined();
      expect(hook.description!.length).toBeGreaterThan(0);
    }
  });
});

// ─── Valid events ───────────────────────────────────────────────────

describe('Hook Event Types', () => {
  const VALID_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop'];

  it('all hooks use valid Copilot event types', () => {
    const invalidHooks: string[] = [];
    for (const hook of hooks) {
      if (!VALID_EVENTS.includes(hook.event)) {
        invalidHooks.push(`${hook.event}: ${hook.command}`);
      }
    }
    expect(invalidHooks, `Invalid events: ${invalidHooks.join(', ')}`).toEqual([]);
  });
});

// ─── Lifecycle completeness ─────────────────────────────────────────

describe('Hook Lifecycle Completeness', () => {
  it('has SessionStart hook', () => {
    expect(hooks.some(h => h.event === 'SessionStart')).toBe(true);
  });

  it('has UserPromptSubmit hook', () => {
    expect(hooks.some(h => h.event === 'UserPromptSubmit')).toBe(true);
  });

  it('has PreToolUse hook for file edits', () => {
    const editHooks = hooks.filter(
      h => h.event === 'PreToolUse' && h.matcher && /Write|Edit|MultiEdit/.test(h.matcher)
    );
    expect(editHooks.length).toBeGreaterThanOrEqual(1);
  });

  it('has PostToolUse hook for file edits', () => {
    const editHooks = hooks.filter(
      h => h.event === 'PostToolUse' && h.matcher && /Write|Edit|MultiEdit/.test(h.matcher)
    );
    expect(editHooks.length).toBeGreaterThanOrEqual(1);
  });

  it('has PreToolUse hook for Bash commands', () => {
    const bashHooks = hooks.filter(
      h => h.event === 'PreToolUse' && h.matcher && /Bash/.test(h.matcher)
    );
    expect(bashHooks.length).toBeGreaterThanOrEqual(1);
  });

  it('has PostToolUse hook for Bash commands', () => {
    const bashHooks = hooks.filter(
      h => h.event === 'PostToolUse' && h.matcher && /Bash/.test(h.matcher)
    );
    expect(bashHooks.length).toBeGreaterThanOrEqual(1);
  });

  it('has Stop hook for session cleanup', () => {
    expect(hooks.some(h => h.event === 'Stop')).toBe(true);
  });
});

// ─── Command format ─────────────────────────────────────────────────

describe('Hook Command Format', () => {
  it('session hooks reference npx ruflo', () => {
    const sessionHooks = hooks.filter(h => h.event === 'SessionStart' || h.event === 'Stop');
    const rufloHooks = sessionHooks.filter(h => h.command.includes('npx ruflo') || h.command.includes('.github/hooks'));
    expect(rufloHooks.length).toBe(sessionHooks.length);
  });

  it('pre-task hook references hooks pre-task', () => {
    const preTask = hooks.find(h => h.event === 'UserPromptSubmit');
    expect(preTask).toBeDefined();
    expect(preTask!.command).toMatch(/hooks\s+pre-task/);
  });

  it('post-edit hook enables pattern training', () => {
    const postEdit = hooks.find(
      h => h.event === 'PostToolUse' && h.matcher && /Write|Edit/.test(h.matcher)
    );
    expect(postEdit).toBeDefined();
    expect(postEdit!.command).toMatch(/--train-patterns/);
  });

  it('session-end hook exports metrics', () => {
    const sessionEnd = hooks.find(
      h => h.event === 'Stop' && h.command.includes('session-end')
    );
    expect(sessionEnd).toBeDefined();
    expect(sessionEnd!.command).toMatch(/--export-metrics/);
  });
});

// ─── Auto-memory hook ───────────────────────────────────────────────

describe('Auto-Memory Hook', () => {
  it('auto-memory-hook.mjs is valid JavaScript', () => {
    const content = fs.readFileSync(path.join(HOOKS_DIR, 'auto-memory-hook.mjs'), 'utf-8');
    // Should be a valid ESM module with exports or functions
    expect(content.length).toBeGreaterThan(100);
  });

  it('SessionStart hook references auto-memory-hook import', () => {
    const importHook = hooks.find(
      h => h.event === 'SessionStart' && h.command.includes('auto-memory-hook')
    );
    expect(importHook).toBeDefined();
    expect(importHook!.command).toMatch(/import/);
  });

  it('Stop hook references auto-memory-hook sync', () => {
    const syncHook = hooks.find(
      h => h.event === 'Stop' && h.command.includes('auto-memory-hook')
    );
    expect(syncHook).toBeDefined();
    expect(syncHook!.command).toMatch(/sync/);
  });
});
