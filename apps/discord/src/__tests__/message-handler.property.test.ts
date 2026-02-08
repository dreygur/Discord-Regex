import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { regexHandler } from '../regex-handler';
import type { Message } from 'discord.js';

// Feature: discord-regex-bot, Property 12: Disabled server bypass
// For any server with status "disabled" and any message from that server,
// the Message Handler should terminate processing immediately without retrieving patterns or webhooks.
// Validates: Requirements 1.5, 4.2

describe('Message Handler - Property-Based Tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('Property 12: Disabled server bypass - skips processing for disabled servers', async () => {
    // Mock database and cache
    const mockDatabase = {
      getServer: vi.fn(),
      getRegexesByServer: vi.fn(),
      getAllWebhooksByServerId: vi.fn()
    };

    const mockCache = {
      get: vi.fn(),
      set: vi.fn()
    };

    vi.doMock('../database', () => ({
      database: mockDatabase
    }));

    vi.doMock('../cache', () => ({
      cache: mockCache
    }));

    vi.doMock('../queue', () => ({
      queue: {
        add: vi.fn().mockResolvedValue({ status: 200 })
      }
    }));

    // Re-import after mocking
    const { regexHandler: handler } = await import('../regex-handler');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // serverId
        fc.string({ minLength: 1, maxLength: 100 }), // message content
        async (serverId, content) => {
          // Reset mocks for each iteration
          mockDatabase.getServer.mockReset();
          mockDatabase.getRegexesByServer.mockReset();
          mockDatabase.getAllWebhooksByServerId.mockReset();
          mockCache.get.mockReset();
          mockCache.set.mockReset();

          // Setup: Server is disabled
          mockCache.get.mockReturnValue(null);
          mockDatabase.getServer.mockResolvedValue({
            serverId,
            name: 'Test Server',
            status: 'disabled',
            totalUsers: 10
          });

          // Create mock message
          const mockMessage = {
            content,
            guildId: serverId,
            author: {
              id: 'user123',
              username: 'testuser'
            }
          } as unknown as Message;

          // Execute
          await handler(mockMessage);

          // Verify: getRegexesByServer and getAllWebhooksByServerId should NOT be called
          expect(mockDatabase.getRegexesByServer).not.toHaveBeenCalled();
          expect(mockDatabase.getAllWebhooksByServerId).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 13: Pattern matching
  // For any message content and regex pattern, if the pattern matches the content using RegExp.test(),
  // the Message Handler should identify it as a match.
  // Validates: Requirements 4.4

  it('Property 13: Pattern matching - identifies matching patterns correctly', async () => {
    const mockDatabase = {
      getServer: vi.fn(),
      getRegexesByServer: vi.fn(),
      getAllWebhooksByServerId: vi.fn()
    };

    const mockCache = {
      get: vi.fn(),
      set: vi.fn()
    };

    const mockQueue = {
      add: vi.fn().mockResolvedValue({ status: 200 })
    };

    vi.doMock('../database', () => ({
      database: mockDatabase
    }));

    vi.doMock('../cache', () => ({
      cache: mockCache
    }));

    vi.doMock('../queue', () => ({
      queue: mockQueue
    }));

    const { regexHandler: handler } = await import('../regex-handler');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // serverId
        fc.constantFrom('test', 'hello', 'world', '123', 'abc'), // known content
        async (serverId, content) => {
          mockDatabase.getServer.mockReset();
          mockDatabase.getRegexesByServer.mockReset();
          mockDatabase.getAllWebhooksByServerId.mockReset();
          mockCache.get.mockReset();
          mockCache.set.mockReset();
          mockQueue.add.mockClear();

          // Setup: Active server with matching pattern
          mockCache.get.mockReturnValue(null);
          mockDatabase.getServer.mockResolvedValue({
            serverId,
            name: 'Test Server',
            status: 'active',
            totalUsers: 10
          });

          // Pattern that will match the content
          mockDatabase.getRegexesByServer.mockResolvedValue([
            {
              serverId,
              regexPattern: content, // Exact match pattern
              webhookName: 'test-webhook',
              user_ids: ['All']
            }
          ]);

          mockDatabase.getAllWebhooksByServerId.mockResolvedValue([
            {
              serverId,
              name: 'test-webhook',
              url: 'https://example.com/webhook',
              data: ''
            }
          ]);

          const mockMessage = {
            content,
            guildId: serverId,
            author: {
              id: 'user123',
              username: 'testuser'
            }
          } as unknown as Message;

          await handler(mockMessage);

          // Verify: Webhook should be called when pattern matches
          expect(mockQueue.add).toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 14: User ID filtering
  // For any matched pattern with a user_ids filter (not "All"), if the message author's ID
  // is not in the filter list, the webhook should not be triggered.
  // Validates: Requirements 3.4, 4.5

  it('Property 14: User ID filtering - blocks users not in filter list', async () => {
    const mockDatabase = {
      getServer: vi.fn(),
      getRegexesByServer: vi.fn(),
      getAllWebhooksByServerId: vi.fn()
    };

    const mockCache = {
      get: vi.fn(),
      set: vi.fn()
    };

    const mockQueue = {
      add: vi.fn().mockResolvedValue({ status: 200 })
    };

    vi.doMock('../database', () => ({
      database: mockDatabase
    }));

    vi.doMock('../cache', () => ({
      cache: mockCache
    }));

    vi.doMock('../queue', () => ({
      queue: mockQueue
    }));

    const { regexHandler: handler } = await import('../regex-handler');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // serverId
        fc.string({ minLength: 1, maxLength: 20 }), // allowedUserId
        fc.string({ minLength: 1, maxLength: 20 }), // blockedUserId
        fc.string({ minLength: 1, maxLength: 50 }), // content
        async (serverId, allowedUserId, blockedUserId, content) => {
          // Ensure users are different
          if (allowedUserId === blockedUserId) return true;

          mockDatabase.getServer.mockReset();
          mockDatabase.getRegexesByServer.mockReset();
          mockDatabase.getAllWebhooksByServerId.mockReset();
          mockCache.get.mockReset();
          mockCache.set.mockReset();
          mockQueue.add.mockClear();

          // Setup: Active server with user-filtered pattern
          mockCache.get.mockReturnValue(null);
          mockDatabase.getServer.mockResolvedValue({
            serverId,
            name: 'Test Server',
            status: 'active',
            totalUsers: 10
          });

          // Pattern with specific user filter
          mockDatabase.getRegexesByServer.mockResolvedValue([
            {
              serverId,
              regexPattern: '.*', // Match everything
              webhookName: 'test-webhook',
              user_ids: [allowedUserId] // Only allow specific user
            }
          ]);

          mockDatabase.getAllWebhooksByServerId.mockResolvedValue([
            {
              serverId,
              name: 'test-webhook',
              url: 'https://example.com/webhook',
              data: ''
            }
          ]);

          // Message from blocked user
          const mockMessage = {
            content,
            guildId: serverId,
            author: {
              id: blockedUserId,
              username: 'blockeduser'
            }
          } as unknown as Message;

          await handler(mockMessage);

          // Verify: Webhook should NOT be called for blocked user
          expect(mockQueue.add).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 15: Template substitution
  // For any webhook with a data template containing $content$ and any message content,
  // the prepared POST body should have all instances of $content$ replaced with the actual message content.
  // Validates: Requirements 2.3, 4.8

  it('Property 15: Template substitution - replaces $content$ with message content', async () => {
    const mockDatabase = {
      getServer: vi.fn(),
      getRegexesByServer: vi.fn(),
      getAllWebhooksByServerId: vi.fn()
    };

    const mockCache = {
      get: vi.fn(),
      set: vi.fn()
    };

    const mockQueue = {
      add: vi.fn().mockResolvedValue({ status: 200 })
    };

    vi.doMock('../database', () => ({
      database: mockDatabase
    }));

    vi.doMock('../cache', () => ({
      cache: mockCache
    }));

    vi.doMock('../queue', () => ({
      queue: mockQueue
    }));

    const { regexHandler: handler } = await import('../regex-handler');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // serverId
        fc.string({ minLength: 1, maxLength: 100 }), // message content
        async (serverId, content) => {
          mockDatabase.getServer.mockReset();
          mockDatabase.getRegexesByServer.mockReset();
          mockDatabase.getAllWebhooksByServerId.mockReset();
          mockCache.get.mockReset();
          mockCache.set.mockReset();
          mockQueue.add.mockClear();

          // Setup: Active server with template webhook
          mockCache.get.mockReturnValue(null);
          mockDatabase.getServer.mockResolvedValue({
            serverId,
            name: 'Test Server',
            status: 'active',
            totalUsers: 10
          });

          mockDatabase.getRegexesByServer.mockResolvedValue([
            {
              serverId,
              regexPattern: '.*', // Match everything
              webhookName: 'test-webhook',
              user_ids: ['All']
            }
          ]);

          // Webhook with template containing $content$
          const template = '{"message": "$content$", "extra": "data"}';
          mockDatabase.getAllWebhooksByServerId.mockResolvedValue([
            {
              serverId,
              name: 'test-webhook',
              url: 'https://example.com/webhook',
              data: template
            }
          ]);

          const mockMessage = {
            content,
            guildId: serverId,
            author: {
              id: 'user123',
              username: 'testuser'
            }
          } as unknown as Message;

          await handler(mockMessage);

          // Verify: Queue was called with substituted content
          expect(mockQueue.add).toHaveBeenCalled();
          
          if (mockQueue.add.mock.calls.length > 0) {
            const callArgs = mockQueue.add.mock.calls[0];
            const body = callArgs[1].body;
            
            // Body should not contain the literal $content$ anymore
            expect(body).not.toContain('$content$');
            
            // Body should contain some form of the content (sanitized/escaped)
            // We check that the template structure is preserved
            expect(body).toContain('"message"');
            expect(body).toContain('"extra"');
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
