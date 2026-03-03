---
name: "GitHub Code Review"
description: "AI-powered code review with multi-agent coordination for comprehensive security, performance, and quality analysis of pull requests."
---

# GitHub Code Review

## What This Skill Does

Deploy specialized review agents to perform comprehensive code reviews covering security, performance, architecture, and style analysis.

## Quick Start

```bash
# View PR details
gh pr view 123 --json files,diff

# Review specific PR
gh pr diff 123
```

Use the `@reviewer` agent for comprehensive code review, or `@security-auditor` for security-focused reviews.

## Review Agents

| Agent | Focus Area |
|-------|-----------|
| `@reviewer` | Code quality, SOLID principles, maintainability |
| `@security-auditor` | OWASP top 10, input validation, auth |
| `@tester` | Test coverage, edge cases, test quality |
| `@architect` | Design patterns, scalability, modularity |

## Review Workflow

1. Get PR context: `gh pr view <number> --json files,additions,deletions`
2. Review diff: `gh pr diff <number>`
3. Use ruflo tools for analysis: `github_code_review`, `github_repo_analyze`
4. Post findings: `gh pr review <number> --comment --body "..."`

## Review Checklist

- **Functionality**: Requirements met, edge cases handled
- **Security**: Input validation, auth, data protection
- **Performance**: Algorithm efficiency, query optimization
- **Code Quality**: SOLID, DRY, naming, abstractions
- **Testing**: Coverage, isolation, maintainability
- **Documentation**: API docs, inline comments where needed

## MCP Tools

- `github_code_review` - Automated code review analysis
- `github_pr_manage` - PR lifecycle management
- `github_metrics` - Repository quality metrics
- `aidefence_scan` - Security analysis
