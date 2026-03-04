---
name: "Hooks Automation"
description: "Automated coordination and learning from development operations using intelligent hooks with MCP integration for pre/post task management, session persistence, and neural pattern training."
---

# Hooks Automation

## What This Skill Does

Intelligent automation system that coordinates, validates, and learns from development operations through hooks integrated with MCP tools and neural pattern training.

**Key Capabilities:**
- **Pre-Operation Hooks**: Validate, prepare, and auto-assign agents before operations
- **Post-Operation Hooks**: Format, analyze, and train patterns after operations
- **Session Management**: Persist state, restore context, generate summaries
- **Memory Coordination**: Synchronize knowledge across agents
- **Neural Training**: Continuous learning from successful patterns

## MCP Tools

Use ruflo MCP hooks tools:
- `hooks_pre-task` - Run pre-task validation and preparation
- `hooks_post-task` - Run post-task analysis and learning
- `hooks_route` - Intelligent task routing to appropriate agents
- `hooks_explain` - Generate explanations for decisions
- `hooks_session-start` / `hooks_session-end` - Session lifecycle
- `hooks_worker-list` / `hooks_worker-dispatch` - Background worker management

## Available Hooks

### Pre-Operation
| Hook | Purpose |
|------|---------|
| `pre-edit` | Validate files before modification |
| `pre-task` | Prepare context and assign agents |
| `pre-command` | Validate commands before execution |

### Post-Operation
| Hook | Purpose |
|------|---------|
| `post-edit` | Format, analyze, store patterns |
| `post-task` | Train neural patterns from results |
| `post-command` | Track metrics and outcomes |

### Session
| Hook | Purpose |
|------|---------|
| `session-start` | Initialize context and restore state |
| `session-end` | Save state, export metrics |
| `session-restore` | Restore previous session context |

### Intelligence
| Hook | Purpose |
|------|---------|
| `route` | Route tasks to appropriate agents |
| `explain` | Generate decision explanations |
| `pretrain` | Train neural patterns |

## Quick Start

```bash
# Pre-task hook
npx ruflo hooks pre-task --description "Implement authentication"

# Post-task with learning
npx ruflo hooks post-task --task-id "task-123" --success true

# Session management
npx ruflo hooks session-start --session-id "dev-session"
npx ruflo hooks session-end --export-metrics true
```

## Best Practices

1. Always run pre-task hooks to get intelligent agent routing
2. Run post-task hooks to train patterns from successful work
3. Use session hooks for cross-session context persistence
4. Enable neural training for continuous improvement
