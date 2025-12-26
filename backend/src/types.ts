// Backend types for Zotero MCP Bridge

/**
 * WebSocket message from browser to backend
 */
export interface WSRequest {
  id: string;           // UUID for request tracking
  type: 'search' | 'getAnnotations' | 'getItemDetails' | 'getCollections' | 'fullTextSearch' | 'ping';
  params?: Record<string, any>;
}

/**
 * WebSocket response from backend to browser
 */
export interface WSResponse {
  id: string;           // Matches request ID
  type: 'success' | 'error';
  data?: any;
  error?: string;
}

/**
 * Zotero item metadata
 */
export interface ZoteroItem {
  key: string;          // Zotero item key
  title: string;
  creators?: Array<{ firstName?: string; lastName?: string; name?: string }>;
  date?: string;        // Publication date
  abstractNote?: string;
  itemType?: string;    // article, book, etc.
  tags?: Array<{ tag: string }>;
  collections?: string[];
  attachments?: ZoteroAttachment[];
}

/**
 * Zotero attachment (PDF, etc.)
 */
export interface ZoteroAttachment {
  key: string;
  title: string;
  path?: string;        // Local file path
  url?: string;         // zotero:// URL
  mimeType?: string;
}

/**
 * Zotero annotation (highlight, note, etc.)
 */
export interface ZoteroAnnotation {
  key: string;
  annotationText?: string;      // Highlighted text
  annotationComment?: string;   // User comment
  annotationColor?: string;     // Highlight color
  annotationPageLabel?: string; // Page number
  annotationType?: 'highlight' | 'note' | 'image';
}

/**
 * Cache entry with TTL
 */
export interface CacheEntry<T> {
  data: T;
  expiry: number;       // Timestamp when entry expires
}
