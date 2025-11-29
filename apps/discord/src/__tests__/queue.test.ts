import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FetchQueue } from '../queue';

// Mock global fetch
global.fetch = vi.fn();

describe('Webhook Queue - Unit Tests', () => {
  let queue: FetchQueue;

  beforeEach(() => {
    queue = new FetchQueue();
    vi.clearAllMocks();
  });

  describe('task queuing', () => {
    it('should queue and process a webhook delivery', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const url = new URL('https://example.com/webhook');
      const result = await queue.add(url);

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(url, {});
    });

    it('should pass request init options to fetch', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const url = new URL('https://example.com/webhook');
      const init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      };

      await queue.add(url, init);

      expect(global.fetch).toHaveBeenCalledWith(url, init);
    });
  });

  describe('parallel processing', () => {
    it('should process multiple webhooks in parallel', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const url1 = new URL('https://example.com/webhook1');
      const url2 = new URL('https://example.com/webhook2');
      const url3 = new URL('https://example.com/webhook3');

      const startTime = Date.now();
      
      // Add all three webhooks simultaneously
      const promises = [
        queue.add(url1),
        queue.add(url2),
        queue.add(url3)
      ];

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All three should complete quickly (parallel processing)
      // If they were sequential, it would take much longer
      expect(duration).toBeLessThan(1000);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry logic with mocked fetch failures', () => {
    it('should retry on fetch failure', async () => {
      // Fail twice, then succeed
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }));

      const url = new URL('https://example.com/webhook');
      const result = await queue.add(url, {}, 3, 10); // 3 retries, 10ms delay

      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should reject after exhausting retries', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const url = new URL('https://example.com/webhook');
      
      await expect(queue.add(url, {}, 2, 10)).rejects.toThrow('Network error');
      
      // Should try initial + 2 retries = 3 total attempts
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on non-ok HTTP responses', async () => {
      // Fail with 500, then succeed
      (global.fetch as any)
        .mockResolvedValueOnce(new Response('Error', { status: 500 }))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }));

      const url = new URL('https://example.com/webhook');
      const result = await queue.add(url, {}, 3, 10);

      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should resolve immediately on first success', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const url = new URL('https://example.com/webhook');
      const result = await queue.add(url, {}, 3, 10);

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries needed
    });
  });

  describe('exponential backoff timing', () => {
    it('should apply exponential backoff between retries', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const url = new URL('https://example.com/webhook');
      const startTime = Date.now();
      
      try {
        // With 3 retries and 50ms initial delay:
        // Attempt 0: immediate
        // Attempt 1: wait 50ms (50 * 2^0)
        // Attempt 2: wait 100ms (50 * 2^1)
        // Attempt 3: wait 200ms (50 * 2^2)
        // Total wait time: ~350ms
        await queue.add(url, {}, 3, 50);
      } catch (error) {
        // Expected to fail after all retries
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least the sum of exponential delays
      // 50 + 100 + 200 = 350ms minimum
      expect(duration).toBeGreaterThanOrEqual(300); // Allow some margin
      expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Retry-After header handling', () => {
    it('should honor Retry-After header on HTTP 429', async () => {
      const retryAfterSeconds = 1;
      const mockResponse429 = new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': retryAfterSeconds.toString() }
      });
      const mockResponse200 = new Response('OK', { status: 200 });

      (global.fetch as any)
        .mockResolvedValueOnce(mockResponse429)
        .mockResolvedValueOnce(mockResponse200);

      const url = new URL('https://example.com/webhook');
      const startTime = Date.now();
      
      const result = await queue.add(url, {}, 3, 10);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.status).toBe(200);
      // Should wait at least the Retry-After duration (1 second = 1000ms)
      expect(duration).toBeGreaterThanOrEqual(900); // Allow some margin
    });

    it('should parse Retry-After as HTTP date', async () => {
      const futureDate = new Date(Date.now() + 500);
      const mockResponse429 = new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': futureDate.toUTCString() }
      });
      const mockResponse200 = new Response('OK', { status: 200 });

      (global.fetch as any)
        .mockResolvedValueOnce(mockResponse429)
        .mockResolvedValueOnce(mockResponse200);

      const url = new URL('https://example.com/webhook');
      const result = await queue.add(url, {}, 3, 10);

      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle missing Retry-After header', async () => {
      const mockResponse429 = new Response('Too Many Requests', { status: 429 });
      const mockResponse200 = new Response('OK', { status: 200 });

      (global.fetch as any)
        .mockResolvedValueOnce(mockResponse429)
        .mockResolvedValueOnce(mockResponse200);

      const url = new URL('https://example.com/webhook');
      const result = await queue.add(url, {}, 3, 10);

      expect(result.status).toBe(200);
    });
  });
});
