/**
 * Headless Worker Executor
 * Executes background workers via provider-agnostic LLM API calls.
 *
 * ADR-020: Headless Worker Integration Architecture
 * - Uses @claude-flow/providers ILLMProvider interface for LLM calls
 * - Provides request pool for concurrent execution
 * - Builds context from file glob patterns
 * - Supports prompt templates and output parsing
 * - Implements timeout and graceful error handling
 *
 * Key Features:
 * - Request pool with configurable maxConcurrent
 * - Context building from file glob patterns with caching
 * - Prompt template system with context injection
 * - Output parsing (text, json, markdown)
 * - Timeout handling with AbortController
 * - Execution logging for debugging
 * - Event emission for monitoring
 * - Provider/model configurable per-worker and globally
 */

import { EventEmitter } from 'events';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { WorkerType } from './worker-daemon.js';
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMModel,
  LLMProvider as LLMProviderType,
} from '@claude-flow/providers';

// ============================================
// Type Definitions
// ============================================

/**
 * Headless worker types - workers that use Claude Code AI
 */
export type HeadlessWorkerType =
  | 'audit'
  | 'optimize'
  | 'testgaps'
  | 'document'
  | 'ultralearn'
  | 'refactor'
  | 'deepdive'
  | 'predict';

/**
 * Local worker types - workers that run locally without AI
 */
export type LocalWorkerType = 'map' | 'consolidate' | 'benchmark' | 'preload';

/**
 * Model types (logical names mapped to provider-specific model IDs)
 */
export type ModelType = 'sonnet' | 'opus' | 'haiku';

/**
 * Output format for worker results
 */
export type OutputFormat = 'text' | 'json' | 'markdown';

/**
 * Execution mode for workers
 */
export type ExecutionMode = 'local' | 'headless';

/**
 * Worker priority levels
 */
export type WorkerPriority = 'low' | 'normal' | 'high' | 'critical';

// ============================================
// Interfaces
// ============================================

/**
 * Base worker configuration (matching worker-daemon.ts)
 */
export interface WorkerConfig {
  type: WorkerType;
  intervalMs: number;
  priority: WorkerPriority;
  description: string;
  enabled: boolean;
}

/**
 * Headless-specific options
 */
export interface HeadlessOptions {
  /** Prompt template for LLM */
  promptTemplate: string;

  /** Model to use: sonnet, opus, or haiku */
  model?: ModelType;

  /** Maximum tokens for output */
  maxOutputTokens?: number;

  /** Timeout in milliseconds (overrides default) */
  timeoutMs?: number;

  /** File glob patterns to include as context */
  contextPatterns?: string[];

  /** Output parsing format */
  outputFormat?: OutputFormat;

  /** Override provider for this worker (e.g. 'anthropic', 'openai') */
  provider?: LLMProviderType;

  /** Temperature for LLM generation */
  temperature?: number;
}

/**
 * Extended worker configuration with headless options
 */
export interface HeadlessWorkerConfig extends WorkerConfig {
  /** Execution mode: local or headless */
  mode: ExecutionMode;

  /** Headless-specific options (required when mode is 'headless') */
  headless?: HeadlessOptions;
}

/**
 * Executor configuration options
 */
export interface HeadlessExecutorConfig {
  /** Maximum concurrent LLM requests */
  maxConcurrent?: number;

  /** Default timeout in milliseconds */
  defaultTimeoutMs?: number;

  /** Maximum files to include in context */
  maxContextFiles?: number;

  /** Maximum characters per file in context */
  maxCharsPerFile?: number;

  /** Log directory for execution logs */
  logDir?: string;

  /** Whether to cache context between runs */
  cacheContext?: boolean;

  /** Context cache TTL in milliseconds */
  cacheTtlMs?: number;
}

/**
 * Result from headless execution
 */
export interface HeadlessExecutionResult {
  /** Whether execution completed successfully */
  success: boolean;

  /** Raw output from LLM */
  output: string;

  /** Parsed output (if outputFormat is json or markdown) */
  parsedOutput?: unknown;

  /** Execution duration in milliseconds */
  durationMs: number;

  /** Tokens used */
  tokensUsed?: number;

