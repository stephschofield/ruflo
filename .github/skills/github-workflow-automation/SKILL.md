---
name: "GitHub Workflow Automation"
description: "GitHub Actions workflow automation with intelligent CI/CD pipelines, workflow optimization, and repository management."
---

# GitHub Workflow Automation

## What This Skill Does

Automate GitHub Actions workflows with intelligent CI/CD pipeline creation, optimization of existing workflows, and comprehensive repository management.

## Quick Start

```bash
# List existing workflows
gh workflow list

# View workflow runs
gh run list --workflow ci.yml

# Analyze failed runs
gh run view <run-id> --json jobs,conclusion
```

## Core Capabilities

### Workflow Generation
Create optimized CI/CD pipelines based on codebase analysis:
- Language detection and appropriate tool selection
- Parallel job configuration for faster builds
- Caching strategies for dependencies
- Security scanning integration

### Workflow Optimization
Improve existing workflows:
- Parallelize independent jobs
- Add caching for dependencies
- Optimize matrix strategies
- Reduce redundant steps

### Failure Analysis
Diagnose and fix workflow failures:
- Parse error logs from failed runs
- Identify flaky tests
- Suggest fixes for common issues

## MCP Tools

- `github_workflow` - Manage GitHub Actions workflows
- `github_metrics` - Repository and workflow metrics
- `performance_benchmark` - Benchmark workflow performance

## Best Practices

1. Use caching for dependencies (`actions/cache`)
2. Parallelize independent jobs
3. Use matrix strategies for multi-platform testing
4. Add status badges to README
5. Set up branch protection rules
