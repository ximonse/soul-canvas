// WebSocket + Express server for Soul Canvas Zotero Bridge

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { ZoteroMCPClient } from './mcpClient.js';
import { Cache } from './cache.js';
import { routeMessage } from './messageRouter.js';
import type { WSRequest, WSResponse } from './types.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean cache every 5 minutes

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Initialize MCP client and cache
const mcpClient = new ZoteroMCPClient();
const cache = new Cache<any>();

// Track connected clients
const clients = new Set<WebSocket>();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const mcpStatus = mcpClient.getStatus();
  const cacheStats = cache.stats();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mcp: mcpStatus,
    cache: cacheStats,
    clients: clients.size,
  });
});

/**
 * Cache stats endpoint
 */
app.get('/cache/stats', (req, res) => {
  res.json(cache.stats());
});

/**
 * Clear cache endpoint
 */
app.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({ status: 'ok', message: 'Cache cleared' });
});

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] Client connected');
  clients.add(ws);

  // Send connection confirmation
  const confirmMessage: WSResponse = {
    id: 'connection',
    type: 'success',
    data: { connected: true, timestamp: Date.now() },
  };
  ws.send(JSON.stringify(confirmMessage));

  /**
   * Handle incoming messages
   */
  ws.on('message', async (data: Buffer) => {
    try {
      const request: WSRequest = JSON.parse(data.toString());
      console.log(`[WS] Received: ${request.type} (id: ${request.id})`);

      // Route message to MCP
      const response = await routeMessage(request, mcpClient, cache);

      // Send response back to client
      ws.send(JSON.stringify(response));
      console.log(`[WS] Sent response for ${request.type}`);

    } catch (error) {
      console.error('[WS] Error handling message:', error);

      const errorResponse: WSResponse = {
        id: 'unknown',
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to process message',
      };

      ws.send(JSON.stringify(errorResponse));
    }
  });

  /**
   * Handle client disconnect
   */
  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    clients.delete(ws);
  });

  /**
   * Handle WebSocket errors
   */
  ws.on('error', (error) => {
    console.error('[WS] WebSocket error:', error);
    clients.delete(ws);
  });
});

/**
 * Broadcast message to all connected clients
 */
function broadcast(message: WSResponse): void {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Initialize server
 */
async function start() {
  try {
    console.log('[Server] Starting Soul Canvas Zotero Bridge...');

    // Connect to Zotero MCP server
    await mcpClient.connect();

    // Start periodic cache cleanup
    setInterval(() => {
      console.log('[Cache] Running cleanup...');
      cache.cleanup();
    }, CACHE_CLEANUP_INTERVAL);

    // Start HTTP + WebSocket server
    server.listen(PORT, () => {
      console.log(`[Server] HTTP server listening on http://localhost:${PORT}`);
      console.log(`[Server] WebSocket server listening on ws://localhost:${PORT}`);
      console.log('[Server] Ready for connections!');
    });

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('[Server] Shutting down...');

  // Close all WebSocket connections
  clients.forEach((client) => {
    client.close();
  });

  // Disconnect MCP client
  await mcpClient.disconnect();

  // Close HTTP server
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
start();
