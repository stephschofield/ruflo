---
name: "Performance Analysis"
description: "Performance analysis, bottleneck detection, and optimization recommendations for swarm operations and application code."
---

# Performance Analysis

## What This Skill Does

Comprehensive performance analysis suite for identifying bottlenecks, profiling operations, generating reports, and providing optimization recommendations.

## Quick Start

```bash
# Run performance benchmark
npx ruflo performance benchmark --suite all

# Generate performance report
npx ruflo analysis performance-report --format markdown --include-metrics

# Detect bottlenecks
npx ruflo bottleneck detect
```

## Core Capabilities

### Bottleneck Detection
Identify performance bottlenecks across:
- Communication overhead between agents
- Processing delays in task execution
- Memory access patterns and cache performance
- Network latency in distributed operations

### Performance Profiling
- Real-time monitoring of swarm operations
- Historical analysis with trend detection
- Resource utilization tracking (CPU, memory, I/O)

### Report Generation
- Multiple output formats (JSON, HTML, Markdown, CSV)
- Comparative analysis against baselines
- Actionable optimization recommendations

## MCP Tools

- `performance_report` - Generate performance reports
- `performance_bottleneck` - Detect bottlenecks
- `performance_benchmark` - Run benchmarks
- `performance_profile` - Profile operations
- `performance_optimize` - Apply optimizations
- `performance_metrics` - Collect metrics

## Metrics Analyzed

- **Communication**: Message queue delays, agent response times
- **Processing**: Task execution duration, throughput
- **Memory**: Allocation patterns, cache hit rates
- **System**: CPU utilization, I/O wait times

## Best Practices

1. Establish performance baselines before optimization
2. Profile before optimizing — measure, don't guess
3. Focus on the critical path first
4. Monitor after changes to verify improvements
