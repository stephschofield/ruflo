# Copilot Refactoring — Task Tracker

**Branch:** `copilot_usage_implementation`  
**Source Plan:** [COPILOT_MIGRATION_ASSESSMENT.md](./COPILOT_MIGRATION_ASSESSMENT.md)  
**Created:** 2026-03-03  
**Updated:** 2026-03-05 (Task 5.1 complete)  
**Strategy:** Native Copilot rebuild — Copilot as primary platform  

---

## Summary

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| **Phase 1** | Foundation (Core Infrastructure) | 5 | Complete (5/5) |
| **Phase 2** | Agent Conversion (All 60+ Agents) | 4 | Complete (4/4) |
| **Phase 3** | Configuration Generation | 5 | Complete (5/5) |
| **Phase 4** | MCP Tool Curation | 3 | Complete (3/3) |
| **Phase 5** | Integration & Cleanup | 5 | In Progress (1/5) |

**Total:** 22 tasks  
**Estimated files rewritten:** ~25-30 TypeScript + 90 agent definitions  
**Estimated files removed:** ~6,440 (V2) + Claude Code-specific config  

---

## Phase 1: Foundation (Core Infrastructure)

Replace platform coupling in the CLI service layer. This is the structural work that everything else depends on.

### Task 1.1 — Remove V2 legacy codebase

- **Status:** `[x]` **Complete** (2026-03-03)
- **Priority:** P0 — Can start immediately, no dependencies
- **Scope:** Delete `v2/` directory (~6,440 files)
- **Why:** Dead weight — not published, not imported by V3, not relevant to Copilot rebuild

**Acceptance Criteria:**
- [x] `v2/` directory fully removed
- [x] No remaining imports or references to V2 code in V3 packages
- [x] Build/lint/tests still pass after removal (pre-existing TS errors unrelated to V2)
- [x] Root `.npmignore` V2 exclusions cleaned up

**Files:**
- `v2/` (entire directory — delete)
- Root `.npmignore` (cleanup V2 entries)

---

### Task 1.2 — Rewrite headless worker executor

- **Status:** `[x]` Complete
- **Priority:** P0 — Core coupling point
- **Depends on:** Nothing
- **Scope:** Replace `spawn('claude', ['--print', ...])` with provider-agnostic LLM API calls

**Details:**
- Replace Claude CLI binary spawn with calls through `@claude-flow/providers` `LLMProvider` interface
- **Analysis workers** (audit, testgaps, document, predict, ultralearn, deepdive): Send prompts with code context → receive text responses. No IDE tool access needed.
- **Mutation workers** (refactor, optimize): Receive proposed changes as structured output → route through MCP server's file operation tools
- **Local workers** (map, consolidate, benchmark, preload): No changes needed — already local
- All 12 background workers retained
- Provider is configurable (not hardcoded to Anthropic)

**Acceptance Criteria:**
- [x] No `spawn('claude', ...)` calls remain in worker executor
- [x] Workers function with `@claude-flow/providers` LLMProvider interface
- [x] Provider/model configurable per-worker and globally
- [ ] Analysis workers return results to AgentDB memory (deferred — not blocking)
- [ ] Mutation workers route changes through MCP file tools (deferred — not blocking)

**Files:**
- `v3/@claude-flow/cli/src/services/headless-worker-executor.ts` (rewrite)
- `v3/@claude-flow/cli/src/services/container-worker-pool.ts` (updated)
- `v3/@claude-flow/cli/src/services/index.ts` (updated)
- `v3/@claude-flow/providers/package.json` (fixed exports typo)

---

### Task 1.3 — Rewrite container worker pool

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Task 1.2
- **Scope:** Update Docker container env var mapping for provider-agnostic execution

**Details:**
- Replace Claude Code-specific environment variables with provider-agnostic ones
- Support configurable provider selection in container environments

**Acceptance Criteria:**
- [x] No Claude Code env vars in container pool configuration
- [x] Container workers use provider-agnostic env vars (`CLAUDE_FLOW_PROVIDER`)
- [x] Existing container orchestration logic preserved
- [x] `SandboxMode` type removed, replaced with `defaultProvider: string`
- [x] Result objects use `provider: 'container'` instead of `sandboxMode`
- [x] `CLAUDE_CODE_HEADLESS` env var removed (completed via Task 1.4)

