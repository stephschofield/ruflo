#!/usr/bin/env python3
"""Convert .claude/agents/ to .github/agents/ with Copilot frontmatter.
Part of Task 2.1 — Agent frontmatter conversion.
"""
import os
import re
import yaml
from pathlib import Path

SRCDIR = Path(".claude/agents")
DSTDIR = Path(".github/agents")

# Already hand-crafted — don't overwrite
SKIP = {
    "coordinator", "coder", "researcher", "architect", "tester",
    "reviewer", "planner", "pr-manager", "issue-tracker", "security-auditor"
}

# Infrastructure agents: user-invokable=false, disable-model-invocation=true
INFRASTRUCTURE = {
    "queen-coordinator", "collective-intelligence-coordinator", "worker-specialist",
    "scout-explorer", "swarm-memory-manager", "hierarchical-coordinator",
    "mesh-coordinator", "adaptive-coordinator", "byzantine-coordinator",
    "raft-manager", "gossip-coordinator", "crdt-synchronizer", "quorum-manager",
    "security-manager", "consensus-coordinator", "memory-coordinator",
    "orchestrator-task", "coordinator-swarm-init", "automation-smart-agent",
    "load-balancer", "load-balancing-coordinator", "resource-allocator",
    "topology-optimizer", "swarm-init", "task-orchestrator",
    "codex-coordinator", "codex-worker", "dual-orchestrator",
    "v3-queen-coordinator", "v3-memory-specialist", "v3-integration-architect",
    "v3-performance-engineer", "v3-security-architect",
}

# Agents that can delegate to subagents
DELEGATORS = {
    "sparc-coordinator": ["specification", "pseudocode", "architecture", "coder"],
    "sparc-coord": ["specification", "pseudocode", "architecture", "coder"],
    "queen-coordinator": ["*"],
    "collective-intelligence-coordinator": ["*"],
    "coordinator-swarm-init": ["*"],
    "v3-queen-coordinator": ["*"],
    "code-review-swarm": ["reviewer", "security-auditor"],
    "swarm-pr": ["reviewer", "security-auditor"],
    "release-swarm": ["tester", "coder", "reviewer"],
    "release-manager": ["tester", "coder", "reviewer"],
    "hierarchical-coordinator": ["coder", "tester", "reviewer", "researcher"],
    "mesh-coordinator": ["coder", "tester", "reviewer", "researcher"],
    "adaptive-coordinator": ["coder", "tester", "reviewer", "researcher"],
    "tdd-london-swarm": ["coder", "tester"],
}

