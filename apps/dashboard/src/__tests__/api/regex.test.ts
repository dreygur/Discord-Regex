import { describe, it, expect } from 'vitest';
import { validateRegexPattern, validateUserIds } from '../../lib/sanitize';

describe('Regex API Routes - Unit Tests', () => {
  describe('validation logic', () => {
    it('should validate correct regex pattern', () => {
      expect(() => validateRegexPattern('/test/')).not.toThrow();
    });

    it('should reject empty regex pattern', () => {
      expect(() => validateRegexPattern('')).toThrow('Regex pattern is required');
    });

    it('should validate user IDs array', () => {
      const userIds = ['123456789', '987654321'];
      expect(validateUserIds(userIds)).toEqual(userIds);
    });

    it('should allow "All" as user ID', () => {
      const userIds = ['All'];
      expect(validateUserIds(userIds)).toEqual(userIds);
    });

    it('should handle undefined user IDs', () => {
      expect(validateUserIds(undefined)).toBeUndefined();
    });

    it('should reject non-array user IDs', () => {
      expect(() => validateUserIds('not-an-array')).toThrow('must be an array');
    });

    it('should reject invalid user ID format', () => {
      expect(() => validateUserIds(['abc'])).toThrow('Invalid user ID format');
    });

    it('should validate numeric user IDs', () => {
      const userIds = ['123456789'];
      expect(validateUserIds(userIds)).toEqual(userIds);
    });
  });
});
