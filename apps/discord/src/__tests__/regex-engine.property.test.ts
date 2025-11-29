import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseRegex } from '../regex-engine';

// Generator for valid regex patterns (simple patterns to avoid complexity limits)
const simpleRegexPattern = fc.oneof(
  fc.constant('test'),
  fc.constant('\\d+'),
  fc.constant('[a-z]+'),
  fc.constant('hello|world'),
  fc.constant('\\w+@\\w+\\.\\w+'),
  fc.constant('^start'),
  fc.constant('end$'),
  fc.constant('a{2,5}'),
  fc.constant('(group)'),
  fc.constant('[0-9]{3}-[0-9]{4}')
);

// Generator for valid regex flags
const regexFlags = fc.oneof(
  fc.constant(''),
  fc.constant('g'),
  fc.constant('i'),
  fc.constant('m'),
  fc.constant('gi'),
  fc.constant('gim'),
  fc.constant('gimsuy')
);

// Generator for wrapped format regex patterns
const wrappedRegexPattern = fc.tuple(simpleRegexPattern, regexFlags).map(
  ([pattern, flags]) => `/${pattern}/${flags}`
);

describe('Regex Engine - Property-Based Tests', () => {
  // Feature: discord-regex-bot, Property 10: Regex format parsing
  // Validates: Requirements 3.2
  it('Property 10: should parse both wrapped and raw format regex patterns', () => {
    fc.assert(
      fc.property(simpleRegexPattern, (pattern) => {
        // Test raw format
        const rawResult = parseRegex(pattern);
        expect(rawResult).toBeInstanceOf(RegExp);
        expect(rawResult.source).toBe(pattern);

        // Test wrapped format without flags
        const wrappedResult = parseRegex(`/${pattern}/`);
        expect(wrappedResult).toBeInstanceOf(RegExp);
        expect(wrappedResult.source).toBe(pattern);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 11: Regex flag extraction
  // Validates: Requirements 3.3
  it('Property 11: should correctly extract and apply regex flags', () => {
    fc.assert(
      fc.property(wrappedRegexPattern, (wrappedPattern) => {
        const result = parseRegex(wrappedPattern);
        expect(result).toBeInstanceOf(RegExp);

        // Extract expected flags from the wrapped pattern
        const lastSlash = wrappedPattern.lastIndexOf('/');
        const expectedFlags = wrappedPattern.slice(lastSlash + 1);

        // Check each flag is applied
        if (expectedFlags.includes('g')) expect(result.global).toBe(true);
        if (expectedFlags.includes('i')) expect(result.ignoreCase).toBe(true);
        if (expectedFlags.includes('m')) expect(result.multiline).toBe(true);
        if (expectedFlags.includes('s')) expect(result.dotAll).toBe(true);
        if (expectedFlags.includes('u')) expect(result.unicode).toBe(true);
        if (expectedFlags.includes('y')) expect(result.sticky).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 8: Regex syntax validation
  // Validates: Requirements 10.5, 13.1, 13.2
  it('Property 8: should reject invalid regex patterns with descriptive errors', () => {
    // Generator for invalid regex patterns
    const invalidRegexPatterns = fc.oneof(
      fc.constant('[unclosed'),           // Unclosed bracket
      fc.constant('(unclosed'),           // Unclosed parenthesis
      fc.constant('(?invalid)'),          // Invalid group
      fc.constant('*invalid'),            // Invalid quantifier at start
      fc.constant('+invalid'),            // Invalid quantifier at start
      fc.constant('\\'),                  // Trailing backslash
      fc.constant('[z-a]'),               // Invalid range
      fc.constant('(?<>test)'),           // Empty named group
    );

    fc.assert(
      fc.property(invalidRegexPatterns, (invalidPattern) => {
        // Should throw an error for invalid patterns
        expect(() => parseRegex(invalidPattern)).toThrow();
        
        // Error message should be descriptive
        try {
          parseRegex(invalidPattern);
          return false; // Should not reach here
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message.length).toBeGreaterThan(0);
          return true;
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 9: Regex compilation
  // Validates: Requirements 13.3
  it('Property 9: should successfully compile valid regex patterns', () => {
    fc.assert(
      fc.property(simpleRegexPattern, (pattern) => {
        // Valid patterns should compile without throwing
        const result = parseRegex(pattern);
        expect(result).toBeInstanceOf(RegExp);
        
        // The compiled regex should be usable
        expect(() => result.test('test string')).not.toThrow();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
