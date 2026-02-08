import { describe, it, expect, beforeEach, vi } from 'vitest';
import { regexHandler } from '../regex-handler';
import { database } from '../database';
import { cache } from '../cache';
import { queue } from '../queue';
import type { Message } from 'discord.js';

// Mock dependencies
vi.mock('../database');
vi.mock('../cache');
vi.mock('../queue');
vi.mock('../debug', () => ({
  debug: {
    log: vi.fn(),
    error: vi.fn()
  }
}));

describe('Message Handler - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (cache.get as any).mockReturnValue(undefined);
    (cache.set as any).mockReturnValue(undefined);
  });

  const createMockMessage = (content: string, guildId: string, authorId: string): any => ({
    content,
    guildId,
    author: {
      id: authorId,
      username: 'testuser'
    }
  });

  describe('server status checking', () => {
    it('should skip processing for disabled servers', async () => {
      const message = createMockMessage('test message', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        name: 'Test Server',
        status: 'disabled',
        totalUsers: 100
      });

      await regexHandler(message);

      // Should not fetch patterns or webhooks for disabled server
      expect(database.getRegexesByServer).not.toHaveBeenCalled();
      expect(database.getAllWebhooksByServerId).not.toHaveBeenCalled();
    });

    it('should process messages for active servers', async () => {
      const message = createMockMessage('test message', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        name: 'Test Server',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([]);
      (database.getAllWebhooksByServerId as any).mockResolvedValue([]);

      await regexHandler(message);

      // Should fetch patterns and webhooks for active server
      expect(database.getRegexesByServer).toHaveBeenCalledWith('123');
      expect(database.getAllWebhooksByServerId).toHaveBeenCalledWith('123');
    });

    it('should use cached server status', async () => {
      const message = createMockMessage('test message', '123', 'user1');
      
      (cache.get as any).mockReturnValue({
        servers: {
          serverId: '123',
          name: 'Test Server',
          status: 'active',
          totalUsers: 100
        }
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([]);
      (database.getAllWebhooksByServerId as any).mockResolvedValue([]);

      await regexHandler(message);

      // Should not call database if cache hit
      expect(database.getServer).not.toHaveBeenCalled();
    });
  });

  describe('pattern matching logic', () => {
    it('should match message against regex pattern', async () => {
      const message = createMockMessage('hello world', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/hello/',
          webhookName: 'webhook1',
          user_ids: ['All']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook',
          serverId: '123',
          data: ''
        }
      ]);
      
      (queue.add as any).mockResolvedValue({ status: 200 });

      await regexHandler(message);

      // Should queue webhook delivery for matching pattern
      expect(queue.add).toHaveBeenCalled();
    });

    it('should not trigger webhook for non-matching pattern', async () => {
      const message = createMockMessage('goodbye world', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/hello/',
          webhookName: 'webhook1',
          user_ids: ['All']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook',
          serverId: '123',
          data: ''
        }
      ]);

      await regexHandler(message);

      // Should not queue webhook for non-matching pattern
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('user ID filtering', () => {
    it('should allow message when user is in allowed list', async () => {
      const message = createMockMessage('test message', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/test/',
          webhookName: 'webhook1',
          user_ids: ['user1', 'user2']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook',
          serverId: '123',
          data: ''
        }
      ]);
      
      (queue.add as any).mockResolvedValue({ status: 200 });

      await regexHandler(message);

      expect(queue.add).toHaveBeenCalled();
    });

    it('should block message when user is not in allowed list', async () => {
      const message = createMockMessage('test message', '123', 'user3');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/test/',
          webhookName: 'webhook1',
          user_ids: ['user1', 'user2']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook',
          serverId: '123',
          data: ''
        }
      ]);

      await regexHandler(message);

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should allow all users when user_ids includes "All"', async () => {
      const message = createMockMessage('test message', '123', 'anyuser');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/test/',
          webhookName: 'webhook1',
          user_ids: ['All']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook',
          serverId: '123',
          data: ''
        }
      ]);
      
      (queue.add as any).mockResolvedValue({ status: 200 });

      await regexHandler(message);

      expect(queue.add).toHaveBeenCalled();
    });
  });

  describe('webhook identification', () => {
    it('should find webhook by name', async () => {
      const message = createMockMessage('test message', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/test/',
          webhookName: 'webhook2',
          user_ids: ['All']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook1',
          serverId: '123',
          data: ''
        },
        {
          name: 'webhook2',
          url: 'https://example.com/webhook2',
          serverId: '123',
          data: ''
        }
      ]);
      
      (queue.add as any).mockResolvedValue({ status: 200 });

      await regexHandler(message);

      // Should call the correct webhook URL
      expect(queue.add).toHaveBeenCalledWith(
        new URL('https://example.com/webhook2'),
        expect.any(Object)
      );
    });

    it('should not trigger if webhook not found', async () => {
      const message = createMockMessage('test message', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/test/',
          webhookName: 'nonexistent',
          user_ids: ['All']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook1',
          serverId: '123',
          data: ''
        }
      ]);

      await regexHandler(message);

      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('template substitution', () => {
    it('should substitute $content$ in webhook data template', async () => {
      const message = createMockMessage('hello world', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/hello/',
          webhookName: 'webhook1',
          user_ids: ['All']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook',
          serverId: '123',
          data: '{"message": "$content$", "type": "alert"}'
        }
      ]);
      
      (queue.add as any).mockResolvedValue({ status: 200 });

      await regexHandler(message);

      // Should replace $content$ with actual message
      expect(queue.add).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          body: expect.stringContaining('hello world')
        })
      );
    });

    it('should use default format when no data template', async () => {
      const message = createMockMessage('test message', '123', 'user1');
      
      (database.getServer as any).mockResolvedValue({
        serverId: '123',
        status: 'active',
        totalUsers: 100
      });
      
      (database.getRegexesByServer as any).mockResolvedValue([
        {
          serverId: '123',
          regexPattern: '/test/',
          webhookName: 'webhook1',
          user_ids: ['All']
        }
      ]);
      
      (database.getAllWebhooksByServerId as any).mockResolvedValue([
        {
          name: 'webhook1',
          url: 'https://example.com/webhook',
          serverId: '123',
          data: ''
        }
      ]);
      
      (queue.add as any).mockResolvedValue({ status: 200 });

      await regexHandler(message);

      // Should use default JSON format
      expect(queue.add).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          body: JSON.stringify({ content: 'test message' })
        })
      );
    });
  });
});
