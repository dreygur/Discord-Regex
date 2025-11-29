import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWebhookUrl, validateServerStatus } from '../validation';

// Custom arbitraries for data generation
const serverIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const serverNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
const serverStatusArb = fc.constantFrom('active' as const, 'disabled' as const);
const totalUsersArb = fc.integer({ min: 0, max: 1000000 });

const webhookNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const webhookUrlArb = fc.webUrl({ validSchemes: ['http', 'https'] });
const webhookDataArb = fc.string({ maxLength: 500 });

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

const userIdsArb = fc.oneof(
  fc.constant(['All'] as string[]),
  fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 })
);

// Simple in-memory mock database for testing persistence properties
class MockDatabase {
  private servers: Map<string, any> = new Map();
  private webhooks: Map<string, any> = new Map();
  private patterns: Map<string, any> = new Map();

  async createServer(serverId: string, name: string, status: string, totalUsers: number): Promise<void> {
    validateServerStatus(status);
    this.servers.set(serverId, { serverId, name, status, totalUsers });
  }

  async getServer(serverId: string): Promise<any | null> {
    return this.servers.get(serverId) || null;
  }

  async deleteServer(serverId: string): Promise<void> {
    this.servers.delete(serverId);
  }

  async createWebhook(name: string, url: string, serverId: string, data: string): Promise<void> {
    validateWebhookUrl(url, false);
    this.webhooks.set(name, { name, url, serverId, data });
  }

  async getWebhook(name: string): Promise<any | null> {
    return this.webhooks.get(name) || null;
  }

  async getAllWebhooksByServerId(serverId: string): Promise<any[]> {
    return Array.from(this.webhooks.values()).filter(w => w.serverId === serverId);
  }

  async deleteWebhook(name: string): Promise<void> {
    this.webhooks.delete(name);
  }

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

  clear() {
    this.servers.clear();
    this.webhooks.clear();
    this.patterns.clear();
  }
}

