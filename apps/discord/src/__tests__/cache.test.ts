import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache } from '../cache';

describe('Cache Layer - Unit Tests', () => {
  let cache: Cache<any>;

  beforeEach(() => {
    cache = new Cache();
  });

  describe('set and get operations', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should store and retrieve complex objects', () => {
      const obj = { id: 1, name: 'test', nested: { value: 42 } };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');
    });

    it('should handle multiple keys independently', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('TTL expiration behavior', () => {
    it('should return value before TTL expires', () => {
      cache.set('key', 'value', 1000); // 1 second TTL
      expect(cache.get('key')).toBe('value');
    });

    it('should return undefined after TTL expires', async () => {
      cache.set('key', 'value', 50); // 50ms TTL
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      expect(cache.get('key')).toBeUndefined();
    });

    it('should delete expired entry on access', async () => {
      cache.set('key', 'value', 50);
      expect(cache.size).toBe(1);
      await new Promise(resolve => setTimeout(resolve, 100));
      cache.get('key'); // This should trigger deletion
      expect(cache.size).toBe(0);
    });

    it('should handle null TTL as no expiration', async () => {
      cache.set('key', 'value', null);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('key')).toBe('value');
    });

    it('should use default TTL when not specified', () => {
      const cacheWithDefault = new Cache({ defaultTtl: 1000 });
      cacheWithDefault.set('key', 'value');
      expect(cacheWithDefault.get('key')).toBe('value');
    });

    it('should override default TTL with explicit TTL', async () => {
      const cacheWithDefault = new Cache({ defaultTtl: 10000 });
      cacheWithDefault.set('key', 'value', 50); // Override with 50ms
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cacheWithDefault.get('key')).toBeUndefined();
    });
  });

  describe('cache key formats', () => {
    it('should handle server ID as cache key', () => {
      const serverId = '123456789';
      const serverData = { serverId, name: 'Test Server', status: 'active' };
      cache.set(serverId, { servers: serverData });
      expect(cache.get(serverId)).toEqual({ servers: serverData });
    });

    it('should handle patterns grouped by server ID', () => {
      const serverId = '123456789';
      const patterns = [
        { serverId, regexPattern: '/test/', webhookName: 'webhook1' },
        { serverId, regexPattern: '/hello/', webhookName: 'webhook2' }
      ];
      cache.set(serverId, { patterns });
      expect(cache.get(serverId)).toEqual({ patterns });
    });

    it('should handle webhooks grouped by server ID', () => {
      const serverId = '123456789';
      const webhooks = [
        { name: 'webhook1', url: 'https://example.com/1', serverId },
        { name: 'webhook2', url: 'https://example.com/2', serverId }
      ];
      cache.set(serverId, { webhooks });
      expect(cache.get(serverId)).toEqual({ webhooks });
    });
  });

  describe('deletion', () => {
    it('should delete a specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should handle deletion of non-existent key', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });
  });

  describe('additional cache operations', () => {
    it('should invalidate entries matching predicate', () => {
      cache.set('server:1', { id: 1, name: 'Server 1' });
      cache.set('server:2', { id: 2, name: 'Server 2' });
      cache.set('user:1', { id: 1, name: 'User 1' });
      
      cache.invalidateMatching((key) => key.startsWith('server:'));
      
      expect(cache.get('server:1')).toBeUndefined();
      expect(cache.get('server:2')).toBeUndefined();
      expect(cache.get('user:1')).toBeDefined();
    });

    it('should cleanup expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 50);
      cache.set('key3', 'value3', null);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      cache.cleanupExpired();
      
      expect(cache.size).toBe(1);
      expect(cache.get('key3')).toBe('value3');
    });

    it('should report correct size', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });
});
