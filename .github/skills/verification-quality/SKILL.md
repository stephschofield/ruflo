---
name: "Verification & Quality Assurance"
description: "Truth scoring, code quality verification, and automatic rollback system for ensuring high-quality agent outputs and codebase reliability."
---

# Verification & Quality Assurance

## What This Skill Does

Comprehensive verification and quality assurance system:
- **Truth Scoring**: Reliability metrics (0.0-1.0 scale) for code and tasks
- **Verification Checks**: Automated correctness, security, and best practices validation
- **Automatic Rollback**: Reversion of changes that fail verification (threshold: 0.95)
- **Quality Metrics**: Statistical analysis with trends and improvement tracking

## Quick Start

```bash
# View current truth scores
npx ruflo truth

# Run verification check
npx ruflo verify check

# Verify specific file
npx ruflo verify check --file src/app.js --threshold 0.98

# Rollback last failed verification
npx ruflo verify rollback --last-good
```

## Truth Scoring

Scores range from 0.0 (unreliable) to 1.0 (fully verified):
- **0.95+**: Production ready
- **0.80-0.94**: Needs minor improvements
- **0.60-0.79**: Significant issues
- **Below 0.60**: Requires rework

## Verification Checks

- Code syntax and type correctness
- Security vulnerability scanning
- Performance regression detection
- Test coverage analysis
- Best practice compliance

## Output Formats

```bash
npx ruflo truth --format table    # Terminal table
npx ruflo truth --format json     # Programmatic access
npx ruflo truth --format csv      # Spreadsheet analysis
npx ruflo truth --format html     # Visual report
```

## Best Practices

1. Set verification thresholds appropriate to the project stage
2. Run verification before merging PRs
3. Track truth scores over time for trend analysis
4. Use automatic rollback for production-critical code
