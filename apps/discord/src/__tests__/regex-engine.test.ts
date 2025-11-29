import { describe, it, expect } from 'vitest';
import { parseRegex } from '../regex-engine';

describe('Regex Engine - Unit Tests', () => {
  describe('parseRegex with wrapped format', () => {
    it('should parse wrapped format /pattern/flags', () => {
      const regex = parseRegex('/test/gi');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('test');
      expect(regex.flags).toContain('g');
      expect(regex.flags).toContain('i');
    });

    it('should parse wrapped format without flags', () => {
      const regex = parseRegex('/hello/');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('hello');
      expect(regex.flags).toBe('');
    });

    it('should handle complex patterns in wrapped format', () => {
      const regex = parseRegex('/\\d{3}-\\d{4}/');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('\\d{3}-\\d{4}');
    });
  });

  describe('parseRegex with raw format', () => {
    it('should parse raw pattern without flags', () => {
      const regex = parseRegex('test');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('test');
    });

    it('should apply default flags to raw pattern', () => {
      const regex = parseRegex('test', 'gi');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('test');
      expect(regex.flags).toContain('g');
      expect(regex.flags).toContain('i');
    });

    it('should handle complex raw patterns', () => {
      const regex = parseRegex('[a-z]+@[a-z]+\\.[a-z]+');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test('test@example.com')).toBe(true);
    });
  });

  describe('flag extraction and application', () => {
    it('should extract and apply global flag', () => {
      const regex = parseRegex('/test/g');
      expect(regex.global).toBe(true);
    });

    it('should extract and apply case-insensitive flag', () => {
      const regex = parseRegex('/test/i');
      expect(regex.ignoreCase).toBe(true);
    });

    it('should extract and apply multiline flag', () => {
      const regex = parseRegex('/test/m');
      expect(regex.multiline).toBe(true);
    });

    it('should extract and apply multiple flags', () => {
      const regex = parseRegex('/test/gim');
      expect(regex.global).toBe(true);
      expect(regex.ignoreCase).toBe(true);
      expect(regex.multiline).toBe(true);
    });
  });

  describe('error handling for invalid patterns', () => {
    it('should throw error for invalid regex syntax', () => {
      expect(() => parseRegex('/[/'))
        .toThrow();
    });

    it('should throw error for unclosed group', () => {
      expect(() => parseRegex('/(abc/'))
        .toThrow();
    });

    it('should throw error for invalid quantifier', () => {
      expect(() => parseRegex('/+/'))
        .toThrow();
    });

    it('should throw error for non-string, non-RegExp input', () => {
      expect(() => parseRegex(123 as any))
        .toThrow('Regex must be a string or RegExp');
    });
  });

  describe('edge cases', () => {
    it('should handle empty pattern', () => {
      const regex = parseRegex('//');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('(?:)'); // Empty regex becomes (?:)
    });

    it('should handle special characters', () => {
      const regex = parseRegex('/\\$\\^\\*\\+\\?/');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('\\$\\^\\*\\+\\?');
    });

    it('should handle forward slashes in pattern', () => {
      const regex = parseRegex('/\\/path\\/to\\/file/');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test('/path/to/file')).toBe(true);
    });

    it('should accept RegExp objects directly', () => {
      const inputRegex = /test/gi;
      const regex = parseRegex(inputRegex);
      expect(regex).toBe(inputRegex);
    });
  });

  describe('complexity limits', () => {
    it('should reject patterns exceeding maximum length', () => {
      const longPattern = 'a'.repeat(1001);
      expect(() => parseRegex(longPattern))
        .toThrow('exceeds maximum length');
    });

    it('should reject patterns with excessive nesting depth', () => {
      const deeplyNested = '('.repeat(15) + 'a' + ')'.repeat(15);
      expect(() => parseRegex(deeplyNested))
        .toThrow('exceeds maximum nesting depth');
    });

    it('should reject nested quantifiers', () => {
      expect(() => parseRegex('/(a+)+/'))
        .toThrow('nested quantifiers');
    });

    it('should reject dangerous alternation patterns', () => {
      expect(() => parseRegex('/(a|b)+/'))
        .toThrow('alternation with quantifiers');
    });

    it('should accept patterns within complexity limits', () => {
      const validPattern = '(a|b)(c|d)';
      expect(() => parseRegex(validPattern)).not.toThrow();
    });
  });
});
