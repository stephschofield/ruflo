# Copilot-Native Implementation Status

**Branch**: `ghcp-skills-update`  
**Date**: 2026-03-04  
**Reference**: [updated_usage_copilot.md](updated_usage_copilot.md)

---

## Summary

Audit of the codebase against the [updated usage doc](updated_usage_copilot.md) specification. All 378 copilot-ux tests pass. The primary gap is that `ruflo init --copilot` cannot yet reproduce the 98 `.agent.md` files from scratch — they were manually created outside the init pipeline.

---

## Completed Items

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Platform selection prompt (`--copilot` / `--claude-code`) | DONE | `v3/@claude-flow/cli/src/commands/init.ts` L198-213 |
| 2 | 98 `.agent.md` files in `.github/agents/` | DONE | All have proper YAML frontmatter (name, description, tools, model, handoffs, user-invocable, argument-hint) |
| 3 | 10 skills in `.github/skills/` | DONE | agentdb-vector-search, github-code-review, github-project-management, github-workflow-automation, hooks-automation, pair-programming, performance-analysis, sparc-methodology, swarm-orchestration, verification-quality |
| 4 | 5 prompts in `.github/prompts/` | DONE | code-review, memory-search, performance-report, sparc, swarm-init |
| 5 | `.github/hooks/hooks.json` + `auto-memory-hook.mjs` | DONE | 8 hook events, all reference `npx ruflo` |
| 6 | `.vscode/mcp.json` with ruflo MCP server | DONE | stdio transport, points to `v3/@claude-flow/cli/bin/mcp-server.js` |
| 7 | `.github/copilot-instructions.md` | DONE | References MCP tools, agents, coding standards |
| 8 | `--tool-profile` flag (minimal/default/development/devops/full) | DONE | `init.ts` L190-191 |
| 9 | `--start-all` flag | DONE | `init.ts` L359-398 |
| 10 | `--with-embeddings` flag | DONE | `init.ts` L400-423 |
| 11 | `ruflo init wizard` subcommand | DONE | `init.ts` L471-750 |
| 12 | `ruflo init skills --all` subcommand | DONE | `init.ts` L756-798 |
| 13 | `ruflo init hooks --minimal` subcommand | DONE | `init.ts` L804-846 |
| 14 | `ruflo init upgrade` subcommand | DONE | `init.ts` L852-938 |
| 15 | `ruflo doctor` command | DONE | `v3/@claude-flow/cli/src/commands/doctor.ts` |
| 16 | Copilot-UX test suite | DONE | 14 test files, 378 tests, all passing |
| 17 | `ruflo` package bin entry | DONE | `ruflo/package.json` → `"ruflo": "./bin/ruflo.js"` |

---

## Implementation Tasks (Gaps)

### HIGH Priority

| # | Task | Status | Details |
|---|------|--------|---------|
| H1 | Init `copyAgents` doesn't produce `.agent.md` format for Copilot | NOT STARTED | Bundled source agents in `v3/@claude-flow/cli/.claude/agents/` are plain `.md` files in category subdirectories (e.g. `core/coder.md`). `copyAgents()` in `executor.ts` copies them as-is via `copyDirRecursive()`. For Copilot mode it should: (a) flatten from `category/name.md` to `name.agent.md`, (b) inject YAML frontmatter with `tools: [ruflo]`, `model`, `handoffs`, `user-invocable`, `argument-hint`. Running `ruflo init --copilot` on a fresh project produces the wrong format. |
| H2 | No bundled Copilot-format agent templates in CLI package | NOT STARTED | The CLI package only bundles Claude Code-format agents (`v3/@claude-flow/cli/.claude/agents/`). No `.github/agents/` source directory exists. Either: (a) add a `copilot-agents/` directory with pre-built `.agent.md` templates, or (b) implement a conversion layer in `copyAgents()`. |
| H3 | Root `package.json` bin still says `claude-flow` | NOT STARTED | Root `package.json` has `"bin": { "claude-flow": "./bin/cli.js" }`. Should add `"ruflo"` as an alias. |
| H4 | CLI `@claude-flow/cli` package.json bin missing `ruflo` | NOT STARTED | `v3/@claude-flow/cli/package.json` has `"bin": { "cli": …, "claude-flow": …, "claude-flow-mcp": … }` — no `ruflo` entry. Should add `"ruflo": "./bin/cli.js"` and `"ruflo-mcp": "./bin/mcp-server.js"`. |

### MEDIUM Priority

