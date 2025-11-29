/**
 * Feature: dashboard-dropdown-selectors, Property 7: Error state handling
 * Validates: Requirements 1.4, 2.4, 3.4
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
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

describe('Dropdown Error Handling Property Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Property 7a: For any API error, server dropdown displays error message and retry button', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }), // HTTP error codes
        async (statusCode) => {
          // Mock fetch to return error
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: statusCode
          } as Response);

          // Render the component
          const { unmount } = render(<CreateWebhook />);

          try {
            // Wait for error state to appear
            await waitFor(() => {
              expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
            });

            // Property: Error message should be displayed
            expect(screen.getByText('Error loading servers')).toBeInTheDocument();

            // Property: Retry button should be present
            const retryButton = screen.getByRole('button', { name: /retry/i });
            expect(retryButton).toBeInTheDocument();

            // Property: Dropdown should not be present when error occurs
            expect(screen.queryByRole('combobox', { name: /select server/i })).not.toBeInTheDocument();
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('Property 7b: For any API error, webhook dropdown displays error message and retry button', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            serverId: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            status: fc.constantFrom('active' as const, 'disabled' as const),
            totalUsers: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.integer({ min: 400, max: 599 }), // HTTP error codes
        async (servers, statusCode) => {
          let fetchCallCount = 0;
          
          // Mock fetch to handle both servers and webhooks
          (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
            fetchCallCount++;
            
            // First call is for servers (success)
            if (fetchCallCount === 1) {
              return Promise.resolve({
                ok: true,
                json: async () => servers
              } as Response);
            }
            
            // Second call is for webhooks (error)
            return Promise.resolve({
              ok: false,
              status: statusCode
            } as Response);
          });

          // Render the component
          const { unmount } = render(<CreateRegex />);

          try {
            // Wait for servers to load
            await waitFor(() => {
              expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
            });

            // Wait for webhook error state to appear
            await waitFor(() => {
              expect(screen.queryByText('Loading webhooks...')).not.toBeInTheDocument();
            });

            // Property: Error message should be displayed
            expect(screen.getByText('Error loading webhooks')).toBeInTheDocument();

            // Property: Retry button should be present
            const retryButtons = screen.getAllByRole('button', { name: /retry/i });
            expect(retryButtons.length).toBeGreaterThan(0);

            // Property: Webhook dropdown should not be present when error occurs
            expect(screen.queryByRole('combobox', { name: /select webhook/i })).not.toBeInTheDocument();
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('Property 7c: Retry button refetches data after error', async () => {
    const servers: Server[] = [
      { serverId: '1', name: 'Test Server', status: 'active', totalUsers: 100 }
    ];

    let fetchCallCount = 0;

    // Mock fetch to fail first, then succeed
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fetchCallCount++;
      
      if (fetchCallCount === 1) {
        // First call fails
        return Promise.resolve({
          ok: false,
          status: 500
        } as Response);
      }
      
      // Second call succeeds
      return Promise.resolve({
        ok: true,
        json: async () => servers
      } as Response);
    });

    render(<CreateWebhook />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Error loading servers')).toBeInTheDocument();
    });

    // Property: Error state should be displayed initially
    expect(screen.getByText('Error loading servers')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Click retry button
    fireEvent.click(retryButton);

    // Wait for successful load
    await waitFor(() => {
      expect(screen.queryByText('Error loading servers')).not.toBeInTheDocument();
    });

    // Property: After retry, dropdown should be displayed
    expect(screen.getByRole('combobox', { name: /select server/i })).toBeInTheDocument();
    expect(screen.queryByText('Error loading servers')).not.toBeInTheDocument();
  });

  it('Property 7d: Form remains functional despite dropdown errors', async () => {
    // Mock fetch to return error
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response);

    render(<CreateWebhook />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Error loading servers')).toBeInTheDocument();
    });

    // Property: Form fields should still be present and functional
    const nameInput = screen.getByLabelText(/name/i);
    const urlInput = screen.getByLabelText(/url/i);
    const submitButton = screen.getByRole('button', { name: /create webhook/i });

    expect(nameInput).toBeInTheDocument();
    expect(urlInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();

    // Property: Form inputs should be editable
    fireEvent.change(nameInput, { target: { value: 'test-webhook' } });
    expect(nameInput).toHaveValue('test-webhook');
  });

  it('Property 7e: Error state persists until successful refetch', async () => {
    let fetchCallCount = 0;

    // Mock fetch to fail multiple times
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fetchCallCount++;
      
      if (fetchCallCount <= 2) {
        // First two calls fail
        return Promise.resolve({
          ok: false,
          status: 500
        } as Response);
      }
      
      // Third call succeeds
      return Promise.resolve({
        ok: true,
        json: async () => [
          { serverId: '1', name: 'Test Server', status: 'active', totalUsers: 100 }
        ]
      } as Response);
    });

    render(<CreateWebhook />);

    // Wait for initial error
    await waitFor(() => {
      expect(screen.getByText('Error loading servers')).toBeInTheDocument();
    });

    // Property: Error persists after first retry
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    // Wait for loading to complete and error to reappear
    await waitFor(() => {
      expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    await waitFor(() => {
      expect(screen.getByText('Error loading servers')).toBeInTheDocument();
    });

    // Property: Error clears after successful retry
    const retryButton2 = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton2);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait for error to clear and dropdown to appear
    await waitFor(() => {
      expect(screen.queryByText('Error loading servers')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByRole('combobox', { name: /select server/i })).toBeInTheDocument();
  });
});