  /** Model used for execution */
  model: string;

  /** Provider used for execution */
  provider: string;

  /** Worker type that was executed */
  workerType: HeadlessWorkerType;

  /** Timestamp of execution */
  timestamp: Date;

  /** Error message if execution failed */
  error?: string;

  /** Execution ID for tracking */
  executionId: string;
}

/**
 * Active request entry
 */
interface PoolEntry {
  abortController: AbortController;
  executionId: string;
  workerType: HeadlessWorkerType;
  startTime: Date;
  timeout: NodeJS.Timeout;
}

/**
 * Pending queue entry
 */
interface QueueEntry {
  workerType: HeadlessWorkerType;
  config?: Partial<HeadlessOptions>;
  resolve: (result: HeadlessExecutionResult) => void;
  reject: (error: Error) => void;
  queuedAt: Date;
}

/**
 * Context cache entry
 */
interface CacheEntry {
  content: string;
  timestamp: number;
  patterns: string[];
}

/**
 * Pool status information
 */
export interface PoolStatus {
  activeCount: number;
  queueLength: number;
  maxConcurrent: number;
  providerAvailable: boolean;
  activeWorkers: Array<{
    executionId: string;
    workerType: HeadlessWorkerType;
    startTime: Date;
    elapsedMs: number;
  }>;
  queuedWorkers: Array<{
    workerType: HeadlessWorkerType;
    queuedAt: Date;
    waitingMs: number;
  }>;
}

// ============================================
// Constants
// ============================================

/**
 * Array of headless worker types for runtime checking
 */
export const HEADLESS_WORKER_TYPES: HeadlessWorkerType[] = [
  'audit',
  'optimize',
  'testgaps',
  'document',
  'ultralearn',
  'refactor',
  'deepdive',
  'predict',
];

/**
 * Array of local worker types
 */
export const LOCAL_WORKER_TYPES: LocalWorkerType[] = [
  'map',
  'consolidate',
  'benchmark',
  'preload',
];

/**
 * Default model ID mapping (provider-specific, configurable)
 */
const DEFAULT_MODEL_IDS: Record<ModelType, LLMModel> = {
  sonnet: 'claude-3-5-sonnet-latest',
  opus: 'claude-3-opus-20240229',
  haiku: 'claude-3-haiku-20240307',
};

/**
 * Default headless worker configurations based on ADR-020
 */
