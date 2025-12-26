// In-memory cache with TTL (Time To Live)

import type { CacheEntry } from './types.js';

/**
 * Simple in-memory cache with expiration
 */
export class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  /**
   * @param defaultTTL - Default time to live in milliseconds (default: 5 minutes)
   */
  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set a cache entry
   */
  set(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Get a cache entry (returns undefined if expired or not found)
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries (called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    this.cleanup(); // Clean before stats
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
