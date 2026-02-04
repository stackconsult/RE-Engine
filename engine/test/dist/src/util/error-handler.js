/**
 * Standardized Error Handling Utilities
 * Consistent error patterns across the RE Engine
 */
import { logError } from '../observability/logger.js';
export class BaseError extends Error {
    code;
    statusCode;
    context;
    timestamp;
    constructor(message, code, statusCode, context) {
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
    constructor(message, context) {
        super(message, 'VALIDATION_ERROR', 400, context);
        this.name = 'ValidationError';
    }
}
export class DatabaseError extends BaseError {
    constructor(message, context) {
        super(message, 'DATABASE_ERROR', 500, context);
        this.name = 'DatabaseError';
    }
}
export class AuthenticationError extends BaseError {
    constructor(message, context) {
        super(message, 'AUTHENTICATION_ERROR', 401, context);
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends BaseError {
    constructor(message, context) {
        super(message, 'AUTHORIZATION_ERROR', 403, context);
        this.name = 'AuthorizationError';
    }
}
export class NotFoundError extends BaseError {
    constructor(message, context) {
        super(message, 'NOT_FOUND', 404, context);
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends BaseError {
    constructor(message, context) {
        super(message, 'CONFLICT', 409, context);
        this.name = 'ConflictError';
    }
}
export class ExternalServiceError extends BaseError {
    constructor(message, service, context) {
        super(message, 'EXTERNAL_SERVICE_ERROR', 502, { ...context, service });
        this.name = 'ExternalServiceError';
    }
}
export class TimeoutError extends BaseError {
    constructor(message, timeout, context) {
        super(message, 'TIMEOUT', 408, { ...context, timeout });
        this.name = 'TimeoutError';
    }
}
export class RateLimitError extends BaseError {
    constructor(message, retryAfter, context) {
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
    static handle(error, context) {
        const serviceError = this.normalizeError(error, context);
        logError(serviceError, context?.operation || 'Unknown operation', context?.metadata);
        return serviceError;
    }
    /**
     * Normalize any error to ServiceError format
     */
    static normalizeError(error, context) {
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
            const obj = error;
            const message = obj.message || obj.error || 'Unknown error occurred';
            const code = obj.code || 'UNKNOWN_ERROR';
            const statusCode = obj.status || obj.statusCode || 500;
            return new BaseError(typeof message === 'string' ? message : String(message), code, statusCode, context);
        }
        return new BaseError('Unknown error occurred', 'UNKNOWN_ERROR', 500, context);
    }
    /**
     * Create error response for API endpoints
     */
    static createErrorResponse(error) {
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
    static isRetryable(error) {
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
    static getRetryDelay(attempt, baseDelay = 1000) {
        const maxDelay = 30000; // 30 seconds max
        const delay = baseDelay * Math.pow(2, attempt - 1);
        return Math.min(delay, maxDelay);
    }
    /**
     * Wrap async functions with error handling
     */
    static async withErrorHandling(operation, context) {
        try {
            return await operation();
        }
        catch (error) {
            throw this.handle(error, context);
        }
    }
    /**
     * Create context for error tracking
     */
    static createContext(operation, additionalContext) {
        return {
            operation,
            ...additionalContext
        };
    }
}
/**
 * Type guard for ServiceError
 */
export function isServiceError(error) {
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
export function handleErrors(context) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const operationContext = ErrorHandler.createContext(`${target?.constructor?.name || 'Unknown'}.${propertyName}`, context);
            try {
                return await method.apply(this, args);
            }
            catch (error) {
                throw ErrorHandler.handle(error, operationContext);
            }
        };
        return descriptor;
    };
}
//# sourceMappingURL=error-handler.js.map