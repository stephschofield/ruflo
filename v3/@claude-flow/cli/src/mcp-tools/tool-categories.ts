/**
 * MCP Tool Categories & Profiles
 *
 * Organizes 224 MCP tools into categories and exposes named profiles
 * for enable/disable by group. Copilot's `tools/list` response is
 * filtered based on the active profile.
 *
 * Phase 4 — Task 4.1 (Tool categorization) + Task 4.2 (Default profile)
 *
 * @module @claude-flow/cli/mcp-tools/tool-categories
 */

// ─── Category Definitions ───────────────────────────────────────────

/**
 * Every tool belongs to exactly one ToolCategory.
 * These map 1:1 to the `category` field already present on most MCPTool objects.
 */
export type ToolCategory =
  | 'agent'
  | 'swarm'
  | 'memory'
  | 'task'
  | 'session'
  | 'config'
  | 'hooks'
  | 'workflow'
  | 'github'
  | 'analyze'
  | 'progress'
  | 'security'
  | 'performance'
  | 'neural'
  | 'embeddings'
  | 'claims'
  | 'coordination'
  | 'hive-mind'
  | 'browser'
  | 'terminal'
  | 'transfer'
  | 'system'
  | 'daa'
  | 'agentdb'
  | 'coverage'
  | 'dashboard';

/** Human-readable metadata for each category */
export interface CategoryInfo {
  name: ToolCategory;
  displayName: string;
  description: string;
  toolCount: number;
}

/** Complete category metadata table */
export const CATEGORY_INFO: Record<ToolCategory, Omit<CategoryInfo, 'name'>> = {
  agent:        { displayName: 'Agent',         description: 'Agent lifecycle management (spawn, terminate, status, health)',         toolCount: 7  },
  swarm:        { displayName: 'Swarm',         description: 'Multi-agent swarm coordination and initialization',                    toolCount: 4  },
  memory:       { displayName: 'Memory',        description: 'Memory storage, retrieval, vector search, and migration',              toolCount: 7  },
  task:         { displayName: 'Task',          description: 'Task creation, tracking, assignment, and lifecycle',                   toolCount: 6  },
  session:      { displayName: 'Session',       description: 'Session save/restore, listing, and management',                        toolCount: 5  },
  config:       { displayName: 'Config',        description: 'Configuration get/set, import/export',                                 toolCount: 6  },
  hooks:        { displayName: 'Hooks',         description: 'Hook lifecycle, intelligence, workers, model routing',                 toolCount: 36 },
  workflow:     { displayName: 'Workflow',       description: 'Workflow creation, execution, templates',                              toolCount: 9  },
  github:       { displayName: 'GitHub',        description: 'GitHub repo analysis, PR management, issue tracking',                  toolCount: 5  },
  analyze:      { displayName: 'Analyze',       description: 'Diff analysis, risk assessment, reviewer suggestions',                 toolCount: 6  },
  progress:     { displayName: 'Progress',      description: 'V3 implementation progress tracking and sync',                        toolCount: 4  },
  security:     { displayName: 'Security',      description: 'AI defense scanning, threat analysis, PII detection',                  toolCount: 6  },
  performance:  { displayName: 'Performance',   description: 'Benchmarking, profiling, metrics, optimization',                       toolCount: 6  },
  neural:       { displayName: 'Neural',        description: 'SONA neural training, prediction, pattern learning',                   toolCount: 6  },
  embeddings:   { displayName: 'Embeddings',    description: 'Vector embeddings, similarity search, hyperbolic space',               toolCount: 7  },
  claims:       { displayName: 'Claims',        description: 'Claims-based authorization, handoff, load balancing',                  toolCount: 12 },
  coordination: { displayName: 'Coordination',  description: 'Topology management, load balancing, consensus',                       toolCount: 7  },
  'hive-mind':  { displayName: 'Hive Mind',     description: 'Byzantine fault-tolerant consensus, queen coordination',               toolCount: 9  },
  browser:      { displayName: 'Browser',       description: 'Browser automation — navigation, interaction, screenshots',            toolCount: 23 },
  terminal:     { displayName: 'Terminal',       description: 'Terminal session management and command execution',                    toolCount: 5  },
  transfer:     { displayName: 'Transfer',       description: 'Plugin store, IPFS resolution, PII detection',                       toolCount: 11 },
  system:       { displayName: 'System',        description: 'System status, health, info, reset',                                   toolCount: 5  },
  daa:          { displayName: 'DAA',           description: 'Dynamic Adaptive Agents — create, adapt, workflow execution',          toolCount: 8  },
  agentdb:      { displayName: 'AgentDB',       description: 'AgentDB controller operations — patterns, causal graph, batching',     toolCount: 15 },
  coverage:     { displayName: 'Coverage',      description: 'RuVector test coverage routing, suggestions, gap analysis',            toolCount: 3  },
  dashboard:    { displayName: 'Dashboard',     description: 'Aggregated swarm, agent, memory, and system status dashboard',       toolCount: 1  },
};

// ─── Profile Definitions ────────────────────────────────────────────

/**
 * A ToolProfile is a named group of categories that are exposed to the client.
 * Profiles control which tools appear in the MCP `tools/list` response.
 */
