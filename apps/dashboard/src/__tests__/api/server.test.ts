import { describe, it, expect } from 'vitest';
import { validateServerId, validateServerName, validateServerStatus, validateTotalUsers } from '../../lib/sanitize';

describe('Server API Routes - Unit Tests', () => {
  describe('validation logic', () => {
    it('should validate correct server ID', () => {
      expect(() => validateServerId('123456789')).not.toThrow();
    });

    it('should reject invalid server ID format', () => {
      expect(() => validateServerId('abc')).toThrow('Invalid server ID format');
    });

    it('should reject empty server ID', () => {
      expect(() => validateServerId('')).toThrow('Server ID is required');
    });

    it('should validate correct server name', () => {
      expect(() => validateServerName('Test Server')).not.toThrow();
    });

    it('should reject empty server name', () => {
      expect(() => validateServerName('')).toThrow('Server name is required');
    });

    it('should reject server name exceeding max length', () => {
      const longName = 'a'.repeat(201);
      expect(() => validateServerName(longName)).toThrow('must be 200 characters or less');
    });

    it('should validate active status', () => {
      expect(validateServerStatus('active')).toBe('active');
    });

    it('should validate disabled status', () => {
      expect(validateServerStatus('disabled')).toBe('disabled');
    });

    it('should reject invalid status', () => {
      expect(() => validateServerStatus('invalid')).toThrow('must be either "active" or "disabled"');
    });

    it('should validate positive integer for total users', () => {
      expect(validateTotalUsers(100)).toBe(100);
    });

    it('should reject negative total users', () => {
      expect(() => validateTotalUsers(-1)).toThrow('must be a non-negative integer');
    });

    it('should reject non-integer total users', () => {
      expect(() => validateTotalUsers(10.5)).toThrow('must be a non-negative integer');
    });
  });
});
