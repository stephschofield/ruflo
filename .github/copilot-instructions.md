# Ruflo Project Instructions

Ruflo (v3.5) is a multi-agent orchestration framework. It provides 199+ MCP tools for swarm coordination, memory management, agent spawning, task orchestration, and more via the `ruflo` MCP server.

## Project Architecture

### Core Packages
| Package | Path | Purpose |
|---------|------|---------|
| `@claude-flow/cli` | `v3/@claude-flow/cli/` | CLI entry point (26 commands) |
| `@claude-flow/swarm` | `v3/@claude-flow/swarm/` | Coordination engine (4 topologies, 3 consensus) |
| `@claude-flow/memory` | `v3/@claude-flow/memory/` | AgentDB + HNSW vector search |
| `@claude-flow/hooks` | `v3/@claude-flow/hooks/` | 17 hooks + 12 background workers |
| `@claude-flow/security` | `v3/@claude-flow/security/` | Input validation, CVE remediation |
| `@claude-flow/neural` | `v3/@claude-flow/neural/` | SONA learning, neural modes |
| `@claude-flow/plugins` | `v3/@claude-flow/plugins/` | Plugin SDK + registry |

### MCP Server
The `ruflo` MCP server exposes all tools over stdio (JSON-RPC 2.0). Key tool categories:
- **agent**: `agent_spawn`, `agent_terminate`, `agent_status`, `agent_list`, `agent_pool`, `agent_health`, `agent_update`
- **swarm**: `swarm_init`, `swarm_status`, `swarm_shutdown`, `swarm_health`
- **memory**: `memory_store`, `memory_retrieve`, `memory_search`, `memory_delete`, `memory_list`, `memory_stats`
- **task**: `task_create`, `task_status`, `task_list`, `task_complete`, `task_update`, `task_cancel`
- **hooks**: `hooks_pre-task`, `hooks_post-task`, `hooks_route`, `hooks_explain`, plus 30+ more
- **workflow**: `workflow_create`, `workflow_execute`, `workflow_status`, `workflow_list`
- **github**: `github_repo_analyze`, `github_pr_manage`, `github_issue_track`, `github_workflow`, `github_metrics`
- **security**: `aidefence_scan`, `aidefence_analyze`, `aidefence_is_safe`
- **performance**: `performance_report`, `performance_bottleneck`, `performance_benchmark`
- **neural**: `neural_train`, `neural_predict`, `neural_patterns`, `neural_optimize`
- **embeddings**: `embeddings_generate`, `embeddings_search`, `embeddings_compare`

## Coding Standards

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes
- Validate input at system boundaries

## File Organization

- `/src` for source code
- `/tests` for test files
- `/docs` for documentation
- `/config` for configuration
- `/scripts` for utility scripts
- Never save working files to the root folder

## Swarm Coordination

When a task involves multiple files or complex multi-step work, use the ruflo MCP tools:

1. Initialize a swarm: `swarm_init` with topology (`hierarchical`, `mesh`, `adaptive`)
2. Spawn agents: `agent_spawn` for specialized roles (coder, tester, reviewer, researcher)
3. Orchestrate tasks: `task_create` and `task_update` for tracking
4. Coordinate via memory: `memory_store` and `memory_search` for shared state
5. Monitor: `swarm_status` and `agent_health` for progress

### Agent Routing by Task Type

| Task | Agents |
|------|--------|
| Bug Fix | researcher, coder, tester |
| Feature | architect, coder, tester, reviewer |
| Refactor | architect, coder, reviewer |
| Performance | performance engineer, coder |
| Security | security-auditor, coder |

## Available Agents

Use `@agent-name` to invoke specialized agents:
- `@coordinator` - Task decomposition and swarm orchestration
- `@coder` - Implementation specialist
- `@researcher` - Investigation and analysis
- `@architect` - System design decisions
- `@tester` - Testing and QA
- `@reviewer` - Code review
- `@planner` - Task planning
- `@security-auditor` - Security analysis
- `@pr-manager` - Pull request management
- `@issue-tracker` - Issue management
