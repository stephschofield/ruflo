/**
 * MCP Tools Index for CLI
 *
 * Re-exports all tool definitions for use within the CLI package.
 */

export type { MCPTool, MCPToolInputSchema, MCPToolResult } from './types.js';
export { agentTools } from './agent-tools.js';
export { swarmTools } from './swarm-tools.js';
export { memoryTools } from './memory-tools.js';
export { configTools } from './config-tools.js';
export { hooksTools } from './hooks-tools.js';
export { taskTools } from './task-tools.js';
export { sessionTools } from './session-tools.js';
export { hiveMindTools } from './hive-mind-tools.js';
export { workflowTools } from './workflow-tools.js';
export { coverageRouterTools } from '../ruvector/coverage-tools.js';
export { analyzeTools } from './analyze-tools.js';
export { progressTools } from './progress-tools.js';
export { transferTools } from './transfer-tools.js';
export { securityTools } from './security-tools.js';
export { embeddingsTools } from './embeddings-tools.js';
export { claimsTools } from './claims-tools.js';
export { dashboardTools } from './dashboard-tools.js';

// Tool categorization & profiles (Phase 4)
export {
  type ToolCategory,
  type ToolProfileName,
  type ToolProfile,
  type CategoryInfo,
  CATEGORY_INFO,
  TOOL_PROFILES,
  resolveProfileName,
  getProfileCategories,
  isCategoryAllowed,
  listProfileCategories,
  estimateProfileToolCount,
} from './tool-categories.js';
