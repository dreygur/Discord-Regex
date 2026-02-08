import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { logger, LogLevel, LogContext } from '../debug';

describe('Structured Logging - Property-Based Tests', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Feature: discord-regex-bot, Property 36: Log level support
  // Validates: Requirements 11.1
  it('Property 36: For any log event, the system should support logging at INFO, WARN, or ERROR levels', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // message
        (message) => {
          // Test INFO level
          logger.info(message);
          expect(consoleLogSpy).toHaveBeenCalled();
          const infoLog = JSON.parse(consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0]);
          expect(infoLog.level).toBe(LogLevel.INFO);
          expect(infoLog.message).toBe(message);

          // Test WARN level
          logger.warn(message);
          expect(consoleWarnSpy).toHaveBeenCalled();
          const warnLog = JSON.parse(consoleWarnSpy.mock.calls[consoleWarnSpy.mock.calls.length - 1][0]);
          expect(warnLog.level).toBe(LogLevel.WARN);
          expect(warnLog.message).toBe(message);

          // Test ERROR level
          logger.error(message);
          expect(consoleErrorSpy).toHaveBeenCalled();
          const errorLog = JSON.parse(consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1][0]);
          expect(errorLog.level).toBe(LogLevel.ERROR);
          expect(errorLog.message).toBe(message);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 37: Contextual logging
  // Validates: Requirements 11.6
  it('Property 37: For any logged event, the log entry should include contextual information such as serverId, userId, timestamp, and relevant identifiers where applicable', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // message
        fc.record({
          serverId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          userId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          webhookName: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          patternId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
        }), // context
        (message, context) => {
          // Filter out undefined values from context
          const cleanContext: LogContext = Object.fromEntries(
            Object.entries(context).filter(([_, v]) => v !== undefined)
          );

          logger.info(message, cleanContext);
          expect(consoleLogSpy).toHaveBeenCalled();
          
          const logOutput = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
          const parsedLog = JSON.parse(logOutput);

          // Verify timestamp exists and is valid ISO format
          expect(parsedLog.timestamp).toBeDefined();
          expect(() => new Date(parsedLog.timestamp)).not.toThrow();

          // Verify message is included
          expect(parsedLog.message).toBe(message);

          // Verify context is included if it has any properties
          if (Object.keys(cleanContext).length > 0) {
            expect(parsedLog.context).toBeDefined();
            
            // Verify all provided context fields are present
            Object.entries(cleanContext).forEach(([key, value]) => {
              expect(parsedLog.context[key]).toBe(value);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 38: JSON log structure
  // Validates: Requirements 11.7
  it('Property 38: For any log entry, the output should be valid JSON that can be parsed by machine log analyzers', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // message
        fc.record({
          serverId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          userId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
        }), // context
        fc.constantFrom(LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR), // level
        (message, context, level) => {
          // Filter out undefined values from context
          const cleanContext: LogContext = Object.fromEntries(
            Object.entries(context).filter(([_, v]) => v !== undefined)
          );

          // Log at the specified level
          switch (level) {
            case LogLevel.INFO:
              logger.info(message, cleanContext);
              break;
            case LogLevel.WARN:
              logger.warn(message, cleanContext);
              break;
            case LogLevel.ERROR:
              logger.error(message, cleanContext);
              break;
          }

          // Get the appropriate spy based on level
          const spy = level === LogLevel.INFO ? consoleLogSpy : 
                      level === LogLevel.WARN ? consoleWarnSpy : 
                      consoleErrorSpy;

          expect(spy).toHaveBeenCalled();
          const logOutput = spy.mock.calls[spy.mock.calls.length - 1][0];

          // Verify it's valid JSON
          let parsedLog;
          expect(() => {
            parsedLog = JSON.parse(logOutput);
          }).not.toThrow();

          // Verify required fields exist
          expect(parsedLog).toHaveProperty('timestamp');
          expect(parsedLog).toHaveProperty('level');
          expect(parsedLog).toHaveProperty('message');

          // Verify field types
          expect(typeof parsedLog.timestamp).toBe('string');
          expect(typeof parsedLog.level).toBe('string');
          expect(typeof parsedLog.message).toBe('string');

          // Verify level matches
          expect(parsedLog.level).toBe(level);

          // Verify message matches
          expect(parsedLog.message).toBe(message);

          // If context was provided, verify it's an object
          if (Object.keys(cleanContext).length > 0) {
            expect(typeof parsedLog.context).toBe('object');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
