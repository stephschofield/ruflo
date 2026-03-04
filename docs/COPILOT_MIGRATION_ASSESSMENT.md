# Ruflo -> GitHub Copilot Native Rebuild Plan

**Date**: 2026-03-03
**Branch**: `assessment`
**Strategy**: Native Copilot rebuild (Strategy B) — Copilot as primary platform
**Scope**: Full codebase review of Ruflo v3.5 (formerly Claude Flow) with plan to rebuild natively for GitHub Copilot

---

## Executive Summary

Ruflo is a multi-agent orchestration framework built primarily for Claude Code. The codebase contains ~9,400 files across V2 (legacy) and V3 (active) implementations, 20 sub-packages, 215+ MCP tools, 60+ agent definitions, and extensive hooks/memory/intelligence systems.

**This plan targets a native Copilot rebuild, not a port.** Copilot becomes the primary platform. The architecture is layered such that ~70% of the codebase (the core libraries) is already platform-agnostic and stays as-is. The remaining 30% — the CLI service layer, agent definitions, configuration generators, and worker executor — gets rewritten to use Copilot's native primitives: subagent orchestration, handoff graphs, Copilot-native agent frontmatter, and `.github/` directory conventions.

All 60+ agents are converted (not reduced). All 12 background workers are retained using provider-agnostic LLM API calls. V2 (6,440 files) is removed.

---

## 1. Codebase Architecture Overview

### Package Structure

```
ruflo/                          # Root umbrella (npm: claude-flow@3.5.2)
  bin/cli.js                    # Proxy to v3/@claude-flow/cli
  ruflo/                        # Thin wrapper (npm: ruflo@3.5.2)
  packages/coflow/              # Shorthand alias (npm: coflow)
  v3/                           # Active monorepo (pnpm workspaces)
    @claude-flow/cli/           # Core CLI (184 TS files, 46 commands)
    @claude-flow/mcp/           # Standalone MCP server (protocol 2025-11-25)
    @claude-flow/swarm/         # Coordination engine (4 topologies, 3 consensus)
    @claude-flow/memory/        # AgentDB + HNSW vector search
    @claude-flow/hooks/         # 17 hooks + 12 background workers
    @claude-flow/neural/        # SONA learning
    @claude-flow/providers/     # Multi-LLM abstraction (6 providers)
    @claude-flow/plugins/       # Plugin SDK + registry
    @claude-flow/shared/        # Types, events, utilities
    @claude-flow/security/      # Input validation, CVE remediation
    @claude-flow/embeddings/    # Vector embeddings (sql.js WASM)
    @claude-flow/codex/         # OpenAI Codex adapter
    @claude-flow/guidance/      # Governance control plane
    @claude-flow/performance/   # Benchmarking
    @claude-flow/integration/   # agentic-flow bridge
    @claude-flow/testing/       # TDD framework
    @claude-flow/deployment/    # Release management
    @claude-flow/browser/       # Browser automation
    @claude-flow/aidefence/     # Prompt injection defense
    @claude-flow/claims/        # Work coordination
  v2/                           # Legacy V2 — TO BE REMOVED
  .claude/                      # Claude Code configuration — TO BE REPLACED
  .agents/                      # OpenAI Codex CLI configuration — TO BE REPLACED
```

### Key Observations

1. **Three-package publishing model**: `@claude-flow/cli`, `claude-flow`, and `ruflo` are all published to npm
2. **V2 is dead weight**: 6,440 files excluded from npm publish via `.npmignore`; retained only for reference. Will be removed in this rebuild.
3. **Already cross-platform**: The `.agents/` directory with `config.toml` is a port of `.claude/` for OpenAI Codex CLI, proving one cross-platform adaptation has already been done
4. **MCP is custom-built**: V3 implements MCP from scratch (no `@modelcontextprotocol/sdk` dependency), giving full control over protocol compliance
5. **Optional dependency pattern**: Heavy packages (memory, embeddings, guidance, codex) are optional in the CLI, enabling lightweight installation

