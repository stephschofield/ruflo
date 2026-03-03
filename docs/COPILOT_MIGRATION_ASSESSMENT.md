# Ruflo -> GitHub Copilot Migration Assessment

**Date**: 2026-03-02
**Branch**: `assessment`
**Scope**: Full codebase review of Ruflo v3.5 (formerly Claude Flow) with assessment of refactoring for GitHub Copilot usage

---

## Executive Summary

Ruflo is a multi-agent orchestration framework built primarily for Claude Code. The codebase contains ~9,400 files across V2 (legacy) and V3 (active) implementations, 20 sub-packages, 215+ MCP tools, 60+ agent definitions, and extensive hooks/memory/intelligence systems.

**The core finding is that migration to GitHub Copilot is feasible and does not require a full rewrite.** The architecture is layered such that ~70% of the codebase (the core libraries) is already platform-agnostic. The Claude Code coupling is concentrated in the CLI service layer and configuration generators. GitHub Copilot's current feature set (MCP support, custom agents, hooks, skills, custom instructions) maps closely to Claude Code's capabilities, making this a configuration/adapter refactoring task rather than a fundamental architecture change.

---

## 1. Codebase Architecture Overview

### Package Structure

```
ruflo/                          # Root umbrella (npm: claude-flow@3.5.2)
  bin/cli.js                    # Proxy to v3/@claude-flow/cli
  ruflo/                        # Thin wrapper (npm: ruflo@3.5.2)
  packages/coflow/              # Shorthand alias (npm: coflow)
  v3/                           # Active monorepo (pnpm workspaces)
    @claude-flow/cli/           # Core CLI (184 TS files, 46 commands)
    @claude-flow/mcp/           # Standalone MCP server (protocol 2025-11-25)
    @claude-flow/swarm/         # Coordination engine (4 topologies, 3 consensus)
    @claude-flow/memory/        # AgentDB + HNSW vector search
    @claude-flow/hooks/         # 17 hooks + 12 background workers
    @claude-flow/neural/        # SONA learning
    @claude-flow/providers/     # Multi-LLM abstraction (6 providers)
    @claude-flow/plugins/       # Plugin SDK + registry
    @claude-flow/shared/        # Types, events, utilities
    @claude-flow/security/      # Input validation, CVE remediation
    @claude-flow/embeddings/    # Vector embeddings (sql.js WASM)
    @claude-flow/codex/         # OpenAI Codex adapter
    @claude-flow/guidance/      # Governance control plane
    @claude-flow/performance/   # Benchmarking
    @claude-flow/integration/   # agentic-flow bridge
    @claude-flow/testing/       # TDD framework
    @claude-flow/deployment/    # Release management
    @claude-flow/browser/       # Browser automation
    @claude-flow/aidefence/     # Prompt injection defense
    @claude-flow/claims/        # Work coordination
  v2/                           # Legacy V2 (excluded from publish)
  .claude/                      # Claude Code configuration
  .agents/                      # OpenAI Codex CLI configuration
```

### Key Observations

1. **Three-package publishing model**: `@claude-flow/cli`, `claude-flow`, and `ruflo` are all published to npm
2. **V2 is dead weight**: 6,440 files excluded from npm publish via `.npmignore`; retained only for reference
3. **Already cross-platform**: The `.agents/` directory with `config.toml` is a port of `.claude/` for OpenAI Codex CLI, proving the team has already done one cross-platform adaptation
4. **MCP is custom-built**: V3 implements MCP from scratch (no `@modelcontextprotocol/sdk` dependency), giving full control over protocol compliance
5. **Optional dependency pattern**: Heavy packages (memory, embeddings, guidance, codex) are optional in the CLI, enabling lightweight installation

---

## 2. Platform Coupling Analysis

### Layer 1: Fully Generic (No Platform Coupling)

These packages work with any AI platform. Zero Claude Code references:

