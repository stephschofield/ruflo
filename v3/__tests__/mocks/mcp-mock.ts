/**
 * Mock for @claude-flow/mcp package.
 * The MCP package dist/ is not built in development; this stub
 * lets vite resolve the import so CLI tests can run.
 */
export function createMCPServer() {
  return {
    start: async () => {},
    stop: async () => {},
    on: () => {},
    emit: () => {},
  };
}

export default { createMCPServer };
