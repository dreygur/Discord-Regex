import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Server } from 'http';
import { Client } from 'discord.js';

// Feature: discord-regex-bot, Property 42: Health check failure on disconnection
// For any health check request when the service cannot connect to Discord or DynamoDB, 
// the endpoint should return HTTP 503.
// Validates: Requirements 14.2, 14.3, 14.5

describe('Health Check Failure - Property-Based Tests', () => {
  let healthServer: Server;

  afterEach(() => {
    if (healthServer) {
      healthServer.close();
    }
  });

  it('Property 42: Health check failure - returns HTTP 503 when Discord is disconnected', async () => {
    // Mock database to succeed
    vi.mock('../database', () => ({
      database: {
        getAllServers: vi.fn().mockResolvedValue([])
      }
    }));

    const { createHealthCheckServer } = await import('../health');

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 8081, max: 9000 }), // Random port
        async (port) => {
          // Create a mock Discord client that is NOT ready
          const mockClient = {
            isReady: vi.fn().mockReturnValue(false)
          } as unknown as Client;

          // Create health check server with disconnected client
          healthServer = createHealthCheckServer(mockClient, port);

          // Wait for server to start
          await new Promise(resolve => setTimeout(resolve, 100));

          // Make HTTP request to health endpoint
          const response = await fetch(`http://localhost:${port}/health`);
          const data = await response.json();

          // Close server after test
          healthServer.close();
          await new Promise(resolve => setTimeout(resolve, 50));

          // Verify response
          expect(response.status).toBe(503);
          expect(data.status).toBe('unhealthy');
          expect(data.discord).toBe('disconnected');

          return response.status === 503 && 
                 data.status === 'unhealthy' &&
                 data.discord === 'disconnected';
        }
      ),
      { numRuns: 10 } // Reduced runs since we're starting servers
    );
  });

  it('Property 42: Health check failure - returns HTTP 503 when DynamoDB is disconnected', async () => {
    // Mock database to fail
    vi.mock('../database', () => ({
      database: {
        getAllServers: vi.fn().mockRejectedValue(new Error('DynamoDB connection failed'))
      }
    }));

    const { createHealthCheckServer } = await import('../health');

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 8081, max: 9000 }), // Random port
        async (port) => {
          // Create a mock Discord client that IS ready
          const mockClient = {
            isReady: vi.fn().mockReturnValue(true)
          } as unknown as Client;

          // Create health check server with connected Discord but disconnected DB
          healthServer = createHealthCheckServer(mockClient, port);

          // Wait for server to start
          await new Promise(resolve => setTimeout(resolve, 100));

          // Make HTTP request to health endpoint
          const response = await fetch(`http://localhost:${port}/health`);
          const data = await response.json();

          // Close server after test
          healthServer.close();
          await new Promise(resolve => setTimeout(resolve, 50));

          // Verify response
          expect(response.status).toBe(503);
          expect(data.status).toBe('unhealthy');
          expect(data.dynamodb).toBe('disconnected');

          return response.status === 503 && 
                 data.status === 'unhealthy' &&
                 data.dynamodb === 'disconnected';
        }
      ),
      { numRuns: 10 } // Reduced runs since we're starting servers
    );
  });
});
