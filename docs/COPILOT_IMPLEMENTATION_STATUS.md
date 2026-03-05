# Copilot-Native Implementation Status

**Branch**: `copilot_usage_implementation`  
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
| H1 | Init `copyAgents` doesn't produce `.agent.md` format for Copilot | DONE (Phase 2) | All 98 agents converted to `.github/agents/*.agent.md` format with proper YAML frontmatter. `copyAgents()` in executor.ts now routes by platform. See COPILOT_REFACTORING_TASKS.md Tasks 2.1–2.4. |
| H2 | No bundled Copilot-format agent templates in CLI package | DONE (Phase 2) | 98 `.agent.md` files exist in `.github/agents/`. Conversion script at `scripts/convert-agents.py`. See Tasks 2.1–2.4. |
| H3 | Root `package.json` bin still says `claude-flow` | NOT STARTED | Root `package.json` has `"bin": { "claude-flow": "./bin/cli.js" }`. Should add `"ruflo"` as an alias. |
| H4 | CLI `@claude-flow/cli` package.json bin missing `ruflo` | NOT STARTED | `v3/@claude-flow/cli/package.json` has `"bin": { "cli": …, "claude-flow": …, "claude-flow-mcp": … }` — no `ruflo` entry. Should add `"ruflo": "./bin/cli.js"` and `"ruflo-mcp": "./bin/mcp-server.js"`. |

### MEDIUM Priority

| # | Task | Status | Details |
|---|------|--------|---------|
| M1 | Init `copyPrompts` doesn't ensure Copilot prompt format | DONE (Phase 3) | `copyPrompts()` added to executor.ts, converts `.md` → `.prompt.md` with Copilot format. See Task 3.4. |
| M2 | Init `executor.ts` has 24 `claude-flow` string references | PARTIAL | Branding updated in settings-generator.ts (permissions, attribution). Executor platform routing added. Some internal `@claude-flow/` package refs remain (correct — those are package names). |
| M3 | No integration test for `ruflo init --copilot` on clean directory | NOT STARTED | Existing tests validate files already in the repo. No test runs `ruflo init --copilot` against a temp directory and verifies it produces correct output. |

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
  ├── createDirectories()        → .github/, .github/agents/, .github/skills/, .github/prompts/, .github/hooks/, .vscode/
  ├── writeCopilotSettings()     → .vscode/settings.json            (generated inline)
  ├── writeMCPConfig()           → .vscode/mcp.json                 (generated inline)
  ├── copySkills()               → .github/skills/*                 (copied from .claude/skills/)
  ├── copyPrompts()              → .github/prompts/*                (converts .md → .prompt.md)
  ├── copyAgents()               → .github/agents/*                 (platform-routed)
  ├── writeCopilotInstructions()  → .github/copilot-instructions.md  (generated inline)
  ├── writeHooksConfig()         → .github/hooks/hooks.json         (generated inline)
  └── writeRuntimeConfig()       → .claude-flow/config.yaml         (generated inline)
```

### Agent Format (Resolved)

H1/H2 resolved via Phase 2 (Tasks 2.1–2.4) — 98 `.agent.md` files with Copilot YAML frontmatter now exist in `.github/agents/`. Conversion script: `scripts/convert-agents.py`.

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

1. ~~Fix H1/H2 (agent format conversion)~~ — **DONE** (Phase 2)
2. Fix H3/H4 (CLI branding) — ensures `npx ruflo` works everywhere
3. Fix L1 (stale `npx claude-flow` refs in 8 agent files) — quick sed fix
4. Add M3 (integration test) — validates the full init pipeline
5. ~~Fix M1 (prompt format)~~ — **DONE** (Task 3.4)
6. Fix M2 remainder (executor branding) — partial, package refs are fine
7. Phase 4: MCP Tool Curation (categorization, default profile)
8. Phase 5: Integration & Cleanup (guidance pkg, teammate plugin, model routing, tests)

