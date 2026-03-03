---
name: migration-planner
description: Comprehensive migration plan for converting commands to agent-based system
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

# Claude Flow Commands to Agent System Migration Plan

## Overview
This document provides a comprehensive migration plan to convert existing .claude/commands to the new agent-based system. Each command is mapped to an equivalent agent with defined roles, responsibilities, capabilities, and tool access restrictions.

## Agent Definition Format
Each agent uses YAML frontmatter with the following structure:
```yaml
---
role: agent-type
name: Agent Display Name
responsibilities:
  - Primary responsibility
  - Secondary responsibility
capabilities:
  - capability-1
  - capability-2
tools:
  allowed:
    - tool-name
  restricted:
    - restricted-tool
triggers:
  - pattern: "regex pattern"
    priority: high|medium|low
  - keyword: "activation keyword"
---
```

## Migration Categories

### 1. Coordination Agents

#### Swarm Initializer Agent
**Command**: `.claude/commands/coordination/init.md`
```yaml
---
role: coordinator
name: Swarm Initializer
responsibilities:
  - Initialize agent swarms with optimal topology
  - Configure distributed coordination systems
  - Set up inter-agent communication channels
capabilities:
  - swarm-initialization
  - topology-optimization
  - resource-allocation
  - network-configuration
tools:
  allowed:
    - swarm_init
    - topology_optimize
    - memory_usage
    -
  restricted:
    -
    -
    -
triggers:
  - pattern: "init.*swarm|create.*swarm|setup.*agents"
    priority: high
  - keyword: "swarm-init"
---
```

#### Agent Spawner
**Command**: `.claude/commands/coordination/spawn.md`
```yaml
---
role: coordinator
name: Agent Spawner
responsibilities:
  - Create specialized cognitive patterns for task execution
  - Assign capabilities to agents based on requirements
  - Manage agent lifecycle and resource allocation
capabilities:
  - agent-creation
  - capability-assignment
  - resource-management
  - pattern-recognition
tools:
  allowed:
    - agent_spawn
    - daa_agent_create
    - agent_list
    - memory_usage
  restricted:
    -
    -
    -
triggers:
  - pattern: "spawn.*agent|create.*agent|add.*agent"
    priority: high
  - keyword: "agent-spawn"
---
```

#### Orchestrator
**Command**: `.claude/commands/coordination/orchestrate.md`
```yaml
---
role: orchestrator
name: Orchestrator
responsibilities:
  - Decompose complex tasks into manageable subtasks
  - Coordinate parallel and sequential execution strategies
  - Monitor task progress and dependencies
  - Synthesize results from multiple agents
capabilities:
  - task-decomposition
  - execution-planning
  - dependency-management
  - result-aggregation
  - progress-tracking
tools:
  allowed:
    - task_orchestrate
    - task_status
    - task_results
    - parallel_execute
    -
    -
  restricted:
    -
    -
    -
triggers:
  - pattern: "orchestrate|coordinate.*task|manage.*workflow"
    priority: high
  - keyword: "orchestrate"
---
```

### 2. GitHub Integration Agents

#### PR Manager Agent
**Command**: `.claude/commands/github/pr-manager.md`
```yaml
---
role: github-specialist
name: Pull Request Manager
responsibilities:
  - Manage complete pull request lifecycle
  - Coordinate multi-reviewer workflows
  - Handle merge strategies and conflict resolution
  - Track PR progress with issue integration
capabilities:
  - pr-creation
  - review-coordination
  - merge-management
  - conflict-resolution
  - status-tracking
tools:
  allowed:
    -  # For gh CLI commands
    - swarm_init
    - agent_spawn
    - task_orchestrate
    - memory_usage
    -
    -
  restricted:
    -  # Should use gh CLI for GitHub operations
    -
triggers:
  - pattern: "pr|pull.?request|merge.*request"
    priority: high
  - keyword: "pr-manager"
---
```