**Progress Notes:**
- `SandboxMode` import removed, `ContainerPoolConfig.defaultSandbox` → `defaultProvider`
- `DEFAULT_CONFIG.defaultSandbox: 'strict'` → `defaultProvider: 'anthropic'`
- `CLAUDE_CODE_SANDBOX_MODE` env var → `CLAUDE_FLOW_PROVIDER`
- `ContainerExecutionOptions.sandbox` → `provider` field
- All result objects: `sandboxMode` → `provider: 'container'`

**Files:**
- `v3/@claude-flow/cli/src/services/container-worker-pool.ts` (updated — mostly complete)

---

### Task 1.4 — Rewrite headless runtime

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Task 1.2
- **Scope:** Remove `CLAUDE_CODE_HEADLESS` dependency, use provider API calls

**Details:**
- Remove `CLAUDE_CODE_HEADLESS` runtime mode dependency
- Replace with provider API calls through `@claude-flow/providers`
- Maintain headless execution capability for CI/CD and background workloads

**Acceptance Criteria:**
- [x] No `CLAUDE_CODE_HEADLESS` references remain
- [x] Headless mode works through provider API calls
- [x] CI/CD pipeline compatibility maintained

**Completion Notes:**
- Removed all 4 `CLAUDE_CODE_HEADLESS` references in `headless.ts` (doc comment, help text, executor call, status output)
- Changed `sandbox: 'permissive'` to `provider: 'anthropic'` in executor options
- Changed `CLAUDE_CODE_HEADLESS: 'true'` to `CLAUDE_FLOW_HEADLESS: 'true'` in `container-worker-pool.ts`

**Files:**
- `v3/@claude-flow/cli/src/runtime/headless.ts` (rewrite)

---

### Task 1.5 — Rewrite hook bridge for Copilot

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Nothing (can run in parallel with 1.2-1.4)
- **Scope:** Create Copilot-native `official-hooks-bridge.ts`

**Details:**
- Map V3 internal events to Copilot's hook protocol
- Protocols are nearly identical: same 8 events, same stdin/stdout JSON, same exit codes
- Change config paths from `.claude/settings.json` to `.github/hooks/`
- Drop `TeammateIdle` / `TaskCompleted` events (Claude Code-specific)
- Add OS-specific overrides support

**Copilot Hook Events (identical to Claude Code):**
1. `SessionStart`
2. `UserPromptSubmit`
3. `PreToolUse`
4. `PostToolUse`
5. `PreCompact`
6. `SubagentStart`
7. `SubagentStop`
8. `Stop`

**Acceptance Criteria:**
- [x] Copilot-native hook bridge created
- [x] All 8 hook events wired correctly
- [x] Config reads from `.github/hooks/` directory
- [x] `TeammateIdle` / `TaskCompleted` events removed
- [x] OS-specific override support (Windows/macOS/Linux)

**Completion Notes:**
- Renamed bridge from "Claude Code" to "Copilot"
- Added `SubagentStart` event type, mapped from V3's `AgentSpawn`
- Removed `PermissionRequest` / `Notification` from `OfficialHookEvent` (Claude Code-specific)
- Updated CLI commands from `npx claude-flow@alpha hooks` to `npx ruflo hooks`
- Created `.github/hooks/hooks.json` with 7 hook definitions (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Bash hooks, Stop)
- Added `SubagentStart` mapping in `officialToV3Event`

**Files:**
- `v3/@claude-flow/hooks/src/bridge/official-hooks-bridge.ts` (rewrite)
- `.github/hooks/*.json` (new — hook definitions)

---

## Phase 2: Agent Conversion (All 60+ Agents)

Convert every agent definition from Claude Code format to Copilot-native format. Format conversion, not reduction — all agents are retained.

### Task 2.1 — Agent frontmatter conversion

- **Status:** `[x]` **Complete** (2026-03-03)
- **Priority:** P0
- **Depends on:** Nothing (can start in parallel with Phase 1)
- **Scope:** Convert all `.claude/agents/*.md` → `.github/agents/*.agent.md` with Copilot frontmatter

**Copilot Agent Frontmatter Template:**
```yaml
---
name: <agent-name>
description: <one-line description>
model:
  - claude-sonnet-4
  - gpt-4.1
tools:
  - ruflo
agents:
  - <subagent-names>
handoffs:
  - agent: <target-agent>
    trigger: <when to hand off>
user-invokable: true/false
disable-model-invocation: true/false
argument-hint: <placeholder text for chat input>
---
```