export const HEADLESS_WORKER_CONFIGS: Record<HeadlessWorkerType, HeadlessWorkerConfig> = {
  audit: {
    type: 'audit',
    mode: 'headless',
    intervalMs: 30 * 60 * 1000,
    priority: 'critical',
    description: 'AI-powered security analysis',
    enabled: true,
    headless: {
      promptTemplate: `Analyze this codebase for security vulnerabilities:
- Check for hardcoded secrets (API keys, passwords)
- Identify SQL injection risks
- Find XSS vulnerabilities
- Check for insecure dependencies
- Identify authentication/authorization issues

Provide a JSON report with:
{
  "vulnerabilities": [{ "severity": "high|medium|low", "file": "...", "line": N, "description": "..." }],
  "riskScore": 0-100,
  "recommendations": ["..."]
}`,
      model: 'haiku',
      outputFormat: 'json',
      contextPatterns: ['**/*.ts', '**/*.js', '**/.env*', '**/package.json'],
      timeoutMs: 5 * 60 * 1000,
    },
  },

  optimize: {
    type: 'optimize',
    mode: 'headless',
    intervalMs: 60 * 60 * 1000,
    priority: 'high',
    description: 'AI optimization suggestions',
    enabled: true,
    headless: {
      promptTemplate: `Analyze this codebase for performance optimizations:
- Identify N+1 query patterns
- Find unnecessary re-renders in React
- Suggest caching opportunities
- Identify memory leaks
- Find redundant computations

Provide actionable suggestions with code examples.`,
      model: 'sonnet',
      outputFormat: 'markdown',
      contextPatterns: ['src/**/*.ts', 'src/**/*.tsx'],
      timeoutMs: 10 * 60 * 1000,
    },
  },

  testgaps: {
    type: 'testgaps',
    mode: 'headless',
    intervalMs: 60 * 60 * 1000,
    priority: 'normal',
    description: 'AI test gap analysis',
    enabled: true,
    headless: {
      promptTemplate: `Analyze test coverage and identify gaps:
- Find untested functions and classes
- Identify edge cases not covered
- Suggest new test scenarios
- Check for missing error handling tests
- Identify integration test gaps

For each gap, provide a test skeleton.`,
      model: 'sonnet',
      outputFormat: 'markdown',
      contextPatterns: ['src/**/*.ts', 'tests/**/*.ts', '__tests__/**/*.ts'],
      timeoutMs: 10 * 60 * 1000,
    },
  },

  document: {
    type: 'document',
    mode: 'headless',
    intervalMs: 120 * 60 * 1000,
    priority: 'low',
    description: 'AI documentation generation',
    enabled: false,
    headless: {
      promptTemplate: `Generate documentation for undocumented code:
- Add JSDoc comments to functions
- Create README sections for modules
- Document API endpoints
- Add inline comments for complex logic
- Generate usage examples

Focus on public APIs and exported functions.`,
      model: 'haiku',
      outputFormat: 'markdown',
      contextPatterns: ['src/**/*.ts'],
      timeoutMs: 10 * 60 * 1000,
    },
  },

  ultralearn: {
    type: 'ultralearn',
    mode: 'headless',
    intervalMs: 0, // Manual trigger only
    priority: 'normal',
    description: 'Deep knowledge acquisition',
    enabled: false,
    headless: {
      promptTemplate: `Deeply analyze this codebase to learn:
- Architectural patterns used
- Coding conventions
- Domain-specific terminology
- Common patterns and idioms
- Team preferences

Provide insights as JSON:
{
  "architecture": { "patterns": [...], "style": "..." },
  "conventions": { "naming": "...", "formatting": "..." },
  "domains": ["..."],
  "insights": ["..."]
}`,
      model: 'opus',
      outputFormat: 'json',
      contextPatterns: ['**/*.ts', '**/CLAUDE.md', '**/README.md'],
      timeoutMs: 15 * 60 * 1000,
    },
  },

  refactor: {
    type: 'refactor',
    mode: 'headless',
    intervalMs: 0, // Manual trigger only
    priority: 'normal',
    description: 'AI refactoring suggestions',
    enabled: false,
    headless: {
      promptTemplate: `Suggest refactoring opportunities:
- Identify code duplication
- Suggest better abstractions
- Find opportunities for design patterns
- Identify overly complex functions
- Suggest module reorganization

Provide before/after code examples.`,
      model: 'sonnet',
      outputFormat: 'markdown',
      contextPatterns: ['src/**/*.ts'],
      timeoutMs: 10 * 60 * 1000,
    },
  },

  deepdive: {
    type: 'deepdive',
    mode: 'headless',
    intervalMs: 0, // Manual trigger only
    priority: 'normal',
    description: 'Deep code analysis',
    enabled: false,
    headless: {
      promptTemplate: `Perform deep analysis of this codebase:
- Understand data flow
- Map dependencies
- Identify architectural issues
- Find potential bugs
- Analyze error handling

Provide comprehensive report.`,
      model: 'opus',
      outputFormat: 'markdown',
      contextPatterns: ['src/**/*.ts'],
      timeoutMs: 15 * 60 * 1000,
    },
  },

  predict: {
    type: 'predict',
    mode: 'headless',
    intervalMs: 10 * 60 * 1000,
    priority: 'low',
    description: 'Predictive preloading',
    enabled: false,
    headless: {
      promptTemplate: `Based on recent activity, predict what the developer needs:
- Files likely to be edited next
- Tests that should be run
- Documentation to reference
- Dependencies to check

Provide preload suggestions as JSON:
{
  "filesToPreload": ["..."],
  "testsToRun": ["..."],
  "docsToReference": ["..."],
  "confidence": 0.0-1.0
}`,
      model: 'haiku',
      outputFormat: 'json',
      contextPatterns: ['.claude-flow/metrics/*.json'],
      timeoutMs: 2 * 60 * 1000,
    },
  },
};

