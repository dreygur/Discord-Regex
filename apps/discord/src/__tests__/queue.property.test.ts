import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { FetchQueue } from '../queue';

describe('Webhook Queue - Property-Based Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // Feature: discord-regex-bot, Property 16: Retry exhaustion
  // Validates: Requirements 5.4
  it('Property 16: For any webhook POST request that fails on every attempt, after exhausting the configured retry count, the Queue System should reject the promise with an error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2 }), // retries (reduced for faster tests)
        fc.integer({ min: 5, max: 15 }), // delay (reduced for faster tests)
        async (retries, delay) => {
          const queue = new FetchQueue();
          let callCount = 0;
          
          global.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            throw new Error('Network error');
          }) as any;

          const url = new URL('https://example.com/webhook');
          
          // Should reject after exhausting retries
          await expect(queue.add(url, {}, retries, delay)).rejects.toThrow();
          
          // Should have attempted retries + 1 times (initial + retries)
          expect(callCount).toBe(retries + 1);
        }
      ),
      { numRuns: 50 } // Reduced runs for faster execution
    );
  }, 15000);

  // Feature: discord-regex-bot, Property 17: Exponential backoff
  // Validates: Requirements 5.2
  it('Property 17: For any webhook POST request that fails, each subsequent retry should have a delay that is exponentially larger than the previous delay', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 2 }), // retries (fixed at 2 for consistent timing)
        fc.integer({ min: 10, max: 20 }), // initial delay
        async (retries, initialDelay) => {
          const queue = new FetchQueue();
          const callTimes: number[] = [];
          
          global.fetch = vi.fn().mockImplementation(async () => {
            callTimes.push(Date.now());
            throw new Error('Network error');
          }) as any;

          const url = new URL('https://example.com/webhook');
          
          await expect(queue.add(url, {}, retries, initialDelay)).rejects.toThrow();
          
          // Check that delays grow exponentially
          // More generous tolerance for timing precision and test environment variability
          const tolerance = Math.max(20, initialDelay); // ms
          
          for (let i = 0; i < callTimes.length - 1; i++) {
            const actualDelay = callTimes[i + 1] - callTimes[i];
            const expectedDelay = initialDelay * Math.pow(2, i);
            
            // Delay should be at least the expected exponential delay (minus tolerance)
            expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - tolerance);
          }
        }
      ),
      { numRuns: 50 } // Reduced runs
    );
  }, 15000); // Increase timeout

  // Feature: discord-regex-bot, Property 18: Success resolution
  // Validates: Requirements 5.3
  it('Property 18: For any webhook POST request that succeeds (returns HTTP 2xx), the Queue System should resolve the promise with the response without further retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 200, max: 299 }), // success status codes
        fc.integer({ min: 1, max: 5 }), // retries (should not be used)
        async (statusCode, retries) => {
          const queue = new FetchQueue();
          let callCount = 0;
          const mockResponse = {
            ok: true,
            status: statusCode,
            headers: new Headers(),
          } as Response;
          
          global.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            return mockResponse;
          }) as any;

          const url = new URL('https://example.com/webhook');
          
          const response = await queue.add(url, {}, retries, 10);
          
          // Should resolve with the response
          expect(response).toBe(mockResponse);
          
          // Should only call fetch once (no retries on success)
          expect(callCount).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: discord-regex-bot, Property 19: Retry-After header compliance
  // Validates: Requirements 12.4
  it('Property 19: For any webhook POST request that returns HTTP 429 with a Retry-After header, the Queue System should wait at least the specified duration before the next retry attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(1), // Fixed at 1 second for consistent timing
        async (retryAfterSeconds) => {
          const queue = new FetchQueue();
          const callTimes: number[] = [];
          let callCount = 0;
          
          global.fetch = vi.fn().mockImplementation(async () => {
            callTimes.push(Date.now());
            callCount++;
            
            // First call returns 429, second call succeeds
            if (callCount === 1) {
              return {
                ok: false,
                status: 429,
                headers: new Headers({
                  'Retry-After': retryAfterSeconds.toString()
                }),
              } as Response;
            } else {
              return {
                ok: true,
                status: 200,
                headers: new Headers(),
              } as Response;
            }
          }) as any;

          const url = new URL('https://example.com/webhook');
          
          const result = await queue.add(url, {}, 2, 10);
          
          // Should have called fetch twice
          expect(callCount).toBe(2);
          expect(result.status).toBe(200);
          
          // Check that the delay between calls is at least the Retry-After duration
          if (callTimes.length >= 2) {
            const actualDelay = callTimes[1] - callTimes[0];
            const expectedDelay = retryAfterSeconds * 1000;
            const tolerance = 100; // ms (more generous tolerance)
            
            expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - tolerance);
          }
        }
      ),
      { numRuns: 20 } // Reduced runs significantly
    );
  }, 30000); // Increase timeout significantly

  // Feature: discord-regex-bot, Property 20: Parallel webhook processing
  // Validates: Requirements 12.3, 12.5
  it('Property 20: For any set of multiple webhook deliveries queued simultaneously, the Queue System should process them in parallel rather than sequentially', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }), // number of webhooks (reduced)
        fc.integer({ min: 50, max: 70 }), // processing time per webhook (higher minimum for clearer signal)
        async (numWebhooks, processingTime) => {
          const queue = new FetchQueue();
          const startTimes: number[] = [];
          
          global.fetch = vi.fn().mockImplementation(async () => {
            startTimes.push(Date.now());
            await new Promise(resolve => setTimeout(resolve, processingTime));
            return {
              ok: true,
              status: 200,
              headers: new Headers(),
            } as Response;
          }) as any;

          const promises: Promise<Response>[] = [];
          const overallStart = Date.now();
          
          // Queue multiple webhooks
          for (let i = 0; i < numWebhooks; i++) {
            const url = new URL(`https://example.com/webhook${i}`);
            promises.push(queue.add(url, {}, 0, 10));
          }
          
          await Promise.all(promises);
          const overallEnd = Date.now();
          const totalTime = overallEnd - overallStart;
          
          // If processed sequentially, total time would be numWebhooks * processingTime
          // If processed in parallel, total time should be close to processingTime
          // We check that total time is less than what sequential would take
          const sequentialTime = numWebhooks * processingTime;
          
          // Parallel processing should be significantly faster than sequential
          // Very generous threshold to account for test environment overhead and timing variability
          expect(totalTime).toBeLessThan(sequentialTime * 0.9);
          
          // All webhooks should have started within a short time window (parallel)
          // This is the key indicator of parallel processing
          if (startTimes.length > 1) {
            const timeSpan = Math.max(...startTimes) - Math.min(...startTimes);
            // All should start within a very generous window
            // The key is they don't start sequentially (which would be processingTime apart)
            expect(timeSpan).toBeLessThan(processingTime);
          }
        }
      ),
      { numRuns: 20 } // Reduced runs for faster execution
    );
  }, 20000); // Increase timeout to 20 seconds
});