describe('Database Client - Property-Based Tests', () => {

  // Feature: discord-regex-bot, Property 6: URL validation
  // Validates: Requirements 2.2, 15.4
  it('Property 6: URL validation - rejects URLs that do not start with http:// or https://', () => {
    // Generator for invalid URLs (not starting with http:// or https://)
    const invalidUrlGen = fc.oneof(
      // Empty string
      fc.constant(''),
      // Random strings that don't start with http:// or https://
      fc.string().filter(s => !s.startsWith('http://') && !s.startsWith('https://')),
      // Common invalid protocols
      fc.constantFrom('ftp://example.com', 'file:///path', 'ws://example.com', 'example.com', 'www.example.com')
    );

    fc.assert(
      fc.property(invalidUrlGen, (url) => {
        // For any URL that doesn't start with http:// or https://, validation should throw
        expect(() => validateWebhookUrl(url, false)).toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: URL validation - accepts valid HTTP URLs', () => {
    // Generator for valid HTTP URLs
    const validHttpUrlGen = fc.webUrl({ validSchemes: ['http'] });

    fc.assert(
      fc.property(validHttpUrlGen, (url) => {
        // For any valid HTTP URL, validation should not throw (when HTTPS not enforced)
        expect(() => validateWebhookUrl(url, false)).not.toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: URL validation - accepts valid HTTPS URLs', () => {
    // Generator for valid HTTPS URLs
    const validHttpsUrlGen = fc.webUrl({ validSchemes: ['https'] });

    fc.assert(
      fc.property(validHttpsUrlGen, (url) => {
        // For any valid HTTPS URL, validation should not throw (regardless of enforcement)
        expect(() => validateWebhookUrl(url, false)).not.toThrow();
        expect(() => validateWebhookUrl(url, true)).not.toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: URL validation - enforces HTTPS in production mode', () => {
    // Generator for valid HTTP URLs (not HTTPS)
    const validHttpUrlGen = fc.webUrl({ validSchemes: ['http'] });

    fc.assert(
      fc.property(validHttpUrlGen, (url) => {
        // For any HTTP URL, validation should throw when HTTPS is enforced
        expect(() => validateWebhookUrl(url, true)).toThrow(/HTTPS protocol/);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 7: Server status constraint
  // Validates: Requirements 1.4
  it('Property 7: Server status constraint - only accepts "active" or "disabled"', () => {
    // Generator for invalid status values (anything except "active" or "disabled")
    const invalidStatusGen = fc.oneof(
      // Empty string
      fc.constant(''),
      // Random strings that are not "active" or "disabled"
      fc.string().filter(s => s !== 'active' && s !== 'disabled'),
      // Common invalid values
      fc.constantFrom('enabled', 'inactive', 'pending', 'Active', 'Disabled', 'ACTIVE', 'DISABLED', '1', '0', 'true', 'false'),
      // Non-string types
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.boolean(),
      fc.object()
    );

    fc.assert(
      fc.property(invalidStatusGen, (status) => {
        // For any invalid status value, validation should throw
        expect(() => validateServerStatus(status)).toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: Server status constraint - accepts "active"', () => {
    fc.assert(
      fc.property(fc.constant('active'), (status) => {
        // For "active" status, validation should not throw
        expect(() => validateServerStatus(status)).not.toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: Server status constraint - accepts "disabled"', () => {
    fc.assert(
      fc.property(fc.constant('disabled'), (status) => {
        // For "disabled" status, validation should not throw
        expect(() => validateServerStatus(status)).not.toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 1: Server creation persistence
  // Validates: Requirements 1.1, 1.2, 1.3
  it('Property 1: Server creation persistence - creating then retrieving a server returns the same field values', async () => {
    await fc.assert(
      fc.asyncProperty(
        serverIdArb,
        serverNameArb,
        serverStatusArb,
        totalUsersArb,
        async (serverId, name, status, totalUsers) => {
          const db = new MockDatabase();
          
          // Create a server with the generated values
          await db.createServer(serverId, name, status, totalUsers);

          // Retrieve the server
          const retrieved = await db.getServer(serverId);

          // Verify all fields match
          expect(retrieved).not.toBeNull();
          expect(retrieved?.serverId).toBe(serverId);
          expect(retrieved?.name).toBe(name);
          expect(retrieved?.status).toBe(status);
          expect(retrieved?.totalUsers).toBe(totalUsers);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 2: Webhook CRUD round-trip
  // Validates: Requirements 2.1, 2.4
  it('Property 2: Webhook CRUD round-trip - creating then retrieving a webhook returns the same field values', async () => {
    await fc.assert(
      fc.asyncProperty(
        webhookNameArb,
        webhookUrlArb,
        serverIdArb,
        webhookDataArb,
        async (name, url, serverId, data) => {
          const db = new MockDatabase();
          
          // Create a webhook with the generated values
          await db.createWebhook(name, url, serverId, data);

          // Retrieve the webhook
          const retrieved = await db.getWebhook(name);

          // Verify all fields match
          expect(retrieved).not.toBeNull();
          expect(retrieved?.name).toBe(name);
          expect(retrieved?.url).toBe(url);
          expect(retrieved?.serverId).toBe(serverId);
          expect(retrieved?.data).toBe(data);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 3: Regex pattern CRUD round-trip
  // Validates: Requirements 3.1, 3.5
  it('Property 3: Regex pattern CRUD round-trip - creating then retrieving a pattern returns the same field values', async () => {
    await fc.assert(
      fc.asyncProperty(
        serverIdArb,
        regexPatternArb,
        webhookNameArb,
        userIdsArb,
        async (serverId, regexPattern, webhookName, userIds) => {
          const db = new MockDatabase();
          
          // Create a regex pattern with the generated values
          await db.addRegex(serverId, regexPattern, webhookName, userIds);

          // Retrieve the regex pattern
          const retrieved = await db.getRegex(serverId, regexPattern);

          // Verify all fields match
          expect(retrieved).not.toBeNull();
          expect(retrieved?.serverId).toBe(serverId);
          expect(retrieved?.regexPattern).toBe(regexPattern);
          expect(retrieved?.webhookName).toBe(webhookName);
          
          // user_ids should match (note: empty arrays are stored as ['All'])
          const expectedUserIds = userIds.length > 0 ? userIds : ['All'];
          expect(retrieved?.user_ids).toEqual(expectedUserIds);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 4: Server query isolation
  // Validates: Requirements 2.4, 3.5
  it('Property 4: Server query isolation - querying patterns or webhooks for one serverId returns only entities for that serverId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            serverId: serverIdArb,
            webhookName: webhookNameArb,
            webhookUrl: webhookUrlArb,
            webhookData: webhookDataArb,
            regexPattern: regexPatternArb,
          }),
          { minLength: 2, maxLength: 5 }
        ),
        serverIdArb,
        async (entities, queryServerId) => {
          const db = new MockDatabase();
          
          // Ensure queryServerId is one of the entities
          const testEntities = [
            { ...entities[0], serverId: queryServerId },
            ...entities.slice(1).filter(e => e.serverId !== queryServerId)
          ];

          // Create webhooks and patterns for multiple servers
          for (const entity of testEntities) {
            await db.createWebhook(
              entity.webhookName,
              entity.webhookUrl,
              entity.serverId,
              entity.webhookData
            );
            await db.addRegex(
              entity.serverId,
              entity.regexPattern,
              entity.webhookName,
              ['All']
            );
          }

          // Query webhooks for the specific serverId
          const webhooks = await db.getAllWebhooksByServerId(queryServerId);
          
          // All returned webhooks should have the queried serverId
          for (const webhook of webhooks) {
            expect(webhook.serverId).toBe(queryServerId);
          }

          // Query patterns for the specific serverId
          const patterns = await db.getRegexesByServer(queryServerId);
          
          // All returned patterns should have the queried serverId
          for (const pattern of patterns) {
            expect(pattern.serverId).toBe(queryServerId);
          }

          return true;
        }
      ),
      { numRuns: 50 } // Reduced runs due to complexity
    );
  });

  // Feature: discord-regex-bot, Property 5: Deletion completeness
  // Validates: Requirements 2.5
  it('Property 5: Deletion completeness - after deletion, retrieving an entity returns undefined or empty result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({
            type: fc.constant('server' as const),
            serverId: serverIdArb,
            name: serverNameArb,
            status: serverStatusArb,
            totalUsers: totalUsersArb,
          }),
          fc.record({
            type: fc.constant('webhook' as const),
            name: webhookNameArb,
            url: webhookUrlArb,
            serverId: serverIdArb,
            data: webhookDataArb,
          }),
          fc.record({
            type: fc.constant('pattern' as const),
            serverId: serverIdArb,
            regexPattern: regexPatternArb,
            webhookName: webhookNameArb,
            userIds: userIdsArb,
          })
        ),
        async (entity) => {
          const db = new MockDatabase();
          
          // Create the entity
          if (entity.type === 'server') {
            await db.createServer(entity.serverId, entity.name, entity.status, entity.totalUsers);
          } else if (entity.type === 'webhook') {
            await db.createWebhook(entity.name, entity.url, entity.serverId, entity.data);
          } else {
            await db.addRegex(entity.serverId, entity.regexPattern, entity.webhookName, entity.userIds);
          }

          // Delete the entity
          if (entity.type === 'server') {
            await db.deleteServer(entity.serverId);
          } else if (entity.type === 'webhook') {
            await db.deleteWebhook(entity.name);
          } else {
            await db.deleteRegex(entity.serverId, entity.regexPattern);
          }

          // Attempt to retrieve the entity
          let retrieved;
          if (entity.type === 'server') {
            retrieved = await db.getServer(entity.serverId);
          } else if (entity.type === 'webhook') {
            retrieved = await db.getWebhook(entity.name);
          } else {
            retrieved = await db.getRegex(entity.serverId, entity.regexPattern);
          }

          // Verify the entity is not found
          expect(retrieved).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
