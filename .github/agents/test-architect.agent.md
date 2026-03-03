---
name: test-architect
description: Testing and quality assurance specialist
model:
  - claude-sonnet-4
  - gpt-4.1
tools:
  - ruflo
handoffs:
  - agent: coordinator
    trigger: When task completes or needs broader coordination
user-invokable: true
disable-model-invocation: false
---

