# GitHub Copilot Skills Update — MVP

**Branch**: `ghcp-skills-update`
**Date**: 2026-03-03
**Strategy**: Additive MVP — existing MCP server + Copilot-native config files

---

## Overview

This MVP adds GitHub Copilot support to Ruflo by layering Copilot-native configuration files alongside the existing Claude Code (`.claude/`) and Codex (`.agents/`) configs. No existing code or files are modified.

The core insight: Ruflo's MCP server already speaks standard JSON-RPC 2.0 over stdio. Copilot supports MCP servers natively. One config file (`.vscode/mcp.json`) gives Copilot access to all 199+ tools with zero code changes.

---

## What Was Created

### File Inventory (27 new files)

```
.vscode/
  mcp.json                                    # MCP server config

.github/
  copilot-instructions.md                     # Always-on project instructions

  agents/
    coordinator.agent.md                      # Swarm coordinator
    coder.agent.md                            # Implementation specialist
    researcher.agent.md                       # Research & analysis
    architect.agent.md                        # System design
    tester.agent.md                           # Testing & QA
    reviewer.agent.md                         # Code review
    planner.agent.md                          # Task planning
    security-auditor.agent.md                 # Security analysis
    pr-manager.agent.md                       # PR lifecycle
    issue-tracker.agent.md                    # Issue management

  skills/
    swarm-orchestration/SKILL.md              # Multi-agent swarms
    sparc-methodology/SKILL.md                # SPARC dev workflow
    github-code-review/SKILL.md               # Code review automation
    github-workflow-automation/SKILL.md       # CI/CD automation
    github-project-management/SKILL.md        # Project management
    performance-analysis/SKILL.md             # Performance profiling
    verification-quality/SKILL.md             # Quality verification
    pair-programming/SKILL.md                 # Pair programming modes
    agentdb-vector-search/SKILL.md            # Vector search
    hooks-automation/SKILL.md                 # Hook automation

  prompts/
    sparc.prompt.md                           # SPARC methodology workflow
    swarm-init.prompt.md                      # Swarm initialization
    memory-search.prompt.md                   # Memory search
    code-review.prompt.md                     # Code review
    performance-report.prompt.md              # Performance report
```

---

## Design Decisions

### 1. MCP Server Reuse (No Code Changes)

The existing Ruflo MCP server at `v3/@claude-flow/cli/bin/cli.js` auto-detects piped stdin and enters MCP mode. It uses the standard MCP protocol (JSON-RPC 2.0, protocol version `2024-11-05`). Copilot connects to MCP servers over stdio using the same protocol.

**Decision**: Point `.vscode/mcp.json` at `npx ruflo mcp start` and use the server as-is.

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

This immediately exposes all 199+ tools (agent, swarm, memory, task, hooks, workflow, github, security, performance, neural, embeddings, browser, coordination, etc.) to Copilot without any server modifications.

### 2. Additive Coexistence (Nothing Removed)

Three platform configs now coexist:

| Platform | Config Directory | Status |
|----------|-----------------|--------|
| Claude Code | `.claude/` | Existing, untouched |
| OpenAI Codex | `.agents/` | Existing, untouched |
| GitHub Copilot | `.github/` + `.vscode/` | New, added by this MVP |

This allows all three platforms to work simultaneously from the same repository. The full refactoring (documented in `docs/COPILOT_MIGRATION_ASSESSMENT.md`) can converge on a single config surface later.

### 3. Agent Selection (10 of 60+)

The MVP converts the 10 most essential agents, selected for breadth of coverage across common development workflows:

| Agent | Role | Why Selected |
|-------|------|-------------|
| `coordinator` | Orchestration | Central entry point for multi-agent tasks |
| `coder` | Implementation | Primary code writing agent |
| `researcher` | Investigation | Analysis and information gathering |
| `architect` | Design | System architecture decisions |
| `tester` | QA | Testing strategy and implementation |
| `reviewer` | Review | Code quality and security review |
| `planner` | Planning | Task decomposition and scheduling |
| `security-auditor` | Security | Vulnerability assessment |
| `pr-manager` | PR lifecycle | Pull request management |
| `issue-tracker` | Issues | Issue creation and tracking |

The remaining 50+ agents (consensus, hive-mind, neural, sublinear, flow-nexus, dual-mode, etc.) are deferred to the full refactoring. They remain accessible through the MCP server tools but don't have dedicated Copilot agent definitions.

### 4. Copilot Agent Frontmatter Format

Each agent uses Copilot-native frontmatter fields:

```yaml
---
name: coder
description: Implementation specialist for writing clean, efficient code
tools:
  - ruflo                    # Scoped to the ruflo MCP server
model:
  - claude-sonnet-4          # Primary model
  - gpt-4.1                  # Fallback model
handoffs:
  - agent: tester
    trigger: When implementation is complete and needs test coverage
  - agent: reviewer
    trigger: When code is ready for review
user-invokable: true          # Appears in @-mention picker
argument-hint: Describe what you want to implement...
---
```