# Custom handoff definitions
HANDOFFS = {
    # GitHub agents
    "code-review-swarm": [
        {"agent": "coder", "trigger": "When code changes are needed based on review findings"},
        {"agent": "coordinator", "trigger": "When task requires broader coordination"},
    ],
    "github-modes": [
        {"agent": "coder", "trigger": "When code changes are needed"},
        {"agent": "coordinator", "trigger": "When task requires broader coordination"},
    ],
    "swarm-pr": [
        {"agent": "coder", "trigger": "When PR review identifies code changes needed"},
        {"agent": "coordinator", "trigger": "When PR requires broader coordination"},
    ],
    "swarm-issue": [
        {"agent": "coder", "trigger": "When issue requires code implementation"},
        {"agent": "coordinator", "trigger": "When issue requires broader coordination"},
    ],
    "release-manager": [
        {"agent": "tester", "trigger": "When release needs validation testing"},
        {"agent": "coordinator", "trigger": "When release requires multi-team coordination"},
    ],
    "release-swarm": [
        {"agent": "tester", "trigger": "When release needs validation testing"},
        {"agent": "coordinator", "trigger": "When release requires multi-team coordination"},
    ],
    "repo-architect": [
        {"agent": "coder", "trigger": "When architecture decisions need implementation"},
        {"agent": "coordinator", "trigger": "When architectural changes span multiple teams"},
    ],
    "workflow-automation": [
        {"agent": "coder", "trigger": "When workflow automation requires code changes"},
        {"agent": "coordinator", "trigger": "When workflow spans multiple teams"},
    ],
    # SPARC pipeline
    "specification": [
        {"agent": "pseudocode", "trigger": "When specification is complete and ready for pseudocode design"},
    ],
    "pseudocode": [
        {"agent": "architecture", "trigger": "When pseudocode is complete and ready for architecture design"},
    ],
    "architecture": [
        {"agent": "coder", "trigger": "When architecture design is ready for implementation"},
    ],
    "refinement": [
        {"agent": "tester", "trigger": "When refinement is complete and needs testing"},
        {"agent": "reviewer", "trigger": "When refinement is ready for code review"},
    ],
    "sparc-coordinator": [
        {"agent": "specification", "trigger": "When starting SPARC pipeline"},
        {"agent": "coordinator", "trigger": "When SPARC process completes"},
    ],
    "sparc-coord": [
        {"agent": "specification", "trigger": "When starting SPARC pipeline"},
        {"agent": "coordinator", "trigger": "When SPARC process completes"},
    ],
    # Consensus/infrastructure → coordinator
    "byzantine-coordinator": [
        {"agent": "coordinator", "trigger": "When consensus operation completes or requires escalation"},
    ],
    "raft-manager": [
        {"agent": "coordinator", "trigger": "When consensus operation completes or requires escalation"},
    ],
    "gossip-coordinator": [
        {"agent": "coordinator", "trigger": "When gossip protocol operation completes"},
    ],
    "crdt-synchronizer": [
        {"agent": "coordinator", "trigger": "When synchronization operation completes"},
    ],
    "quorum-manager": [
        {"agent": "coordinator", "trigger": "When quorum operation completes or requires escalation"},
    ],
    "security-manager": [
        {"agent": "coordinator", "trigger": "When security operation completes or requires escalation"},
    ],
    # Hive-mind → coordinator
    "queen-coordinator": [
        {"agent": "coordinator", "trigger": "When hive-mind operation requires top-level coordination"},
    ],
    "collective-intelligence-coordinator": [
        {"agent": "coordinator", "trigger": "When collective intelligence operation completes"},
    ],
    "worker-specialist": [
        {"agent": "coordinator", "trigger": "When worker task completes or requires escalation"},
    ],
    "scout-explorer": [
        {"agent": "coordinator", "trigger": "When reconnaissance completes and findings need action"},
    ],
    "swarm-memory-manager": [
        {"agent": "coordinator", "trigger": "When memory management operation completes"},
    ],
    # Swarm coordinators
    "hierarchical-coordinator": [
        {"agent": "coordinator", "trigger": "When swarm topology management completes"},
    ],
    "mesh-coordinator": [
        {"agent": "coordinator", "trigger": "When swarm topology management completes"},
    ],
    "adaptive-coordinator": [
        {"agent": "coordinator", "trigger": "When swarm topology management completes"},
    ],
}


def parse_agent_file(filepath):
    """Parse a Claude agent .md or .yaml file and return (metadata, body)."""
    content = filepath.read_text(encoding="utf-8", errors="replace")
    # Remove any \r characters
    content = content.replace("\r", "")
    
    if filepath.suffix == ".yaml":
        try:
            meta = yaml.safe_load(content)
        except yaml.YAMLError:
            meta = {}
        return meta or {}, ""
    
    # For .md files: parse YAML frontmatter between --- delimiters
    parts = content.split("---", 2)
    if len(parts) >= 3:
        try:
            meta = yaml.safe_load(parts[1])
        except yaml.YAMLError:
            meta = {}
        body = parts[2].strip()
    elif len(parts) == 2:
        try:
            meta = yaml.safe_load(parts[1])
        except yaml.YAMLError:
            meta = {}
        body = ""
    else:
        meta = {}
        body = content
    
    return meta or {}, body


def clean_body(body):
    """Remove Claude Code-specific patterns from body content."""
    # Remove MCP prefix patterns
    body = re.sub(r'mcp__claude[_-]flow__', '', body)
    body = re.sub(r'mcp__ruv[_-]swarm__', '', body)
    # Remove Claude Code tool lists from body text
    body = re.sub(r',?\s*(?:Bash|Read|Write|Edit|Glob|Grep|LS|TodoWrite|TodoRead|Task|WebFetch|MultiEdit)\b', '', body)
    return body


