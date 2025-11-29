/**
 * Feature: dashboard-dropdown-selectors, Property 1: Server dropdown displays all active servers
 * Validates: Requirements 1.1, 2.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useServers, type Server } from '../../hooks/useServers';

// Polyfill for fetch in test environment
if (!global.fetch) {
  global.fetch = vi.fn();
}

describe('useServers Property Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 1: For any server list, hook returns all servers sorted alphabetically', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random server lists
        fc.array(
          fc.record({
            serverId: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            status: fc.constantFrom('active' as const, 'disabled' as const),
            totalUsers: fc.integer({ min: 0, max: 10000 }),
            email: fc.option(fc.emailAddress(), { nil: undefined })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (servers) => {
          // Mock fetch to return the generated servers
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => servers
          } as Response);

          // Render the hook
          const { result } = renderHook(() => useServers());

          // Wait for the hook to finish loading
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Property: All servers should be returned
          expect(result.current.data).toHaveLength(servers.length);
          expect(result.current.error).toBeNull();

          // Property: Servers should be sorted alphabetically by name
          const expectedSorted = [...servers].sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          expect(result.current.data).toEqual(expectedSorted);

          // Property: Each server should have all required fields
          result.current.data.forEach((server, index) => {
            expect(server).toHaveProperty('serverId');
            expect(server).toHaveProperty('name');
            expect(server).toHaveProperty('status');
            expect(server).toHaveProperty('totalUsers');
            expect(typeof server.serverId).toBe('string');
            expect(typeof server.name).toBe('string');
            expect(['active', 'disabled']).toContain(server.status);
            expect(typeof server.totalUsers).toBe('number');
          });
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);

  it('Property 2: Hook handles empty server list correctly', async () => {
    // Mock fetch to return empty array
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response);

    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('Property 3: Hook handles API errors correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }), // HTTP error codes
        async (statusCode) => {
          // Mock fetch to return error
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: statusCode
          } as Response);

          const { result } = renderHook(() => useServers());

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Property: Error should be set
          expect(result.current.error).not.toBeNull();
          expect(result.current.error).toContain('Failed to fetch servers');
          
          // Property: Data should be empty on error
          expect(result.current.data).toEqual([]);
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);

  it('Property 4: Refetch function reloads server data', async () => {
    const initialServers: Server[] = [
      { serverId: '1', name: 'Server A', status: 'active', totalUsers: 100 }
    ];
    const updatedServers: Server[] = [
      { serverId: '1', name: 'Server A', status: 'active', totalUsers: 100 },
      { serverId: '2', name: 'Server B', status: 'active', totalUsers: 200 }
    ];

    // First call returns initial servers
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => initialServers
    } as Response);

    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);

    // Second call returns updated servers
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedServers
    } as Response);

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Property: Data should be updated after refetch
    expect(result.current.data).toHaveLength(2);
  });
});
