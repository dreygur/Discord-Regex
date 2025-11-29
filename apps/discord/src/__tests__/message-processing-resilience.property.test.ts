import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { regexHandler } from '../regex-handler';
import { database } from '../database';
import { cache } from '../cache';

// Feature: discord-regex-bot, Property 33: Message processing resilience
// Validates: Requirements 10.1
// For any error that occurs during processing of a single message, the Message Handler should log the error and continue processing subsequent messages without crashing.

describe('Property 33: Message processing resilience', () => {
  beforeEach(() => {
    cache.clear();
    vi.clearAllMocks();
  });

  it('should continue processing messages after encountering errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            guildId: fc.string({ minLength: 1, maxLength: 20 }),
            authorId: fc.string({ minLength: 1, maxLength: 20 }),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            shouldFail: fc.boolean()
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (messages) => {
          // Track which messages were processed
          const processedMessages: string[] = [];
          const errorMessages: string[] = [];

          // Mock database to simulate errors for specific messages
          const originalGetServer = database.getServer.bind(database);
          vi.spyOn(database, 'getServer').mockImplementation(async (serverId: string) => {
            const message = messages.find(m => m.guildId === serverId);
            if (message?.shouldFail) {
              errorMessages.push(serverId);
              throw new Error('Simulated database error');
            }
            processedMessages.push(serverId);
            return {
              serverId,
              name: 'Test Server',
              status: 'active' as const,
              totalUsers: 100
            };
          });

          // Process all messages
          for (const msg of messages) {
            const mockMessage = {
              guildId: msg.guildId,
              author: { id: msg.authorId, username: 'testuser' },
              content: msg.content
            } as any;

            try {
              await regexHandler(mockMessage);
            } catch (error) {
              // The handler should NOT throw - it should catch and log errors internally
              // If we catch an error here, the test should fail
              expect.fail('regexHandler should not throw errors - it should handle them internally');
            }
          }

          // Restore original implementation
          database.getServer = originalGetServer;

          // Verify that messages that should succeed were processed
          // and messages that should fail were attempted but didn't crash the system
          const successfulMessages = messages.filter(m => !m.shouldFail);
          const failedMessages = messages.filter(m => m.shouldFail);

          // All successful messages should have been processed
          for (const msg of successfulMessages) {
            expect(processedMessages).toContain(msg.guildId);
          }

          // Failed messages should have triggered errors but not crashed
          for (const msg of failedMessages) {
            expect(errorMessages).toContain(msg.guildId);
          }

          // The key property: we processed ALL messages without the handler crashing
          expect(processedMessages.length + errorMessages.length).toBe(messages.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle pattern matching errors without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          guildId: fc.string({ minLength: 1, maxLength: 20 }),
          authorId: fc.string({ minLength: 1, maxLength: 20 }),
          content: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async (messageData) => {
          // Set up a server with an invalid regex pattern that will cause errors
          const serverId = messageData.guildId;
          
          // Mock database to return invalid regex patterns
          vi.spyOn(database, 'getServer').mockResolvedValue({
            serverId,
            name: 'Test Server',
            status: 'active' as const,
            totalUsers: 100
          });

          vi.spyOn(database, 'getRegexesByServer').mockResolvedValue([
            {
              serverId,
              regexPattern: '(((((', // Invalid regex that will cause parsing error
              webhookName: 'test-webhook',
              user_ids: ['All']
            }
          ]);

          vi.spyOn(database, 'getAllWebhooksByServerId').mockResolvedValue([
            {
              name: 'test-webhook',
              url: 'https://example.com/webhook',
              serverId,
              data: ''
            }
          ]);

          const mockMessage = {
            guildId: messageData.guildId,
            author: { id: messageData.authorId, username: 'testuser' },
            content: messageData.content
          } as any;

          // The handler should not crash even with invalid regex
          try {
            await regexHandler(mockMessage);
            // If we get here, the handler successfully handled the error
            expect(true).toBe(true);
          } catch (error) {
            // The handler should NOT throw - it should catch and log errors internally
            expect.fail('regexHandler should not throw errors for invalid patterns');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
