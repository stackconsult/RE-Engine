import pino from "pino";
import path from "path";
import { hostname } from "os";
import { ConfigService } from "../config/config.service.js";

// Create a production-ready logger configuration
const config = ConfigService.getInstance();
const isProduction = config.get('NODE_ENV') === 'production';
const logLevel = config.get('LOG_LEVEL') || 'info';

// Base logger configuration
const baseConfig = {
  level: logLevel,
  formatters: {
    // Add timestamp and correlation ID
    log: (log: Record<string, unknown>) => {
      log.timestamp = new Date().toISOString();
      log.pid = process.pid;
      log.hostname = hostname();
      return log;
    }
  },
  redact: {
    // Redact sensitive information
    paths: [
      'req.headers.authorization',
      'headers.authorization',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.jwt',
      '*.secret',
      'password',
      'token',
      'apiKey',
      'jwt',
      'secret'
    ],
    remove: true,
  },
  // Transport configuration
  transport: isProduction
    ? {
      target: 'pino/file',
      options: {
        destination: path.join(process.cwd(), 'logs', 'app.log'),
        mkdir: true
      }
    }
    : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
};

// Create child loggers for different modules
export const logger = pino(baseConfig);

export const authLogger = logger.child({ module: 'auth' });
export const dbLogger = logger.child({ module: 'database' });
export const apiLogger = logger.child({ module: 'api' });
export const mcpLogger = logger.child({ module: 'mcp' });
export const approvalLogger = logger.child({ module: 'approvals' });
export const leadLogger = logger.child({ module: 'leads' });

// Structured logging helpers
export const logAuthEvent = (event: string, userId?: string, metadata?: Record<string, unknown>) => {
  authLogger.info({
    event,
    userId,
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logDatabaseOperation = (operation: string, table: string, duration?: number, error?: Error) => {
  const logData: Record<string, unknown> = {
    operation,
    table,
    timestamp: new Date().toISOString()
  };

  if (duration !== undefined) {
    logData.duration = `${duration}ms`;
  }

  if (error) {
    logData.error = error.message;
    dbLogger.error(logData);
  } else {
    dbLogger.info(logData);
  }
};

export const logApiRequest = (method: string, url: string, statusCode: number, duration?: number, userId?: string) => {
  const logData: Record<string, unknown> = {
    method,
    url,
    statusCode,
    timestamp: new Date().toISOString()
  };

  if (duration !== undefined) {
    logData.duration = `${duration}ms`;
  }

  if (userId) {
    logData.userId = userId;
  }

  if (statusCode >= 400) {
    apiLogger.warn(logData);
  } else {
    apiLogger.info(logData);
  }
};

export const logApprovalAction = (action: string, approvalId: string, userId?: string, metadata?: Record<string, unknown>) => {
  approvalLogger.info({
    action,
    approvalId,
    userId,
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logSystemEvent = (event: string, severity: 'info' | 'warn' | 'error' | 'debug' = 'info', metadata?: Record<string, unknown>) => {
  const logData = {
    event,
    severity,
    metadata,
    timestamp: new Date().toISOString()
  };

  switch (severity) {
    case 'error':
      logger.error(logData);
      break;
    case 'warn':
      logger.warn(logData);
      break;
    case 'debug':
      logger.debug(logData);
      break;
    default:
      logger.info(logData);
  }
};

// Performance monitoring
export const logPerformance = (operation: string, duration: number, metadata?: Record<string, unknown>) => {
  logger.info({
    event: 'performance',
    operation,
    duration: `${duration}ms`,
    metadata,
    timestamp: new Date().toISOString()
  });
};

// Error logging with context
export const logError = (error: Error, context?: string, metadata?: Record<string, unknown>) => {
  const logData: Record<string, unknown> = {
    error: error.message,
    stack: error.stack,
    context,
    metadata,
    timestamp: new Date().toISOString()
  };

  logger.error(logData);
};

// Export the main logger for backward compatibility
export default logger;