**Key adaptations from Claude Code format**:
- `tools: [ruflo]` replaces the Claude Code `mcp__claude-flow__*` tool syntax
- `handoffs` replaces Claude Code's `Task` tool spawning (declarative graph vs imperative API)
- `model` array provides fallback chain (Copilot routes to available model)
- `user-invokable` / `argument-hint` are Copilot-specific UX features
- Agent body content stripped of `mcp__claude-flow__*` invocation examples, replaced with generic MCP tool name references

### 5. Handoff Graph Design

Handoffs form a directed graph where each agent declares which agents it can transfer control to and under what conditions:

```
              ┌──────────────┐
              │ coordinator  │
              │ agents: ['*']│
              └──┬─┬─┬─┬─┬──┘
                 │ │ │ │ │
    ┌────────────┘ │ │ │ └──────────────┐
    ▼              ▼ │ ▼                ▼
researcher    architect │ tester    security-auditor
    │              │   │    │              │
    └→architect    └→coder  └→coder        └→coder
    └→coder             │
                        ▼
                   coder ──→ tester, reviewer
                                  │
                            reviewer ──→ coder, coordinator
```

**Design principles**:
- `coordinator` can delegate to any agent (`agents: ['*']`)
- All agents can escalate back to `coordinator` for re-routing
- `coder` → `tester` → `coder` forms a TDD loop
- `coder` → `reviewer` → `coder` forms a review loop
- `security-auditor` → `coder` for vulnerability fixes

### 6. Skill Selection (10 of 35+)

Skills were selected to cover the most common development workflows:

| Category | Skills |
|----------|--------|
| Core workflow | swarm-orchestration, sparc-methodology |
| GitHub integration | github-code-review, github-workflow-automation, github-project-management |
| Quality | performance-analysis, verification-quality |
| Development | pair-programming, hooks-automation |
| Data/Search | agentdb-vector-search |

**Adaptation from Claude Code format**: The SKILL.md YAML frontmatter (`name`, `description`) is already compatible with the agent skills open standard. The body content was adapted to remove Claude Code-specific invocation syntax (`mcp__claude-flow__*` calls) and replace with generic MCP tool name references.

### 7. Prompt File Design

Prompts convert Claude Code's slash commands (`.claude/commands/`) to Copilot's `.prompt.md` format. Key differences:

| Aspect | Claude Code | Copilot |
|--------|-------------|---------|
| Location | `.claude/commands/*.md` | `.github/prompts/*.prompt.md` |
| Invocation | `/command-name` | `/prompt-name` |
| Variables | None (interactive) | `$input` for user text |
| Format | Freeform markdown | YAML frontmatter + template body |

Each prompt references specific MCP tool names and agent `@`-mentions so Copilot knows which tools and agents to use.

### 8. Instructions File Scope

`.github/copilot-instructions.md` distills from `CLAUDE.md` only what Copilot needs:
- Project architecture (packages and their purposes)
- MCP tool categories and names (so the model knows what tools exist)
- Coding standards (DDD, TDD, file organization)
- Agent routing guidance (which agent for which task type)

Stripped out: Claude Code-specific patterns (Task tool, TodoWrite, swarm auto-start protocol, dual-mode Codex collaboration, publishing procedures, hook bridge details).

---

## What This MVP Does NOT Include

These are deferred to the full refactoring documented in `docs/COPILOT_MIGRATION_ASSESSMENT.md`:

| Item | Reason for deferral |
|------|-------------------|
| Code changes to MCP server | Not needed — existing server works with Copilot |
| Headless worker executor rewrite | Requires replacing `claude --print` with provider-agnostic API calls |
| Hook bridge rewrite | Requires `.github/hooks/` config path changes |
| Init command changes | Requires rewriting config generators |
| V2 removal (6,440 files) | Cleanup task, not MVP |
| Remaining 50+ agent conversions | Mechanical work, prioritize after validating MVP |
| Remaining 25+ skill conversions | Same as above |
| `.claude/` directory removal | Keep for backward compatibility during transition |
| MCP tool categorization / default profiles | 199 tools may overwhelm model tool selection; profile system needed |
| MCP App for status visualization | Copilot-specific rich UI component |
| Organization-level agent publishing | Requires GitHub org `.github` repo setup |

---

## Verification Steps

After merging, verify in VS Code with GitHub Copilot:

1. **MCP server**: Open the MCP servers panel → verify `ruflo` appears and tools are listed
2. **Agents**: Type `@` in Copilot chat → verify the 10 agents appear in the picker
3. **Skills**: Verify skills are discoverable when agents reference them
4. **Prompts**: Type `/` in Copilot chat → verify the 5 prompts appear
5. **Tool invocation**: Ask `@coder` to use `memory_search` → verify the MCP tool is called
6. **Handoff**: Ask `@coordinator` a multi-step task → verify it can hand off to `@coder`

---

## Mapping to Full Refactoring

This MVP corresponds to a subset of the full refactoring plan:

| Full Plan Phase | MVP Coverage |
|----------------|-------------|
| Phase 1: Foundation (service layer rewrites) | Not started |
| Phase 2: Agent Conversion (60+ agents) | 10 of 60+ done |
| Phase 3: Config Generation (init command) | Manual creation only |
| Phase 4: MCP Tool Curation (categorization) | Not started |
| Phase 5: Cleanup (V2 removal, guidance, tests) | Not started |

The MVP validates that the approach works before investing in the full migration.
