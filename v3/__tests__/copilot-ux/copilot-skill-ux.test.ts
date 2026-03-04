/**
 * Skill UX Tests
 *
 * Validates all 10 skills (.github/skills/) have correct structure,
 * reference MCP tools, and provide clear documentation.
 *
 * Phase 5 — Task 5.5 (Copilot UX validation)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SKILLS_DIR = path.join(ROOT, '.github', 'skills');

const EXPECTED_SKILLS = [
  'agentdb-vector-search',
  'github-code-review',
  'github-project-management',
  'github-workflow-automation',
  'hooks-automation',
  'pair-programming',
  'performance-analysis',
  'sparc-methodology',
  'swarm-orchestration',
  'verification-quality',
];

function readSkill(skillDir: string): string {
  return fs.readFileSync(path.join(SKILLS_DIR, skillDir, 'SKILL.md'), 'utf-8');
}

// ─── All skills exist ───────────────────────────────────────────────

describe('Skill Directory Existence', () => {
  for (const skill of EXPECTED_SKILLS) {
    it(`${skill}/ directory exists`, () => {
      expect(
        fs.existsSync(path.join(SKILLS_DIR, skill)),
        `Missing skill directory: ${skill}`
      ).toBe(true);
    });

    it(`${skill}/SKILL.md exists`, () => {
      expect(
        fs.existsSync(path.join(SKILLS_DIR, skill, 'SKILL.md')),
        `Missing SKILL.md in ${skill}`
      ).toBe(true);
    });
  }
});

// ─── Frontmatter validation ─────────────────────────────────────────

describe('Skill Frontmatter', () => {
  for (const skill of EXPECTED_SKILLS) {
    describe(skill, () => {
      it('has YAML frontmatter with name and description', () => {
        const content = readSkill(skill).replace(/\r\n/g, '\n');
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        expect(match, `${skill} missing frontmatter`).not.toBeNull();
        const yaml = match![1];
        expect(yaml).toMatch(/name:/);
        expect(yaml).toMatch(/description:/);
      });
    });
  }
});

// ─── Content quality ────────────────────────────────────────────────

describe('Skill Content Quality', () => {
  for (const skill of EXPECTED_SKILLS) {
    it(`${skill} has substantial documentation (>100 chars)`, () => {
      const content = readSkill(skill).replace(/\r\n/g, '\n');
      const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
      expect(body.trim().length).toBeGreaterThan(100);
    });
  }

  it('swarm-orchestration skill documents MCP tools', () => {
    const content = readSkill('swarm-orchestration');
    expect(content).toMatch(/swarm_init|agent_spawn|mcp/i);
  });

  it('sparc-methodology skill documents SPARC phases', () => {
    const content = readSkill('sparc-methodology');
    expect(content).toMatch(/specification|pseudocode|architecture|refinement/i);
  });

  it('agentdb-vector-search skill documents memory tools', () => {
    const content = readSkill('agentdb-vector-search');
    expect(content).toMatch(/memory_search|memory_store|vector|hnsw/i);
  });

  it('hooks-automation skill documents hook events', () => {
    const content = readSkill('hooks-automation');
    expect(content).toMatch(/session|pre-task|post-task|hook/i);
  });

  it('github-code-review skill documents review workflow', () => {
    const content = readSkill('github-code-review');
    expect(content).toMatch(/review|pull request|pr/i);
  });

  it('performance-analysis skill documents metrics', () => {
    const content = readSkill('performance-analysis');
    expect(content).toMatch(/performance|benchmark|bottleneck/i);
  });

  it('verification-quality skill documents testing', () => {
    const content = readSkill('verification-quality');
    expect(content).toMatch(/test|quality|verification|coverage/i);
  });

  it('pair-programming skill documents collaboration', () => {
    const content = readSkill('pair-programming');
    expect(content).toMatch(/pair|collab|agent/i);
  });
});

// ─── MCP tool references ────────────────────────────────────────────

describe('Skill MCP Tool References', () => {
  it('at least 5 skills reference ruflo MCP tools', () => {
    let count = 0;
    for (const skill of EXPECTED_SKILLS) {
      const content = readSkill(skill);
      if (/ruflo|mcp.*tool|tool.*mcp/i.test(content)) {
        count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
