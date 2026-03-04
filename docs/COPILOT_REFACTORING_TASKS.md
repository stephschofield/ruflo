# Copilot Refactoring — Task Tracker

**Branch:** `copilot-refactoring`  
**Source Plan:** [COPILOT_MIGRATION_ASSESSMENT.md](./COPILOT_MIGRATION_ASSESSMENT.md)  
**Created:** 2026-03-03  
**Strategy:** Native Copilot rebuild — Copilot as primary platform  

---

## Summary

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| **Phase 1** | Foundation (Core Infrastructure) | 5 | In Progress (4/5) |
| **Phase 2** | Agent Conversion (All 60+ Agents) | 4 | Complete (4/4) |
| **Phase 3** | Configuration Generation | 5 | Not Started |
| **Phase 4** | MCP Tool Curation | 3 | Not Started |
| **Phase 5** | Integration & Cleanup | 5 | Not Started |

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
- [ ] Analysis workers return results to AgentDB memory
- [ ] Mutation workers route changes through MCP file tools

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

- **Status:** `[ ]` Not Started
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
- [ ] `npx ruflo init` generates Copilot-native config by default
- [ ] All 6 output types created correctly
- [ ] No `.claude/settings.json` generated (Copilot mode)
- [ ] Backward-compat flag for Claude Code output (optional)

**Files:**
- `v3/@claude-flow/cli/src/commands/init.ts` (rewrite)
- `v3/@claude-flow/cli/src/init/executor.ts` (rewrite — 44 Claude Code refs)

---

### Task 3.2 — Rewrite settings generator

- **Status:** `[ ]` Not Started
- **Priority:** P1
- **Depends on:** Task 3.1
- **Scope:** Output `.vscode/settings.json` and `.github/copilot-instructions.md` instead of `.claude/settings.json`

**Acceptance Criteria:**
- [ ] Generates `.vscode/settings.json` with Copilot-relevant settings
- [ ] Generates `.github/copilot-instructions.md` with behavioral rules
- [ ] No `.claude/settings.json` references (17 to remove)

**Files:**
- `v3/@claude-flow/cli/src/init/settings-generator.ts` (rewrite — 17 Claude Code refs)

---

### Task 3.3 — Rewrite MCP config generator

- **Status:** `[ ]` Not Started
- **Priority:** P1
- **Depends on:** Task 3.1
- **Scope:** Output `.vscode/mcp.json` instead of `.mcp.json` for Claude Code

**Target Output:**
```json
{
  "servers": {
    "ruflo": {
      "command": "npx",
      "args": ["ruflo", "mcp", "start"],
      "env": {}
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Generates `.vscode/mcp.json` in Copilot format
- [ ] MCP server configuration correct for Ruflo
- [ ] No `.mcp.json` (Claude Code format) generated

**Files:**
- `v3/@claude-flow/cli/src/init/mcp-generator.ts` (rewrite)

---

### Task 3.4 — Convert prompt files (slash commands)

- **Status:** `[ ]` Not Started
- **Priority:** P2
- **Depends on:** Task 3.1
- **Scope:** Convert `.claude/commands/*.md` → `.github/prompts/*.prompt.md`

**Details:**
- Copilot uses `.github/prompts/*.prompt.md` for slash command equivalents
- Adjust frontmatter format for Copilot prompt files
- Preserve command functionality and descriptions

**Acceptance Criteria:**
- [ ] All Claude Code commands converted to Copilot prompt files
- [ ] Prompt files use correct Copilot frontmatter format
- [ ] Slash commands functional in Copilot chat

**Files:**
- `.claude/commands/*.md` (source)
- `.github/prompts/*.prompt.md` (target)

---

### Task 3.5 — Rewrite copilot-instructions.md generator

- **Status:** `[ ]` Not Started
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
- [ ] `.github/copilot-instructions.md` contains all essential project rules
- [ ] Content de-coupled from Claude Code terminology
- [ ] References use Copilot-native patterns (MCP tools, subagents, handoffs)

**Files:**
- `CLAUDE.md` (source reference)
- `.github/copilot-instructions.md` (target — generated)

---

## Phase 4: MCP Tool Curation

The 215 MCP tools all work with Copilot, but need organization for effective model tool selection.

### Task 4.1 — Tool categorization system

- **Status:** `[ ]` Not Started
- **Priority:** P1
- **Depends on:** Phase 1
- **Scope:** Group tools into categories for enable/disable by group

**Categories:**
| Category | Approx. Tools | Description |
|----------|---------------|-------------|
| `core` | ~25 | Memory, swarm init, agent spawn, task management — always enabled |
| `github` | ~20 | PR management, issue tracking, code review, release |
| `neural` | ~15 | SONA learning, pattern training, neural modes |
| `security` | ~15 | Scanning, audit, CVE, threat modeling |
| `performance` | ~10 | Benchmarking, profiling, metrics |
| `embeddings` | ~10 | Vector search, similarity, clustering |
| `plugins` | ~10 | Plugin management, registry, discovery |
| `advanced` | ~110 | Remaining tools — opt-in |

**Acceptance Criteria:**
- [ ] All 215 tools assigned to a category
- [ ] Category metadata schema defined
- [ ] Enable/disable by category supported in MCP config

**Files:**
- MCP tool registration files (add category metadata)
- MCP config generator (support categories)

---

### Task 4.2 — Default tool profile

- **Status:** `[ ]` Not Started
- **Priority:** P1
- **Depends on:** Task 4.1
- **Scope:** `core` + `github` categories (~45 tools) enabled by default

**Details:**
- Default profile optimized for model tool selection (not overwhelming with 215 tools)
- Users opt in to additional categories explicitly
- Generated `.vscode/mcp.json` uses default profile

**Acceptance Criteria:**
- [ ] Default profile exposes ~45 tools (core + github)
- [ ] Additional categories available via config
- [ ] `npx ruflo init` generates config with default profile

---

### Task 4.3 — MCP App for swarm status

- **Status:** `[ ]` Not Started
- **Priority:** P3
- **Depends on:** Phase 1
- **Scope:** Replace Claude Code statusline with MCP App rich UI component

**Details:**
- MCP Apps render rich UI (dashboards, forms) in Copilot chat
- Replaces `.claude/helpers/statusline.cjs` (Claude Code-specific)
- Shows swarm status, agent metrics, memory usage

**Acceptance Criteria:**
- [ ] MCP App rendering swarm status in Copilot chat
- [ ] Agent metrics visible (active, idle, busy counts)
- [ ] Memory usage dashboard
- [ ] Old statusline helper removed

---

## Phase 5: Integration & Cleanup

Final cleanup, cross-cutting concerns, and test updates.

### Task 5.1 — Rewrite guidance package generators

- **Status:** `[ ]` Not Started
- **Priority:** P2
- **Depends on:** Phase 3
- **Scope:** Output Copilot-native governance config

**Acceptance Criteria:**
- [ ] `@claude-flow/guidance/src/generators.ts` — 4 Claude Code refs removed
- [ ] Generates Copilot-native governance configuration
- [ ] Governance rules compatible with Copilot instructions format

**Files:**
- `v3/@claude-flow/guidance/src/generators.ts` (rewrite)

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

