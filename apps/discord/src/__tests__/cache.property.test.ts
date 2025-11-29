import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Cache } from '../cache';

describe('Cache Layer - Property-Based Tests', () => {
  // Feature: discord-regex-bot, Property 21: Cache storage and retrieval
  // Validates: Requirements 6.1, 6.2
  it('Property 21: For any data stored in cache with a key and TTL, retrieving the data before the TTL expires should return the exact value that was stored', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // cache key
        fc.anything(), // cache value
        fc.integer({ min: 1000, max: 10000 }), // TTL in milliseconds (1-10 seconds)
        (key, value, ttl) => {
          const cache = new Cache<any>();
          
          // Store value in cache with TTL
          cache.set(key, value, ttl);
          
          // Retrieve immediately (before TTL expires)
          const retrieved = cache.get(key);
          
          // Should return the exact value that was stored
          expect(retrieved).toEqual(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 22: Cache expiration
  // Validates: Requirements 6.3
  it('Property 22: For any data stored in cache with a TTL, retrieving the data after the TTL has expired should return undefined', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // cache key
        fc.anything(), // cache value
        fc.integer({ min: 10, max: 100 }), // TTL in milliseconds (short for testing)
        async (key, value, ttl) => {
          const cache = new Cache<any>();
          
          // Store value in cache with short TTL
          cache.set(key, value, ttl);
          
          // Wait for TTL to expire (add buffer to ensure expiration)
          await new Promise(resolve => setTimeout(resolve, ttl + 50));
          
          // Retrieve after TTL expires
          const retrieved = cache.get(key);
          
          // Should return undefined
          expect(retrieved).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
