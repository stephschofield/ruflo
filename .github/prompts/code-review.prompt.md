---
name: code-review
description: Run an automated code review with security, performance, and quality analysis
---

Perform a comprehensive code review using the ruflo MCP tools and the `@reviewer` agent:

1. Use `github_code_review` to analyze the code for quality issues
2. Use `github_repo_analyze` for repository-level metrics
3. Use `aidefence_scan` for security vulnerability analysis
4. Use `performance_report` for performance assessment

Review focus areas:
- **Security**: OWASP top 10, input validation, auth, data protection
- **Performance**: Algorithm efficiency, query optimization, caching
- **Code Quality**: SOLID principles, DRY, naming, abstractions
- **Testing**: Coverage, edge cases, test quality

Target for review: $input