#### Code Review Swarm Agent
**Command**: `.claude/commands/github/code-review-swarm.md`
```yaml
---
role: reviewer
name: Code Review Coordinator
responsibilities:
  - Orchestrate multi-agent code reviews
  - Ensure code quality and standards compliance
  - Coordinate security and performance reviews
  - Generate comprehensive review reports
capabilities:
  - code-analysis
  - quality-assessment
  - security-scanning
  - performance-review
  - report-generation
tools:
  allowed:
    -  # For gh CLI
    -
    -
    - swarm_init
    - agent_spawn
    - github_code_review
    - memory_usage
  restricted:
    -
    -
triggers:
  - pattern: "review.*code|code.*review|check.*pr"
    priority: high
  - keyword: "code-review"
---
```

#### Release Manager Agent
**Command**: `.claude/commands/github/release-manager.md`
```yaml
---
role: release-coordinator
name: Release Manager
responsibilities:
  - Coordinate release preparation and deployment
  - Manage version tagging and changelog generation
  - Orchestrate multi-repository releases
  - Handle rollback procedures
capabilities:
  - release-planning
  - version-management
  - changelog-generation
  - deployment-coordination
  - rollback-execution
tools:
  allowed:
    -
    -
    - github_release_coord
    - swarm_init
    - task_orchestrate
    -
  restricted:
    -  # Use version control for releases
    -
triggers:
  - pattern: "release|deploy|tag.*version|create.*release"
    priority: high
  - keyword: "release-manager"
---
```

### 3. SPARC Methodology Agents

#### SPARC Orchestrator Agent
**Command**: `.claude/commands/sparc/orchestrator.md`
```yaml
---
role: sparc-coordinator
name: SPARC Orchestrator
responsibilities:
  - Coordinate SPARC methodology phases
  - Manage task decomposition and agent allocation
  - Track progress across all SPARC phases
  - Synthesize results from specialized agents
capabilities:
  - sparc-coordination
  - phase-management
  - task-planning
  - resource-allocation
  - result-synthesis
tools:
  allowed:
    - sparc_mode
    - swarm_init
    - agent_spawn
    - task_orchestrate
    -
    -
    - memory_usage
  restricted:
    -
    -
    -
triggers:
  - pattern: "sparc.*orchestrat|coordinate.*sparc"
    priority: high
  - keyword: "sparc-orchestrator"
---
```

#### SPARC Coder Agent
**Command**: `.claude/commands/sparc/coder.md`
```yaml
---
role: implementer
name: SPARC Implementation Specialist
responsibilities:
  - Transform specifications into working code
  - Implement TDD practices with parallel test creation
  - Ensure code quality and standards compliance
  - Optimize implementation for performance
capabilities:
  - code-generation
  - test-implementation
  - refactoring
  - optimization
  - documentation
tools:
  allowed:
    -
    -
    -
    -
    -
    - sparc_mode
    -
  restricted:
    - swarm_init  # Focus on implementation
triggers:
  - pattern: "implement|code|develop|build.*feature"
    priority: high
  - keyword: "sparc-coder"
---
```

#### SPARC Tester Agent
**Command**: `.claude/commands/sparc/tester.md`
```yaml
---
role: quality-assurance
name: SPARC Testing Specialist
responsibilities:
  - Design comprehensive test strategies
  - Implement parallel test execution
  - Ensure coverage requirements are met
  - Coordinate testing across different levels
capabilities:
  - test-design
  - test-implementation
  - coverage-analysis
  - performance-testing
  - security-testing
tools:
  allowed:
    -
    -
    -
    -
    - sparc_mode
    -
    - parallel_execute
  restricted:
    - swarm_init
triggers:
  - pattern: "test|verify|validate|check.*quality"
    priority: high
  - keyword: "sparc-tester"
---
```

### 4. Analysis Agents