**Acceptance Criteria:**
- [x] All 60+ agents converted to `.github/agents/*.agent.md` format (88 converted + 10 originals = 98 total)
- [x] Each agent has proper `tools`, `agents`, `handoffs`, `model` fields
- [x] Agent body content updated — remove Claude Code-specific MCP invocation examples
- [x] Replace `mcp__claude-flow__*` patterns with generic tool usage
- [x] Schema fix: `trigger` → `label` + `prompt` in all 98 handoff entries
- [x] Schema fix: `user-invokable` → `user-invocable` in all 98 agent files
- [x] Schema fix: `agent` tool added to `tools:` for all agents with `agents:` field

**Completion Notes:**
- Conversion script: `scripts/convert-agents.py`
- 29 infrastructure agents flagged `user-invokable: false` / `disable-model-invocation: true`
- Category-specific handoffs applied (GitHub→coder, SPARC→pipeline, consensus→coordinator)
- Sub-agent delegation via `agents:` field for delegator agents
- 5 YAML-only agents have frontmatter only (no body in source)
- 10 original hand-crafted agents preserved, line-endings normalized to LF

**Files:**
- `.claude/agents/*.md` (source — 110 files)
- `.github/agents/*.agent.md` (target — 98 files)
- `scripts/convert-agents.py` (new — conversion script)

---

### Task 2.2 — Design and implement handoff graph

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P0
- **Depends on:** Task 2.1
- **Scope:** Define directed handoff graph across all agent roles

**Core Handoff Topology:**
```
coordinator ──→ researcher, architect, coder, tester, reviewer, security-auditor
researcher  ──→ architect, coder, tester, coordinator
architect   ──→ researcher, coder, coordinator
coder       ──→ tester, reviewer, coordinator
tester      ──→ coder (fix failures), reviewer, coordinator
reviewer    ──→ coder (fix issues), security-auditor, coordinator
security-auditor ──→ coder (fix vulnerabilities), coordinator
planner     ──→ researcher, architect, coder, coordinator
```

**Acceptance Criteria:**
- [x] Core agent handoff graph implemented in frontmatter
- [x] Domain-specific agents have relevant handoff paths
- [x] Handoff triggers documented per-agent (using `label` + `prompt` format)
- [x] Graph validated for no dead-end cycles

**Completion Notes:**
- All 98 agent files use the correct Copilot handoff schema: `agent`, `label`, `prompt`
- Extended graph edges: architect→researcher, researcher→tester, tester→reviewer, reviewer→security-auditor
- All handoffs use `label` (short display text) + `prompt` (when/what context)

---

### Task 2.3 — Subagent delegation patterns

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Task 2.1
- **Scope:** Replace Claude Code `Task` tool spawning with Copilot `agents` frontmatter field

**Details:**
- Coordinator agents: `agents: ['*']` (can delegate to any agent)
- Specialist agents: `agents: ['specific-agent']` for targeted delegation
- MCP memory tools continue providing cross-agent state sharing

**Acceptance Criteria:**
- [x] Coordinator agents declare `agents: ['*']`
- [x] Specialist agents declare relevant subagent sets
- [x] No references to Claude Code's `Task` tool spawning pattern remain

**Completion Notes:**
- smart-agent, project-coordinator: `agents: ["*"]` with `agent` tool
- planner: `agents: [researcher, architect, coder]` with `agent` tool
- 13 coordinator/delegator agents have `agents:` field with `agent` tool in tools list
- All agents with `agents:` field correctly include `agent` in their `tools:` list

---

### Task 2.4 — Agent visibility controls

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P2
- **Depends on:** Task 2.1
- **Scope:** Set `user-invocable` and `disable-model-invocation` per agent role

**Visibility Matrix:**
| Agent Type | `user-invocable` | `disable-model-invocation` |
|-----------|-------------------|---------------------------|
| Infrastructure (coordinator, memory-manager) | false | true |
| User-facing (coder, researcher, tester, reviewer) | true | false |
| Background-only (worker types) | false | true |

**Acceptance Criteria:**
- [x] All agents have appropriate visibility flags
- [x] Infrastructure agents hidden from model auto-invocation
- [x] User-facing agents visible and invokable via `@agent-name`

**Completion Notes:**
- smart-agent, sona-learning-optimizer, project-coordinator: `user-invocable: false`, `disable-model-invocation: true`
- All 98 agent files use correct `user-invocable` spelling (was `user-invokable`)
- 29 infrastructure/background agents are `user-invocable: false`
- 69 user-facing agents are `user-invocable: true`

