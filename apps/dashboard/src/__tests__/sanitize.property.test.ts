import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  sanitizeString,
  validateServerId,
  validateWebhookName,
  validateRegexPattern,
  validateServerName,
  validateServerStatus,
  validateTotalUsers,
  sanitizeDataTemplate,
  validateUserIds
} from '../lib/sanitize';

describe('Dashboard Input Sanitization Property Tests', () => {
  // Feature: discord-regex-bot, Property 39: Input sanitization
  // For any user input from Discord messages or Dashboard forms, the system should sanitize the input before using it in webhook payloads or database operations.
  // Validates: Requirements 15.1, 15.2

  it('Property 39: sanitizeString should always return a string', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = sanitizeString(input);
        expect(typeof result).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: sanitizeString should remove null bytes', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const inputWithNullBytes = input + '\0' + input;
        const result = sanitizeString(inputWithNullBytes);
        expect(result).not.toContain('\0');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: sanitizeString should trim whitespace', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const paddedInput = '  ' + input + '  ';
        const result = sanitizeString(paddedInput);
        expect(result).toBe(result.trim());
      }),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateServerId should reject non-numeric strings', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length > 0 && !/^\d+$/.test(s)),
        (input) => {
          expect(() => validateServerId(input)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateServerId should accept numeric strings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => n.toString()),
        (input) => {
          const result = validateServerId(input);
          expect(result).toBe(input);
          expect(/^\d+$/.test(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateWebhookName should reject empty strings', () => {
    expect(() => validateWebhookName('')).toThrow();
    expect(() => validateWebhookName('   ')).toThrow();
  });

  it('Property 39: validateWebhookName should reject names over 100 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101, maxLength: 200 }),
        (input) => {
          expect(() => validateWebhookName(input)).toThrow('100 characters or less');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateWebhookName should accept valid names', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (input) => {
          const result = validateWebhookName(input);
          expect(result.length).toBeGreaterThan(0);
          expect(result.length).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateServerStatus should only accept "active" or "disabled"', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s !== 'active' && s !== 'disabled'),
        (input) => {
          expect(() => validateServerStatus(input)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateServerStatus should accept "active" and "disabled"', () => {
    expect(validateServerStatus('active')).toBe('active');
    expect(validateServerStatus('disabled')).toBe('disabled');
  });

  it('Property 39: validateTotalUsers should reject negative numbers', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: -1 }),
        (input) => {
          expect(() => validateTotalUsers(input)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateTotalUsers should reject non-integers', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 100, noNaN: true }).filter(n => !Number.isInteger(n)),
        (input) => {
          expect(() => validateTotalUsers(input)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateTotalUsers should accept non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (input) => {
          const result = validateTotalUsers(input);
          expect(result).toBe(input);
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: sanitizeDataTemplate should handle null and undefined', () => {
    expect(sanitizeDataTemplate(null)).toBeUndefined();
    expect(sanitizeDataTemplate(undefined)).toBeUndefined();
  });

  it('Property 39: sanitizeDataTemplate should stringify objects', () => {
    fc.assert(
      fc.property(
        fc.object(),
        (input) => {
          const result = sanitizeDataTemplate(input);
          if (result !== undefined) {
            expect(typeof result).toBe('string');
            // Should be valid JSON
            expect(() => JSON.parse(result)).not.toThrow();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateUserIds should reject non-arrays', () => {
    fc.assert(
      fc.property(
        fc.anything().filter(x => x !== null && x !== undefined && !Array.isArray(x)),
        (input) => {
          expect(() => validateUserIds(input)).toThrow('must be an array');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateUserIds should accept "All" as a valid user ID', () => {
    const result = validateUserIds(['All']);
    expect(result).toEqual(['All']);
  });

  it('Property 39: validateUserIds should accept numeric string user IDs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => n.toString()), { minLength: 1, maxLength: 10 }),
        (input) => {
          const result = validateUserIds(input);
          expect(result).toBeDefined();
          result!.forEach(id => {
            expect(/^\d+$/.test(id)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: validateUserIds should reject invalid user ID formats', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string().filter(s => s !== 'All' && !/^\d+$/.test(s) && s.length > 0), { minLength: 1, maxLength: 5 }),
        (input) => {
          expect(() => validateUserIds(input)).toThrow('Invalid user ID format');
        }
      ),
      { numRuns: 100 }
    );
  });
});
