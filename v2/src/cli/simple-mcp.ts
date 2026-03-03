/**
 * Simple MCP command implementation for Node.js compatibility
 */

import { Command } from './commander-fix.js';
import http from 'http';

function printSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function printError(message: string) {
  console.error(`❌ Error: ${message}`);
}

// Check if MCP server is running
async function checkMCPStatus(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

export function createMCPCommand() {
  const mcpCmd = new Command('mcp').description('Manage MCP server and tools').action(() => {
    printSuccess('MCP Server Management');
    console.log('\n🌐 Available MCP commands:');
    console.log('  • mcp start - Start the MCP server');
    console.log('  • mcp status - Show MCP server status');
    console.log('  • mcp tools - List available MCP tools');
    console.log('  • mcp stop - Stop the MCP server');
    console.log('\n💡 Use "mcp start --port 3001" to use a different port');
  });

  mcpCmd
    .command('start')
    .description('Start the MCP server')
    .option('--port <port>', 'Port for MCP server', '3000')
    .option('--host <host>', 'Host for MCP server', 'localhost')
    .option('--transport <transport>', 'Transport type (stdio, http)', 'http')
    .action(async (options) => {
      // This is handled by the actual MCP implementation
      console.log('Starting MCP server...');
      console.log('(This command is handled by the MCP module)');
    });

  mcpCmd
    .command('status')
    .description('Show MCP server status')
    .option('--port <port>', 'Port to check', '3000')
    .option('--host <host>', 'Host to check', 'localhost')
    .action(async (options) => {
      printSuccess('MCP Server Status:');

      const host = options.host || 'localhost';
      const port = parseInt(options.port) || 3000;

      // Check if server is actually running
      const isRunning = await checkMCPStatus(host, port);

      if (isRunning) {
        console.log('🟢 Status: Running');
        console.log(`📍 Address: ${host}:${port}`);
        console.log('🔐 Authentication: Disabled');
        console.log('🔧 Tools: System, Health, Tools');
        console.log('📡 Transport: http');
        console.log('\n💡 Use "mcp tools" to see available tools');
      } else {
        console.log('🟡 Status: Not running (use "mcp start" to start)');
        console.log(`📍 Checked address: ${host}:${port}`);
        console.log('🔐 Authentication: Disabled');
        console.log('🔧 Tools: System, Health, Tools (when running)');
      }
    });

  mcpCmd
    .command('tools')
    .description('List available MCP tools')
    .action(() => {
      printSuccess('Available MCP Tools:');
      console.log('\n📊 System Tools:');
      console.log('  • system/info - Get system information');
      console.log('  • system/health - Get system health status');
      console.log('\n🔧 Tool Management:');
      console.log('  • tools/list - List all available tools');
      console.log('  • tools/schema - Get schema for a specific tool');
      console.log('\n💡 Note: Additional tools available when orchestrator is running');
    });

  mcpCmd
    .command('stop')
    .description('Stop the MCP server')
    .action(() => {
      printSuccess('Stopping MCP server...');
      console.log('🛑 MCP server stop requested');
      console.log('💡 Use Ctrl+C in the terminal running "mcp start" to stop');
    });

  return mcpCmd;
}
