/**
 * Dashboard MCP Tools for CLI
 *
 * Rich dashboard tool that aggregates swarm status, agent metrics,
 * memory usage, and system health into a single comprehensive view.
 *
 * Phase 4 — Task 4.3: MCP App for swarm status
 * Replaces `.claude/helpers/statusline.cjs` with an MCP-native dashboard.
 *
 * @module @claude-flow/cli/mcp-tools/dashboard-tools
 */

import type { MCPTool } from './types.js';
import { existsSync, readFileSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as os from 'node:os';

// ─── Shared data helpers ────────────────────────────────────────────

const STORAGE_DIR = '.claude-flow';

function readJSON(filePath: string): unknown | null {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

interface SystemMetrics {
  startTime: string;
  health: number;
  cpu: number;
  memory: { used: number; total: number };
  agents: { active: number; total: number };
  tasks: { pending: number; completed: number; failed: number };
}

function loadSystemMetrics(): SystemMetrics {
  const metricsPath = join(process.cwd(), STORAGE_DIR, 'system', 'metrics.json');
  try {
    if (existsSync(metricsPath)) {
      return JSON.parse(readFileSync(metricsPath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {
    startTime: new Date().toISOString(),
    health: 1.0,
    cpu: 0,
    memory: { used: 0, total: os.totalmem() },
    agents: { active: 0, total: 0 },
    tasks: { pending: 0, completed: 0, failed: 0 },
  };
}

interface AgentRecord {
  agentId: string;
  agentType: string;
  status: string;
  health: number;
  taskCount: number;
  createdAt: string;
  domain?: string;
}

interface AgentStore {
  agents: Record<string, AgentRecord>;
}

function loadAgentStore(): AgentStore {
  const storePath = join(process.cwd(), STORAGE_DIR, 'agents', 'store.json');
  try {
    if (existsSync(storePath)) {
      return JSON.parse(readFileSync(storePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { agents: {} };
}

interface SwarmState {
  swarmId?: string;
  topology?: string;
  status?: string;
  maxAgents?: number;
  startedAt?: string;
}

function loadSwarmState(): SwarmState {
  const paths = [
    join(process.cwd(), STORAGE_DIR, 'swarm', 'state.json'),
    join(process.cwd(), STORAGE_DIR, 'swarm', 'current.json'),
  ];
  for (const p of paths) {
    const data = readJSON(p) as SwarmState | null;
    if (data) return data;
  }
  return {};
}

function getMemoryDbSize(): { sizeBytes: number; sizeFormatted: string } | null {
  const paths = [
    join(process.cwd(), '.swarm', 'memory.db'),
    join(process.cwd(), STORAGE_DIR, 'memory.db'),
    join(process.cwd(), '.agentdb', 'memory.db'),
    join(process.cwd(), 'data', 'memory.db'),
  ];
  for (const p of paths) {
    try {
      const stat = statSync(p);
      const bytes = stat.size;
      const formatted = bytes < 1024 ? `${bytes} B`
        : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1048576).toFixed(1)} MB`;
      return { sizeBytes: bytes, sizeFormatted: formatted };
    } catch { /* not found */ }
  }
  return null;
}

function getSessionCount(): number {
  const sessionDirs = [
    join(process.cwd(), STORAGE_DIR, 'sessions'),
    join(process.cwd(), '.claude', 'sessions'),
  ];
  for (const dir of sessionDirs) {
    try {
      if (existsSync(dir)) {
        return readdirSync(dir).filter(f => f.endsWith('.json')).length;
      }
    } catch { /* ignore */ }
  }
  return 0;
}

function getHookCount(): number {
  const hookDirs = [
    join(process.cwd(), '.github', 'hooks'),
    join(process.cwd(), STORAGE_DIR, 'hooks'),
  ];
  for (const dir of hookDirs) {
    try {
      if (existsSync(dir)) {
        return readdirSync(dir).filter(f => f.endsWith('.json')).length;
      }
    } catch { /* ignore */ }
  }
  return 0;
}

function healthIcon(health: number): string {
  if (health >= 0.9) return 'healthy';
  if (health >= 0.7) return 'good';
  if (health >= 0.5) return 'degraded';
  return 'unhealthy';
}

function statusLabel(status: string): string {
  switch (status) {
    case 'running': return 'Running';
    case 'idle': return 'Idle';
    case 'active': return 'Active';
    case 'busy': return 'Busy';
    case 'terminated': return 'Terminated';
    case 'error': return 'Error';
    default: return status || 'Unknown';
  }
}

// ─── Dashboard Tool ─────────────────────────────────────────────────

export const dashboardTools: MCPTool[] = [
  {
    name: 'dashboard_status',
    description: 'Get a comprehensive dashboard showing swarm status, agent metrics, memory usage, and system health in a single view. Use this instead of calling swarm_status, agent_list, and memory_stats separately.',
    category: 'dashboard',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sections: {
          type: 'array',
          items: { type: 'string', enum: ['swarm', 'agents', 'memory', 'system', 'tasks'] },
          description: 'Sections to include (default: all). Options: swarm, agents, memory, system, tasks',
        },
        format: {
          type: 'string',
          enum: ['full', 'compact'],
          description: 'Output format: "full" (default) includes markdown summary, "compact" returns data only',
        },
      },
    },
    handler: async (input) => {
      const sections = (input.sections as string[] | undefined) ?? ['swarm', 'agents', 'memory', 'system', 'tasks'];
      const format = (input.format as string | undefined) ?? 'full';

      const metrics = loadSystemMetrics();
      const uptime = Date.now() - new Date(metrics.startTime).getTime();

      const data: Record<string, unknown> = {};
      const lines: string[] = [];

      // ── Swarm Section ──
      if (sections.includes('swarm')) {
        const swarm = loadSwarmState();
        const swarmData = {
          swarmId: swarm.swarmId || null,
          topology: swarm.topology || 'none',
          status: swarm.status || 'inactive',
          maxAgents: swarm.maxAgents || 0,
          startedAt: swarm.startedAt || null,
        };
        data.swarm = swarmData;

        if (format === 'full') {
          lines.push('## Swarm');
          if (swarmData.swarmId) {
            lines.push(`- **Status:** ${statusLabel(swarmData.status)}`);
            lines.push(`- **Topology:** ${swarmData.topology}`);
            lines.push(`- **Max Agents:** ${swarmData.maxAgents}`);
            lines.push(`- **Swarm ID:** ${swarmData.swarmId}`);
          } else {
            lines.push('- **Status:** No active swarm');
          }
          lines.push('');
        }
      }

      // ── Agents Section ──
      if (sections.includes('agents')) {
        const store = loadAgentStore();
        const allAgents = Object.values(store.agents);
        const active = allAgents.filter(a => a.status === 'active' || a.status === 'running' || a.status === 'busy');
        const idle = allAgents.filter(a => a.status === 'idle');
        const terminated = allAgents.filter(a => a.status === 'terminated');
        const totalTasks = allAgents.reduce((sum, a) => sum + (a.taskCount || 0), 0);
        const avgHealth = active.length > 0
          ? active.reduce((sum, a) => sum + (a.health || 0), 0) / active.length
          : 0;

        // Group by type
        const byType: Record<string, number> = {};
        for (const a of allAgents.filter(a => a.status !== 'terminated')) {
          byType[a.agentType] = (byType[a.agentType] || 0) + 1;
        }

        const agentData = {
          total: allAgents.length - terminated.length,
          active: active.length,
          idle: idle.length,
          terminated: terminated.length,
          totalTasksCompleted: totalTasks,
          averageHealth: Math.round(avgHealth * 100) / 100,
          healthStatus: healthIcon(avgHealth),
          byType,
          agents: allAgents
            .filter(a => a.status !== 'terminated')
            .map(a => ({
              id: a.agentId,
              type: a.agentType,
              status: a.status,
              health: a.health,
              tasks: a.taskCount,
            })),
        };
        data.agents = agentData;

        if (format === 'full') {
          lines.push('## Agents');
          lines.push(`- **Active:** ${agentData.active}  |  **Idle:** ${agentData.idle}  |  **Total:** ${agentData.total}`);
          if (agentData.active > 0) {
            lines.push(`- **Average Health:** ${(agentData.averageHealth * 100).toFixed(0)}% (${agentData.healthStatus})`);
          }
          lines.push(`- **Tasks Completed:** ${agentData.totalTasksCompleted}`);
          if (Object.keys(byType).length > 0) {
            lines.push(`- **By Type:** ${Object.entries(byType).map(([t, c]) => `${t} (${c})`).join(', ')}`);
          }
          if (agentData.agents.length > 0) {
            lines.push('');
            lines.push('| Agent | Type | Status | Health | Tasks |');
            lines.push('|-------|------|--------|--------|-------|');
            for (const a of agentData.agents) {
              lines.push(`| ${a.id} | ${a.type} | ${statusLabel(a.status)} | ${((a.health || 0) * 100).toFixed(0)}% | ${a.tasks} |`);
            }
          }
          lines.push('');
        }
      }

      // ── Memory Section ──
      if (sections.includes('memory')) {
        const dbSize = getMemoryDbSize();
        const sessionCount = getSessionCount();

        // Try to get namespace stats from memory store
        const memoryStorePath = join(process.cwd(), STORAGE_DIR, 'memory', 'namespaces.json');
        const nsData = readJSON(memoryStorePath) as Record<string, number> | null;

        const memoryData: Record<string, unknown> = {
          backend: 'sql.js + HNSW',
          database: dbSize ? { size: dbSize.sizeFormatted, bytes: dbSize.sizeBytes } : null,
          sessions: sessionCount,
          namespaces: nsData || {},
        };
        data.memory = memoryData;

        if (format === 'full') {
          lines.push('## Memory');
          lines.push(`- **Backend:** sql.js + HNSW vector search`);
          if (dbSize) {
            lines.push(`- **Database Size:** ${dbSize.sizeFormatted}`);
          } else {
            lines.push('- **Database:** Not initialized');
          }
          lines.push(`- **Sessions:** ${sessionCount}`);
          if (nsData && Object.keys(nsData).length > 0) {
            lines.push(`- **Namespaces:** ${Object.entries(nsData).map(([ns, count]) => `${ns} (${count})`).join(', ')}`);
          }
          lines.push('');
        }
      }

      // ── Tasks Section ──
      if (sections.includes('tasks')) {
        const taskStorePath = join(process.cwd(), STORAGE_DIR, 'tasks', 'store.json');
        const tasksRaw = readJSON(taskStorePath) as { tasks?: Record<string, { status: string }> } | null;
        const tasks = tasksRaw?.tasks ? Object.values(tasksRaw.tasks) : [];

        const pending = tasks.filter(t => t.status === 'pending' || t.status === 'created').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress' || t.status === 'running').length;
        const completed = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
        const failed = tasks.filter(t => t.status === 'failed' || t.status === 'error').length;

        const taskData = {
          total: tasks.length,
          pending,
          inProgress,
          completed,
          failed,
        };
        data.tasks = taskData;

        if (format === 'full') {
          lines.push('## Tasks');
          lines.push(`- **Pending:** ${pending}  |  **In Progress:** ${inProgress}  |  **Completed:** ${completed}  |  **Failed:** ${failed}`);
          lines.push(`- **Total:** ${tasks.length}`);
          lines.push('');
        }
      }

      // ── System Section ──
      if (sections.includes('system')) {
        const mem = process.memoryUsage();
        const systemData = {
          status: metrics.health >= 0.8 ? 'healthy' : metrics.health >= 0.5 ? 'degraded' : 'unhealthy',
          health: Math.round(metrics.health * 100) / 100,
          uptime: `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`,
          hooks: getHookCount(),
          process: {
            heapUsed: `${(mem.heapUsed / 1048576).toFixed(1)} MB`,
            heapTotal: `${(mem.heapTotal / 1048576).toFixed(1)} MB`,
            rss: `${(mem.rss / 1048576).toFixed(1)} MB`,
          },
          platform: {
            os: `${os.type()} ${os.release()}`,
            node: process.version,
            arch: os.arch(),
          },
          version: '3.5.0',
        };
        data.system = systemData;

        if (format === 'full') {
          lines.push('## System');
          lines.push(`- **Status:** ${systemData.status} (${(systemData.health * 100).toFixed(0)}%)`);
          lines.push(`- **Uptime:** ${systemData.uptime}`);
          lines.push(`- **Version:** Ruflo ${systemData.version}`);
          lines.push(`- **Hooks:** ${systemData.hooks} registered`);
          lines.push(`- **Memory:** ${systemData.process.heapUsed} / ${systemData.process.heapTotal} heap, ${systemData.process.rss} RSS`);
          lines.push(`- **Platform:** ${systemData.platform.os}, Node ${systemData.platform.node}`);
          lines.push('');
        }
      }

      const result: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        data,
      };

      if (format === 'full') {
        result.summary = lines.join('\n');
      }

      return result;
    },
  },
];
