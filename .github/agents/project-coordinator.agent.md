---
name: project-coordinator
description: Coordinates multi-agent workflows for this project
model:
  - claude-sonnet-4
  - gpt-4.1
tools:
  - ruflo
  - agent
agents:
  - "*"
handoffs:
  - agent: coordinator
    label: Coordination needed
    prompt: Task completes or needs broader coordination
user-invocable: false
disable-model-invocation: true
---