/**
 * Local worker configurations
 */
export const LOCAL_WORKER_CONFIGS: Record<LocalWorkerType, HeadlessWorkerConfig> = {
  map: {
    type: 'map',
    mode: 'local',
    intervalMs: 15 * 60 * 1000,
    priority: 'normal',
    description: 'Codebase mapping',
    enabled: true,
  },
  consolidate: {
    type: 'consolidate',
    mode: 'local',
    intervalMs: 30 * 60 * 1000,
    priority: 'low',
    description: 'Memory consolidation',
    enabled: true,
  },
  benchmark: {
    type: 'benchmark',
    mode: 'local',
    intervalMs: 60 * 60 * 1000,
    priority: 'low',
    description: 'Performance benchmarking',
    enabled: false,
  },
  preload: {
    type: 'preload',
    mode: 'local',
    intervalMs: 5 * 60 * 1000,
    priority: 'low',
    description: 'Resource preloading',
    enabled: false,
  },
};

/**
 * Combined worker configurations
 */
export const ALL_WORKER_CONFIGS: HeadlessWorkerConfig[] = [
  ...Object.values(HEADLESS_WORKER_CONFIGS),
  ...Object.values(LOCAL_WORKER_CONFIGS),
];

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a worker type is a headless worker
 */
export function isHeadlessWorker(type: WorkerType): type is HeadlessWorkerType {
  return HEADLESS_WORKER_TYPES.includes(type as HeadlessWorkerType);
}

/**
 * Check if a worker type is a local worker
 */
export function isLocalWorker(type: WorkerType): type is LocalWorkerType {
  return LOCAL_WORKER_TYPES.includes(type as LocalWorkerType);
}

/**
 * Get model ID from model type
 */
export function getModelId(model: ModelType): LLMModel {
  return DEFAULT_MODEL_IDS[model];
}

/**
 * Get worker configuration by type
 */
export function getWorkerConfig(type: WorkerType): HeadlessWorkerConfig | undefined {
  if (isHeadlessWorker(type)) {
    return HEADLESS_WORKER_CONFIGS[type];
  }
  if (isLocalWorker(type)) {
    return LOCAL_WORKER_CONFIGS[type];
  }
  return undefined;
}

// ============================================
// HeadlessWorkerExecutor Class
// ============================================

/**
 * HeadlessWorkerExecutor - Executes workers via provider-agnostic LLM API calls
 *
 * Features:
 * - Request pool with configurable concurrency limit
 * - Pending queue for overflow requests
 * - Context caching with configurable TTL
 * - Execution logging for debugging
 * - Event emission for monitoring
 * - Provider/model configurable per-worker and globally
 */
export class HeadlessWorkerExecutor extends EventEmitter {
  private projectRoot: string;
  private config: Required<HeadlessExecutorConfig>;
  private activeRequests: Map<string, PoolEntry> = new Map();
  private pendingQueue: QueueEntry[] = [];
  private contextCache: Map<string, CacheEntry> = new Map();
  private llmProvider: ILLMProvider | null = null;
  private modelIds: Record<ModelType, LLMModel>;

