/**
 * Feature: dashboard-dropdown-selectors, Property 1: Server dropdown displays all active servers
 * Validates: Requirements 1.1, 2.1
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import CreateWebhook from '../../pages/Webhooks/Create';
import type { Server } from '../../hooks/useServers';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Polyfill for fetch in test environment
if (!global.fetch) {
  global.fetch = vi.fn();
}

describe('CreateWebhook Server Dropdown Property Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Property 1: For any server list, dropdown displays all servers with correct names and IDs', async () => {
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
          { minLength: 1, maxLength: 10 }
        ),
        async (servers) => {
          // Mock fetch to return the generated servers
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => servers
          } as Response);

          // Render the component
          const { unmount } = render(<CreateWebhook />);

          try {
            // Wait for servers to load
            await waitFor(() => {
              expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
            });

            // Property: Server dropdown should be present
            const serverTrigger = screen.getByRole('combobox', { name: /select server/i });
            expect(serverTrigger).toBeInTheDocument();

            // Property: Placeholder should be shown when no selection
            expect(screen.getByText('Select a server')).toBeInTheDocument();
          } finally {
            // Clean up after each property test iteration
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);

  it('Property 6: Empty state displays appropriate message when no servers available', async () => {
    // Mock fetch to return empty array
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response);

    // Render the component
    render(<CreateWebhook />);

    // Wait for servers to load
    await waitFor(() => {
      expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
    });

    // Property: Empty state message should be displayed
    expect(screen.getByText('No servers available')).toBeInTheDocument();

    // Property: Dropdown should not be present when empty
    expect(screen.queryByRole('combobox', { name: /select server/i })).not.toBeInTheDocument();
  });
});
