/**
 * MCP Tool Category System
 *
 * Defines tool categories and profiles for organizing 215+ MCP tools
 * into manageable groups. Profiles control which categories are enabled
 * by default vs opt-in, optimizing model tool selection.
 *
 * Task 4.1 — Tool categorization system
 * @module @claude-flow/cli/mcp-tools/tool-categories
 */

// ============================================================================
// Category Types
// ============================================================================

/**
 * All recognized tool categories.
 * Each tool's `category` field must be one of these values.
 */
export type ToolCategory =
  | 'agent'
  | 'agentdb'
  | 'analyze'
  | 'browser'
  | 'claims'
  | 'config'
  | 'coordination'
  | 'coverage'
  | 'daa'
  | 'embeddings'
  | 'github'
  | 'hive-mind'
  | 'hooks'
  | 'memory'
  | 'neural'
  | 'performance'
  | 'progress'
  | 'security'
  | 'session'
  | 'swarm'
  | 'system'
  | 'task'
  | 'terminal'
  | 'transfer'
  | 'workflow';

/**
 * Profile names for pre-configured tool selections.
 */
export type ToolProfile = 'default' | 'full' | 'minimal' | 'development' | 'ci';

/**
 * Category group for organizing related categories.
 */
export type CategoryGroup = 'core' | 'github' | 'intelligence' | 'security' | 'advanced';

/**
 * Metadata for a single tool category.
 */
export interface CategoryMetadata {
  /** Category identifier (matches tool.category) */
  id: ToolCategory;
  /** Human-readable display name */
  displayName: string;
  /** Short description of what tools in this category do */
  description: string;
  /** Higher-level group this category belongs to */
  group: CategoryGroup;
  /** Whether this category is enabled in the default profile */
  defaultEnabled: boolean;
  /** Approximate number of tools in this category */
  toolCount: number;
}

/**
 * Profile definition — which categories are enabled.
 */
export interface ProfileDefinition {
  /** Profile identifier */
  id: ToolProfile;
  /** Human-readable name */
  displayName: string;
  /** Description of the profile's purpose */
  description: string;
  /** Categories enabled in this profile */
  categories: ToolCategory[];
}

// ============================================================================
// Category Registry
// ============================================================================

/**
 * Complete category metadata registry.
 * Every tool category has an entry here with its group and default state.
 */
