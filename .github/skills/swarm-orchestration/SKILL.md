---
name: "Swarm Orchestration"
description: "Orchestrate multi-agent swarms for parallel task execution, dynamic topology, and intelligent coordination. Use when scaling beyond single agents, implementing complex workflows, or building distributed AI systems."
---

# Swarm Orchestration

## What This Skill Does

Orchestrates multi-agent swarms using ruflo's coordination system. Supports mesh, hierarchical, and adaptive topologies with automatic task distribution, load balancing, and fault tolerance.

## Prerequisites

- ruflo MCP server configured in `.vscode/mcp.json`
- Node.js 18+

## Quick Start

Use the ruflo MCP tools to initialize and manage swarms:

```
swarm_init     - Initialize swarm with topology and agent limits
agent_spawn    - Create specialized worker agents
task_create    - Create tasks for agents to execute
swarm_status   - Monitor swarm health and progress
memory_store   - Share state across agents
```

## Topology Patterns

### 1. Mesh (Peer-to-Peer)
Equal peers with distributed decision-making. Use for research, analysis, and brainstorming tasks where all agents contribute equally.

### 2. Hierarchical (Coordinator-Worker)
Centralized coordination with specialized workers. Use for structured development tasks with clear phases (design, implement, test, review).

### 3. Adaptive (Dynamic)
Automatically switches topology based on task complexity. Use when task requirements are uncertain.

## Task Orchestration

### Parallel Execution
Execute independent tasks concurrently across multiple agents. Each agent works on its assigned task while sharing state through memory.

### Pipeline Execution
Sequential stages with dependencies: design -> implement -> test -> review. Each stage's output feeds the next.

### Adaptive Execution
Let the swarm decide the execution strategy based on the goal and constraints.

## Memory Coordination

Agents share state through the ruflo memory system:
- `memory_store` - Save data to shared namespace
- `memory_search` - Find relevant data across the swarm
- `memory_retrieve` - Fetch specific keys

## Best Practices

1. Start small: Begin with 2-3 agents, scale up
2. Use memory: Share context through swarm memory
3. Monitor metrics: Track performance and bottlenecks
4. Set timeouts: Prevent hung tasks
5. Use hierarchical topology for coding tasks (anti-drift)