---

## 2. Platform Coupling Analysis

### Layer 1: Fully Generic (No Platform Coupling) — KEPT AS-IS

These packages work with any AI platform. Zero Claude Code references:

| Package | Files | Purpose |
|---------|-------|---------|
| `@claude-flow/mcp` | 20 | Pure MCP protocol implementation |
| `@claude-flow/swarm` | 42 | Coordination engine, topologies, consensus |
| `@claude-flow/memory` | 51 | AgentDB, HNSW, SQLite storage |
| `@claude-flow/plugins` | 66 | Plugin SDK, registry, dependency graph |
| `@claude-flow/embeddings` | 16 | Vector embeddings |
| `@claude-flow/security` | 30 | Input validation, path security |
| `@claude-flow/neural` | 52 | SONA learning, neural modes |
| `@claude-flow/shared` | 85 | Types, events, utilities |
| `@claude-flow/performance` | 15 | Benchmarking |
| `@claude-flow/testing` | 38 | TDD framework |
| `@claude-flow/aidefence` | 7 | Prompt injection defense |
| `@claude-flow/claims` | 23 | Work coordination |

**Total**: ~450 source files, representing ~70% of the functional code. No changes required.

### Layer 2: Abstracted (Anthropic-Aware but Portable) — MINOR CHANGES

These have Anthropic-specific code behind generic interfaces:

| Component | Coupling Point | Migration Action |
|-----------|---------------|-----------------|
| `@claude-flow/providers` | `AnthropicProvider` uses Anthropic API format | Already abstracted behind `LLMProvider` interface. No framework changes needed. Copilot routes model selection through its own `model` frontmatter field — the providers package is used for background workers only. |
| MCP sampling | `createAnthropicProvider` factory | Behind `LLMProvider` interface, easy to swap |

### Layer 3: Tightly Coupled to Claude Code — REWRITTEN

These are rewritten for Copilot-native behavior:

| Component | File(s) | Coupling | Migration Action |
|-----------|---------|----------|-----------------|
| **Headless worker executor** | `cli/src/services/headless-worker-executor.ts` | Spawns `claude --print` binary directly | Replace `spawn('claude', ...)` with provider-agnostic LLM API calls through `@claude-flow/providers`. All 12 workers retained. Workers that only analyze/report (audit, testgaps, document, predict, ultralearn, deepdive) work directly. Workers that need file writes (refactor, optimize) route output through MCP server as proposed changes. |
| **Container worker pool** | `cli/src/services/container-worker-pool.ts` | Sets Claude Code env vars in Docker containers | Rewrite env var mapping for provider-agnostic execution |
| **Settings generator** | `cli/src/init/settings-generator.ts` | Generates `.claude/settings.json` | Rewrite to generate `.vscode/settings.json` and `.github/copilot-instructions.md` |
| **MCP config generator** | `cli/src/init/mcp-generator.ts` | Generates `.mcp.json` for Claude Code | Rewrite to generate `.vscode/mcp.json` |
| **Headless runtime** | `cli/src/runtime/headless.ts` | `CLAUDE_CODE_HEADLESS` runtime | Rewrite to use provider API calls |
| **Agent model mapping** | `cli/src/mcp-tools/agent-tools.ts` | Maps to `claude-sonnet-4-5-*`, etc. | Replace with Copilot model routing (logical names via `model` frontmatter field, not hardcoded IDs) |
| **Codex adapter** | `@claude-flow/codex/` (18 files) | CLAUDE.md parser, Claude-to-Codex migration | Repurpose as generic platform bridge or drop in favor of direct Copilot support |
| **Hook bridge** | `@claude-flow/hooks/src/bridge/official-hooks-bridge.ts` | Maps V3 hook events to Claude Code's hook protocol | Rewrite for Copilot hook protocol (same 8 events, same stdin/stdout JSON, same exit codes — mostly a config path change) |
| **Auto-memory hook** | `.claude/helpers/auto-memory-hook.mjs` | Bridges Claude Code's MEMORY.md files | Rewrite for `.github/` paths |
| **Status line** | `.claude/helpers/statusline.cjs` | Claude Code UI status bar | Replace with MCP App (rich UI component in Copilot chat) or drop |
| **Teammate plugin** | `v3/plugins/teammate-plugin/` (5 files) | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Replace with Copilot subagent orchestration pattern |
| **Init executor** | `cli/src/init/executor.ts` (44 refs) | Claude Code config paths | Rewrite output targets for `.github/` directory structure |
| **Guidance generators** | `@claude-flow/guidance/src/generators.ts` (4 refs) | Claude Code governance config | Rewrite output format for Copilot |

