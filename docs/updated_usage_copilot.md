# Ruflo — Copilot-Native Usage Guide

> **Version**: 3.5.2  
> **Branch**: `ghcp-skills-update`  
> **Package**: `ruflo` / `@claude-flow/cli`

## Overview

Ruflo is a multi-agent orchestration framework that provides 199+ MCP tools for swarm coordination, memory management, agent spawning, task orchestration, and more. As of the latest refactoring, Ruflo is **Copilot-native first** — all agent definitions, skills, prompts, and hooks are authored in GitHub Copilot's native formats and live under `.github/`.

The framework supports two agentic platforms:

| Platform | Output Directory | Asset Formats |
|----------|-----------------|---------------|
| **GitHub Copilot** | `.github/agents/`, `.github/skills/`, `.github/prompts/`, `.github/hooks/` | `.agent.md` (YAML frontmatter), `.prompt.md`, `hooks.json` |
| **Claude Code** | `.claude/`, `.mcp.json` | `settings.json`, `CLAUDE.md`, commands, helpers |

---

## Installation

### Prerequisites

- **Node.js** 20+
- **npm** 9+
- **Git**

### Install

```bash
npm install -g ruflo
```

Or use directly via npx:

```bash
npx ruflo init
```

---

## Initialization

Running `ruflo init` is the entry point for all new projects. The CLI **always prompts** the user to select their agentic platform:

```
$ ruflo init

? Please select your agentic platform to initialize Ruflo:
❯ GitHub Copilot    (.github/agents/, skills, prompts, hooks)
  Claude Code       (.claude/, CLAUDE.md, .mcp.json)
```

The user **must** select one of the two platforms before initialization proceeds. There is no default — the prompt will wait for a selection.

### Shortcut Flags

To skip the interactive prompt, use a flag:

```bash
# Initialize directly for GitHub Copilot
ruflo init --copilot

# Initialize directly for Claude Code
ruflo init --claude-code
```

### Additional Init Flags

| Flag | Description |
|------|-------------|
| `--copilot` | Skip prompt, initialize for GitHub Copilot |
| `--claude-code` | Skip prompt, initialize for Claude Code |
| `--minimal` | Minimal configuration (fewer components) |
| `--full` | All components enabled |
| `--force` | Overwrite existing configuration |
| `--tool-profile <profile>` | MCP tool profile: `default` (~45 tools), `full` (all 224), `minimal` (~25), `development` (~100), `devops` (~90) |
| `--start-all` | Initialize and start daemon, memory, swarm |
| `--with-embeddings` | Initialize ONNX embedding subsystem |

### Init Examples

```bash
ruflo init                        # Interactive platform selection
ruflo init --copilot              # GitHub Copilot (skip prompt)
ruflo init --claude-code          # Claude Code (skip prompt)
ruflo init --copilot --full       # Copilot with all components
ruflo init --copilot --minimal    # Copilot with minimal setup
ruflo init --force                # Reinitialize (overwrite existing)
ruflo init wizard                 # Interactive setup wizard
ruflo init skills --all           # Install all available skills
ruflo init hooks --minimal        # Minimal hooks configuration
ruflo init upgrade                # Update helpers, preserve data
```

---

## What Gets Created (GitHub Copilot)

When initializing for **GitHub Copilot**, the following structure is generated:

```
.github/
├── copilot-instructions.md      # Project-wide Copilot instructions
├── agents/                      # 98 agent definitions
│   ├── coordinator.agent.md
│   ├── coder.agent.md
│   ├── researcher.agent.md
│   ├── architect.agent.md
│   └── ... (98 total)
├── skills/                      # 10 reusable skills
│   ├── agentdb-vector-search/
│   ├── github-code-review/
│   ├── github-project-management/
│   ├── github-workflow-automation/
│   ├── hooks-automation/
│   ├── pair-programming/
│   ├── performance-analysis/
│   ├── sparc-methodology/
│   ├── swarm-orchestration/
│   └── verification-quality/
├── prompts/                     # 5 reusable prompts
│   ├── code-review.prompt.md
│   ├── memory-search.prompt.md
│   ├── performance-report.prompt.md
│   ├── sparc.prompt.md
│   └── swarm-init.prompt.md
└── hooks/                       # Lifecycle hooks
    ├── hooks.json
    └── auto-memory-hook.mjs
.vscode/
└── mcp.json                     # MCP server configuration
.claude-flow/                    # V3 Runtime
├── config.yaml
├── data/
├── logs/
└── sessions/
```

