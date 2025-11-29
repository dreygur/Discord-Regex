import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDatabase } from '../database';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Mock the AWS SDK
vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({
        send: vi.fn()
      }))
    }
  };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn()
  })),
  CreateTableCommand: vi.fn(),
  DescribeTableCommand: vi.fn(),
  DeleteTableCommand: vi.fn(),
  ResourceInUseException: class ResourceInUseException extends Error {},
  ResourceNotFoundException: class ResourceNotFoundException extends Error {}
}));

describe('Database Client - Unit Tests', () => {
  let db: DynamoDatabase;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock send function
    mockSend = vi.fn();
    
    // Mock DynamoDBDocumentClient.from to return an object with our mock send
    (DynamoDBDocumentClient.from as any).mockReturnValue({
      send: mockSend
    });

    db = new DynamoDatabase({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      },
      webhooksTableName: 'test-webhooks',
      regexTableName: 'test-regex',
      serversTableName: 'test-servers'
    });
  });

  describe('Server CRUD operations', () => {
    it('should create a server', async () => {
      mockSend.mockResolvedValue({});

      await db.createServer('123', 'Test Server', 'active', 100);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-servers',
            Item: {
              serverId: '123',
              name: 'Test Server',
              status: 'active',
              totalUsers: 100
            }
          })
        })
      );
    });

    it('should get a server by ID', async () => {
      const mockServer = {
        serverId: '123',
        name: 'Test Server',
        status: 'active',
        totalUsers: 100
      };

      mockSend.mockResolvedValue({ Item: mockServer });

      const result = await db.getServer('123');

      expect(result).toEqual(mockServer);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-servers',
            Key: { serverId: '123' }
          })
        })
      );
    });

    it('should update a server', async () => {
      mockSend.mockResolvedValue({});

      await db.updateServer('123', { name: 'Updated Server', status: 'disabled' });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should delete a server', async () => {
      mockSend.mockResolvedValue({});

      await db.deleteServer('123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-servers',
            Key: { serverId: '123' }
          })
        })
      );
    });

    it('should reject invalid server status', async () => {
      await expect(db.createServer('123', 'Test', 'invalid' as any, 100))
        .rejects.toThrow('Invalid server status');
    });
  });

  describe('Webhook CRUD operations', () => {
    it('should create a webhook', async () => {
      mockSend.mockResolvedValue({});

      await db.createWebhook('webhook1', 'https://example.com', '123', '{}');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-webhooks',
            Item: {
              name: 'webhook1',
              url: 'https://example.com',
              serverId: '123',
              data: '{}'
            }
          })
        })
      );
    });

    it('should get a webhook by name', async () => {
      const mockWebhook = {
        name: 'webhook1',
        url: 'https://example.com',
        serverId: '123',
        data: '{}'
      };

      mockSend.mockResolvedValue({ Item: mockWebhook });

      const result = await db.getWebhook('webhook1');

      expect(result).toEqual(mockWebhook);
    });

    it('should get webhooks by server ID', async () => {
      const mockWebhooks = [
        { name: 'webhook1', url: 'https://example.com/1', serverId: '123', data: '{}' },
        { name: 'webhook2', url: 'https://example.com/2', serverId: '123', data: '{}' }
      ];

      mockSend.mockResolvedValue({ Items: mockWebhooks });

      const result = await db.getAllWebhooksByServerId('123');

      expect(result).toEqual(mockWebhooks);
      expect(result.length).toBe(2);
      expect(result.every(w => w.serverId === '123')).toBe(true);
    });

    it('should update a webhook', async () => {
      mockSend.mockResolvedValue({});

      await db.updateWebhook('webhook1', 'https://example.com/updated', '123', '{}');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should delete a webhook', async () => {
      mockSend.mockResolvedValue({});

      await db.deleteWebhook('webhook1');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-webhooks',
            Key: { name: 'webhook1' }
          })
        })
      );
    });

    it('should reject invalid webhook URLs', async () => {
      await expect(db.createWebhook('webhook1', 'not-a-url', '123', '{}'))
        .rejects.toThrow('Invalid webhook URL');
    });
  });

  describe('Regex pattern CRUD operations', () => {
    it('should add a regex pattern', async () => {
      mockSend.mockResolvedValue({});

      await db.addRegex('123', '/test/', 'webhook1', ['user1', 'user2']);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-regex',
            Item: expect.objectContaining({
              serverId: '123',
              regexPattern: '/test/',
              webhookName: 'webhook1'
            })
          })
        })
      );
    });

    it('should get regex patterns by server ID', async () => {
      const mockPatterns = [
        { serverId: '123', regexPattern: '/test/', webhookName: 'webhook1', user_ids: new Set(['All']) },
        { serverId: '123', regexPattern: '/hello/', webhookName: 'webhook2', user_ids: new Set(['user1']) }
      ];

      mockSend.mockResolvedValue({ Items: mockPatterns });

      const result = await db.getRegexesByServer('123');

      expect(result.length).toBe(2);
      expect(result.every(p => p.serverId === '123')).toBe(true);
    });

    it('should update a regex pattern', async () => {
      mockSend.mockResolvedValue({});

      await db.updateRegex('123', '/test/', { webhookName: 'webhook2' });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should delete a regex pattern', async () => {
      mockSend.mockResolvedValue({});

      await db.deleteRegex('123', '/test/');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-regex',
            Key: { serverId: '123', regexPattern: '/test/' }
          })
        })
      );
    });

    it('should default user_ids to ["All"] when not provided', async () => {
      mockSend.mockResolvedValue({});

      await db.addRegex('123', '/test/', 'webhook1');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Item: expect.objectContaining({
              user_ids: new Set(['All'])
            })
          })
        })
      );
    });
  });

  describe('Query filtering by serverId', () => {
    it('should filter webhooks by serverId', async () => {
      const mockWebhooks = [
        { name: 'webhook1', serverId: '123', url: 'https://example.com/1', data: '{}' },
        { name: 'webhook2', serverId: '123', url: 'https://example.com/2', data: '{}' }
      ];

      mockSend.mockResolvedValue({ Items: mockWebhooks });

      const result = await db.getAllWebhooksByServerId('123');

      expect(result.every(w => w.serverId === '123')).toBe(true);
    });

    it('should filter regex patterns by serverId', async () => {
      const mockPatterns = [
        { serverId: '123', regexPattern: '/test/', webhookName: 'webhook1', user_ids: new Set(['All']) }
      ];

      mockSend.mockResolvedValue({ Items: mockPatterns });

      const result = await db.getRegexesByServer('123');

      expect(result.every(p => p.serverId === '123')).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSend.mockRejectedValue(new Error('Database connection failed'));

      await expect(db.getServer('123')).rejects.toThrow('Database connection failed');
    });

    it('should throw error for invalid regex pattern', async () => {
      await expect(db.addRegex('123', '[invalid', 'webhook1'))
        .rejects.toThrow('Invalid regex pattern');
    });
  });
});