**Total**: ~25-30 files rewritten.

### Layer 4: Configuration Files — REPLACED

| Claude Code | Copilot Native | Migration Action |
|-------------|---------------|-----------------|
| `.claude/settings.json` | `.vscode/settings.json` + `.github/copilot-instructions.md` | Rewrite generator |
| `.claude/mcp.json` | `.vscode/mcp.json` | Near-identical format, change output path |
| `.claude/agents/*.md` (90 files) | `.github/agents/*.agent.md` (90 files) | Convert all agents to Copilot frontmatter (add `tools`, `agents`, `model`, `handoffs`) |
| `.claude/commands/*.md` | `.github/prompts/*.prompt.md` | Rename + adjust format for prompt files |
| `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` | Already compatible format, move directory |
| `CLAUDE.md` | `.github/copilot-instructions.md` | Rewrite as Copilot instructions |
| `.claude/helpers/hooks*.json` | `.github/hooks/*.json` | Same protocol, change paths + add OS overrides |

### Layer 5: Removed

| Component | Reason |
|-----------|--------|
| `v2/` (6,440 files) | Legacy dead weight. Not published, not referenced by V3 |
| `.agents/config.toml` (Codex config) | Replaced by Copilot-native config |
| `CLAUDE.md` as primary instructions | Replaced by `.github/copilot-instructions.md` |
| `TeammateIdle` / `TaskCompleted` hooks | Claude Code-specific events with no Copilot equivalent. Functionality handled through MCP tools and subagent lifecycle instead |

---

## 3. GitHub Copilot Feature Mapping

### Direct Equivalences

| Claude Code Feature | Copilot Equivalent | Compatibility |
|--------------------|--------------------|---------------|
| MCP servers (stdio) | MCP servers (stdio) | **Identical**. Same JSON-RPC 2.0 protocol, same stdio transport |
| MCP servers (HTTP) | MCP servers (HTTP) | **Identical** |
| `.claude/agents/*.md` | `.github/agents/*.agent.md` | **High**. Copilot reads `.claude/agents/` with auto-conversion, but native `.github/agents/` is preferred |
| Hooks (8 events) | Hooks (8 events) | **Identical events**: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SubagentStart, SubagentStop, Stop |
| Hook stdin/stdout JSON | Hook stdin/stdout JSON | **Identical protocol**. Same exit codes (0, 2, non-zero) |
| Slash commands | Prompt files | **Similar**. `.github/prompts/*.prompt.md` replaces `.claude/commands/*.md` |
| Skills (SKILL.md) | Agent Skills (SKILL.md) | **Identical**. Copilot reads `.claude/skills/` natively. Same YAML frontmatter format |
| Task tool (sub-agents) | Subagents (`agents` field) | **Different model**. Copilot uses declarative `agents` field in frontmatter for subagent delegation |
| CLAUDE.md | `.github/copilot-instructions.md` | **Similar**. Both are always-on Markdown instruction files |
| Tool permissions | Tool restrictions in agent frontmatter | **Similar**. Copilot uses `tools` array in agent frontmatter |
| Model selection | `model` field in agent frontmatter | **Available**. Copilot supports model arrays with fallback |

### Copilot-Native Features to Adopt

These are Copilot features that don't exist in Claude Code. The native rebuild should use them:

