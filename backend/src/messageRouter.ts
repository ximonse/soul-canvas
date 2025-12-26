// Message router - routes WebSocket messages to MCP tools

import type { WSRequest, WSResponse } from './types.js';
import type { ZoteroMCPClient } from './mcpClient.js';
import type { Cache } from './cache.js';

/**
 * Route incoming WebSocket message to appropriate MCP tool
 */
export async function routeMessage(
  request: WSRequest,
  mcpClient: ZoteroMCPClient,
  cache: Cache<any>
): Promise<WSResponse> {
  const { id, type, params = {} } = request;

  try {
    // Handle ping (no MCP call needed)
    if (type === 'ping') {
      return {
        id,
        type: 'success',
        data: { pong: true, timestamp: Date.now() },
      };
    }

    // Generate cache key
    const cacheKey = `${type}:${JSON.stringify(params)}`;

    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Router] Cache hit for ${type}`);
      return {
        id,
        type: 'success',
        data: cachedResult,
      };
    }

    console.log(`[Router] Routing ${type} to MCP...`);

    let result: any;

    switch (type) {
      case 'search': {
        // Search Zotero library
        // Expected params: { query: string, limit?: number }
        result = await mcpClient.callTool('search_library', {
          query: params.query || '',
          limit: params.limit || 50,
        });
        break;
      }

      case 'getAnnotations': {
        // Get annotations for an item
        // Expected params: { itemKey: string }
        result = await mcpClient.callTool('get_annotations', {
          itemKey: params.itemKey,
        });
        break;
      }

      case 'getItemDetails': {
        // Get full item details
        // Expected params: { itemKey: string }
        result = await mcpClient.callTool('get_item', {
          itemKey: params.itemKey,
        });
        break;
      }

      case 'getCollections': {
        // Get all collections/folders
        result = await mcpClient.callTool('list_collections', {});
        break;
      }

      case 'fullTextSearch': {
        // Full-text search in PDFs
        // Expected params: { query: string, limit?: number }
        result = await mcpClient.callTool('search_fulltext', {
          query: params.query || '',
          limit: params.limit || 20,
        });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    // Cache the result (5 min TTL for searches, 10 min for item details)
    const ttl = type.includes('search') ? 5 * 60 * 1000 : 10 * 60 * 1000;
    cache.set(cacheKey, result, ttl);

    return {
      id,
      type: 'success',
      data: result,
    };

  } catch (error) {
    console.error(`[Router] Error handling ${type}:`, error);
    return {
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