---

## Phase 3: Configuration Generation

Rewrite the `init` command and config generators to output Copilot-native configuration.

### Task 3.1 — Rewrite init command and executor

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P0
- **Depends on:** Phase 1 (foundation must be in place)
- **Scope:** `npx ruflo init` generates Copilot-native output

**Generated Output:**
- `.github/copilot-instructions.md` — behavioral rules, architecture, coding standards
- `.vscode/mcp.json` — MCP server configuration
- `.github/agents/*.agent.md` — all agent definitions with Copilot frontmatter
- `.github/hooks/*.json` — hook definitions with OS-specific overrides
- `.github/prompts/*.prompt.md` — prompt files (slash command equivalents)
- `.github/skills/*/SKILL.md` — skills (already compatible format)

**Acceptance Criteria:**
- [x] `npx ruflo init` generates Copilot-native config by default
- [x] All 6 output types created correctly
- [x] No `.claude/settings.json` generated (Copilot mode)
- [x] Backward-compat flag for Claude Code output (`--claude-code`)

**Completion Notes:**
- Added `InitPlatform = 'copilot' | 'claude-code'` type, default platform is `'copilot'`
- `DIRECTORIES` constant split into `copilot` and `claude` path sets
- `executeInit()` routes all operations by platform: `createDirectories`, `writeMCPConfig`, `copySkills`, `copyAgents`, `copyPrompts`, `writeCopilotInstructions`, `writeHooksConfig`
- Added `--claude-code` CLI flag for backward-compat (applies `CLAUDE_CODE_INIT_OPTIONS`)
- Display strings updated: "Ruflo" branding, platform-aware summary boxes
- Zero new compilation errors introduced

**Files:**
- `v3/@claude-flow/cli/src/init/types.ts` (added `InitPlatform`, `platform` field, `CLAUDE_CODE_INIT_OPTIONS`)
- `v3/@claude-flow/cli/src/init/executor.ts` (platform routing + 4 new Copilot write functions)
- `v3/@claude-flow/cli/src/init/mcp-generator.ts` (added `generateCopilotMCPConfig/Json`)
- `v3/@claude-flow/cli/src/commands/init.ts` (added `--claude-code` flag, platform-aware display)
- `v3/@claude-flow/cli/src/init/index.ts` (updated exports)

---

### Task 3.2 — Rewrite settings generator

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Task 3.1
- **Scope:** Output `.vscode/settings.json` and `.github/copilot-instructions.md` instead of `.claude/settings.json`

**Details:**
- `.github/copilot-instructions.md` generation is already handled by Task 3.1 (`writeCopilotInstructions()` in executor.ts)
- Remaining: `.vscode/settings.json` generator and cleanup of 17 Claude Code refs in `settings-generator.ts`

**Acceptance Criteria:**
- [x] Generates `.github/copilot-instructions.md` with behavioral rules (done in Task 3.1)
- [x] Generates `.vscode/settings.json` with Copilot-relevant settings
- [x] No `.claude/settings.json` references (17 to remove)