| Feature | Description | How Ruflo Uses It |
|---------|-------------|-------------------|
| `handoffs` | Directed-graph agent-to-agent transitions rendered as UI buttons. Not sequential — any agent can declare multiple handoff targets. The model or user triggers transitions based on context. | Design handoff graphs per agent role. A `coordinator` can hand off to `coder`, `tester`, `reviewer`, or `security-auditor` depending on need. A `researcher` can hand off to `architect` or back to `coordinator`. |
| `argument-hint` | Placeholder text in chat input when agent is invoked | Add per-agent hints (e.g., `@coder` shows "Describe what you want to implement...") |
| `user-invokable` / `disable-model-invocation` | Granular control over agent visibility and auto-invocation | Mark infrastructure agents (coordinator, memory-manager) as `disable-model-invocation: true`. Mark user-facing agents (coder, researcher, tester) as `user-invokable: true`. |
| Organization-level agents | GitHub org-wide agent sharing via `.github/agents/` in a `.github` repo | Publish Ruflo's agent library as an org-level package |
| `target` field | `vscode` vs `github-copilot` targeting | Target `vscode` for dev workflow agents, `github-copilot` for review/PR agents |
| Agent Skills open standard | `agentskills.io` cross-platform compatibility | Publish skills to `agentskills.io` for cross-platform discovery |
| MCP Apps | Rich UI components (dashboards, forms) rendered in chat | Replace statusline with an MCP App for swarm status visualization |

### Claude Code Features Without Direct Copilot Equivalent

| Feature | Resolution |
|---------|-----------|
| `claude -p` headless mode | Replace with provider-agnostic LLM API calls through `@claude-flow/providers`. Background workers call LLM APIs directly instead of spawning a CLI binary. |
| `TeamCreate` / `SendMessage` | Replace with Copilot's subagent orchestration. Coordinator agents use `agents: ['*']` to delegate to subagents. Memory coordination via MCP tools remains unchanged. |
| `TodoWrite` / task lists | Expose as MCP tools. The MCP server already has `task_create`, `task_status`, `task_list`, `task_complete`. |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Not needed. Copilot handles multi-agent coordination natively via subagents. |
| `TeammateIdle` / `TaskCompleted` hooks | Handle through MCP tools and `SubagentStart` / `SubagentStop` hook events instead. |
| Statusline | Replace with MCP App or drop. |

---

## 4. Migration Plan

### Phase 1: Foundation (Core Infrastructure)

Replace the platform coupling in the CLI service layer. This is the structural work that everything else depends on.

**1.1 Remove V2**

Delete the `v2/` directory (6,440 files). It is not published, not imported by V3, and not relevant to the Copilot rebuild.

**1.2 Rewrite headless worker executor**

Replace `spawn('claude', ['--print', ...])` in `cli/src/services/headless-worker-executor.ts` with calls through `@claude-flow/providers`:

- The `LLMProvider` interface already supports OpenAI, Anthropic, Google, Cohere, and Ollama
- Workers that analyze/report (audit, testgaps, document, predict, ultralearn, deepdive) send prompts with code context and receive text responses — no IDE tool access needed
- Workers that modify files (refactor, optimize) receive proposed changes as structured output and route them through the MCP server's file operation tools
- All 12 background workers are retained
- The provider to use is configurable (not hardcoded to Anthropic)

**1.3 Rewrite container worker pool**

Update `cli/src/services/container-worker-pool.ts` to set provider-agnostic env vars instead of Claude Code-specific ones.

**1.4 Rewrite headless runtime**

Update `cli/src/runtime/headless.ts` to remove `CLAUDE_CODE_HEADLESS` dependency and use provider API calls.

**1.5 Rewrite hook bridge**

Create a Copilot-native `official-hooks-bridge.ts` that maps V3 internal events to Copilot's hook protocol. The protocols are nearly identical (same 8 events, same stdin/stdout JSON, same exit codes). The change is primarily config paths (`.github/hooks/` instead of `.claude/settings.json`) and dropping the `TeammateIdle`/`TaskCompleted` events.

