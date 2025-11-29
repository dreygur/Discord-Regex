import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { database } from '../database';

// Feature: discord-regex-bot, Property 34: Command error responses
// Validates: Requirements 10.2
// For any error that occurs during slash command execution, the Discord Bot should respond to the user with an error message.

describe('Property 34: Command error responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should respond with error message when command execution fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          guildId: fc.string({ minLength: 1, maxLength: 20 }),
          pattern: fc.string({ minLength: 1, maxLength: 50 }),
          webhookName: fc.string({ minLength: 1, maxLength: 30 }),
          shouldFail: fc.boolean()
        }),
        async (commandData) => {
          // Mock interaction object
          const mockInteraction = {
            guildId: commandData.guildId,
            options: {
              get: (name: string) => {
                if (name === 'pattern') return { value: commandData.pattern };
                if (name === 'webhook') return { value: commandData.webhookName };
                return null;
              }
            },
            reply: vi.fn().mockResolvedValue(undefined)
          };

          // Mock database to simulate errors
          const originalAddRegex = database.addRegex.bind(database);
          vi.spyOn(database, 'addRegex').mockImplementation(async (...args) => {
            if (commandData.shouldFail) {
              throw new Error('Simulated database error');
            }
            return originalAddRegex(...args);
          });

          // Import and execute the command
          const { command } = await import('../commands/add-pattern');
          
          try {
            await command.execute(mockInteraction as any);
          } catch (error) {
            // Commands should NOT throw - they should catch errors and reply to the user
            expect.fail('Command should not throw errors - it should reply with error message');
          }

          // Verify that reply was called
          expect(mockInteraction.reply).toHaveBeenCalled();

          if (commandData.shouldFail) {
            // When an error occurs, the reply should contain an error message
            const replyArg = mockInteraction.reply.mock.calls[0][0];
            const replyText = typeof replyArg === 'string' ? replyArg : JSON.stringify(replyArg);
            expect(replyText.toLowerCase()).toMatch(/error/);
          }

          // Restore original implementation
          database.addRegex = originalAddRegex;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respond with error message for list-pattern command failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          guildId: fc.string({ minLength: 1, maxLength: 20 }),
          shouldFail: fc.boolean()
        }),
        async (commandData) => {
          // Mock interaction object
          const mockInteraction = {
            guildId: commandData.guildId,
            reply: vi.fn().mockResolvedValue(undefined)
          };

          // Mock database to simulate errors
          const originalGetRegexes = database.getRegexesByServer.bind(database);
          vi.spyOn(database, 'getRegexesByServer').mockImplementation(async (serverId: string) => {
            if (commandData.shouldFail) {
              throw new Error('Simulated database error');
            }
            return originalGetRegexes(serverId);
          });

          // Import and execute the command
          const { command } = await import('../commands/list-pattern');
          
          try {
            await command.execute(mockInteraction as any);
          } catch (error) {
            // Commands should NOT throw - they should catch errors and reply to the user
            expect.fail('Command should not throw errors - it should reply with error message');
          }

          // Verify that reply was called
          expect(mockInteraction.reply).toHaveBeenCalled();

          if (commandData.shouldFail) {
            // When an error occurs, the reply should contain an error message
            const replyArg = mockInteraction.reply.mock.calls[0][0];
            const replyText = typeof replyArg === 'string' ? replyArg : JSON.stringify(replyArg);
            expect(replyText.toLowerCase()).toMatch(/error/);
          }

          // Restore original implementation
          database.getRegexesByServer = originalGetRegexes;
        }
      ),
      { numRuns: 100 }
    );
  });
});