### Agent Format

Each agent is a Markdown file with YAML frontmatter defining its capabilities:

```markdown
---
name: coder
description: Implementation specialist for writing clean, efficient code
tools:
  - ruflo
model: claude-sonnet-4-20250514
---

# Coder Agent

You are a code implementation specialist...
```

Key frontmatter fields: `name`, `description`, `tools`, `model`, `handoffs`, `user-invocable`, `argument-hint`.

---

## Available Agents (98)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`, `architect`, `system-architect`

### Coordination
`coordinator`, `project-coordinator`, `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `sync-coordinator`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-coordinator`, `crdt-synchronizer`, `quorum-manager`, `queen-coordinator`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `performance-monitor`, `performance-optimizer`, `benchmark-suite`, `topology-optimizer`, `matrix-optimizer`, `load-balancing-coordinator`, `resource-allocator`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `release-swarm`, `repo-architect`, `multi-repo-swarm`, `project-board-sync`, `swarm-issue`, `swarm-pr`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `database-specialist`, `python-specialist`, `typescript-specialist`, `code-analyzer`, `base-template-generator`

### Security
`security-auditor`, `security-manager`, `v3-security-architect`

### Memory & Neural
`memory-coordinator`, `swarm-memory-manager`, `v3-memory-specialist`, `sona-learning-optimizer`, `safla-neural`, `smart-agent`

### Testing
`tdd-london-swarm`, `test-architect`, `test-long-runner`, `production-validator`, `verification-quality` (skill)

### Planning & Analysis
`goal-planner`, `sublinear-goal-planner`, `code-goal-planner`, `migration-planner`, `analyst`, `scout-explorer`, `pagerank-analyzer`, `trading-predictor`

### Flow Nexus
`flow-nexus-app-store`, `flow-nexus-auth`, `flow-nexus-challenges`, `flow-nexus-neural`, `flow-nexus-payments`, `flow-nexus-sandbox`, `flow-nexus-swarm`, `flow-nexus-user-tools`, `flow-nexus-workflow`

---

## Available Skills (10)

Skills are reusable instruction sets that agents can reference:

| Skill | Purpose |
|-------|---------|
| `agentdb-vector-search` | Vector search with HNSW indexing on AgentDB |
| `github-code-review` | AI-powered code review coordination |
| `github-project-management` | Issue tracking and project board management |
| `github-workflow-automation` | CI/CD pipeline creation and optimization |
| `hooks-automation` | Lifecycle hook automation |
| `pair-programming` | Collaborative pair programming patterns |
| `performance-analysis` | Performance profiling and bottleneck detection |
| `sparc-methodology` | Specification, Pseudocode, Architecture, Refinement, Completion |
| `swarm-orchestration` | Multi-agent swarm coordination |
| `verification-quality` | Quality assurance and verification |

---

## Available Prompts (5)

Prompts are reusable prompt templates invokable via `/` commands:

| Prompt | Purpose |
|--------|---------|
| `code-review` | Structured code review |
| `memory-search` | Semantic memory search |
| `performance-report` | Performance analysis report |
| `sparc` | SPARC methodology workflow |
| `swarm-init` | Swarm initialization |

---

## MCP Tools (199+)

The Ruflo MCP server exposes tools over stdio (JSON-RPC 2.0). Tool categories:

| Category | Key Tools |
|----------|-----------|
| **agent** | `agent_spawn`, `agent_terminate`, `agent_status`, `agent_list`, `agent_pool`, `agent_health`, `agent_update` |
| **swarm** | `swarm_init`, `swarm_status`, `swarm_shutdown`, `swarm_health` |
| **memory** | `memory_store`, `memory_retrieve`, `memory_search`, `memory_delete`, `memory_list`, `memory_stats` |
| **task** | `task_create`, `task_status`, `task_list`, `task_complete`, `task_update`, `task_cancel` |
| **hooks** | `hooks_pre-task`, `hooks_post-task`, `hooks_route`, `hooks_explain`, plus 30+ more |
| **workflow** | `workflow_create`, `workflow_execute`, `workflow_status`, `workflow_list` |
| **github** | `github_repo_analyze`, `github_pr_manage`, `github_issue_track`, `github_workflow`, `github_metrics` |
| **security** | `aidefence_scan`, `aidefence_analyze`, `aidefence_is_safe` |
| **performance** | `performance_report`, `performance_bottleneck`, `performance_benchmark` |
| **neural** | `neural_train`, `neural_predict`, `neural_patterns`, `neural_optimize` |
| **embeddings** | `embeddings_generate`, `embeddings_search`, `embeddings_compare` |
| **agentdb** | Vector search, hierarchical storage, pattern matching, context synthesis |
| **browser** | Page navigation, element interaction, screenshots |
| **hive-mind** | Byzantine consensus, collective coordination |
| **claims** | Authorization, permission management |

