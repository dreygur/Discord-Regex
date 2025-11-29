import { describe, it, expect } from 'vitest';
import { validateWebhookName, sanitizeDataTemplate } from '../../lib/sanitize';

describe('Webhooks API Routes - Unit Tests', () => {
  describe('validation logic', () => {
    it('should validate correct webhook name', () => {
      expect(() => validateWebhookName('webhook1')).not.toThrow();
    });

    it('should reject empty webhook name', () => {
      expect(() => validateWebhookName('')).toThrow('Webhook name is required');
    });

    it('should reject webhook name exceeding max length', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateWebhookName(longName)).toThrow('must be 100 characters or less');
    });

    it('should sanitize data template string', () => {
      const template = '{"message": "$content$"}';
      expect(sanitizeDataTemplate(template)).toBe(template);
    });

    it('should handle undefined data template', () => {
      expect(sanitizeDataTemplate(undefined)).toBeUndefined();
    });

    it('should handle null data template', () => {
      expect(sanitizeDataTemplate(null)).toBeUndefined();
    });

    it('should stringify object data template', () => {
      const obj = { message: '$content$' };
      const result = sanitizeDataTemplate(obj);
      expect(result).toBe(JSON.stringify(obj));
    });
  });
});
