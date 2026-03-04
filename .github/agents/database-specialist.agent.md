---
name: database-specialist
description: Database design and optimization specialist
model:
  - claude-sonnet-4
  - gpt-4.1
tools:
  - ruflo
handoffs:
  - agent: coordinator
    label: Task completes or needs broader coordination
    prompt: task completes or needs broader coordination
user-invocable: true
disable-model-invocation: false
---

