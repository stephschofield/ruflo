---
name: "GitHub Project Management"
description: "GitHub project management with issue tracking, project board automation, sprint planning, and coordinated workflows."
---

# GitHub Project Management

## What This Skill Does

Comprehensive project management using GitHub Issues, Projects, and Milestones with AI-coordinated tracking and automation.

## Quick Start

```bash
# Create an issue
gh issue create --title "feat: description" --label "enhancement"

# List open issues
gh issue list --state open

# View project boards
gh project list --owner @me
```

## Core Capabilities

### Issue Management
- Create issues with smart templates (feature, bug, task)
- Automated labeling and triage
- Progress tracking with coordinated updates
- Cross-repository issue synchronization

### Project Board Automation
- Bidirectional sync between issues and project boards
- Automated column transitions based on PR status
- Sprint planning with milestone coordination

### Sprint Coordination
- Weekly sprint planning and review
- Velocity tracking and burn-down analysis
- Backlog grooming with priority-based sorting

## Issue Templates

### Feature Request
```markdown
## Feature Request
### Overview
[Brief description]
### Objectives
- [ ] Objective 1
### Acceptance Criteria
- [ ] Criteria 1
```

### Bug Report
```markdown
## Bug Report
### Problem
[Description]
### Expected vs Actual
### Steps to Reproduce
```

## MCP Tools

- `github_issue_track` - Issue management and tracking
- `github_metrics` - Repository and project metrics
- `task_create` / `task_update` - Task coordination
- `memory_store` - Project state persistence
