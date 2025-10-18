/**
 * Simplified logger using Vercel's built-in logging (console).
 * Compatible with Turbopack and automatically captured by Vercel.
 * 
 * Logs are viewable in:
 * - Vercel Dashboard → Project → Logs
 * - `vercel logs` CLI command
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isProduction = process.env.NODE_ENV === 'production';

// Helper to format log output
const formatLog = (context: string, level: LogLevel, dataOrMsg: Record<string, unknown> | string, msg?: string) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${context}] [${level.toUpperCase()}]`;
  
  // Handle both Pino-style (data, message) and simple (message) calls
  if (typeof dataOrMsg === 'string') {
    // Simple message only: logger.info('message')
    return `${prefix} ${dataOrMsg}`;
  } else if (msg) {
    // Pino-style: logger.info({ data }, 'message')
    return `${prefix} ${msg} ${JSON.stringify(dataOrMsg)}`;
  } else {
    // Data only: logger.info({ data })
    return `${prefix} ${JSON.stringify(dataOrMsg)}`;
  }
};

// Create child loggers for specific contexts
export const createLogger = (context: string) => {
  return {
    info: (dataOrMsg: Record<string, unknown> | string, msg?: string) => {
      console.log(formatLog(context, 'info', dataOrMsg, msg));
    },

    warn: (dataOrMsg: Record<string, unknown> | string, msg?: string) => {
      console.warn(formatLog(context, 'warn', dataOrMsg, msg));
    },

    error: (dataOrMsg: Record<string, unknown> | string, msg?: string) => {
      console.error(formatLog(context, 'error', dataOrMsg, msg));
    },

    debug: (dataOrMsg: Record<string, unknown> | string, msg?: string) => {
      // Only log debug in development
      if (!isProduction) {
        console.debug(formatLog(context, 'debug', dataOrMsg, msg));
      }
    },
  };
};

// Default logger without context
export const logger = createLogger('app');

export default logger;