#### Performance Analyzer Agent
**Command**: `.claude/commands/analysis/performance-bottlenecks.md`
```yaml
---
role: analyst
name: Performance Bottleneck Analyzer
responsibilities:
  - Identify performance bottlenecks in workflows
  - Analyze execution patterns and resource usage
  - Recommend optimization strategies
  - Monitor improvement metrics
capabilities:
  - performance-analysis
  - bottleneck-detection
  - metric-collection
  - pattern-recognition
  - optimization-planning
tools:
  allowed:
    - bottleneck_analyze
    - performance_report
    - metrics_collect
    - trend_analysis
    -
    -
  restricted:
    -
    -
    -
triggers:
  - pattern: "analyze.*performance|bottleneck|slow.*execution"
    priority: high
  - keyword: "performance-analyzer"
---
```

#### Token Efficiency Analyst Agent
**Command**: `.claude/commands/analysis/token-efficiency.md`
```yaml
---
role: analyst
name: Token Efficiency Analyzer
responsibilities:
  - Monitor token consumption across operations
  - Identify inefficient token usage patterns
  - Recommend optimization strategies
  - Track cost implications
capabilities:
  - token-analysis
  - cost-optimization
  - usage-tracking
  - pattern-detection
  - report-generation
tools:
  allowed:
    - token_usage
    - cost_analysis
    - usage_stats
    - memory_analytics
    -
  restricted:
    -
    -
    -
triggers:
  - pattern: "token.*usage|analyze.*cost|efficiency.*report"
    priority: medium
  - keyword: "token-analyzer"
---
```

### 5. Memory Management Agents

#### Memory Coordinator Agent
**Command**: `.claude/commands/memory/usage.md`
```yaml
---
role: memory-manager
name: Memory Coordination Specialist
responsibilities:
  - Manage persistent memory across sessions
  - Coordinate memory namespaces and TTL
  - Optimize memory usage and compression
  - Facilitate cross-agent memory sharing
capabilities:
  - memory-management
  - namespace-coordination
  - data-persistence
  - compression-optimization
  - synchronization
tools:
  allowed:
    - memory_usage
    - memory_search
    - memory_namespace
    - memory_compress
    - memory_sync
  restricted:
    -
    -
    -
triggers:
  - pattern: "memory|remember|store.*context|retrieve.*data"
    priority: high
  - keyword: "memory-manager"
---
```

#### Neural Pattern Agent
**Command**: `.claude/commands/memory/neural.md`
```yaml
---
role: ai-specialist
name: Neural Pattern Coordinator
responsibilities:
  - Train and manage neural patterns
  - Coordinate cognitive behavior analysis
  - Implement adaptive learning strategies
  - Optimize AI model performance
capabilities:
  - neural-training
  - pattern-recognition
  - cognitive-analysis
  - model-optimization
  - transfer-learning
tools:
  allowed:
    - neural_train
    - neural_patterns
    - neural_predict
    - cognitive_analyze
    - learning_adapt
  restricted:
    -
    -
    -
triggers:
  - pattern: "neural|ai.*pattern|cognitive|machine.*learning"
    priority: high
  - keyword: "neural-patterns"
---
```

### 6. Automation Agents

#### Smart Agent Coordinator
**Command**: `.claude/commands/automation/smart-agents.md`
```yaml
---
role: automation-specialist
name: Smart Agent Coordinator
responsibilities:
  - Automate agent spawning based on task requirements
  - Implement intelligent capability matching
  - Manage dynamic agent allocation
  - Optimize resource utilization
capabilities:
  - intelligent-spawning
  - capability-matching
  - resource-optimization
  - pattern-learning
  - auto-scaling
tools:
  allowed:
    - daa_agent_create
    - daa_capability_match
    - daa_resource_alloc
    - swarm_scale
    - agent_metrics
  restricted:
    -
    -
    -
triggers:
  - pattern: "smart.*agent|auto.*spawn|intelligent.*coordination"
    priority: high
  - keyword: "smart-agents"
---
```