### Phase 2: Agent Conversion (All 60+ Agents)

Convert every agent definition from Claude Code format to Copilot-native format. This is a format conversion, not a reduction.

**2.1 Agent frontmatter conversion**

Each `.claude/agents/*.md` becomes `.github/agents/*.agent.md` with Copilot frontmatter:

```yaml
---
name: researcher
description: Deep research and information gathering specialist
model:
  - claude-sonnet-4
  - gpt-4.1
tools:
  - ruflo          # MCP server with all Ruflo tools
agents:
  - coder
  - architect
handoffs:
  - agent: architect
    trigger: When research reveals architectural decisions needed
  - agent: coder
    trigger: When research is complete and implementation can begin
  - agent: coordinator
    trigger: When research reveals scope changes or blockers
user-invokable: true
argument-hint: Describe what you want to research...
---

# Research and Analysis Agent

[Agent instructions — same body content, remove Claude Code-specific
MCP invocation examples, replace with generic tool usage patterns]
```

**2.2 Handoff graph design**

Handoffs are a directed graph, not a sequential pipeline. Each agent declares which other agents it can hand off to and under what conditions. The model or user triggers the handoff.

Core handoff topology:

```
coordinator ──→ researcher, architect, coder, tester, reviewer, security-auditor
researcher  ──→ architect, coder, coordinator
architect   ──→ coder, coordinator
coder       ──→ tester, reviewer, coordinator
tester      ──→ coder (fix failures), coordinator
reviewer    ──→ coder (fix issues), coordinator
security-auditor ──→ coder (fix vulnerabilities), coordinator
```

Domain-specific agents (PR manager, release manager, etc.) follow the same pattern with handoffs relevant to their workflows.

**2.3 Subagent delegation**

Replace Claude Code's `Task` tool spawning with Copilot's `agents` frontmatter field:

- Coordinator agents declare `agents: ['*']` (can delegate to any agent)
- Specialist agents declare `agents: ['specific-agent']` for targeted delegation
- The MCP memory tools continue to provide cross-agent state sharing

**2.4 Visibility controls**

- Infrastructure agents (coordinator, memory-manager, swarm-coordinator): `disable-model-invocation: true`
- User-facing agents (coder, researcher, tester, reviewer): `user-invokable: true`
- Background-only agents (worker types): `user-invokable: false`, `disable-model-invocation: true`

### Phase 3: Configuration Generation

Rewrite the `init` command and config generators to output Copilot-native configuration.

**3.1 Rewrite init command**

`cli/src/commands/init.ts` and `cli/src/init/executor.ts` generate Copilot-native output:

```bash
npx ruflo init    # Generates Copilot config by default
```

Output:
- `.github/copilot-instructions.md` — behavioral rules, architecture, coding standards
- `.vscode/mcp.json` — MCP server configuration
- `.github/agents/*.agent.md` — all agent definitions with Copilot frontmatter
- `.github/hooks/*.json` — hook definitions with OS-specific overrides
- `.github/prompts/*.prompt.md` — prompt files (slash command equivalents)
- `.github/skills/*/SKILL.md` — skills (already compatible format)

**3.2 Rewrite settings generator**

`cli/src/init/settings-generator.ts` (17 Claude Code refs) outputs `.vscode/settings.json` with Copilot-relevant settings and `.github/copilot-instructions.md` instead of `.claude/settings.json`.

**3.3 Rewrite MCP config generator**

`cli/src/init/mcp-generator.ts` outputs `.vscode/mcp.json`:

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

**3.4 Convert prompt files**

Convert `.claude/commands/*.md` to `.github/prompts/*.prompt.md` for Copilot slash command equivalents.

**3.5 Rewrite copilot-instructions.md generator**

Extract behavioral rules, project architecture, coding standards, and agent routing patterns from `CLAUDE.md` into `.github/copilot-instructions.md`.

### Phase 4: MCP Tool Curation

The 215 MCP tools all work with Copilot, but the tool set should be organized for effective model tool selection.