| Package | Files | Purpose |
|---------|-------|---------|
| `@claude-flow/mcp` | 20 | Pure MCP protocol implementation |
| `@claude-flow/swarm` | 42 | Coordination engine, topologies, consensus |
| `@claude-flow/memory` | 51 | AgentDB, HNSW, SQLite storage |
| `@claude-flow/plugins` | 66 | Plugin SDK, registry, dependency graph |
| `@claude-flow/embeddings` | 16 | Vector embeddings |
| `@claude-flow/security` | 30 | Input validation, path security |
| `@claude-flow/neural` | 52 | SONA learning, neural modes |
| `@claude-flow/shared` | 85 | Types, events, utilities |
| `@claude-flow/performance` | 15 | Benchmarking |
| `@claude-flow/testing` | 38 | TDD framework |
| `@claude-flow/aidefence` | 7 | Prompt injection defense |
| `@claude-flow/claims` | 23 | Work coordination |
| `.claude/helpers/router.cjs` | 1 | Regex task-to-agent routing |
| `.claude/helpers/session.cjs` | 1 | Cross-platform session manager |
| `.claude/helpers/memory.cjs` | 1 | JSON key-value store |
| `.claude/helpers/intelligence.cjs` | 1 | Pattern matching engine |

**Total**: ~450 source files, representing ~70% of the functional code.

### Layer 2: Abstracted (Anthropic-Aware but Portable)

These have Anthropic-specific code behind generic interfaces:

| Component | Coupling Point | Migration Effort |
|-----------|---------------|-----------------|
| `@claude-flow/providers` | `AnthropicProvider` uses Anthropic API format | Already abstracted. Add a `CopilotProvider` or use existing `OpenAIProvider`. No framework changes. |
| MCP sampling | `createAnthropicProvider` factory | Behind `LLMProvider` interface, easy to swap |

### Layer 3: Tightly Coupled to Claude Code

These require refactoring for Copilot:

