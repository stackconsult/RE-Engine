/**
 * Standardized Error Handling Utilities
 * Consistent error patterns across the RE Engine
 */

import { logError } from '../observability/logger.js';

export interface ErrorContext {
  operation?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  service?: string;
  timeout?: number;
  retryAfter?: number;
  timestamp?: string;
}

export interface ServiceError extends Error {
  code: string;
  statusCode?: number;
  context?: ErrorContext;
  timestamp: string;
}

export class BaseError extends Error implements ServiceError {
  code: string;
  statusCode?: number;
  context?: ErrorContext;
  timestamp: string;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'DATABASE_ERROR', 500, context);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'NOT_FOUND', 404, context);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'CONFLICT', 409, context);
    this.name = 'ConflictError';
  }
}

export class ExternalServiceError extends BaseError {
  constructor(message: string, service: string, context?: ErrorContext) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, { ...context, service });
    this.name = 'ExternalServiceError';
  }
}

export class TimeoutError extends BaseError {
  constructor(message: string, timeout: number, context?: ErrorContext) {
    super(message, 'TIMEOUT', 408, { ...context, timeout });
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string, retryAfter?: number, context?: ErrorContext) {
    super(message, 'RATE_LIMIT', 429, { ...context, retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Error handling utility functions
 */
export class ErrorHandler {
  /**
   * Handle and log errors consistently
   */
  static handle(error: unknown, context?: ErrorContext): ServiceError {
    const serviceError = this.normalizeError(error, context);
    logError(serviceError, context?.operation || 'Unknown operation', context?.metadata);
    return serviceError;
  }

  /**
   * Normalize any error to ServiceError format
   */
  static normalizeError(error: unknown, context?: ErrorContext): ServiceError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      return new BaseError(error.message, 'UNKNOWN_ERROR', 500, context);
    }

    if (typeof error === 'string') {
      return new BaseError(error, 'UNKNOWN_ERROR', 500, context);
    }

    if (typeof error === 'object' && error !== null) {
      const obj = error as Record<string, unknown>;
      const message = obj.message || obj.error || 'Unknown error occurred';
      const code = obj.code as string || 'UNKNOWN_ERROR';
      const statusCode = obj.status as number || obj.statusCode as number || 500;
      
      return new BaseError(
        typeof message === 'string' ? message : String(message),
        code,
        statusCode,
        context
      );
    }

    return new BaseError('Unknown error occurred', 'UNKNOWN_ERROR', 500, context);
  }

  /**
   * Create error response for API endpoints
   */
  static createErrorResponse(error: ServiceError): {
    error: {
      code: string;
      message: string;
      timestamp: string;
      context?: ErrorContext;
    };
    statusCode: number;
  } {
    return {
      error: {
        code: error.code,
        message: error.message,
        timestamp: error.timestamp,
        context: error.context
      },
      statusCode: error.statusCode || 500
    };
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: ServiceError): boolean {
    const retryableCodes = [
      'TIMEOUT',
      'EXTERNAL_SERVICE_ERROR',
      'DATABASE_ERROR',
      'RATE_LIMIT'
    ];

    return retryableCodes.includes(error.code) || 
           Boolean(error.statusCode && error.statusCode >= 500);
  }

  /**
   * Get retry delay for exponential backoff
   */
  static getRetryDelay(attempt: number, baseDelay: number = 1000): number {
    const maxDelay = 30000; // 30 seconds max
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Wrap async functions with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handle(error, context);
    }
  }

  /**
   * Create context for error tracking
   */
  static createContext(
    operation: string,
    additionalContext?: Partial<ErrorContext>
  ): ErrorContext {
    return {
      operation,
      ...additionalContext
    };
  }
}

/**
 * Type guard for ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof BaseError || 
         (typeof error === 'object' && 
          error !== null && 
          'code' in error && 
          'message' in error &&
          'timestamp' in error);
}

/**
 * Decorator for automatic error handling on methods
 */
export function handleErrors(context?: Partial<ErrorContext>) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const operationContext = ErrorHandler.createContext(
        `${target?.constructor?.name || 'Unknown'}.${propertyName}`,
        context
      );

      try {
        return await method.apply(this, args);
      } catch (error) {
        throw ErrorHandler.handle(error, operationContext);
      }
    };

    return descriptor;
  };
}
