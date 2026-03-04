/**
 * Mock for @claude-flow/codex package.
 * The codex package dist/ is not built in development; this stub
 * lets vite resolve the import so CLI tests can run.
 */
export class CodexInitializer {
  async initialize() {
    return { success: true };
  }
}

export default { CodexInitializer };