| Component | File(s) | Coupling |
|-----------|---------|----------|
| **Headless worker executor** | `cli/src/services/headless-worker-executor.ts` | Spawns `claude --print` binary directly. Uses `CLAUDE_CODE_HEADLESS`, `CLAUDE_CODE_SANDBOX_MODE`, `ANTHROPIC_MODEL` env vars. |
| **Container worker pool** | `cli/src/services/container-worker-pool.ts` | Sets Claude Code env vars in Docker containers |
| **Settings generator** | `cli/src/init/settings-generator.ts` | Generates `.claude/settings.json` with Claude Code permission format, model IDs, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` |
| **MCP config generator** | `cli/src/init/mcp-generator.ts` | Generates `.mcp.json` for Claude Code |
| **Headless runtime** | `cli/src/runtime/headless.ts` | `CLAUDE_CODE_HEADLESS` runtime |
| **Agent model mapping** | `cli/src/mcp-tools/agent-tools.ts` | Maps to `claude-sonnet-4-5-*`, `claude-opus-4-6`, `claude-haiku-4-5-*` model IDs |
| **Codex adapter** | `@claude-flow/codex/` (18 files) | CLAUDE.md parser, Claude-to-Codex migration |
| **Hook bridge** | `@claude-flow/hooks/src/bridge/official-hooks-bridge.ts` | Maps V3 hook events to Claude Code's hook protocol |
| **Auto-memory hook** | `.claude/helpers/auto-memory-hook.mjs` | Bridges Claude Code's MEMORY.md files |
| **Status line** | `.claude/helpers/statusline.cjs` | Claude Code UI status bar |

**Total**: ~15-20 files requiring modification, representing ~5% of the functional code.

### Layer 4: Configuration Files

| Claude Code | Copilot Equivalent | Migration |
|-------------|-------------------|-----------|
| `.claude/settings.json` | `.vscode/settings.json` + `.github/copilot-instructions.md` | Rewrite generator |
| `.claude/mcp.json` | `.vscode/mcp.json` | Near-identical format |
| `.claude/agents/*.md` | `.github/agents/*.agent.md` | Add Copilot frontmatter fields |
| `.claude/commands/*.md` | Prompt files (`.github/prompts/*.prompt.md`) | Rename + adjust format |
| `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` | Already compatible format |
| `CLAUDE.md` | `.github/copilot-instructions.md` | Extract key instructions |
| `.claude/helpers/hooks*.json` | `.github/hooks/*.json` | Near-identical format |

---

## 3. GitHub Copilot Feature Mapping

### Direct Equivalences

| Claude Code Feature | Copilot Equivalent | Compatibility |
|--------------------|--------------------|---------------|
| MCP servers (stdio) | MCP servers (stdio) | **Identical**. Same JSON-RPC 2.0 protocol, same stdio transport |
| MCP servers (HTTP) | MCP servers (HTTP) | **Identical** |
| `.claude/agents/*.md` | `.github/agents/*.agent.md` | **High**. Copilot reads `.claude/agents/` directly with auto-conversion |
| Hooks (8 events) | Hooks (8 events) | **Identical events**: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SubagentStart, SubagentStop, Stop |
| Hook stdin/stdout JSON | Hook stdin/stdout JSON | **Identical protocol**. Same exit codes (0, 2, non-zero) |
| Slash commands | Prompt files | **Similar**. Different naming convention but same concept |
| Skills (SKILL.md) | Agent Skills (SKILL.md) | **Identical**. Copilot reads `.claude/skills/` natively. Same YAML frontmatter format |
| Task tool (sub-agents) | Subagents (`agents` field) | **Similar**. Copilot uses `agents` field in frontmatter instead of programmatic Task tool |
| CLAUDE.md | `.github/copilot-instructions.md` | **Similar**. Both are always-on Markdown instruction files |
| Tool permissions | Tool restrictions in agent frontmatter | **Similar**. Copilot uses `tools` array in agent frontmatter |
| Model selection | `model` field in agent frontmatter | **Available**. Copilot supports model arrays with fallback |

### Copilot Has But Claude Code Doesn't

| Feature | Description |
|---------|-------------|
| `handoffs` | Structured agent-to-agent handoff with UI buttons |
| `argument-hint` | Placeholder text in chat input for agents |
| `user-invokable` / `disable-model-invocation` | Granular control over agent visibility and auto-invocation |
| Organization-level agents | GitHub org-wide agent sharing |
| `target` field | `vscode` vs `github-copilot` targeting |
| Agent Skills open standard | `agentskills.io` cross-platform compatibility |
| MCP Apps | Rich UI components (dashboards, forms) rendered in chat |

### Claude Code Has But Copilot Lacks (or differs)

| Feature | Status in Copilot |
|---------|-------------------|
| `claude -p` headless mode | No direct equivalent. Would need a different background execution mechanism |
| `TeamCreate` / `SendMessage` | No built-in inter-agent messaging protocol. Subagents are orchestrated by the parent agent |
| `TodoWrite` / task lists | No built-in task tracking tool. Would need MCP tool implementation |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | No equivalent env var. Copilot handles teams via subagents natively |
| `TeammateIdle` / `TaskCompleted` hooks | Not available in Copilot's 8 hook events |
| Statusline | No equivalent UI surface |

---

## 4. Migration Path

### Phase 1: Zero-Change Compatibility (Works Today)

The following already works with Copilot without any code changes:

1. **MCP server**: `npx ruflo@v3alpha mcp start` can be added to `.vscode/mcp.json`:
   ```json
   {
     "servers": {
       "ruflo": {
         "command": "npx",
         "args": ["ruflo@v3alpha", "mcp", "start"]
       }
     }
   }
   ```
   All 215 MCP tools become available to Copilot's agent mode immediately.

2. **Agent definitions**: Copilot already reads `.claude/agents/*.md` with auto-conversion of frontmatter fields.

3. **Skills**: Copilot reads `.claude/skills/*/SKILL.md` natively — same format, same discovery locations.

4. **Hooks**: Most hooks use the same event names and stdin/stdout JSON protocol. The `.claude/settings.json` hooks can be copied to `.github/hooks/` files with minor adjustments.

### Phase 2: Configuration Adaptation (Low Effort)

1. **Generate `.github/copilot-instructions.md`** from CLAUDE.md — extract the behavioral rules, project architecture, and coding standards sections.

2. **Create `.vscode/mcp.json`** — move MCP server configuration from `.claude/mcp.json` format.

3. **Create `.github/agents/*.agent.md`** — convert agent definitions to use Copilot frontmatter:
   - Add `tools` as YAML array (instead of comma-separated string)
   - Add `agents` field for subagent orchestration
   - Add `model` field with Copilot-compatible model names
   - Add `handoffs` for agent-to-agent transitions
   - Set `user-invokable` and `disable-model-invocation` as needed

4. **Create `.github/hooks/*.json`** — port hook definitions from `.claude/settings.json`:
   - Same 8 event names
   - Same stdin/stdout JSON protocol
   - Same exit code semantics
   - Add OS-specific overrides (`windows`, `linux`, `osx`) if needed

5. **Create prompt files** — convert `.claude/commands/*.md` to `.github/prompts/*.prompt.md` for slash command equivalents.

### Phase 3: Service Layer Refactoring (Medium Effort)

1. **Headless worker executor**: Replace `spawn('claude', ['--print', ...])` with a Copilot-compatible background execution mechanism. Options:
   - Use Copilot's background agents (if the API supports programmatic spawning)
   - Use the MCP server's own agent spawning via JSON-RPC calls
   - Use a generic LLM API call through `@claude-flow/providers` (already has OpenAI, Google, Cohere, Ollama providers)

2. **Settings generator**: Add a Copilot mode to `settings-generator.ts` that outputs `.vscode/settings.json` and `.github/copilot-instructions.md` instead of `.claude/settings.json`.

3. **MCP config generator**: Add `.vscode/mcp.json` output alongside `.mcp.json`.

4. **Model mapping**: Add Copilot model IDs (`GPT-5.2`, `Claude Opus 4.5`, etc.) to the model routing system alongside existing Claude model IDs.

5. **Hook bridge**: Create a Copilot variant of `official-hooks-bridge.ts` that maps V3 internal events to Copilot's hook events (already nearly identical).

### Phase 4: Advanced Feature Adaptation (Higher Effort)

1. **Agent Teams → Subagents**: Replace Claude Code's `TeamCreate`/`SendMessage` pattern with Copilot's subagent orchestration:
   - Define coordinator agents with `agents: ['*']` and `tools: ['agent']`
   - Use subagent delegation instead of explicit messaging
   - Memory coordination via MCP tools continues to work as-is

2. **Task tracking**: Implement `TodoWrite`-equivalent as an MCP tool (the MCP server already has `task_create`, `task_status`, `task_list`, `task_complete` tools).

3. **Dual-mode orchestration**: The `@claude-flow/codex` package already bridges two platforms. Extend this pattern to support Copilot as a third platform option.

4. **Status line**: No direct equivalent in Copilot. Consider implementing as an MCP App (rich UI component in chat) or dropping this feature.

---

## 5. Effort Estimate

| Phase | Scope | Files Changed | New Files |
|-------|-------|--------------|-----------|
| Phase 1 (Zero-change) | MCP + agents + skills | 0 | 1 (`.vscode/mcp.json`) |
| Phase 2 (Config) | Instructions, hooks, prompts | 2-3 generators | 5-10 config files |
| Phase 3 (Services) | Worker executor, settings gen, model mapping | 5-8 TS files | 2-3 adapter files |
| Phase 4 (Advanced) | Agent teams, task tracking, dual-mode | 10-15 TS files | 3-5 new modules |

**Phase 1 can be done immediately.** The MCP server, agent definitions, and skills already work with Copilot.

**Phase 2 is straightforward.** The configuration formats are nearly identical between Claude Code and Copilot.

**Phase 3 is the core refactoring work.** The headless worker executor is the single biggest coupling point.

**Phase 4 is optional.** Most advanced features (agent teams, task tracking) can continue to work through the MCP tool interface rather than requiring native Copilot integration.

---

## 6. Architecture Recommendations

### 6.1: Platform Abstraction Layer

Create a `@claude-flow/platform` package that abstracts platform-specific concerns:

```typescript
interface PlatformAdapter {
  generateConfig(): Promise<void>;          // Settings, MCP config, instructions
  generateAgentDefs(): Promise<void>;       // Agent definition files
  generateHookConfig(): Promise<void>;      // Hook configuration
  spawnBackgroundWorker(task: string): Promise<WorkerHandle>;
  getModelId(tier: 'fast' | 'balanced' | 'powerful'): string;
  getPlatformName(): 'claude-code' | 'copilot' | 'codex' | 'cursor';
}
```

Implementations: `ClaudeCodeAdapter`, `CopilotAdapter`, `CodexAdapter`, `CursorAdapter`.

### 6.2: Dual Config Generation

Modify the `init` command to detect the target platform and generate appropriate config files:

```bash
npx ruflo init --platform copilot    # Generates .vscode/mcp.json, .github/agents/, .github/hooks/
npx ruflo init --platform claude     # Generates .claude/settings.json, .claude/agents/ (current behavior)
npx ruflo init --platform codex      # Generates .agents/config.toml (current behavior)
npx ruflo init --platform all        # Generates config for all platforms
```

### 6.3: Keep MCP as the Universal Interface

The MCP server is the most portable component. All 215 tools are accessible from any MCP-compatible client. Rather than building deep native integrations with each platform, invest in making the MCP server the primary interface:

- Copilot agent mode + MCP tools = full functionality
- Claude Code + MCP tools = full functionality (current)
- Cursor + MCP tools = full functionality
- Any future MCP-compatible IDE = full functionality

### 6.4: Deprecate Direct CLI Binary Spawning

Replace `spawn('claude', ['--print', ...])` in the headless worker executor with provider-agnostic LLM API calls through `@claude-flow/providers`. This eliminates the single tightest coupling point and makes background workers work with any LLM backend.

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Copilot MCP protocol version mismatch | Medium | High | V3 CLI uses protocol `2024-11-05` (broadly supported); standalone MCP package uses `2025-11-25` (may be too new). Use the CLI server for Copilot. |
| 215 tools overwhelms Copilot UI | Medium | Low | Copilot has tool toggle UI. Users can selectively enable tools. Consider categorizing tools. |
| Background worker replacement | High | Medium | No direct `claude -p` equivalent in Copilot. Use LLM API calls via providers package instead. |
| Hook event gaps | Low | Low | Copilot covers the same 8 core events. Missing: `TeammateIdle`, `TaskCompleted` (Claude-specific). These can be handled through MCP tools instead. |
| Agent subagent model differences | Medium | Medium | Claude Code uses Task tool for explicit agent spawning. Copilot uses declarative subagent fields. The coordination patterns differ but achieve the same outcomes. |

---

## 8. Conclusion

**Ruflo can be refactored for GitHub Copilot usage.** The migration is feasible because:

1. **MCP is the universal bridge**: The custom-built MCP server (215 tools, stdio/HTTP transports) works with Copilot today with zero code changes.

2. **Configuration formats converge**: Copilot's hooks, agents, skills, and custom instructions use nearly identical formats to Claude Code's equivalents. Copilot even auto-reads `.claude/agents/` and `.claude/skills/` directories.

3. **Core libraries are platform-agnostic**: 70% of the codebase (memory, swarm, plugins, security, neural, embeddings) has no Claude Code dependency.

4. **The coupling is concentrated**: Only ~15-20 files in the CLI service layer need modification. The heaviest coupling point is the headless worker executor (~1 file).

5. **Precedent exists**: The `.agents/` directory demonstrates that cross-platform adaptation has already been done once for Codex CLI. The same pattern applies to Copilot.

The recommended approach is to start with Phase 1 (the MCP server already works), add configuration generation for Copilot in Phase 2, refactor the service layer in Phase 3, and adapt advanced features in Phase 4 as needed.