  constructor(
    projectRoot: string,
    options?: HeadlessExecutorConfig,
    provider?: ILLMProvider,
    modelIds?: Partial<Record<ModelType, LLMModel>>
  ) {
    super();
    this.projectRoot = projectRoot;
    this.llmProvider = provider ?? null;
    this.modelIds = { ...DEFAULT_MODEL_IDS, ...modelIds };

    // Merge with defaults
    this.config = {
      maxConcurrent: options?.maxConcurrent ?? 2,
      defaultTimeoutMs: options?.defaultTimeoutMs ?? 5 * 60 * 1000,
      maxContextFiles: options?.maxContextFiles ?? 20,
      maxCharsPerFile: options?.maxCharsPerFile ?? 5000,
      logDir: options?.logDir ?? join(projectRoot, '.claude-flow', 'logs', 'headless'),
      cacheContext: options?.cacheContext ?? true,
      cacheTtlMs: options?.cacheTtlMs ?? 60000, // 1 minute default
    };

    // Ensure log directory exists
    this.ensureLogDir();
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Set the LLM provider (can be swapped at runtime)
   */
  setProvider(provider: ILLMProvider): void {
    this.llmProvider = provider;
    this.emit('providerChanged', { provider: provider.name });
  }

  /**
   * Get the current LLM provider
   */
  getProvider(): ILLMProvider | null {
    return this.llmProvider;
  }

  /**
   * Set custom model IDs (override defaults)
   */
  setModelIds(modelIds: Partial<Record<ModelType, LLMModel>>): void {
    this.modelIds = { ...this.modelIds, ...modelIds };
  }

  /**
   * Check if an LLM provider is configured and available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.llmProvider) {
      this.emit('status', { available: false, reason: 'No LLM provider configured' });
      return false;
    }

    try {
      const health = await this.llmProvider.healthCheck();
      this.emit('status', { available: health.healthy, provider: this.llmProvider.name });
      return health.healthy;
    } catch {
      this.emit('status', { available: false, provider: this.llmProvider.name });
      return false;
    }
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { name: string; model: string } | null {
    if (!this.llmProvider) return null;
    return {
      name: this.llmProvider.name,
      model: this.llmProvider.config.model,
    };
  }

  /**
   * Execute a headless worker
   */
  async execute(
    workerType: HeadlessWorkerType,
    configOverrides?: Partial<HeadlessOptions>
  ): Promise<HeadlessExecutionResult> {
    const baseConfig = HEADLESS_WORKER_CONFIGS[workerType];
    if (!baseConfig) {
      throw new Error(`Unknown headless worker type: ${workerType}`);
    }

    // Check availability
    const available = await this.isAvailable();
    if (!available) {
      const result = this.createErrorResult(
        workerType,
        'No LLM provider available. Configure a provider via setProvider().'
      );
      this.emit('error', result);
      return result;
    }

    // Check concurrent limit
    if (this.activeRequests.size >= this.config.maxConcurrent) {
      // Queue the request
      return new Promise((resolve, reject) => {
        const entry: QueueEntry = {
          workerType,
          config: configOverrides,
          resolve,
          reject,
          queuedAt: new Date(),
        };
        this.pendingQueue.push(entry);
        this.emit('queued', {
          workerType,
          queuePosition: this.pendingQueue.length,
        });
      });
    }

    // Execute immediately
    return this.executeInternal(workerType, configOverrides);
  }

  /**
   * Get pool status
   */
  getPoolStatus(): PoolStatus {
    const now = Date.now();
    return {
      activeCount: this.activeRequests.size,
      queueLength: this.pendingQueue.length,
      maxConcurrent: this.config.maxConcurrent,
      providerAvailable: this.llmProvider !== null,
      activeWorkers: Array.from(this.activeRequests.values()).map((entry) => ({
        executionId: entry.executionId,
        workerType: entry.workerType,
        startTime: entry.startTime,
        elapsedMs: now - entry.startTime.getTime(),
      })),
      queuedWorkers: this.pendingQueue.map((entry) => ({
        workerType: entry.workerType,
        queuedAt: entry.queuedAt,
        waitingMs: now - entry.queuedAt.getTime(),
      })),
    };
  }

  /**
   * Get number of active executions
   */
  getActiveCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Cancel a running execution
   */
  cancel(executionId: string): boolean {
    const entry = this.activeRequests.get(executionId);
    if (!entry) {
      return false;
    }

    clearTimeout(entry.timeout);
    entry.abortController.abort();
    this.activeRequests.delete(executionId);
    this.emit('cancelled', { executionId });

    // Process next in queue
    this.processQueue();

    return true;
  }

  /**
   * Cancel all running executions
   */
  cancelAll(): number {
    let cancelled = 0;

    // Cancel active requests (convert to array to avoid iterator issues)
    const entries = Array.from(this.activeRequests.entries());
    for (const [executionId, entry] of entries) {
      clearTimeout(entry.timeout);
      entry.abortController.abort();
      this.emit('cancelled', { executionId });
      cancelled++;
    }
    this.activeRequests.clear();

    // Reject pending queue
    for (const entry of this.pendingQueue) {
      entry.reject(new Error('Executor cancelled all executions'));
    }
    this.pendingQueue = [];

    this.emit('allCancelled', { count: cancelled });
    return cancelled;
  }

  /**
   * Clear context cache
   */
  clearContextCache(): void {
    this.contextCache.clear();
    this.emit('cacheClear', {});
  }

  /**
   * Get worker configuration
   */
  getConfig(workerType: HeadlessWorkerType): HeadlessWorkerConfig | undefined {
    return HEADLESS_WORKER_CONFIGS[workerType];
  }

  /**
   * Get all headless worker types
   */
  getHeadlessWorkerTypes(): HeadlessWorkerType[] {
    return [...HEADLESS_WORKER_TYPES];
  }

  /**
   * Get all local worker types
   */
  getLocalWorkerTypes(): LocalWorkerType[] {
    return [...LOCAL_WORKER_TYPES];
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Ensure log directory exists
   */
  private ensureLogDir(): void {
    try {
      if (!existsSync(this.config.logDir)) {
        mkdirSync(this.config.logDir, { recursive: true });
      }
    } catch (error) {
      this.emit('warning', { message: 'Failed to create log directory', error });
    }
  }

  /**
   * Internal execution logic
   */
  private async executeInternal(
    workerType: HeadlessWorkerType,
    configOverrides?: Partial<HeadlessOptions>
  ): Promise<HeadlessExecutionResult> {
    const baseConfig = HEADLESS_WORKER_CONFIGS[workerType];
    const headless = { ...baseConfig.headless!, ...configOverrides };

    const startTime = Date.now();
    const executionId = `${workerType}_${startTime}_${Math.random().toString(36).slice(2, 8)}`;
    const abortController = new AbortController();

    this.emit('start', { executionId, workerType, config: headless });

    // Setup timeout
    const timeoutMs = headless.timeoutMs || this.config.defaultTimeoutMs;
    const timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    // Track in active requests
    const poolEntry: PoolEntry = {
      abortController,
      executionId,
      workerType,
      startTime: new Date(),
      timeout: timeoutHandle,
    };
    this.activeRequests.set(executionId, poolEntry);

    try {
      // Build context from file patterns
      const context = await this.buildContext(headless.contextPatterns || []);

      // Build the full prompt
      const fullPrompt = this.buildPrompt(headless.promptTemplate, context);

      // Log prompt for debugging
      this.logExecution(executionId, 'prompt', fullPrompt);

      // Execute via LLM provider API
      const result = await this.executeLLMRequest(fullPrompt, {
        model: headless.model || 'sonnet',
        timeoutMs,
        maxOutputTokens: headless.maxOutputTokens,
        temperature: headless.temperature,
        executionId,
        workerType,
        abortController,
      });

      // Parse output based on format
      let parsedOutput: unknown;
      if (headless.outputFormat === 'json' && result.output) {
        parsedOutput = this.parseJsonOutput(result.output);
      } else if (headless.outputFormat === 'markdown' && result.output) {
        parsedOutput = this.parseMarkdownOutput(result.output);
      }

      const executionResult: HeadlessExecutionResult = {
        success: result.success,
        output: result.output,
        parsedOutput,
        durationMs: Date.now() - startTime,
        tokensUsed: result.tokensUsed,
        model: this.modelIds[headless.model || 'sonnet'],
        provider: this.llmProvider?.name || 'unknown',
        workerType,
        timestamp: new Date(),
        executionId,
        error: result.error,
      };

      // Log result
      this.logExecution(executionId, 'result', JSON.stringify(executionResult, null, 2));

      this.emit('complete', executionResult);
      return executionResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const executionResult = this.createErrorResult(workerType, errorMessage);
      executionResult.executionId = executionId;
      executionResult.durationMs = Date.now() - startTime;

      this.logExecution(executionId, 'error', errorMessage);
      this.emit('error', executionResult);

      return executionResult;
    } finally {
      clearTimeout(timeoutHandle);
      this.activeRequests.delete(executionId);
      // Process next in queue
      this.processQueue();
    }
  }

  /**
   * Process the pending queue
   */
  private processQueue(): void {
    while (
      this.pendingQueue.length > 0 &&
      this.activeRequests.size < this.config.maxConcurrent
    ) {
      const next = this.pendingQueue.shift();
      if (!next) break;

      this.executeInternal(next.workerType, next.config)
        .then(next.resolve)
        .catch(next.reject);
    }
  }

  /**
   * Build context from file patterns
   */
  private async buildContext(patterns: string[]): Promise<string> {
    if (patterns.length === 0) return '';

    // Check cache
    const cacheKey = patterns.sort().join('|');
    if (this.config.cacheContext) {
      const cached = this.contextCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
        return cached.content;
      }
    }

    // Collect files matching patterns
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = this.simpleGlob(pattern);
      files.push(...matches);
    }

    // Deduplicate and limit
    const uniqueFiles = Array.from(new Set(files)).slice(0, this.config.maxContextFiles);

    // Build context
    const contextParts: string[] = [];
    for (const file of uniqueFiles) {
      try {
        const fullPath = join(this.projectRoot, file);
        if (!existsSync(fullPath)) continue;

        const content = readFileSync(fullPath, 'utf-8');
        const truncated = content.slice(0, this.config.maxCharsPerFile);
        const wasTruncated = content.length > this.config.maxCharsPerFile;

        contextParts.push(
          `--- ${file}${wasTruncated ? ' (truncated)' : ''} ---\n${truncated}`
        );
      } catch {
        // Skip unreadable files
      }
    }

    const contextContent = contextParts.join('\n\n');

    // Cache the result
    if (this.config.cacheContext) {
      this.contextCache.set(cacheKey, {
        content: contextContent,
        timestamp: Date.now(),
        patterns,
      });
    }

    return contextContent;
  }

