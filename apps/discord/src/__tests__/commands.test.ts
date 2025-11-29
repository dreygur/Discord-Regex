import { describe, it, expect, beforeEach, vi } from 'vitest';
import { database } from '../database';

// Mock dependencies
vi.mock('../database');
vi.mock('../config', () => ({
  config: {
    color: 0x00ff00,
    thumbnail: 'https://example.com/thumb.png'
  }
}));

describe('Slash Commands - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockInteraction = (commandName: string, options: any = {}): any => ({
    guildId: '123',
    options: {
      get: (name: string) => options[name] ? { value: options[name] } : undefined
    },
    reply: vi.fn().mockResolvedValue(undefined)
  });

  describe('add-pattern command', () => {
    it('should add a regex pattern to database', async () => {
      const { command } = await import('../commands/add-pattern');
      const interaction = createMockInteraction('add-pattern', {
        pattern: '/test/',
        webhook: 'webhook1'
      });

      (database.addRegex as any).mockResolvedValue(undefined);

      await command.execute(interaction);

      expect(database.addRegex).toHaveBeenCalledWith('123', '/test/', 'webhook1');
      expect(interaction.reply).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { command } = await import('../commands/add-pattern');
      const interaction = createMockInteraction('add-pattern', {
        pattern: '/test/',
        webhook: 'webhook1'
      });

      (database.addRegex as any).mockRejectedValue(new Error('Database error'));

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });
  });

  describe('list-pattern command', () => {
    it('should list all patterns for a server', async () => {
      const { command } = await import('../commands/list-pattern');
      const interaction = createMockInteraction('list-pattern');

      const mockPatterns = [
        { serverId: '123', regexPattern: '/test/', webhookName: 'webhook1', user_ids: ['All'] },
        { serverId: '123', regexPattern: '/hello/', webhookName: 'webhook2', user_ids: ['All'] }
      ];

      (database.getRegexesByServer as any).mockResolvedValue(mockPatterns);

      await command.execute(interaction);

      expect(database.getRegexesByServer).toHaveBeenCalledWith('123');
      expect(interaction.reply).toHaveBeenCalled();
    });

    it('should handle empty pattern list', async () => {
      const { command } = await import('../commands/list-pattern');
      const interaction = createMockInteraction('list-pattern');

      (database.getRegexesByServer as any).mockResolvedValue([]);

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith('No patterns found.');
    });

    it('should handle errors gracefully', async () => {
      const { command } = await import('../commands/list-pattern');
      const interaction = createMockInteraction('list-pattern');

      (database.getRegexesByServer as any).mockRejectedValue(new Error('Database error'));

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });
  });

  describe('remove-pattern command', () => {
    it('should remove a regex pattern from database', async () => {
      const { command } = await import('../commands/remove-pattern');
      const interaction = createMockInteraction('remove-pattern', {
        pattern: '/test/'
      });

      (database.deleteRegex as any).mockResolvedValue(undefined);

      await command.execute(interaction);

      expect(database.deleteRegex).toHaveBeenCalledWith('123', '/test/');
      expect(interaction.reply).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { command } = await import('../commands/remove-pattern');
      const interaction = createMockInteraction('remove-pattern', {
        pattern: '/test/'
      });

      (database.deleteRegex as any).mockRejectedValue(new Error('Database error'));

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });
  });

  describe('list-webhooks command', () => {
    it('should list all webhooks for a server', async () => {
      const { command } = await import('../commands/list-webhooks');
      const interaction = createMockInteraction('list-webhooks');

      const mockWebhooks = [
        { name: 'webhook1', url: 'https://example.com/1', serverId: '123', data: '' },
        { name: 'webhook2', url: 'https://example.com/2', serverId: '123', data: '' }
      ];

      (database.getAllWebhooksByServerId as any).mockResolvedValue(mockWebhooks);

      await command.execute(interaction);

      expect(database.getAllWebhooksByServerId).toHaveBeenCalledWith('123');
      expect(interaction.reply).toHaveBeenCalled();
    });

    it('should handle empty webhook list', async () => {
      const { command } = await import('../commands/list-webhooks');
      const interaction = createMockInteraction('list-webhooks');

      (database.getAllWebhooksByServerId as any).mockResolvedValue([]);

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith('No webhooks found.');
    });
  });

  describe('autocomplete logic', () => {
    it('should fetch webhooks for autocomplete', async () => {
      const mockWebhooks = [
        { name: 'webhook1', url: 'https://example.com/1', serverId: '123', data: '' },
        { name: 'webhook2', url: 'https://example.com/2', serverId: '123', data: '' }
      ];

      (database.getAllWebhooksByServerId as any).mockResolvedValue(mockWebhooks);

      const webhooks = await database.getAllWebhooksByServerId('123');

      expect(webhooks.length).toBe(2);
      expect(webhooks.map(w => w.name)).toEqual(['webhook1', 'webhook2']);
    });
  });
});
