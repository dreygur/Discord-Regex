import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Server } from 'http';
import { Client } from 'discord.js';

// Feature: discord-regex-bot, Property 41: Health check success
// For any health check request when the service is healthy and connected to all dependencies, 
// the endpoint should return HTTP 200.
// Validates: Requirements 14.1, 14.4

// Mock the database module before importing health
vi.mock('../database', () => ({
  database: {
    getAllServers: vi.fn().mockResolvedValue([
      { serverId: '123', name: 'Test Server', status: 'active', totalUsers: 10 }
    ])
  }
}));

// Import after mocking
import { createHealthCheckServer } from '../health';

describe('Health Check - Property-Based Tests', () => {
  let healthServer: Server;
  let mockClient: Client;
  
  beforeEach(() => {
    // Create a mock Discord client
    mockClient = {
      isReady: vi.fn().mockReturnValue(true)
    } as unknown as Client;
  });

  afterEach(() => {
    if (healthServer) {
      healthServer.close();
    }
  });

  it('Property 41: Health check success - returns HTTP 200 when all dependencies are healthy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 8081, max: 9000 }), // Random port
        async (port) => {
          // Create health check server with mocked client
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
          expect(response.status).toBe(200);
          expect(data.status).toBe('healthy');
          expect(data.discord).toBe('connected');
          expect(data.dynamodb).toBe('connected');

          return response.status === 200 && 
                 data.status === 'healthy' &&
                 data.discord === 'connected' &&
                 data.dynamodb === 'connected';
        }
      ),
      { numRuns: 10 } // Reduced runs since we're starting servers
    );
  });
});