**4.1 Tool categorization**

Group tools into categories so users can enable/disable by group:

| Category | Tools | Description |
|----------|-------|-------------|
| `core` | ~25 | Memory, swarm init, agent spawn, task management — always enabled |
| `github` | ~20 | PR management, issue tracking, code review, release |
| `neural` | ~15 | SONA learning, pattern training, neural modes |
| `security` | ~15 | Scanning, audit, CVE, threat modeling |
| `performance` | ~10 | Benchmarking, profiling, metrics |
| `embeddings` | ~10 | Vector search, similarity, clustering |
| `plugins` | ~10 | Plugin management, registry, discovery |
| `advanced` | ~110 | Remaining tools — opt-in |

**4.2 Default profile**

The `core` + `github` categories (~45 tools) are enabled by default in generated `.vscode/mcp.json`. Users opt in to additional categories.

**4.3 MCP App for status**

Replace the statusline (Claude Code-specific) with an MCP App that renders swarm status, agent metrics, and memory usage as a rich UI component in Copilot chat.

### Phase 5: Integration & Cleanup

**5.1 Guidance package**

Rewrite `@claude-flow/guidance/src/generators.ts` (4 Claude Code refs) to output Copilot-native governance config.

**5.2 Teammate plugin**

Replace `v3/plugins/teammate-plugin/` (10 Claude Code refs relying on `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`) with Copilot subagent patterns. The plugin's coordination logic moves into the coordinator agent's instructions and the MCP memory tools.

**5.3 Model routing**

Update `cli/src/mcp-tools/agent-tools.ts` model mapping. Copilot uses logical model names in agent frontmatter (`model: [claude-sonnet-4, gpt-4.1]`) with fallback chains. The provider-specific model IDs (`claude-opus-4-6`, `gpt-4o`) are only used in the background worker executor where we call APIs directly.

**5.4 Auto-memory hook**

Rewrite `.claude/helpers/auto-memory-hook.mjs` for `.github/` paths.

**5.5 Test coverage**

Update all tests that reference `.claude/` paths, Claude Code env vars, or the `claude --print` spawn pattern.

---

## 5. Effort Estimate

| Phase | Scope | Files Changed | Files Removed |
|-------|-------|--------------|---------------|
| Phase 1 (Foundation) | Worker executor, hook bridge, headless runtime, container pool | 5-8 TS files rewritten | 0 |
| Phase 2 (Agents) | Convert all 60+ agent definitions to Copilot frontmatter | 90+ agent .md files | 0 (replaced in new location) |
| Phase 3 (Config Gen) | Init command, settings gen, MCP gen, instructions gen | 8-10 TS files rewritten | 0 |
| Phase 4 (MCP Tools) | Tool categorization, default profiles, MCP App | 3-5 TS files | 0 |
| Phase 5 (Cleanup) | Guidance, teammate plugin, model routing, memory hook, tests | 10-15 files | 6,440+ (V2 removal) |

**Total rewritten**: ~25-30 TypeScript source files + 90 agent definitions
**Total removed**: ~6,440 files (V2) + Claude Code-specific config

---

## 6. Handoff Graph Architecture

Handoffs are Copilot's agent-to-agent transition system. They are a **directed graph**, not a sequential pipeline. Each agent declares which other agents it can transfer control to, and the conditions under which a handoff is appropriate. The model or user can trigger any declared handoff at any point.

### Core Agent Handoff Graph