  /**
   * Simple glob implementation for file matching
   */
  private simpleGlob(pattern: string): string[] {
    const results: string[] = [];

    // Handle simple patterns (no wildcards)
    if (!pattern.includes('*')) {
      const fullPath = join(this.projectRoot, pattern);
      if (existsSync(fullPath)) {
        results.push(pattern);
      }
      return results;
    }

    // Parse pattern parts
    const parts = pattern.split('/');

    const scanDir = (dir: string, remainingParts: string[]): void => {
      if (remainingParts.length === 0) return;
      if (results.length >= 100) return; // Limit results

      try {
        const fullDir = join(this.projectRoot, dir);
        if (!existsSync(fullDir)) return;

        const entries = readdirSync(fullDir, { withFileTypes: true });
        const currentPart = remainingParts[0];
        const isLastPart = remainingParts.length === 1;

        for (const entry of entries) {
          // Skip common non-code directories
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === 'coverage' ||
            entry.name === '.next' ||
            entry.name === '.cache'
          ) {
            continue;
          }

          const entryPath = dir ? `${dir}/${entry.name}` : entry.name;

          if (currentPart === '**') {
            // Recursive glob
            if (entry.isDirectory()) {
              scanDir(entryPath, remainingParts); // Continue with **
              scanDir(entryPath, remainingParts.slice(1)); // Try next part
            } else if (entry.isFile() && remainingParts.length > 1) {
              // Check if file matches next pattern part
              const nextPart = remainingParts[1];
              if (this.matchesPattern(entry.name, nextPart)) {
                results.push(entryPath);
              }
            }
          } else if (this.matchesPattern(entry.name, currentPart)) {
            if (isLastPart && entry.isFile()) {
              results.push(entryPath);
            } else if (!isLastPart && entry.isDirectory()) {
              scanDir(entryPath, remainingParts.slice(1));
            }
          }
        }
      } catch {
        // Skip unreadable directories
      }
    };

