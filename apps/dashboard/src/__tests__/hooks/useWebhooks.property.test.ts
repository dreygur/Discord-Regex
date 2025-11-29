/**
 * Feature: dashboard-dropdown-selectors, Property 2: Webhook dropdown displays all webhooks
 * Validates: Requirements 3.1, 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useWebhooks, type Webhook } from '../../hooks/useWebhooks';

// Polyfill for fetch in test environment
if (!global.fetch) {
  global.fetch = vi.fn();
}

describe('useWebhooks Property Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 1: For any webhook list, hook returns all webhooks sorted alphabetically', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random webhook lists
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            url: fc.webUrl(),
            serverId: fc.string({ minLength: 1, maxLength: 20 }),
            data: fc.option(fc.string(), { nil: undefined })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (webhooks) => {
          // Mock fetch to return the generated webhooks
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => webhooks
          } as Response);

          // Render the hook without filtering
          const { result } = renderHook(() => useWebhooks());

          // Wait for the hook to finish loading
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Property: All webhooks should be returned
          expect(result.current.data).toHaveLength(webhooks.length);
          expect(result.current.error).toBeNull();

          // Property: Webhooks should be sorted alphabetically by name
          const expectedSorted = [...webhooks].sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          expect(result.current.data).toEqual(expectedSorted);

          // Property: Each webhook should have all required fields
          result.current.data.forEach((webhook) => {
            expect(webhook).toHaveProperty('name');
            expect(webhook).toHaveProperty('url');
            expect(webhook).toHaveProperty('serverId');
            expect(typeof webhook.name).toBe('string');
            expect(typeof webhook.url).toBe('string');
            expect(typeof webhook.serverId).toBe('string');
          });
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);

  it('Property 2: Filtering by serverId returns only matching webhooks', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random server ID and webhook list
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            url: fc.webUrl(),
            serverId: fc.string({ minLength: 1, maxLength: 20 }),
            data: fc.option(fc.string(), { nil: undefined })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (filterServerId, webhooks) => {
          // Mock fetch to return the generated webhooks
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => webhooks
          } as Response);

          // Render the hook with filtering
          const { result } = renderHook(() => useWebhooks(filterServerId));

          // Wait for the hook to finish loading
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Property: All returned webhooks should match the filter
          const expectedFiltered = webhooks.filter(w => w.serverId === filterServerId);
          expect(result.current.data).toHaveLength(expectedFiltered.length);
          
          // Property: Every webhook in result should have matching serverId
          result.current.data.forEach((webhook) => {
            expect(webhook.serverId).toBe(filterServerId);
          });

          // Property: Results should still be sorted alphabetically
          const expectedSorted = [...expectedFiltered].sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          expect(result.current.data).toEqual(expectedSorted);
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);

  it('Property 3: Hook handles empty webhook list correctly', async () => {
    // Mock fetch to return empty array
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response);

    const { result } = renderHook(() => useWebhooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('Property 4: Hook handles API errors correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }), // HTTP error codes
        async (statusCode) => {
          // Mock fetch to return error
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: statusCode
          } as Response);

          const { result } = renderHook(() => useWebhooks());

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Property: Error should be set
          expect(result.current.error).not.toBeNull();
          expect(result.current.error).toContain('Failed to fetch webhooks');
          
          // Property: Data should be empty on error
          expect(result.current.data).toEqual([]);
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);

  it('Property 5: Refetch function reloads webhook data', async () => {
    const initialWebhooks: Webhook[] = [
      { name: 'webhook-a', url: 'https://example.com/a', serverId: '1' }
    ];
    const updatedWebhooks: Webhook[] = [
      { name: 'webhook-a', url: 'https://example.com/a', serverId: '1' },
      { name: 'webhook-b', url: 'https://example.com/b', serverId: '1' }
    ];

    // First call returns initial webhooks
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => initialWebhooks
    } as Response);

    const { result } = renderHook(() => useWebhooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);

    // Second call returns updated webhooks
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedWebhooks
    } as Response);

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Property: Data should be updated after refetch
    expect(result.current.data).toHaveLength(2);
  });

  it('Property 6: Filtering with undefined serverId returns all webhooks', async () => {
    const webhooks: Webhook[] = [
      { name: 'webhook-a', url: 'https://example.com/a', serverId: '1' },
      { name: 'webhook-b', url: 'https://example.com/b', serverId: '2' },
      { name: 'webhook-c', url: 'https://example.com/c', serverId: '1' }
    ];

    // Mock fetch to return webhooks
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => webhooks
    } as Response);

    // Render without filter (undefined)
    const { result } = renderHook(() => useWebhooks(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Property: All webhooks should be returned when no filter is applied
    expect(result.current.data).toHaveLength(3);
  });
});