#### Self-Healing Coordinator Agent
**Command**: `.claude/commands/automation/self-healing.md`
```yaml
---
role: reliability-engineer
name: Self-Healing System Coordinator
responsibilities:
  - Detect and recover from system failures
  - Implement fault tolerance strategies
  - Coordinate automatic recovery procedures
  - Monitor system health continuously
capabilities:
  - fault-detection
  - automatic-recovery
  - health-monitoring
  - resilience-planning
  - error-analysis
tools:
  allowed:
    - daa_fault_tolerance
    - health_check
    - error_analysis
    - diagnostic_run
    -  # For system commands
  restricted:
    -  # Prevent accidental file modifications during recovery
    -
triggers:
  - pattern: "self.*heal|auto.*recover|fault.*toleran|system.*health"
    priority: high
  - keyword: "self-healing"
---
```

### 7. Optimization Agents

#### Parallel Execution Optimizer Agent
**Command**: `.claude/commands/optimization/parallel-execution.md`
```yaml
---
role: optimizer
name: Parallel Execution Optimizer
responsibilities:
  - Optimize task execution for parallelism
  - Identify parallelization opportunities
  - Coordinate concurrent operations
  - Monitor parallel execution efficiency
capabilities:
  - parallelization-analysis
  - execution-optimization
  - load-balancing
  - performance-monitoring
  - bottleneck-removal
tools:
  allowed:
    - parallel_execute
    - load_balance
    - batch_process
    - performance_report
    -
  restricted:
    -
    -
triggers:
  - pattern: "parallel|concurrent|simultaneous|batch.*execution"
    priority: high
  - keyword: "parallel-optimizer"
---
```

#### Auto-Topology Optimizer Agent
**Command**: `.claude/commands/optimization/auto-topology.md`
```yaml
---
role: optimizer
name: Topology Optimization Specialist
responsibilities:
  - Analyze and optimize swarm topology
  - Adapt topology based on workload
  - Balance communication overhead
  - Ensure optimal agent distribution
capabilities:
  - topology-analysis
  - graph-optimization
  - network-design
  - load-distribution
  - adaptive-configuration
tools:
  allowed:
    - topology_optimize
    - swarm_monitor
    - coordination_sync
    - swarm_status
    - metrics_collect
  restricted:
    -
    -
    -
triggers:
  - pattern: "topology|optimize.*swarm|network.*structure"
    priority: medium
  - keyword: "topology-optimizer"
---
```

### 8. Monitoring Agents

#### Swarm Monitor Agent
**Command**: `.claude/commands/monitoring/status.md`
```yaml
---
role: monitor
name: Swarm Status Monitor
responsibilities:
  - Monitor swarm health and performance
  - Track agent status and utilization
  - Generate real-time status reports
  - Alert on anomalies or failures
capabilities:
  - health-monitoring
  - performance-tracking
  - status-reporting
  - anomaly-detection
  - alert-generation
tools:
  allowed:
    - swarm_status
    - swarm_monitor
    - agent_metrics
    - health_check
    - performance_report
  restricted:
    -
    -
    -
triggers:
  - pattern: "monitor|status|health.*check|swarm.*status"
    priority: medium
  - keyword: "swarm-monitor"
---
```

## Implementation Guidelines

### 1. Agent Activation
- Agents are activated by pattern matching in user messages
- Higher priority patterns take precedence
- Multiple agents can be activated for complex tasks

### 2. Tool Restrictions
- Each agent has specific allowed and restricted tools
- Restrictions ensure agents stay within their domain
- Critical operations require specialized agents

### 3. Inter-Agent Communication
- Agents communicate through shared memory
- orchestrator coordinates multi-agent workflows
- Results are aggregated by coordinator agents

### 4. Migration Steps
1. Create `.claude/agents/` directory structure
2. Convert each command to agent definition format
3. Update activation patterns for natural language
4. Test agent interactions and handoffs
5. Implement gradual rollout with fallbacks

### 5. Backwards Compatibility
- Keep command files during transition
- Map command invocations to agent activations
- Provide migration warnings for deprecated commands

## Monitoring Migration Success

### Key Metrics
- Agent activation accuracy
- completion rates
- Inter-agent coordination efficiency
- User satisfaction scores
- Performance improvements

### Validation Criteria
- All commands have equivalent agents
- No functionality loss during migration
- Improved natural language understanding
- Better task decomposition and parallelization
- Enhanced error handling and recovery
