// MCP Client for Zotero - stdio transport to zotero-mcp server

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

export class ZoteroMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  /**
   * Initialize MCP connection to zotero-mcp server
   */
  async connect(): Promise<void> {
    try {
      console.log('[MCP] Starting zotero-mcp server...');

      // Create stdio transport (MCP SDK will spawn the process)
      // On Windows, use node to run the MCP server directly
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'node' : 'zotero-mcp-server';
      const args = isWindows
        ? [path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'zotero-mcp', 'build', 'index.js')]
        : [];

      console.log(`[MCP] Command: ${command} ${args.join(' ')}`);

      this.transport = new StdioClientTransport({
        command,
        args,
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'soul-canvas-zotero-bridge',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect client to transport (this will spawn the process)
      await this.client.connect(this.transport);

      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log('[MCP] Connected to zotero-mcp server');

    } catch (error) {
      console.error('[MCP] Connection error:', error);
      throw error;
    }
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private async handleDisconnect(): Promise<void> {
    this.isConnected = false;
    this.client = null;
    this.transport = null;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      console.log(`[MCP] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[MCP] Reconnect failed:', error);
        });
      }, delay);
    } else {
      console.error('[MCP] Max reconnect attempts reached. Manual restart required.');
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      return result;
    } catch (error) {
      console.error(`[MCP] Tool call failed (${toolName}):`, error);
      throw error;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.listTools();
      return result.tools || [];
    } catch (error) {
      console.error('[MCP] Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;

    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }

    console.log('[MCP] Disconnected');
  }
}
