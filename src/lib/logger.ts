import pino from 'pino';

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Determine log level from environment or use defaults
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Configure Pino logger
// Note: pino-pretty transport is disabled because it uses worker threads
// which are incompatible with Next.js Turbopack mode
export const logger = pino({
  level: logLevel,

  // Use simple browser-compatible formatting
  browser: {
    asObject: true,
  },

  // Redact sensitive data in production
  ...(isProduction && {
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'email',
        'token',
        'apiKey',
        'secret',
        'stripeToken',
        'clerkId',
        // Add more sensitive fields as needed
      ],
      remove: true, // Remove the fields entirely rather than showing [Redacted]
    },
  }),

  // Add useful default fields
  base: {
    env: process.env.NODE_ENV,
  },
});

// Create child loggers for specific contexts
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// Export convenience methods that match console API for easier migration
export default logger;