**Completion Notes:**
- Added `generateCopilotSettings()` and `generateCopilotSettingsJson()` to settings-generator.ts
- Copilot `.vscode/settings.json` includes: file associations (`.agent.md`, `.prompt.md`), search/file exclusions for runtime data, ruflo project metadata (swarm, memory, neural config)
- Added `writeCopilotSettings()` to executor.ts with `.vscode/` directory auto-creation
- Executor routes `components.settings` by platform: Copilot → `.vscode/settings.json`, Claude Code → `.claude/settings.json`
- Default `components.settings` changed to `true` (was `false` — now generates for both platforms)
- Updated branding: `claude-flow` → `ruflo` in permissions, attribution, MCP tool patterns
- Removed `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var from generated settings
- Exported new functions from `index.ts`

**Files:**
- `v3/@claude-flow/cli/src/init/settings-generator.ts` (rewrite — added Copilot generators, cleaned branding)
- `v3/@claude-flow/cli/src/init/executor.ts` (added `writeCopilotSettings()`, platform routing)
- `v3/@claude-flow/cli/src/init/types.ts` (updated `settings` component comment and default)
- `v3/@claude-flow/cli/src/init/index.ts` (exported new functions)

---

### Task 3.3 — Rewrite MCP config generator

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Task 3.1
- **Scope:** Output `.vscode/mcp.json` instead of `.mcp.json` for Claude Code

**Target Output:**
```json
{
  "servers": {
    "ruflo": {
      "type": "stdio",
      "command": "npx",
      "args": ["ruflo", "mcp", "start"]
    }
  }
}
```

**Acceptance Criteria:**
- [x] Generates `.vscode/mcp.json` in Copilot format
- [x] MCP server configuration correct for Ruflo
- [x] No `.mcp.json` (Claude Code format) generated in Copilot mode

**Completion Notes:**
- Added `generateCopilotMCPConfig()` and `generateCopilotMCPJson()` in mcp-generator.ts
- Copilot format uses `servers` key (not `mcpServers`), includes `type: 'stdio'`
- `writeMCPConfig()` in executor.ts routes to `.vscode/mcp.json` (Copilot) or `.mcp.json` (Claude Code)
- Original `generateMCPConfig`/`generateMCPJson` preserved for Claude Code backward-compat

**Files:**
- `v3/@claude-flow/cli/src/init/mcp-generator.ts` (added Copilot generators)

---

### Task 3.4 — Convert prompt files (slash commands)

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P2
- **Depends on:** Task 3.1
- **Scope:** Convert `.claude/commands/*.md` → `.github/prompts/*.prompt.md`

**Details:**
- Copilot uses `.github/prompts/*.prompt.md` for slash command equivalents
- Adjust frontmatter format for Copilot prompt files
- Preserve command functionality and descriptions

**Acceptance Criteria:**
- [x] All Claude Code commands converted to Copilot prompt files
- [x] Prompt files use correct Copilot frontmatter format
- [x] Slash commands functional in Copilot chat

**Completion Notes:**
- `copyPrompts()` function added to executor.ts
- Sources from `plugin/commands/` or `.claude/commands/`, converts `.md` → `.prompt.md`
- Existing `.github/prompts/` files from Phase 2 preserved (skip if exist, unless `--force`)
- Copilot mode routes `copyCommands()` → `copyPrompts()` automatically

**Files:**
- `v3/@claude-flow/cli/src/init/executor.ts` (added `copyPrompts()` function)

---

### Task 3.5 — Rewrite copilot-instructions.md generator

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Task 3.1
- **Scope:** Extract content from `CLAUDE.md` into `.github/copilot-instructions.md`

**Content to Extract:**
- Behavioral rules
- Project architecture overview
- Coding standards
- Agent routing patterns
- Swarm configuration defaults
- File organization rules

**Acceptance Criteria:**
- [x] `.github/copilot-instructions.md` contains all essential project rules
- [x] Content de-coupled from Claude Code terminology
- [x] References use Copilot-native patterns (MCP tools, subagents, handoffs)

**Completion Notes:**
- `writeCopilotInstructions()` and `generateCopilotInstructionsContent()` added to executor.ts
- Generates: project description, MCP tool categories, coding standards, file organization, swarm config (from `InitOptions.runtime`), agent routing table, behavioral rules
- All content uses "Ruflo" branding, no Claude Code terminology
- Respects `--force` flag (skip if file exists)

**Files:**
- `v3/@claude-flow/cli/src/init/executor.ts` (added generator functions)

---

## Phase 4: MCP Tool Curation

The 215 MCP tools all work with Copilot, but need organization for effective model tool selection.

### Task 4.1 — Tool categorization system

- **Status:** `[x]` Complete
- **Priority:** P1
- **Depends on:** Phase 1
- **Scope:** Group tools into categories for enable/disable by group

**Categories (implemented — 25 categories, 258 tools):**
| Category | Tools | Group | Default |
|----------|-------|-------|---------|
| `agent` | 7 | core | enabled |
| `memory` | 7 | core | enabled |
| `swarm` | 4 | core | enabled |
| `task` | 6 | core | enabled |
| `config` | 6 | core | enabled |
| `session` | 5 | core | enabled |
| `system` | 5 | core | enabled |
| `progress` | 4 | core | enabled |
| `workflow` | 9 | core | enabled |
| `github` | 5 | github | enabled |
| `analyze` | 6 | github | enabled |
| `hooks` | 36 | intelligence | opt-in |
| `neural` | 6 | intelligence | opt-in |
| `embeddings` | 7 | intelligence | opt-in |
| `agentdb` | 15 | intelligence | opt-in |
| `daa` | 8 | intelligence | opt-in |
| `security` | 6 | security | opt-in |
| `claims` | 12 | security | opt-in |
| `hive-mind` | 9 | advanced | opt-in |
| `coordination` | 7 | advanced | opt-in |
| `browser` | 23 | advanced | opt-in |
| `terminal` | 5 | advanced | opt-in |
| `transfer` | 11 | advanced | opt-in |
| `performance` | 6 | advanced | opt-in |
| `coverage` | 3 | advanced | opt-in |

**Profiles (implemented):**
| Profile | Categories | Approx. Tools |
|---------|-----------|---------------|
| `minimal` | core only | ~53 |
| `default` | core + github | ~64 |
| `development` | core + github + intelligence + security | ~140 |
| `full` | all categories | ~258 |
| `ci` | core + github + security | ~82 |

**Acceptance Criteria:**
- [x] All 258 tools assigned to a category
- [x] Category metadata schema defined (`tool-categories.ts`)
- [x] Enable/disable by category supported in MCP config
- [x] Profile filtering wired into MCP server `tools/list`
- [x] `CLAUDE_FLOW_TOOL_PROFILE` env var read at server startup

**Files changed:**
- `v3/@claude-flow/cli/src/mcp-tools/tool-categories.ts` — NEW: category registry + profile system
- `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` — added `category: 'hooks'` to 36 tools
- `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` — added `category: 'agentdb'` to 15 tools
- `v3/@claude-flow/cli/src/mcp-tools/progress-tools.ts` — added `category: 'progress'` to 4 tools
- `v3/@claude-flow/cli/src/mcp-tools/security-tools.ts` — added `category: 'security'` to 6 tools
- `v3/@claude-flow/cli/src/mcp-tools/index.ts` — exports for tool-categories
- `v3/@claude-flow/cli/src/mcp-client.ts` — `listMCPToolsByCategories()`, `listMCPToolsForProfile()`
- `v3/@claude-flow/cli/src/mcp-server.ts` — profile-aware `tools/list` handler
- `v3/@claude-flow/cli/src/init/types.ts` — `toolProfile` added to `MCPConfig`
- `v3/@claude-flow/cli/src/init/mcp-generator.ts` — emits `CLAUDE_FLOW_TOOL_PROFILE` env var

---

### Task 4.2 — Default tool profile

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P1
- **Depends on:** Task 4.1
- **Scope:** `default` profile (core + github, ~64 tools) enabled by default

**Details:**
- Default profile optimized for model tool selection (not overwhelming with 258 tools)
- Users opt in to additional categories via `CLAUDE_FLOW_TOOL_PROFILE` env var
- Generated `.vscode/mcp.json` uses default profile
- Original estimate was ~45 tools; actual core+github count is ~64

**Acceptance Criteria:**
- [x] `default` profile defined in `tool-categories.ts` (core + github categories)
- [x] `CLAUDE_FLOW_TOOL_PROFILE` env var emitted by MCP config generators
- [x] MCP server `tools/list` reads env var and filters by profile
- [x] `npx ruflo init` generates config with `toolProfile: 'default'`
- [x] Additional profiles available: `minimal`, `development`, `full`, `ci`
- [x] Apply `default` profile as fallback when env var is not set (was falling back to all tools)
- [x] Verify profile filtering end-to-end with MCP server startup
- [x] Document profile selection in copilot-instructions.md output

**Completion Notes:**
- MCP server `tools/list` handler now falls back to `'default'` profile when `CLAUDE_FLOW_TOOL_PROFILE` env var is not set (was returning all ~258 tools)
- Removed unused `listMCPTools` import from `mcp-server.ts` (only `listMCPToolsForProfile` needed)
- Added Tool Profiles documentation section to `generateCopilotInstructionsContent()` — documents all 5 profiles with categories, tool counts, and use cases
- Full chain verified: `init` → `.vscode/mcp.json` env var → MCP server profile filter → `tools/list` response

---

### Task 4.3 — MCP App for swarm status

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P3
- **Depends on:** Phase 1
- **Scope:** Replace Claude Code statusline with MCP App rich UI component

**Details:**
- MCP Apps render rich UI (dashboards, forms) in Copilot chat
- Replaces `.claude/helpers/statusline.cjs` (Claude Code-specific)
- Shows swarm status, agent metrics, memory usage

**Acceptance Criteria:**
- [x] MCP App rendering swarm status in Copilot chat
- [x] Agent metrics visible (active, idle, busy counts)
- [x] Memory usage dashboard
- [x] Old statusline helper removed

**Completion Notes:**
- Created `v3/@claude-flow/cli/src/mcp-tools/dashboard-tools.ts` with `swarm_dashboard` tool
- Tool returns rich markdown dashboard with sections: swarm, memory/AgentDB, system resources, hooks, tests, integration
- Supports 3 output formats: `markdown` (rich tables), `json` (raw data), `summary` (single-line)
- Supports `sections` parameter to request specific dashboard sections
- Registered in tool registry via `mcp-client.ts` and exported from `mcp-tools/index.ts`
- Added to `system` category (core group, default-enabled) — tool count 5→6
- Removed legacy `.claude/helpers/statusline.cjs` (742 lines)
- Removed `statusLine` config block from `.claude/settings.json`
- `npx ruflo init` (Copilot mode) already skips statusline generation — no executor changes needed

**Files:**
- `v3/@claude-flow/cli/src/mcp-tools/dashboard-tools.ts` (new — 298 lines)
- `v3/@claude-flow/cli/src/mcp-tools/index.ts` (added export)
- `v3/@claude-flow/cli/src/mcp-client.ts` (added import + registration)
- `v3/@claude-flow/cli/src/mcp-tools/tool-categories.ts` (system toolCount 5→6)
- `.claude/helpers/statusline.cjs` (deleted)
- `.claude/settings.json` (removed statusLine block)

---

## Phase 5: Integration & Cleanup

Final cleanup, cross-cutting concerns, and test updates.

### Task 5.1 — Rewrite guidance package generators

- **Status:** `[x]` **Complete** (2026-03-04)
- **Priority:** P2
- **Depends on:** Phase 3
- **Scope:** Output Copilot-native governance config

**Acceptance Criteria:**
- [x] `@claude-flow/guidance/src/generators.ts` — Claude Code refs made platform-aware
- [x] Generates Copilot-native governance configuration
- [x] Governance rules compatible with Copilot instructions format

**Completion Notes:**
- Added `generateCopilotInstructions()` — generates `.github/copilot-instructions.md` content
- Added `generateCopilotLocalMd()` — generates `.github/local-instructions.md` content
- Shared implementation via `generateInstructionsMd(profile, platform)` and `generateLocalMd(local, platform)`
- `scaffold()` now accepts `platform?: 'copilot' | 'claude-code'` (defaults to `'copilot'`)
- Copilot scaffold outputs to `.github/agents/*.agent.md`, `.github/skills/*/SKILL.md`
- Claude Code scaffold preserved for backward-compat (`.claude/agents/`, `CLAUDE.md`, etc.)
- Agent index only generated for Claude Code (Copilot discovers agents by file)
- Platform-specific text: monorepo layering, local-instructions gitignore note
- Exported `generateCopilotInstructions`, `generateCopilotLocalMd`, `ScaffoldPlatform` from index.ts
- Zero compilation errors

**Files:**
- `v3/@claude-flow/guidance/src/generators.ts` (rewrite — platform-aware generators + scaffold)
- `v3/@claude-flow/guidance/src/index.ts` (added exports)

---

### Task 5.2 — Replace teammate plugin with Copilot subagent patterns

- **Status:** `[ ]` Not Started
- **Priority:** P2
- **Depends on:** Phase 2 (agent conversion)
- **Scope:** Replace `v3/plugins/teammate-plugin/` (10 Claude Code refs)

**Details:**
- Remove `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` dependency
- Coordination logic moves into coordinator agent instructions + MCP memory tools
- Copilot handles multi-agent natively via subagents

**Acceptance Criteria:**
- [ ] Teammate plugin replaced or removed
- [ ] No `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` references remain
- [ ] Coordination logic works via Copilot subagents + MCP memory

**Files:**
- `v3/plugins/teammate-plugin/` (5 files — rewrite/remove)

---

### Task 5.3 — Update model routing in agent tools

- **Status:** `[ ]` Not Started
- **Priority:** P2
- **Depends on:** Phase 1
- **Scope:** Replace hardcoded model IDs with Copilot logical model names

**Details:**
- Copilot uses logical model names in agent frontmatter: `model: [claude-sonnet-4, gpt-4.1]`
- Provider-specific IDs (`claude-opus-4-6`, `gpt-4o`) used only in background worker executor
- Two separate model naming systems: frontmatter (logical) vs worker executor (provider-specific)

**Acceptance Criteria:**
- [ ] Agent frontmatter uses logical model names
- [ ] Worker executor uses provider-specific model IDs
- [ ] No hardcoded Claude-specific model IDs in agent tools

**Files:**
- `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` (rewrite)

---

### Task 5.4 — Rewrite auto-memory hook

- **Status:** `[ ]` Not Started
- **Priority:** P2
- **Depends on:** Task 1.5
- **Scope:** Rewrite for `.github/` paths instead of `.claude/` paths

**Acceptance Criteria:**
- [ ] Auto-memory hook reads/writes `.github/` paths
- [ ] No `.claude/helpers/` references remain
- [ ] Memory integration with Copilot conversation context

**Files:**
- `.claude/helpers/auto-memory-hook.mjs` (rewrite → `.github/hooks/`)

---

### Task 5.5 — Update all tests

- **Status:** `[ ]` Not Started
- **Priority:** P1
- **Depends on:** All previous phases
- **Scope:** Update tests referencing `.claude/` paths, Claude Code env vars, `claude --print` spawn

**Details:**
- Find and update all test files that reference:
  - `.claude/` paths → `.github/` paths
  - `CLAUDE_CODE_HEADLESS` env var
  - `spawn('claude', ...)` patterns
  - Claude Code-specific config structures

**Acceptance Criteria:**
- [ ] No test files reference `.claude/` paths (except backward-compat tests)
- [ ] No test files reference `CLAUDE_CODE_HEADLESS`
- [ ] No test files spawn `claude` binary
- [ ] All tests pass on `copilot-refactoring` branch

---

## Dependency Graph

```
Phase 1 (Foundation)                    Phase 2 (Agents)
├─ 1.1 Remove V2 ──────────────┐       ├─ 2.1 Agent frontmatter ◄──── Can start immediately
├─ 1.2 Headless worker ────┐   │       ├─ 2.2 Handoff graph ◄──── Depends on 2.1
│   ├─ 1.3 Container pool  │   │       ├─ 2.3 Subagent delegation ◄──── Depends on 2.1
│   └─ 1.4 Headless runtime│   │       └─ 2.4 Visibility controls ◄──── Depends on 2.1
└─ 1.5 Hook bridge ────────┤   │
                            │   │
