import { CacheEntry, CacheOptions } from "./types";

/**
 * Cache entry
 */
class Cache<T> {
  private entries: Map<string, CacheEntry<T>> = new Map();
  private defaultTtl: number | null;

  constructor(options?: CacheOptions) {
    this.defaultTtl = options?.defaultTtl ?? null;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time-to-live in milliseconds (overrides default TTL, null for no expiration)
   */
  set(key: string, value: T, ttl?: number | null): void {
    const resolvedTtl = ttl !== undefined ? ttl : this.defaultTtl;
    const expiresAt = resolvedTtl !== null ? Date.now() + resolvedTtl : null;
    this.entries.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Delete a specific key from the cache
   * @param key Cache key to delete
   */
  delete(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Invalidate entries matching a predicate function
   * @param predicate Function that returns true for entries to invalidate
   */
  invalidateMatching(predicate: (key: string, value: T) => boolean): void {
    this.entries.forEach((entry, key) => {
      if (predicate(key, entry.value)) {
        this.entries.delete(key);
      }
    });
  }

  /**
   * Remove all expired entries from the cache
   */
  cleanupExpired(): void {
    const now = Date.now();
    this.entries.forEach((entry, key) => {
      if (entry.expiresAt !== null && entry.expiresAt < now) {
        this.entries.delete(key);
      }
    });
  }

  /**
   * Get the number of entries in the cache
   */
  get size(): number {
    return this.entries.size;
  }
}

// Cache
const cache = new Cache<any>({ defaultTtl: parseInt(process.env.CACHE_TTL as string) || 10000 * 6 });

export { Cache, cache };