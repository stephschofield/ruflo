---
name: "SPARC Methodology"
description: "SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) development methodology with multi-agent orchestration for systematic software development."
---

# SPARC Methodology

## Overview

SPARC is a systematic development methodology that structures work into five phases:

1. **Specification**: Define requirements, constraints, and success criteria
2. **Pseudocode**: Plan high-level logic with TDD anchors
3. **Architecture**: Design system structure and component interfaces
4. **Refinement**: Implement with TDD, debugging, security, and optimization
5. **Completion**: Integrate, document, and monitor

## Core Principles

- Specification before code — define requirements first
- Design before implementation — plan architecture
- Tests before features — write failing tests, then make them pass
- Review everything — code quality, security, performance
- Document continuously

## Development Phases

### Phase 1: Specification
- Requirements analysis and user story mapping
- Constraint identification and success metrics
- Use `@researcher` agent for analysis

### Phase 2: Pseudocode
- High-level logic design with TDD anchors
- Algorithm planning and data flow
- Use `@planner` agent for decomposition

### Phase 3: Architecture
- System design and component interfaces
- Database schema and API contracts
- Use `@architect` agent for design

### Phase 4: Refinement
- TDD implementation (red-green-refactor)
- Security review and performance optimization
- Use `@coder`, `@tester`, `@reviewer` agents

### Phase 5: Completion
- Integration testing and documentation
- Deployment preparation and monitoring setup
- Use `@pr-manager` for submission

## Available Modes

- `@architect` - System design and architecture
- `@coder` - Implementation specialist
- `@tester` - TDD and quality assurance
- `@reviewer` - Code review and security
- `@researcher` - Analysis and investigation
- `@planner` - Task decomposition

## Best Practices

1. Follow the phases in order but iterate as needed
2. Use agents appropriate to each phase
3. Store decisions and findings in memory for cross-phase coordination
4. Run verification at each phase boundary
