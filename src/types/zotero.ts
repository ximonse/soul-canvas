// Zotero types for frontend

/**
 * Zotero item from MCP server
 */
export interface ZoteroItem {
  key: string;
  title: string;
  creators?: Array<{
    firstName?: string;
    lastName?: string;
    name?: string;
    creatorType?: string;
  }>;
  date?: string;
  abstractNote?: string;
  itemType?: string;
  tags?: Array<{ tag: string }>;
  collections?: string[];
  url?: string;
}

/**
 * Zotero annotation (highlight, note)
 */
export interface ZoteroAnnotation {
  key: string;
  annotationText?: string;
  annotationComment?: string;
  annotationColor?: string;
  annotationPageLabel?: string;
  annotationType?: 'highlight' | 'note' | 'image';
  parentItem?: string;
}

/**
 * Zotero collection/folder
 */
export interface ZoteroCollection {
  key: string;
  name: string;
  parentCollection?: string;
}

/**
 * WebSocket message types
 */
export type ZoteroMessageType =
  | 'ping'
  | 'search'
  | 'fullTextSearch'
  | 'getAnnotations'
  | 'getItemDetails'
  | 'getCollections';

/**
 * WebSocket request
 */
export interface ZoteroRequest {
  id: string;
  type: ZoteroMessageType;
  params?: Record<string, any>;
}

/**
 * WebSocket response
 */
export interface ZoteroResponse {
  id: string;
  type: 'success' | 'error';
  data?: any;
  error?: string;
}

/**
 * Connection status
 */
export type ZoteroConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