```
                    ┌──────────────────────┐
                    │     coordinator      │
                    │  agents: ['*']       │
                    └──┬──┬──┬──┬──┬──┬───┘
                       │  │  │  │  │  │
          ┌────────────┘  │  │  │  │  └────────────┐
          ▼               ▼  │  ▼  │               ▼
    ┌───────────┐  ┌─────────┐ │ ┌────────┐  ┌──────────────┐
    │ researcher│  │architect│ │ │ tester │  │security-audit│
    └─────┬─┬───┘  └────┬────┘ │ └───┬┬───┘  └──────┬───────┘
          │ │            │      │     ││              │
          │ └──→architect│      │     │└──→coder      │
          │              │      │     │               │
          └──→coder      └──→coder    └──→coordinator └──→coder
                              │
                         ┌────┘
                         ▼
                    ┌──────────┐
                    │  coder   │
                    └──┬──┬────┘
                       │  │
                       │  └──→reviewer
                       ▼
                    ┌──────────┐
                    │ reviewer │
                    └──┬───────┘
                       │
                       └──→coder (fix), coordinator
```

### Handoff Triggers

Handoffs declare *when* a transition is appropriate:

| From | To | Trigger |
|------|----|---------|
| coordinator | researcher | When task requires investigation or analysis before implementation |
| coordinator | architect | When task involves system design decisions |
| coordinator | coder | When requirements are clear and implementation can begin |
| coordinator | tester | When code is written and needs test coverage |
| coordinator | reviewer | When implementation is complete and needs review |
| coordinator | security-auditor | When changes touch auth, crypto, input handling, or external APIs |
| researcher | architect | When research reveals architectural decisions needed |
| researcher | coder | When research is complete and implementation can begin |
| architect | coder | When design is finalized |
| coder | tester | When implementation is complete |
| coder | reviewer | When implementation needs review |
| tester | coder | When tests fail and code needs fixes |
| reviewer | coder | When review finds issues to fix |
| security-auditor | coder | When audit finds vulnerabilities to fix |
| * | coordinator | When scope changes, blockers arise, or the task needs re-routing |

---

## 7. Background Worker Architecture

All 12 background workers are retained. The `spawn('claude', ['--print', ...])` pattern is replaced with direct LLM API calls through `@claude-flow/providers`.

### Worker Categories

**Analysis workers** (no file system writes needed):

| Worker | What it does | Provider call pattern |
|--------|--------------|-----------------------|
| `audit` | Security analysis of code | Send code context + audit prompt → receive findings as JSON |
| `testgaps` | Test coverage analysis | Send code + test files → receive gap report |
| `document` | Auto-documentation | Send code → receive documentation text |
| `predict` | Predictive preloading | Send usage patterns → receive predictions |
| `ultralearn` | Deep knowledge acquisition | Send codebase patterns → receive learnings |
| `deepdive` | Deep code analysis | Send code context → receive analysis |

These workers send a prompt with file context to the LLM provider and store the response in AgentDB memory. No IDE tool access needed.

**Mutation workers** (need to propose file changes):

| Worker | What it does | Provider call pattern |
|--------|--------------|-----------------------|
| `refactor` | Refactoring suggestions | Send code → receive structured diff/patch → route through MCP `file_write` tool |
| `optimize` | Performance optimization | Send code → receive optimized version → route through MCP `file_write` tool |

These workers receive proposed changes as structured output and route them through the MCP server's file operation tools for approval/application.

**Local workers** (no LLM calls, run locally):

| Worker | What it does | Change needed |
|--------|--------------|---------------|
| `map` | Codebase mapping | None — already local |
| `consolidate` | Memory consolidation | None — already local |
| `benchmark` | Performance benchmarking | None — already local |
| `preload` | Resource preloading | None — already local |

### Provider Configuration

Background workers use the `@claude-flow/providers` package to make LLM calls. The provider is configured per-worker or globally:

```typescript
// Worker executor configuration
{
  defaultProvider: 'openai',       // or 'anthropic', 'google', 'ollama'
  defaultModel: 'gpt-4.1',        // or any provider-supported model
  workerOverrides: {
    audit: { provider: 'anthropic', model: 'claude-sonnet-4' },
    optimize: { provider: 'openai', model: 'gpt-4.1' }
  }
}
```

### Tradeoff

