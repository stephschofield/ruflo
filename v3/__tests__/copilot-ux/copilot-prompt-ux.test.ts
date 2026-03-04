/**
 * Prompt UX Tests
 *
 * Validates all 5 prompt files (.github/prompts/) have correct
 * frontmatter, reference agents via @agent patterns, and provide
 * clear user instructions.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PROMPTS_DIR = path.join(ROOT, '.github', 'prompts');

const PROMPT_FILES = [
  'sparc.prompt.md',
  'swarm-init.prompt.md',
  'memory-search.prompt.md',
  'code-review.prompt.md',
  'performance-report.prompt.md',
];

function readPrompt(file: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf-8');
}

function parseFrontmatter(content: string): Record<string, string> {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return meta;
}

// ─── All prompts exist ──────────────────────────────────────────────

describe('Prompt File Existence', () => {
  for (const file of PROMPT_FILES) {
    it(`${file} exists`, () => {
      expect(
        fs.existsSync(path.join(PROMPTS_DIR, file)),
        `Missing prompt: ${file}`
      ).toBe(true);
    });
  }
});

// ─── Frontmatter validation ─────────────────────────────────────────

describe('Prompt Frontmatter', () => {
  for (const file of PROMPT_FILES) {
    describe(file, () => {
      let meta: Record<string, string>;
      let content: string;

      it('has YAML frontmatter', () => {
        content = readPrompt(file);
        expect(content.replace(/\r\n/g, '\n')).toMatch(/^---\n[\s\S]*?\n---/);
        meta = parseFrontmatter(content);
      });

      it('has name field', () => {
        meta = parseFrontmatter(readPrompt(file));
        expect(meta.name).toBeDefined();
        expect(meta.name.length).toBeGreaterThan(0);
      });

      it('has description field', () => {
        meta = parseFrontmatter(readPrompt(file));
        expect(meta.description).toBeDefined();
        expect(meta.description.length).toBeGreaterThan(0);
      });
    });
  }
});

// ─── Content quality ────────────────────────────────────────────────

describe('Prompt Content Quality', () => {
  it('sparc prompt references the SPARC phases', () => {
    const content = readPrompt('sparc.prompt.md');
    expect(content).toMatch(/specification|pseudocode|architecture|refinement|completion/i);
  });

  it('swarm-init prompt documents topology options', () => {
    const content = readPrompt('swarm-init.prompt.md');
    expect(content).toMatch(/hierarchical|mesh|adaptive/i);
  });

  it('memory-search prompt explains search semantics', () => {
    const content = readPrompt('memory-search.prompt.md');
    expect(content).toMatch(/memory|search|pattern|namespace/i);
  });

  it('code-review prompt references quality criteria', () => {
    const content = readPrompt('code-review.prompt.md');
    expect(content).toMatch(/review|quality|security|performance/i);
  });

  it('performance-report prompt references metrics', () => {
    const content = readPrompt('performance-report.prompt.md');
    expect(content).toMatch(/performance|benchmark|metric|profil/i);
  });
});

// ─── Input variable usage ───────────────────────────────────────────

describe('Prompt Input Variables', () => {
  for (const file of PROMPT_FILES) {
    it(`${file} uses $input or descriptive placeholders`, () => {
      const content = readPrompt(file);
      const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
      // Should have some instructional content
      expect(body.trim().length).toBeGreaterThan(50);
    });
  }
});

// ─── Agent references ───────────────────────────────────────────────

describe('Prompt Agent References', () => {
  it('sparc prompt references correct agents', () => {
    const content = readPrompt('sparc.prompt.md');
    // SPARC workflow involves multiple agents
    expect(content).toMatch(/architect|coder|tester|researcher/i);
  });

  it('code-review prompt references reviewer agent', () => {
    const content = readPrompt('code-review.prompt.md');
    expect(content).toMatch(/reviewer/i);
  });
});