export const TOOL_CATEGORIES: Record<ToolCategory, CategoryMetadata> = {
  // ── Core Group (~45 tools) ─────────────────────────────────────────────
  agent: {
    id: 'agent',
    displayName: 'Agent',
    description: 'Agent lifecycle — spawn, terminate, status, health, pool management',
    group: 'core',
    defaultEnabled: true,
    toolCount: 7,
  },
  memory: {
    id: 'memory',
    displayName: 'Memory',
    description: 'Memory store, retrieve, search, delete, list, stats, migrate',
    group: 'core',
    defaultEnabled: true,
    toolCount: 7,
  },
  swarm: {
    id: 'swarm',
    displayName: 'Swarm',
    description: 'Swarm init, status, shutdown, health',
    group: 'core',
    defaultEnabled: true,
    toolCount: 4,
  },
  task: {
    id: 'task',
    displayName: 'Task',
    description: 'Task create, update, complete, cancel, status, list',
    group: 'core',
    defaultEnabled: true,
    toolCount: 6,
  },
  config: {
    id: 'config',
    displayName: 'Config',
    description: 'Configuration get, set, list, import, export, reset',
    group: 'core',
    defaultEnabled: true,
    toolCount: 6,
  },
  session: {
    id: 'session',
    displayName: 'Session',
    description: 'Session save, restore, list, delete, info',
    group: 'core',
    defaultEnabled: true,
    toolCount: 5,
  },
  system: {
    id: 'system',
    displayName: 'System',
    description: 'System status, health, metrics, info, reset, dashboard',
    group: 'core',
    defaultEnabled: true,
    toolCount: 6,
  },
  progress: {
    id: 'progress',
    displayName: 'Progress',
    description: 'Progress check, sync, summary, watch',
    group: 'core',
    defaultEnabled: true,
    toolCount: 4,
  },
  workflow: {
    id: 'workflow',
    displayName: 'Workflow',
    description: 'Workflow create, execute, pause, resume, cancel, delete, template',
    group: 'core',
    defaultEnabled: true,
    toolCount: 9,
  },

  // ── GitHub Group (~11 tools) ───────────────────────────────────────────
  github: {
    id: 'github',
    displayName: 'GitHub',
    description: 'GitHub repo analysis, PR management, issue tracking, workflow, metrics',
    group: 'github',
    defaultEnabled: true,
    toolCount: 5,
  },
  analyze: {
    id: 'analyze',
    displayName: 'Analyze',
    description: 'Diff analysis, risk scoring, reviewer suggestion, file risk',
    group: 'github',
    defaultEnabled: true,
    toolCount: 6,
  },

  // ── Intelligence Group (~50 tools) ─────────────────────────────────────
  hooks: {
    id: 'hooks',
    displayName: 'Hooks',
    description: 'Lifecycle hooks, intelligence, workers, model routing, session events',
    group: 'intelligence',
    defaultEnabled: false,
    toolCount: 36,
  },
  neural: {
    id: 'neural',
    displayName: 'Neural',
    description: 'SONA training, prediction, pattern matching, compression, optimization',
    group: 'intelligence',
    defaultEnabled: false,
    toolCount: 6,
  },
  embeddings: {
    id: 'embeddings',
    displayName: 'Embeddings',
    description: 'Vector embeddings — generate, search, compare, hyperbolic, neural',
    group: 'intelligence',
    defaultEnabled: false,
    toolCount: 7,
  },
  agentdb: {
    id: 'agentdb',
    displayName: 'AgentDB',
    description: 'AgentDB controllers — pattern store/search, routing, sessions, hierarchy',
    group: 'intelligence',
    defaultEnabled: false,
    toolCount: 15,
  },
  daa: {
    id: 'daa',
    displayName: 'DAA',
    description: 'Dynamic Agent Architecture — adaptive agents, cognitive patterns, workflows',
    group: 'intelligence',
    defaultEnabled: false,
    toolCount: 8,
  },

  // ── Security Group (~18 tools) ─────────────────────────────────────────
  security: {
    id: 'security',
    displayName: 'Security',
    description: 'AI defense scanning, PII detection, safety analysis, learning',
    group: 'security',
    defaultEnabled: false,
    toolCount: 6,
  },
  claims: {
    id: 'claims',
    displayName: 'Claims',
    description: 'Claims-based authorization, handoffs, work stealing, load balancing',
    group: 'security',
    defaultEnabled: false,
    toolCount: 12,
  },

  // ── Advanced Group (~60 tools) ─────────────────────────────────────────
  'hive-mind': {
    id: 'hive-mind',
    displayName: 'Hive Mind',
    description: 'Byzantine consensus, broadcast, join/leave, collective memory',
    group: 'advanced',
    defaultEnabled: false,
    toolCount: 9,
  },
  coordination: {
    id: 'coordination',
    displayName: 'Coordination',
    description: 'Distributed coordination — consensus, sync, topology, load balancing',
    group: 'advanced',
    defaultEnabled: false,
    toolCount: 7,
  },
  browser: {
    id: 'browser',
    displayName: 'Browser',
    description: 'Browser automation — click, fill, navigate, screenshot, evaluate',
    group: 'advanced',
    defaultEnabled: false,
    toolCount: 23,
  },
  terminal: {
    id: 'terminal',
    displayName: 'Terminal',
    description: 'Terminal management — create, execute, list, close, history',
    group: 'advanced',
    defaultEnabled: false,
    toolCount: 5,
  },
  transfer: {
    id: 'transfer',
    displayName: 'Transfer',
    description: 'Plugin store, IPFS resolution, PII detection, plugin discovery',
    group: 'advanced',
    defaultEnabled: false,
    toolCount: 11,
  },
  performance: {
    id: 'performance',
    displayName: 'Performance',
    description: 'Benchmarking, profiling, bottleneck detection, metrics, optimization',
    group: 'advanced',
    defaultEnabled: false,
    toolCount: 6,
  },
  coverage: {
    id: 'coverage',
    displayName: 'Coverage',
    description: 'Test coverage routing, gap analysis, suggestions',
    group: 'advanced',
    defaultEnabled: false,
    toolCount: 3,
  },
} as Record<ToolCategory, CategoryMetadata>;

// ============================================================================
// Profile Definitions
// ============================================================================

/**
 * Pre-configured tool profiles.
 * Each profile enables a specific set of categories.
 */