def name_to_kebab(name):
    """Convert a name to kebab-case filename."""
    return re.sub(r'[^a-z0-9-]', '-', name.lower()).strip('-')


def build_frontmatter(name, description, is_infra, handoffs, agents_list):
    """Build Copilot-compatible YAML frontmatter."""
    fm = {
        "name": name,
        "description": description,
        "model": ["claude-sonnet-4", "gpt-4.1"],
        "tools": ["ruflo"],
    }
    
    if agents_list:
        fm["agents"] = agents_list
    
    fm["handoffs"] = handoffs
    fm["user-invokable"] = not is_infra
    fm["disable-model-invocation"] = is_infra
    
    return fm


def convert_agent(src_path):
    """Convert a single agent file."""
    meta, body = parse_agent_file(src_path)
    
    name = meta.get("name", src_path.stem)
    if isinstance(name, str):
        name = name.strip()
    else:
        name = str(name).strip()
    
    kebab = name_to_kebab(name)
    
    if kebab in SKIP:
        return None
    
    description = meta.get("description", f"{name} agent")
    if isinstance(description, str):
        description = description.strip()
    
    is_infra = kebab in INFRASTRUCTURE
    
    # Get handoffs
    handoffs = HANDOFFS.get(kebab, [
        {"agent": "coordinator", "trigger": "When task completes or needs broader coordination"}
    ])
    
    # Get agents (subagent delegation)
    agents_list = None
    if kebab in DELEGATORS:
        deleg = DELEGATORS[kebab]
        if deleg == ["*"]:
            agents_list = ["*"]
        else:
            agents_list = deleg
    
    fm = build_frontmatter(kebab, description, is_infra, handoffs, agents_list)
    
    # Clean body
    body = clean_body(body)
    
    # Build output
    # Use manual YAML serialization for clean formatting
    lines = ["---"]
    lines.append(f"name: {fm['name']}")
    lines.append(f"description: {fm['description']}")
    lines.append("model:")
    for m in fm["model"]:
        lines.append(f"  - {m}")
    lines.append("tools:")
    for t in fm["tools"]:
        lines.append(f"  - {t}")
    if fm.get("agents"):
        lines.append("agents:")
        for a in fm["agents"]:
            lines.append(f'  - {a if a != "*" else chr(34) + "*" + chr(34)}')
    lines.append("handoffs:")
    for h in fm["handoffs"]:
        lines.append(f"  - agent: {h['agent']}")
        lines.append(f"    trigger: {h['trigger']}")
    lines.append(f"user-invokable: {'true' if fm['user-invokable'] else 'false'}")
    lines.append(f"disable-model-invocation: {'true' if fm['disable-model-invocation'] else 'false'}")
    lines.append("---")
    lines.append("")
    if body:
        lines.append(body)
    
    outpath = DSTDIR / f"{kebab}.agent.md"
    outpath.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return kebab


def main():
    DSTDIR.mkdir(parents=True, exist_ok=True)
    
    converted = []
    skipped = []
    
    # Find all agent files
    agent_files = sorted(
        list(SRCDIR.rglob("*.md")) + list(SRCDIR.rglob("*.yaml")),
        key=lambda p: p.name
    )
    
    # Exclude non-agent files
    exclude = {"MIGRATION_SUMMARY.md", "index.yaml"}
    
    for f in agent_files:
        if f.name in exclude:
            continue
        
        result = convert_agent(f)
        if result:
            converted.append(result)
        else:
            skipped.append(f.name)
    
    print(f"\n=== Conversion complete ===")
    print(f"Converted: {len(converted)}")
    print(f"Skipped (already done): {len(skipped)}")
    print(f"Total in {DSTDIR}: {len(list(DSTDIR.glob('*.agent.md')))}")
    
    # Show a few samples
    print("\nSample converted agents:")
    for name in sorted(converted)[:10]:
        p = DSTDIR / f"{name}.agent.md"
        lines = p.read_text().count("\n")
        print(f"  {name}.agent.md ({lines} lines)")


if __name__ == "__main__":
    main()