    scanDir('', parts);
    return results;
  }

  /**
   * Match filename against a simple pattern
   */
  private matchesPattern(name: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === '**') return true;

    // Handle *.ext patterns
    if (pattern.startsWith('*.')) {
      return name.endsWith(pattern.slice(1));
    }

    // Handle prefix* patterns
    if (pattern.endsWith('*')) {
      return name.startsWith(pattern.slice(0, -1));
    }

    // Handle *suffix patterns
    if (pattern.startsWith('*')) {
      return name.endsWith(pattern.slice(1));
    }

    // Exact match
    return name === pattern;
  }

  /**
   * Build full prompt with context
   */
  private buildPrompt(template: string, context: string): string {
    if (!context) {
      return `${template}

## Instructions

Analyze the codebase and provide your response following the format specified in the task.`;
    }

    return `${template}

## Codebase Context

${context}

## Instructions

Analyze the above codebase context and provide your response following the format specified in the task.`;
  }

  /**
   * Execute an LLM request via the provider API
   */
  private async executeLLMRequest(
    prompt: string,
    options: {
      model: ModelType;
      timeoutMs: number;
      maxOutputTokens?: number;
      temperature?: number;
      executionId: string;
      workerType: HeadlessWorkerType;
      abortController: AbortController;
    }
  ): Promise<{ success: boolean; output: string; tokensUsed?: number; error?: string }> {
    if (!this.llmProvider) {
      return { success: false, output: '', error: 'No LLM provider configured' };
    }

    const request: LLMRequest = {
      messages: [
        {
          role: 'system',
          content: `You are a specialized ${options.workerType} analysis worker. Provide thorough, actionable results.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: this.modelIds[options.model],
      maxTokens: options.maxOutputTokens ?? 4096,
      temperature: options.temperature ?? 0.3,
    };

    try {
      const response: LLMResponse = await this.llmProvider.complete(request);

      // Check if aborted during request
      if (options.abortController.signal.aborted) {
        return {
          success: false,
          output: response.content || '',
          error: `Execution timed out after ${options.timeoutMs}ms`,
        };
      }

      return {
        success: true,
        output: response.content,
        tokensUsed: response.usage?.totalTokens,
      };
    } catch (error) {
      if (options.abortController.signal.aborted) {
        return {
          success: false,
          output: '',
          error: `Execution timed out after ${options.timeoutMs}ms`,
        };
      }
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse JSON output from Claude Code
   */
  private parseJsonOutput(output: string): unknown {
    try {
      // Try to find JSON in code blocks first
      const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1].trim());
      }

      // Try to find any JSON object
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Try direct parse
      return JSON.parse(output.trim());
    } catch {
      return {
        parseError: true,
        rawOutput: output,
      };
    }
  }

  /**
   * Parse markdown output into sections
   */
  private parseMarkdownOutput(output: string): {
    sections: Array<{ title: string; content: string; level: number }>;
    codeBlocks: Array<{ language: string; code: string }>;
  } {
    const sections: Array<{ title: string; content: string; level: number }> = [];
    const codeBlocks: Array<{ language: string; code: string }> = [];

    // Extract code blocks first
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let codeMatch;
    while ((codeMatch = codeBlockRegex.exec(output)) !== null) {
      codeBlocks.push({
        language: codeMatch[1] || 'text',
        code: codeMatch[2].trim(),
      });
    }

    // Parse sections
    const lines = output.split('\n');
    let currentSection: { title: string; content: string; level: number } | null = null;

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headerMatch[2].trim(),
          content: '',
          level: headerMatch[1].length,
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      currentSection.content = currentSection.content.trim();
      sections.push(currentSection);
    }

    return { sections, codeBlocks };
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    workerType: HeadlessWorkerType,
    error: string
  ): HeadlessExecutionResult {
    return {
      success: false,
      output: '',
      durationMs: 0,
      model: 'unknown',
      provider: this.llmProvider?.name || 'unknown',
      workerType,
      timestamp: new Date(),
      executionId: `error_${Date.now()}`,
      error,
    };
  }

  /**
   * Log execution details for debugging
   */
  private logExecution(
    executionId: string,
    type: 'prompt' | 'result' | 'error',
    content: string
  ): void {
    try {
      const timestamp = new Date().toISOString();
      const logFile = join(this.config.logDir, `${executionId}_${type}.log`);
      const logContent = `[${timestamp}] ${type.toUpperCase()}\n${'='.repeat(60)}\n${content}\n`;
      writeFileSync(logFile, logContent);
    } catch {
      // Ignore log write errors
    }
  }
}

// Export default
export default HeadlessWorkerExecutor;
