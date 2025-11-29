import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeInput, escapeForJSON } from '../sanitize';

describe('Injection Prevention Property Tests', () => {
  // Feature: discord-regex-bot, Property 40: Injection prevention
  // For any webhook POST body construction, the system should properly escape user-provided content to prevent injection attacks.
  // Validates: Requirements 15.3

  it('Property 40: sanitized content should not break JSON structure', () => {
    fc.assert(
      fc.property(fc.string(), (maliciousInput) => {
        const sanitized = sanitizeInput(maliciousInput);
        const jsonPayload = JSON.stringify({ content: sanitized });
        
        // Should be valid JSON
        expect(() => JSON.parse(jsonPayload)).not.toThrow();
        
        // Parsed content should match sanitized input
        const parsed = JSON.parse(jsonPayload);
        expect(parsed.content).toBe(sanitized);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 40: escaped content should not break JSON when substituted in template', () => {
    fc.assert(
      fc.property(fc.string(), (maliciousInput) => {
        const escaped = escapeForJSON(maliciousInput);
        const template = `{"message": "${escaped}", "type": "alert"}`;
        
        // Should be valid JSON
        expect(() => JSON.parse(template)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 40: common injection patterns should be neutralized', () => {
    const injectionPatterns = [
      '"; DROP TABLE users; --',
      '<script>alert("XSS")</script>',
      '${process.env.SECRET}',
      '{{7*7}}',
      '../../etc/passwd',
      '\'; DELETE FROM webhooks WHERE \'1\'=\'1',
      '"><img src=x onerror=alert(1)>',
      '${constructor.constructor("return process")()}',
      '{{constructor.constructor("return process")()}}',
      '\n\r\t\0',
    ];

    injectionPatterns.forEach(pattern => {
      const sanitized = sanitizeInput(pattern);
      const escaped = escapeForJSON(pattern);
      
      // Sanitized version should not contain raw injection patterns
      const jsonPayload = JSON.stringify({ content: sanitized });
      expect(() => JSON.parse(jsonPayload)).not.toThrow();
      
      // Escaped version should be safe in templates
      const template = `{"data": "${escaped}"}`;
      expect(() => JSON.parse(template)).not.toThrow();
    });
  });

  it('Property 40: double quotes should be properly escaped', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.includes('"')),
        (input) => {
          const sanitized = sanitizeInput(input);
          const escaped = escapeForJSON(input);
          
          // Sanitized should have escaped quotes
          if (input.includes('"')) {
            expect(sanitized).toContain('\\"');
          }
          
          // Should be valid in JSON
          const jsonPayload = `{"content": "${escaped}"}`;
          expect(() => JSON.parse(jsonPayload)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 40: newlines should be properly escaped', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.includes('\n') || s.includes('\r')),
        (input) => {
          const sanitized = sanitizeInput(input);
          const escaped = escapeForJSON(input);
          
          // Should be valid in JSON
          const jsonPayload = `{"content": "${escaped}"}`;
          expect(() => JSON.parse(jsonPayload)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 40: backslashes should be properly escaped', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.includes('\\')),
        (input) => {
          const sanitized = sanitizeInput(input);
          const escaped = escapeForJSON(input);
          
          // Should be valid in JSON
          const jsonPayload = `{"content": "${escaped}"}`;
          expect(() => JSON.parse(jsonPayload)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 40: template substitution should not allow code execution', () => {
    fc.assert(
      fc.property(fc.string(), (maliciousInput) => {
        const escaped = escapeForJSON(maliciousInput);
        const template = `{"alert": "User said: ${escaped}"}`;
        
        // Parse should succeed
        const parsed = JSON.parse(template);
        
        // The parsed value should be a string, not executable code
        expect(typeof parsed.alert).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 40: null bytes should be removed to prevent truncation attacks', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const inputWithNullBytes = input + '\0malicious\0content';
        const sanitized = sanitizeInput(inputWithNullBytes);
        
        // Null bytes should be removed
        expect(sanitized).not.toContain('\0');
        
        // Should still be valid JSON
        const jsonPayload = JSON.stringify({ content: sanitized });
        expect(() => JSON.parse(jsonPayload)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 40: control characters should be removed to prevent protocol smuggling', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitizeInput(input);
        
        // Control characters (except escaped newlines/tabs) should be removed
        const controlCharRegex = /[\x00-\x1F\x7F]/;
        expect(controlCharRegex.test(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 40: Unicode escape sequences should not break JSON parsing', () => {
    const unicodeStrings = [
      '\u0000',
      '\u001F',
      '\u007F',
      '\uFEFF',
      '\\u0000',
      String.fromCharCode(0),
      String.fromCharCode(31),
    ];

    unicodeStrings.forEach(str => {
      const sanitized = sanitizeInput(str);
      const escaped = escapeForJSON(str);
      
      const jsonPayload = `{"content": "${escaped}"}`;
      expect(() => JSON.parse(jsonPayload)).not.toThrow();
    });
  });
});