Background workers lose the ability to use IDE tools (file edits, terminal commands, git operations) that `claude --print` provided. They retain the ability to reason about code, generate analysis, produce structured output, and write to memory. For 10 of 12 workers, this is sufficient. For `refactor` and `optimize`, the MCP tool routing path adds an indirection layer but preserves the capability.

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **MCP protocol version mismatch** | Medium | High | V3 CLI uses protocol `2024-11-05` (broadly supported); standalone MCP package uses `2025-11-25` (may be too new). Use the CLI server for Copilot initially. |
| **215 tools overwhelms model tool selection** | High | Medium | Tool categorization with default profile of ~45 tools. Remaining tools opt-in by category. |
| **Background worker capability loss** | Medium | Medium | Workers lose IDE tool access. Analysis workers unaffected. Mutation workers route through MCP tools. Document the tradeoff. |
| **Agent handoff graph complexity** | Medium | Low | Start with core 10-15 agents' handoff graphs. Add domain-specific agents' handoffs incrementally. |
| **Copilot model routing differs from hardcoded IDs** | Low | Low | Copilot uses logical names with fallback chains. Background workers use provider-specific IDs. Two separate systems, no conflict. |
| **Hook event gaps** | Low | Low | Copilot covers the same 8 core events. `TeammateIdle`/`TaskCompleted` handled through MCP tools and SubagentStart/SubagentStop instead. |
| **Agent body content references Claude Code patterns** | Medium | Low | Audit all 90 agent bodies for `mcp__claude-flow__*` invocation examples and replace with generic tool usage patterns. |

---

## 9. Target Directory Structure

After rebuild, the project's configuration surface looks like:

```
.github/
  copilot-instructions.md          # Behavioral rules, architecture, standards
  agents/
    coordinator.agent.md            # Copilot-native agent definitions
    researcher.agent.md             # with handoffs, tools, model, agents fields
    architect.agent.md
    coder.agent.md
    tester.agent.md
    reviewer.agent.md
    security-auditor.agent.md
    pr-manager.agent.md
    ... (all 60+ agents)
  hooks/
    session-start.json              # Same 8 events, same protocol
    user-prompt-submit.json
    pre-tool-use.json
    post-tool-use.json
    ...
  prompts/
    sparc.prompt.md                 # Slash command equivalents
    swarm-init.prompt.md
    memory-search.prompt.md
    ...
  skills/
    */SKILL.md                      # Already compatible format
.vscode/
  mcp.json                          # MCP server config
  settings.json                     # Copilot-relevant settings
```

The `.claude/` and `.agents/` directories are no longer generated or maintained by the init command.

---

## 10. Conclusion

**Ruflo is rebuilt natively for GitHub Copilot as the primary platform.** The rebuild is feasible because:

1. **70% of the codebase is already platform-agnostic**: The core libraries (memory, swarm, plugins, security, neural, embeddings) have no Claude Code dependency and stay as-is.

2. **The coupling surface is concentrated**: ~25-30 TypeScript files in the CLI service layer and config generators need rewriting. The heaviest coupling point is the headless worker executor (1 file).

3. **All agents are converted, not reduced**: The 60+ agent definitions are format-converted to Copilot-native frontmatter with handoffs, subagent declarations, tools, and visibility controls.

4. **All 12 background workers are retained**: The `claude --print` spawn is replaced with provider-agnostic LLM API calls. Analysis workers are unaffected. Mutation workers route through MCP tools.

5. **Copilot-native features are adopted**: Handoff graphs, subagent orchestration, MCP Apps, argument hints, visibility controls, and org-level agent sharing are new capabilities that don't exist in the Claude Code version.

6. **MCP remains the universal capability layer**: All 215 tools are accessible from Copilot via the MCP server. Tool categorization with a default profile of ~45 tools prevents model overwhelm.

7. **V2 is removed**: 6,440 files of dead weight eliminated.

The execution order is: Phase 1 (service layer rewrites) → Phase 2 (agent conversion) → Phase 3 (config generation) → Phase 4 (tool curation) → Phase 5 (cleanup). Phase 1 is the structural foundation. Phase 2 is the largest volume of work but is mechanical. Phases 3-5 are incremental.
