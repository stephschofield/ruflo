---
name: swarm-init
description: Initialize a multi-agent swarm for coordinated task execution
---

Initialize a ruflo swarm for the following task using the MCP tools:

1. Use the `swarm_init` tool with topology "hierarchical" and maxAgents 8
2. Use the `agent_spawn` tool to create the necessary agents based on the task type:
   - For features: architect, coder, tester, reviewer
   - For bug fixes: researcher, coder, tester
   - For refactoring: architect, coder, reviewer
   - For security: security-auditor, coder, tester
3. Use `memory_store` to persist the swarm state and task context
4. Use `task_create` to create trackable work items

Task to coordinate: $input
