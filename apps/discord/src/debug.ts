// Structured logging system for CloudWatch integration
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  serverId?: string;
  userId?: string;
  webhookName?: string;
  patternId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 && { context })
    };
    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.WARN, message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatLog(LogLevel.ERROR, message, context));
  }
}

// Export singleton instance
export const logger = new Logger();

// Maintain backward compatibility with old debug interface
export const debug = {
  log: (message: string, context?: LogContext | any) => {
    // If context is a primitive value, wrap it in an object
    if (context !== undefined && context !== null && typeof context !== 'object') {
      logger.info(message, { value: context });
    } else {
      logger.info(message, context);
    }
  },
  error: (message: string, context?: LogContext | any) => {
    // If context is a primitive value or error, wrap it appropriately
    if (context !== undefined && context !== null) {
      if (context instanceof Error) {
        logger.error(message, { error: context.message, stack: context.stack });
      } else if (typeof context !== 'object') {
        logger.error(message, { value: context });
      } else {
        logger.error(message, context);
      }
    } else {
      logger.error(message, context);
    }
  }
};