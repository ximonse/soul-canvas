// WebSocket client for Zotero backend bridge

import type {
  ZoteroRequest,
  ZoteroResponse,
  ZoteroMessageType,
} from '../types/zotero';

// Generate UUID using native crypto API
const generateUUID = (): string => {
  return crypto.randomUUID();
};

export class ZoteroClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pendingRequests = new Map<string, {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
  }>();
  private messageQueue: ZoteroRequest[] = [];

  // Callbacks
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[ZoteroClient] Connected to backend');
          this.reconnectAttempts = 0;
          this.onConnect?.();

          // Send queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message && this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify(message));
            }
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const response: ZoteroResponse = JSON.parse(event.data);
            this.handleMessage(response);
          } catch (error) {
            console.error('[ZoteroClient] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[ZoteroClient] WebSocket error:', event);
          const error = new Error('WebSocket connection error');
          this.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[ZoteroClient] Disconnected from backend');
          this.ws = null;
          this.onDisconnect?.();
          this.attemptReconnect();
        };

      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to connect');
        reject(err);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Disconnected'));
    });
    this.pendingRequests.clear();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ZoteroClient] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      10000
    );

    console.log(`[ZoteroClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[ZoteroClient] Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(response: ZoteroResponse): void {
    const { id, type, data, error } = response;

    const pending = this.pendingRequests.get(id);
    if (!pending) {
      console.warn('[ZoteroClient] Received response for unknown request:', id);
      return;
    }

    this.pendingRequests.delete(id);

    if (type === 'success') {
      pending.resolve(data);
    } else {
      pending.reject(new Error(error || 'Unknown error'));
    }
  }

  /**
   * Send a request to the backend
   */
  async sendRequest(
    type: ZoteroMessageType,
    params?: Record<string, any>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = generateUUID();
      const request: ZoteroRequest = { id, type, params };

      // Store pending request
      this.pendingRequests.set(id, { resolve, reject });

      // Send immediately if connected, otherwise queue
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(request));
      } else {
        console.warn('[ZoteroClient] Not connected, queuing message');
        this.messageQueue.push(request);

        // Try to connect if not already attempting
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.connect().catch(reject);
        }
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