### Tool Profiles

Control how many tools are exposed via `--tool-profile`:

| Profile | Tools | Use Case |
|---------|-------|----------|
| `minimal` | ~25 | Lean setup, core operations only |
| `default` | ~45 | Standard development workflow |
| `development` | ~100 | Full development toolkit |
| `devops` | ~90 | CI/CD and infrastructure focus |
| `full` | All 224 | Every available tool |

---

## CLI Commands

Ruflo provides 30+ commands organized by function:

### Core

| Command | Description |
|---------|-------------|
| `ruflo init` | Initialize project (interactive platform selection) |
| `ruflo start` | Start services |
| `ruflo status` | System status monitoring |
| `ruflo doctor` | Health checks and diagnostics |

### Agent & Swarm

| Command | Description |
|---------|-------------|
| `ruflo agent spawn` | Spawn an agent |
| `ruflo agent list` | List active agents |
| `ruflo agent status` | Check agent status |
| `ruflo swarm init` | Initialize a swarm |
| `ruflo swarm status` | Swarm state |
| `ruflo hive-mind` | Byzantine fault-tolerant consensus |

### Memory & Learning

| Command | Description |
|---------|-------------|
| `ruflo memory store` | Store a value |
| `ruflo memory search` | Semantic vector search |
| `ruflo memory retrieve` | Get by key |
| `ruflo neural train` | Train on patterns |
| `ruflo embeddings` | Vector embedding operations |

### Task & Workflow

| Command | Description |
|---------|-------------|
| `ruflo task create` | Create a task |
| `ruflo task list` | List tasks |
| `ruflo workflow create` | Create a workflow |
| `ruflo workflow execute` | Run a workflow |
| `ruflo session` | Session state management |

### Infrastructure

| Command | Description |
|---------|-------------|
| `ruflo mcp` | MCP server management |
| `ruflo daemon` | Background worker daemon |
| `ruflo hooks` | Lifecycle hooks + background workers |
| `ruflo config` | Configuration management |
| `ruflo plugins` | Plugin management |
| `ruflo providers` | AI provider management |

### Analysis & Security

| Command | Description |
|---------|-------------|
| `ruflo security scan` | Security scanning |
| `ruflo performance benchmark` | Performance benchmarking |
| `ruflo analyze` | Code analysis |
| `ruflo claims` | Claims-based authorization |

---

## Quick Start (GitHub Copilot)

```bash
# 1. Initialize for Copilot
ruflo init --copilot

# 2. Verify setup
ruflo doctor

# 3. Start the MCP server (used by agents via .vscode/mcp.json)
ruflo mcp start

# 4. Open VS Code — agents, skills, and prompts are ready to use
code .
```

Once initialized, GitHub Copilot will automatically discover:
- **Agents** in `.github/agents/` — invoke with `@agent-name`
- **Skills** in `.github/skills/` — referenced by agents
- **Prompts** in `.github/prompts/` — invoke with `/prompt-name`
- **Hooks** in `.github/hooks/` — auto-run on lifecycle events
- **MCP tools** via `.vscode/mcp.json` — available to all agents

---

## Architecture

```
ruflo (npm package)
└── @claude-flow/cli           CLI entry point (30+ commands)
    ├── @claude-flow/swarm     Coordination engine (4 topologies, 3 consensus)
    ├── @claude-flow/memory    AgentDB + HNSW vector search
    ├── @claude-flow/hooks     17 hooks + 12 background workers
    ├── @claude-flow/neural    SONA learning, neural modes
    ├── @claude-flow/security  Input validation, CVE remediation
    ├── @claude-flow/plugins   Plugin SDK + registry
    ├── @claude-flow/embeddings Vector embeddings (sql.js, HNSW, hyperbolic)
    └── @claude-flow/shared    Shared utilities
```

The MCP server runs over **stdio** using **JSON-RPC 2.0** (protocol version 2025-11-25), making it compatible with any MCP-compliant client including VS Code, GitHub Copilot, and Claude Code.