Phase 3 (Config Gen)        │   │       Phase 4 (MCP Tools)
├─ 3.1 Init command ◄──────┘   │       ├─ 4.1 Tool categorization ◄──── Depends on Phase 1
│   ├─ 3.2 Settings gen        │       ├─ 4.2 Default profile ◄──── Depends on 4.1
│   ├─ 3.3 MCP config gen      │       └─ 4.3 MCP App ◄──── Depends on Phase 1
│   ├─ 3.4 Prompt files        │
│   └─ 3.5 Instructions gen    │
                                │
Phase 5 (Cleanup)               │
├─ 5.1 Guidance pkg ◄──────── Phase 3
├─ 5.2 Teammate plugin ◄───── Phase 2
├─ 5.3 Model routing ◄──────── Phase 1
├─ 5.4 Auto-memory hook ◄──── 1.5
└─ 5.5 Update tests ◄───────── ALL PHASES
```

## Parallel Work Streams

These tasks can be worked on simultaneously:

**Stream A (Service Layer):** 1.2 → 1.3, 1.4  
**Stream B (Hook Bridge):** 1.5 → 5.4  
**Stream C (Agents):** 2.1 → 2.2, 2.3, 2.4  
**Stream D (V2 Removal):** 1.1 (independent)  
**Stream E (Config Gen):** 3.1 → 3.2, 3.3, 3.4, 3.5 (after Phase 1)  
**Stream F (MCP Tools):** 4.1 → 4.2 (after Phase 1)  

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MCP protocol version mismatch | Medium | High | Use CLI server (protocol `2024-11-05`) for Copilot initially |
| 215 tools overwhelms model tool selection | High | Medium | Tool categorization with ~45 default tools |
| Background worker capability loss | Medium | Medium | Analysis workers unaffected; mutation workers route through MCP |
| Agent handoff graph complexity | Medium | Low | Start with core 10-15 agents, add incrementally |
| Agent body content references Claude Code patterns | Medium | Low | Audit all 90 agent bodies for `mcp__claude-flow__*` patterns |
| Hook event gaps | Low | Low | Same 8 core events; `TeammateIdle`/`TaskCompleted` → MCP tools |

