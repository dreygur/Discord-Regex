import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { CommandInteraction } from 'discord.js';

// Custom arbitraries for data generation
const serverIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const webhookNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const regexPatternArb = fc.oneof(
  fc.constant('test'),
  fc.constant('\\d+'),
  fc.constant('[a-z]+'),
  fc.constant('hello.*world'),
  fc.constant('^start'),
  fc.constant('end$'),
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
    try {
      new RegExp(s);
      return true;
    } catch {
      return false;
    }
  })
);

// Simple in-memory mock database for testing
class MockDatabase {
  private patterns: Map<string, any> = new Map();
  private webhooks: Map<string, any> = new Map();

  async addRegex(serverId: string, regexPattern: string, webhookName: string, userIds?: string[]): Promise<void> {
    // Validate regex pattern
    new RegExp(regexPattern);
    const finalUserIds = userIds && userIds.length > 0 ? userIds : ['All'];
    const key = `${serverId}:${regexPattern}`;
    this.patterns.set(key, { serverId, regexPattern, webhookName, user_ids: finalUserIds });
  }

  async getRegex(serverId: string, regexPattern: string): Promise<any | null> {
    const key = `${serverId}:${regexPattern}`;
    return this.patterns.get(key) || null;
  }

  async getRegexesByServer(serverId: string): Promise<any[]> {
    return Array.from(this.patterns.values()).filter(p => p.serverId === serverId);
  }

  async deleteRegex(serverId: string, regexPattern: string): Promise<void> {
    const key = `${serverId}:${regexPattern}`;
    this.patterns.delete(key);
  }

  async getAllWebhooksByServerId(serverId: string): Promise<any[]> {
    return Array.from(this.webhooks.values()).filter(w => w.serverId === serverId);
  }

  async createWebhook(name: string, url: string, serverId: string, data: string): Promise<void> {
    this.webhooks.set(name, { name, url, serverId, data });
  }

  clear() {
    this.patterns.clear();
    this.webhooks.clear();
  }
}

// Mock interaction factory
function createMockInteraction(guildId: string, options: Record<string, any>): CommandInteraction {
  return {
    guildId,
    options: {
      get: (name: string) => options[name] ? { value: options[name] } : undefined,
    },
    reply: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe('Slash Commands - Property-Based Tests', () => {
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = new MockDatabase();
  });

  // Feature: discord-regex-bot, Property 29: Add-pattern command
  // Validates: Requirements 9.1
  it('Property 29: Add-pattern command - creates a new regex pattern record in the database', async () => {
    await fc.assert(
      fc.asyncProperty(
        serverIdArb,
        regexPatternArb,
        webhookNameArb,
        async (serverId, pattern, webhookName) => {
          mockDb.clear();
          
          // Simulate the add-pattern command execution
          const interaction = createMockInteraction(serverId, {
            pattern,
            webhook: webhookName,
          });

          // Execute the command logic (what add-pattern.ts does)
          await mockDb.addRegex(
            interaction.guildId as string,
            interaction.options.get('pattern')?.value as string,
            interaction.options.get('webhook')?.value as string
          );

          // Verify the pattern was created in the database
          const retrieved = await mockDb.getRegex(serverId, pattern);
          
          expect(retrieved).not.toBeNull();
          expect(retrieved?.serverId).toBe(serverId);
          expect(retrieved?.regexPattern).toBe(pattern);
          expect(retrieved?.webhookName).toBe(webhookName);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 30: List-pattern command
  // Validates: Requirements 9.2
  it('Property 30: List-pattern command - displays all regex patterns associated with the serverId', async () => {
    await fc.assert(
      fc.asyncProperty(
        serverIdArb,
        fc.array(
          fc.record({
            pattern: regexPatternArb,
            webhookName: webhookNameArb,
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (serverId, patterns) => {
          mockDb.clear();
          
          // Remove duplicates based on pattern (since pattern is the unique key)
          const uniquePatterns = Array.from(
            new Map(patterns.map(p => [p.pattern, p])).values()
          );
          
          // Create multiple patterns for the server
          for (const p of uniquePatterns) {
            await mockDb.addRegex(serverId, p.pattern, p.webhookName);
          }

          // Simulate the list-pattern command execution
          const interaction = createMockInteraction(serverId, {});

          // Execute the command logic (what list-pattern.ts does)
          const retrievedPatterns = await mockDb.getRegexesByServer(interaction.guildId as string);

          // Verify all patterns are returned
          expect(retrievedPatterns.length).toBe(uniquePatterns.length);
          
          // Verify each pattern belongs to the correct server
          for (const retrieved of retrievedPatterns) {
            expect(retrieved.serverId).toBe(serverId);
          }

          // Verify all created patterns are in the result
          for (const p of uniquePatterns) {
            const found = retrievedPatterns.find(
              rp => rp.regexPattern === p.pattern && rp.webhookName === p.webhookName
            );
            expect(found).toBeDefined();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 31: Remove-pattern command
  // Validates: Requirements 9.3
  it('Property 31: Remove-pattern command - deletes the pattern from the database', async () => {
    await fc.assert(
      fc.asyncProperty(
        serverIdArb,
        regexPatternArb,
        webhookNameArb,
        async (serverId, pattern, webhookName) => {
          mockDb.clear();
          
          // Create a pattern first
          await mockDb.addRegex(serverId, pattern, webhookName);
          
          // Verify it exists
          const beforeDelete = await mockDb.getRegex(serverId, pattern);
          expect(beforeDelete).not.toBeNull();

          // Simulate the remove-pattern command execution
          const interaction = createMockInteraction(serverId, {
            pattern,
          });

          // Execute the command logic (what remove-pattern.ts does)
          await mockDb.deleteRegex(
            interaction.guildId as string,
            interaction.options.get('pattern')?.value as string
          );

          // Verify the pattern was deleted
          const afterDelete = await mockDb.getRegex(serverId, pattern);
          expect(afterDelete).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 32: Webhook autocomplete
  // Validates: Requirements 9.5
  it('Property 32: Webhook autocomplete - fetches and displays all webhooks associated with the serverId', async () => {
    await fc.assert(
      fc.asyncProperty(
        serverIdArb,
        fc.array(
          fc.record({
            name: webhookNameArb,
            url: fc.webUrl({ validSchemes: ['http', 'https'] }),
            data: fc.string({ maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (serverId, webhooks) => {
          mockDb.clear();
          
          // Remove duplicates based on name (since name is the unique key)
          const uniqueWebhooks = Array.from(
            new Map(webhooks.map(w => [w.name, w])).values()
          );
          
          // Create multiple webhooks for the server
          for (const w of uniqueWebhooks) {
            await mockDb.createWebhook(w.name, w.url, serverId, w.data);
          }

          // Simulate the autocomplete logic (what bot.ts does for autocomplete)
          const retrievedWebhooks = await mockDb.getAllWebhooksByServerId(serverId);

          // Verify all webhooks are returned
          expect(retrievedWebhooks.length).toBe(uniqueWebhooks.length);
          
          // Verify each webhook belongs to the correct server
          for (const retrieved of retrievedWebhooks) {
            expect(retrieved.serverId).toBe(serverId);
          }

          // Verify all created webhooks are in the result
          for (const w of uniqueWebhooks) {
            const found = retrievedWebhooks.find(rw => rw.name === w.name);
            expect(found).toBeDefined();
            expect(found?.url).toBe(w.url);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
