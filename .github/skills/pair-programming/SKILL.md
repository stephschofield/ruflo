---
name: "Pair Programming"
description: "AI-assisted pair programming with driver/navigator modes, real-time verification, quality monitoring, and TDD support."
---

# Pair Programming

## What This Skill Does

Professional pair programming with AI assistance supporting multiple collaboration modes, continuous verification, and integrated testing.

**Key Capabilities:**
- **Multiple Modes**: Driver, Navigator, Switch, TDD, Review, Mentor, Debug
- **Real-Time Verification**: Automatic quality scoring
- **Role Management**: Seamless switching between driver/navigator
- **Testing Integration**: Auto-generate tests, track coverage
- **Code Review**: Security scanning, performance analysis

## Quick Start

```bash
# Start pair programming
npx ruflo pair --start

# TDD session
npx ruflo pair --start --mode tdd --test-first --coverage 90

# Debugging session
npx ruflo pair --start --mode debug --focus debug

# Learning/mentoring session
npx ruflo pair --start --mode mentor --pace slow
```

## Modes

| Mode | Description |
|------|-------------|
| **Driver** | You write code, AI reviews in real-time |
| **Navigator** | AI writes code, you guide direction |
| **Switch** | Alternate between driver and navigator |
| **TDD** | Test-driven development with red-green-refactor |
| **Review** | Focused code review session |
| **Mentor** | Learning-focused with explanations |
| **Debug** | Collaborative debugging |

## Session Commands

- `pair switch` - Switch driver/navigator roles
- `pair status` - View session metrics
- `pair save` - Save session state
- `pair export` - Export session summary

## Best Practices

1. Start with clear goals for each session
2. Use TDD mode for new features
3. Switch roles regularly to maintain engagement
4. Review session metrics for improvement areas