| # | Task | Status | Details |
|---|------|--------|---------|
| M1 | Init `copyPrompts` doesn't ensure Copilot prompt format | NOT STARTED | Renames `.md` → `.prompt.md` but doesn't guarantee proper GitHub Copilot prompt frontmatter (description, mode). Existing 5 prompts are correct but the generator doesn't enforce it. |
| M2 | Init `executor.ts` has 24 `claude-flow` string references | NOT STARTED | Some are in generated output (config, instructions) that should say `ruflo`. Internal package paths (`@claude-flow/`) are fine as-is. Need audit to separate package names from user-facing strings. |
| M3 | No integration test for `ruflo init --copilot` on clean directory | NOT STARTED | Existing tests validate files already in the repo. No test runs `ruflo init --copilot` against a temp directory and verifies it produces correct output. Would immediately surface H1/H2. |

### LOW Priority

| # | Task | Status | Details |
|---|------|--------|---------|
| L1 | 8 agent files still reference `npx claude-flow` | NOT STARTED | Files: `benchmark-suite`, `code-goal-planner`, `load-balancing-coordinator`, `performance-monitor`, `release-manager`, `repo-architect`, `resource-allocator`, `topology-optimizer`. Should be `npx ruflo`. |
| L2 | Skills format validation in `ruflo doctor` | NOT STARTED | No validation that each skill directory contains a proper `SKILL.md`. Should add a check. |
| L3 | `--minimal` / `--full` flag behavior documentation | NOT STARTED | Flags exist but the exact component differences should be explicitly documented and validated against `InitOptions` defaults. |

---

## Architecture Notes

### Current Init Pipeline (Copilot mode)

```
ruflo init --copilot
  ├── createDirectories()      → .github/, .github/agents/, .github/skills/, .github/prompts/, .github/hooks/
  ├── writeCopilotInstructions() → .github/copilot-instructions.md  (generated inline)
  ├── writeHooksConfig()       → .github/hooks/hooks.json           (generated inline)
  ├── copySkills()             → .github/skills/*                   (copied from .claude/skills/)
  ├── copyAgents()             → .github/agents/*                   (⚠️ copies .claude/agents/ dirs as-is — WRONG FORMAT)
  ├── copyPrompts()            → .github/prompts/*                  (copies .claude/commands/ → renames to .prompt.md)
  ├── writeMCPConfig()         → .vscode/mcp.json                   (generated inline)
  └── writeRuntimeConfig()     → .claude-flow/config.yaml           (generated inline)
```

### What H1/H2 Fix Needs

The `copyAgents()` function needs a Copilot-mode path that either:

1. **Option A — Pre-built templates**: Bundle `.agent.md` files in the CLI package (e.g. `v3/@claude-flow/cli/copilot-agents/`) and copy them flat into `.github/agents/`.
2. **Option B — Runtime conversion**: Read `.claude/agents/{category}/{name}.md`, extract metadata, generate YAML frontmatter, write as `.github/agents/{name}.agent.md`.

Option A is simpler and more reliable. Option B is more maintainable long-term (single source of truth).

### Bundled Agent Source (Claude Code format)

```
v3/@claude-flow/cli/.claude/agents/
  ├── core/          → coder.md, planner.md, researcher.md, reviewer.md, tester.md
  ├── consensus/     → byzantine-coordinator.md, raft-manager.md, ...
  ├── github/        → pr-manager.md, issue-tracker.md, ...
  ├── swarm/         → coordinator.md, mesh-coordinator.md, ...
  ├── sparc/         → sparc-coord.md, specification.md, ...
  └── ... (20+ categories)
```

### Target Output (Copilot format)

```
.github/agents/
  ├── coder.agent.md           ← flat, with YAML frontmatter
  ├── coordinator.agent.md
  ├── researcher.agent.md
  └── ... (98 total)
```

---

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| `copilot-init-profiles.test.ts` | MCP config, settings, init defaults | PASS (all) |
| `copilot-native-ux.test.ts` | MCP server, instructions, agents, skills, prompts, hooks, coherence, no leakage | PASS (all) |
| `copilot-e2e-workflow.test.ts` | E2E file generation, consistency | PASS (all) |
| `copilot-backward-compat.test.ts` | Claude Code backward compat | PASS (all) |
| `copilot-instructions-ux.test.ts` | Instructions content validation | PASS (all) |
| **Total** | **378 tests across 14 files** | **ALL PASSING** |

---

## Next Steps

1. Fix H1/H2 (agent format conversion) — this is the #1 blocker for `ruflo init --copilot` working end-to-end on fresh projects
2. Fix H3/H4 (CLI branding) — ensures `npx ruflo` works everywhere
3. Fix L1 (stale `npx claude-flow` refs in 8 agent files) — quick sed fix
4. Add M3 (integration test) — validates the full init pipeline
5. Fix M1/M2 (prompt format, executor branding) — polish items

