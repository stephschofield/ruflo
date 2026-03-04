/**
 * MCP Server Configuration Tests
 *
 * Validates .vscode/mcp.json structure, server definitions,
 * and tool registration for the Ruflo MCP server.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MCP_JSON_PATH = path.join(ROOT, '.vscode', 'mcp.json');

let mcpConfig: Record<string, unknown>;

beforeAll(() => {
  const raw = fs.readFileSync(MCP_JSON_PATH, 'utf-8');
  mcpConfig = JSON.parse(raw);
});

// ─── File structure ─────────────────────────────────────────────────

describe('MCP Configuration File', () => {
  it('.vscode/mcp.json exists', () => {
    expect(fs.existsSync(MCP_JSON_PATH)).toBe(true);
  });

  it('is valid JSON', () => {
    expect(() => JSON.parse(fs.readFileSync(MCP_JSON_PATH, 'utf-8'))).not.toThrow();
  });

  it('has servers object', () => {
    expect(mcpConfig.servers).toBeDefined();
    expect(typeof mcpConfig.servers).toBe('object');
  });
});

// ─── Ruflo server definition ────────────────────────────────────────

describe('Ruflo MCP Server Definition', () => {
  it('has a ruflo server entry', () => {
    const servers = mcpConfig.servers as Record<string, unknown>;
    expect(servers.ruflo).toBeDefined();
  });

  it('ruflo server uses stdio transport', () => {
    const servers = mcpConfig.servers as Record<string, unknown>;
    const ruflo = servers.ruflo as Record<string, unknown>;
    expect(ruflo.type).toBe('stdio');
  });

  it('ruflo server has valid command', () => {
    const servers = mcpConfig.servers as Record<string, unknown>;
    const ruflo = servers.ruflo as Record<string, unknown>;
    expect(ruflo.command).toBeDefined();
    expect(typeof ruflo.command).toBe('string');
  });

  it('ruflo server has args array', () => {
    const servers = mcpConfig.servers as Record<string, unknown>;
    const ruflo = servers.ruflo as Record<string, unknown>;
    expect(Array.isArray(ruflo.args)).toBe(true);
  });

  it('ruflo server args reference MCP server', () => {
    const servers = mcpConfig.servers as Record<string, unknown>;
    const ruflo = servers.ruflo as Record<string, unknown>;
    const args = ruflo.args as string[];
    // Args may point directly to mcp-server.js or use "mcp start" subcommand
    const argsStr = args.join(' ');
    expect(
      argsStr.includes('mcp') || argsStr.includes('mcp-server'),
      `args should reference MCP: ${argsStr}`
    ).toBe(true);
  });
});

// ─── No stale server entries ────────────────────────────────────────

describe('MCP Server Hygiene', () => {
  it('does not contain deprecated server names', () => {
    const servers = mcpConfig.servers as Record<string, unknown>;
    const serverNames = Object.keys(servers);
    // Should not have old names
    expect(serverNames).not.toContain('claude-flow');
    expect(serverNames).not.toContain('ruv-swarm');
  });

  it('all servers have required fields (type, command, args)', () => {
    const servers = mcpConfig.servers as Record<string, Record<string, unknown>>;
    for (const [name, server] of Object.entries(servers)) {
      expect(server.type, `${name} missing type`).toBeDefined();
      expect(server.command, `${name} missing command`).toBeDefined();
      expect(server.args, `${name} missing args`).toBeDefined();
    }
  });
});
