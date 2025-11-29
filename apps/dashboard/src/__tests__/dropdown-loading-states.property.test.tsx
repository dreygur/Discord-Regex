/**
 * Feature: dashboard-dropdown-selectors, Property 5: Dropdown loading states
 * Validates: Requirements 5.1, 5.2
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import CreateWebhook from '../pages/Webhooks/Create';
import CreateRegex from '../pages/Regex/Create';
import type { Server } from '../hooks/useServers';
import type { Webhook } from '../hooks/useWebhooks';

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

describe('Dropdown Loading States Property Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Property 5a: For any server list, loading indicator appears during fetch and disappears after', async () => {
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
          { minLength: 0, maxLength: 10 }
        ),
        fc.integer({ min: 50, max: 200 }), // Random delay
        async (servers, delay) => {
          // Mock fetch with delay to simulate loading
          (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
            new Promise((resolve) =>
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: async () => servers
                } as Response);
              }, delay)
            )
          );

          // Render the component
          const { unmount } = render(<CreateWebhook />);

          try {
            // Property: Loading indicator should be present initially
            expect(screen.getByText('Loading servers...')).toBeInTheDocument();

            // Wait for loading to complete
            await waitFor(
              () => {
                expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
              },
              { timeout: delay + 1000 }
            );

            // Property: Loading indicator should be removed after fetch completes
            expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();

            // Property: Either dropdown or empty state should be visible after loading
            if (servers.length > 0) {
              expect(screen.getByRole('combobox', { name: /select server/i })).toBeInTheDocument();
            } else {
              expect(screen.getByText('No servers available')).toBeInTheDocument();
            }
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('Property 5b: For any webhook list, loading indicator appears during fetch and disappears after', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random server and webhook lists
        fc.array(
          fc.record({
            serverId: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            status: fc.constantFrom('active' as const, 'disabled' as const),
            totalUsers: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            url: fc.webUrl(),
            serverId: fc.string({ minLength: 1, maxLength: 20 }),
            data: fc.option(fc.string(), { nil: undefined })
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.integer({ min: 100, max: 300 }), // Random delay - increased minimum to ensure loading state is observable
        async (servers, webhooks, delay) => {
          let fetchCallCount = 0;
          
          // Mock fetch to handle both servers and webhooks
          (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
            fetchCallCount++;
            
            // First call is for servers (fast)
            if (fetchCallCount === 1) {
              return Promise.resolve({
                ok: true,
                json: async () => servers
              } as Response);
            }
            
            // Second call is for webhooks (with delay)
            return new Promise((resolve) =>
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: async () => webhooks
                } as Response);
              }, delay)
            );
          });

          // Render the component
          const { unmount } = render(<CreateRegex />);

          try {
            // Wait for servers to load first
            await waitFor(() => {
              expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
            }, { timeout: 2000 });

            // Property: Webhook loading indicator should be present immediately after servers load
            // Use a small timeout to allow React to update the DOM
            await waitFor(() => {
              expect(screen.getByText('Loading webhooks...')).toBeInTheDocument();
            }, { timeout: 100 });

            // Wait for webhooks to load
            await waitFor(
              () => {
                expect(screen.queryByText('Loading webhooks...')).not.toBeInTheDocument();
              },
              { timeout: delay + 2000 }
            );

            // Property: Loading indicator should be removed after fetch completes
            expect(screen.queryByText('Loading webhooks...')).not.toBeInTheDocument();

            // Property: Either dropdown or empty state should be visible after loading
            if (webhooks.length > 0) {
              expect(screen.getByRole('combobox', { name: /select webhook/i })).toBeInTheDocument();
            } else {
              expect(screen.getByText(/no webhooks available/i)).toBeInTheDocument();
            }
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property 5c: Loading state transitions correctly from loading to loaded', async () => {
    const servers: Server[] = [
      { serverId: '1', name: 'Test Server', status: 'active', totalUsers: 100 }
    ];

    // Mock fetch with delay
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => servers
          } as Response);
        }, 100)
      )
    );

    render(<CreateWebhook />);

    // Property: Should start in loading state
    expect(screen.getByText('Loading servers...')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /select server/i })).not.toBeInTheDocument();

    // Wait for transition to loaded state
    await waitFor(() => {
      expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
    });

    // Property: Should transition to loaded state with dropdown
    expect(screen.getByRole('combobox', { name: /select server/i })).toBeInTheDocument();
    expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
  });
});
