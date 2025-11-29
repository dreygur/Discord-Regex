import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeInput, escapeForJSON } from '../sanitize';

describe('Input Sanitization Property Tests', () => {
  // Feature: discord-regex-bot, Property 39: Input sanitization
  // For any user input from Discord messages or Dashboard forms, the system should sanitize the input before using it in webhook payloads or database operations.
  // Validates: Requirements 15.1, 15.2
  
  it('Property 39: sanitizeInput should always return a string', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input);
        expect(typeof result).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: sanitizeInput should remove null bytes from any input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const inputWithNullBytes = input + '\0' + input;
        const result = sanitizeInput(inputWithNullBytes);
        expect(result).not.toContain('\0');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: sanitizeInput should escape special characters', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input);
        // If input contained quotes, they should be escaped
        if (input.includes('"')) {
          expect(result).toContain('\\"');
        }
        if (input.includes("'")) {
          expect(result).toContain("\\'");
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: sanitizeInput should handle non-string inputs gracefully', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        if (typeof input !== 'string') {
          const result = sanitizeInput(input as any);
          expect(result).toBe('');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: escapeForJSON should always return a string', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = escapeForJSON(input);
        expect(typeof result).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: escapeForJSON should produce valid JSON-safe strings', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = escapeForJSON(input);
        // The escaped string should be parseable when wrapped in quotes
        const jsonString = `"${result}"`;
        expect(() => JSON.parse(jsonString)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: escapeForJSON should handle non-string inputs gracefully', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        if (typeof input !== 'string') {
          const result = escapeForJSON(input as any);
          expect(result).toBe('');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: sanitized input should not contain control characters', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input);
        // Check that control characters (except escaped ones) are removed
        const controlCharRegex = /[\x00-\x1F\x7F]/;
        expect(controlCharRegex.test(result)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