export const TOOL_PROFILES: Record<ToolProfile, ProfileDefinition> = {
  /**
   * Default profile — core + github categories (~64 tools).
   * Optimized for model tool selection without overwhelming with 215+ tools.
   */
  default: {
    id: 'default',
    displayName: 'Default',
    description: 'Core orchestration + GitHub integration (~64 tools)',
    categories: [
      'agent', 'memory', 'swarm', 'task', 'config',
      'session', 'system', 'progress', 'workflow',
      'github', 'analyze',
    ],
  },

  /**
   * Full profile — all categories enabled (~215 tools).
   */
  full: {
    id: 'full',
    displayName: 'Full',
    description: 'All tool categories enabled (~215 tools)',
    categories: Object.keys(TOOL_CATEGORIES) as ToolCategory[],
  },

  /**
   * Minimal profile — absolute essentials only (~29 tools).
   */
  minimal: {
    id: 'minimal',
    displayName: 'Minimal',
    description: 'Essentials only — agent, memory, swarm, task (~29 tools)',
    categories: ['agent', 'memory', 'swarm', 'task', 'system'],
  },

  /**
   * Development profile — core + intelligence + performance (~130 tools).
   */
  development: {
    id: 'development',
    displayName: 'Development',
    description: 'Core + intelligence + performance tools (~130 tools)',
    categories: [
      'agent', 'memory', 'swarm', 'task', 'config',
      'session', 'system', 'progress', 'workflow',
      'github', 'analyze',
      'hooks', 'neural', 'embeddings', 'agentdb',
      'performance', 'terminal',
    ],
  },

  /**
   * CI profile — core + security + analysis (~85 tools).
   */
  ci: {
    id: 'ci',
    displayName: 'CI',
    description: 'Core + security + analysis for CI/CD pipelines (~85 tools)',
    categories: [
      'agent', 'memory', 'swarm', 'task', 'config',
      'session', 'system', 'progress', 'workflow',
      'github', 'analyze',
      'security', 'claims', 'performance',
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get categories enabled for a given profile.
 */
export function getCategoriesForProfile(profileId: ToolProfile): ToolCategory[] {
  const profile = TOOL_PROFILES[profileId];
  return profile ? profile.categories : TOOL_PROFILES.default.categories;
}

/**
 * Get all categories in a given group.
 */
export function getCategoriesByGroup(group: CategoryGroup): CategoryMetadata[] {
  return Object.values(TOOL_CATEGORIES).filter(cat => cat.group === group);
}

/**
 * Get categories enabled by default.
 */
export function getDefaultCategories(): ToolCategory[] {
  return Object.values(TOOL_CATEGORIES)
    .filter(cat => cat.defaultEnabled)
    .map(cat => cat.id);
}

/**
 * Check if a category is valid.
 */
export function isValidCategory(category: string): category is ToolCategory {
  return category in TOOL_CATEGORIES;
}

/**
 * Get metadata for a specific category.
 */
export function getCategoryMetadata(category: ToolCategory): CategoryMetadata | undefined {
  return TOOL_CATEGORIES[category];
}

/**
 * Get all category groups with their categories.
 */
export function getCategoryGroups(): Record<CategoryGroup, CategoryMetadata[]> {
  const groups: Record<CategoryGroup, CategoryMetadata[]> = {
    core: [],
    github: [],
    intelligence: [],
    security: [],
    advanced: [],
  };

  for (const cat of Object.values(TOOL_CATEGORIES)) {
    groups[cat.group].push(cat);
  }

  return groups;
}

/**
 * Resolve a list of category/group/profile specifiers into a flat category list.
 * Accepts: category names, group names (prefixed with `group:`), profile names (prefixed with `profile:`).
 *
 * @example
 * resolveCategories(['agent', 'group:intelligence', 'profile:ci'])
 */
export function resolveCategories(specifiers: string[]): ToolCategory[] {
  const resolved = new Set<ToolCategory>();

  for (const spec of specifiers) {
    if (spec.startsWith('profile:')) {
      const profileId = spec.slice(8) as ToolProfile;
      const profile = TOOL_PROFILES[profileId];
      if (profile) {
        profile.categories.forEach(c => resolved.add(c));
      }
    } else if (spec.startsWith('group:')) {
      const group = spec.slice(6) as CategoryGroup;
      getCategoriesByGroup(group).forEach(c => resolved.add(c.id));
    } else if (isValidCategory(spec)) {
      resolved.add(spec);
    }
  }

  return Array.from(resolved);
}