export type ToolProfileName = 'default' | 'full' | 'minimal' | 'development' | 'devops';

export interface ToolProfile {
  name: ToolProfileName;
  displayName: string;
  description: string;
  /** Categories included in this profile */
  categories: ToolCategory[];
}

/**
 * `default` — Core + GitHub (~45 tools)
 * Optimized for model tool selection — not overwhelming with 224 tools.
 */
const DEFAULT_PROFILE: ToolProfile = {
  name: 'default',
  displayName: 'Default',
  description: 'Core orchestration + GitHub integration (~45 tools)',
  categories: [
    'agent',       // 7  — spawn, list, status, health
    'swarm',       // 4  — init, status, shutdown, health
    'memory',      // 7  — store, retrieve, search, list
    'task',        // 6  — create, status, list, complete
    'config',      // 6  — get, set, list, import/export
    'github',      // 5  — repo, PR, issue, workflow, metrics
    'system',      // 5  — status, health, info
    'session',     // 5  — save, restore, list
    'dashboard',   // 1  — aggregated status dashboard
  ],
};

/**
 * `full` — All 224 tools, no filtering
 */
const FULL_PROFILE: ToolProfile = {
  name: 'full',
  displayName: 'Full',
  description: 'All 224 tools — every category enabled',
  categories: Object.keys(CATEGORY_INFO) as ToolCategory[],
};

/**
 * `minimal` — Bare minimum for simple tasks (~25 tools)
 */
const MINIMAL_PROFILE: ToolProfile = {
  name: 'minimal',
  displayName: 'Minimal',
  description: 'Bare minimum orchestration tools (~25 tools)',
  categories: [
    'agent',       // 7
    'swarm',       // 4
    'memory',      // 7
    'task',        // 6
    'system',      // 5
  ],
};

/**
 * `development` — Default + dev-focused categories (~100 tools)
 */
const DEVELOPMENT_PROFILE: ToolProfile = {
  name: 'development',
  displayName: 'Development',
  description: 'Core + dev workflow tools (~100 tools)',
  categories: [
    // Core (same as default)
    'agent', 'swarm', 'memory', 'task', 'config', 'github', 'system', 'session',
    // Dev workflow
    'hooks',        // 36 — pre/post edit, task hooks, workers
    'workflow',     // 9  — workflow templates, execution
    'analyze',      // 6  — diff analysis, risk assessment
    'performance',  // 6  — benchmarking, profiling
    'security',     // 6  — AI defense, scanning
    'coverage',     // 3  — test coverage
  ],
};

/**
 * `devops` — Default + ops/infra categories (~90 tools)
 */
const DEVOPS_PROFILE: ToolProfile = {
  name: 'devops',
  displayName: 'DevOps',
  description: 'Core + infrastructure and ops tools (~90 tools)',
  categories: [
    // Core (same as default)
    'agent', 'swarm', 'memory', 'task', 'config', 'github', 'system', 'session',
    // Ops/infra
    'coordination', // 7  — topology, load balancing
    'claims',       // 12 — authorization, handoff
    'terminal',     // 5  — terminal management
    'performance',  // 6  — metrics, profiling
    'browser',      // 23 — browser automation
  ],
};

/** All profiles keyed by name */
export const TOOL_PROFILES: Record<ToolProfileName, ToolProfile> = {
  default: DEFAULT_PROFILE,
  full: FULL_PROFILE,
  minimal: MINIMAL_PROFILE,
  development: DEVELOPMENT_PROFILE,
  devops: DEVOPS_PROFILE,
};

// ─── Filtering ──────────────────────────────────────────────────────

/**
 * Resolve the active profile name from environment or explicit argument.
 * Priority: explicit argument > RUFLO_TOOL_PROFILE env var > 'default'
 */
export function resolveProfileName(explicit?: string): ToolProfileName {
  const raw = explicit || process.env.RUFLO_TOOL_PROFILE || 'default';
  const normalized = raw.trim().toLowerCase();
  if (normalized in TOOL_PROFILES) {
    return normalized as ToolProfileName;
  }
  return 'default';
}

/**
 * Get the set of allowed categories for a given profile.
 */
export function getProfileCategories(profileName: ToolProfileName): Set<ToolCategory> {
  const profile = TOOL_PROFILES[profileName];
  return new Set(profile.categories);
}

/**
 * Check whether a tool category is allowed by the active profile.
 */
export function isCategoryAllowed(category: string | undefined, profileName: ToolProfileName): boolean {
  if (profileName === 'full') return true;
  if (!category) return false;
  const allowed = getProfileCategories(profileName);
  return allowed.has(category as ToolCategory);
}

/**
 * List categories included in a profile with their tool counts.
 */
export function listProfileCategories(profileName: ToolProfileName): CategoryInfo[] {
  const profile = TOOL_PROFILES[profileName];
  return profile.categories.map(name => ({
    name,
    ...CATEGORY_INFO[name],
  }));
}

/**
 * Estimated tool count for a profile (sum of category toolCounts).
 */
export function estimateProfileToolCount(profileName: ToolProfileName): number {
  const profile = TOOL_PROFILES[profileName];
  return profile.categories.reduce((sum, cat) => sum + CATEGORY_INFO[cat].toolCount, 0);
}
