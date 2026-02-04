/**
 * Standardized Response Utilities
 * Consistent API response patterns across the RE Engine
 */
import { ErrorHandler } from './error-handler.js';
/**
 * Response builder utility
 */
export class ResponseBuilder {
    /**
     * Create a successful response
     */
    static success(data, metadata) {
        return {
            success: true,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                ...metadata
            }
        };
    }
    /**
     * Create a paginated response
     */
    static paginated(data, page, limit, total, metadata) {
        const totalPages = Math.ceil(total / limit);
        return {
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                ...metadata
            }
        };
    }
    /**
     * Create an error response
     */
    static error(error, details) {
        if (typeof error === 'string') {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error,
                    timestamp: new Date().toISOString(),
                    details
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                }
            };
        }
        const errorResponse = ErrorHandler.createErrorResponse(error);
        return {
            success: false,
            error: {
                code: errorResponse.error.code,
                message: errorResponse.error.message,
                timestamp: errorResponse.error.timestamp,
                details: {
                    ...errorResponse.error.context,
                    ...details
                }
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Create a validation error response
     */
    static validationError(validationErrors, message = 'Validation failed') {
        return {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message,
                timestamp: new Date().toISOString(),
                details: {
                    validationErrors
                }
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Create a not found response
     */
    static notFound(resource, identifier) {
        const message = identifier
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;
        return {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message,
                timestamp: new Date().toISOString()
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Create an unauthorized response
     */
    static unauthorized(message = 'Authentication required') {
        return {
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message,
                timestamp: new Date().toISOString()
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Create a forbidden response
     */
    static forbidden(message = 'Access denied') {
        return {
            success: false,
            error: {
                code: 'FORBIDDEN',
                message,
                timestamp: new Date().toISOString()
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Create a conflict response
     */
    static conflict(message, details) {
        return {
            success: false,
            error: {
                code: 'CONFLICT',
                message,
                timestamp: new Date().toISOString(),
                details
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Create a rate limited response
     */
    static rateLimited(retryAfter, message = 'Rate limit exceeded') {
        return {
            success: false,
            error: {
                code: 'RATE_LIMIT',
                message,
                timestamp: new Date().toISOString(),
                details: retryAfter ? { retryAfter } : undefined
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Create a timeout response
     */
    static timeout(timeout, message) {
        return {
            success: false,
            error: {
                code: 'TIMEOUT',
                message: message || `Operation timed out after ${timeout}ms`,
                timestamp: new Date().toISOString(),
                details: { timeout }
            },
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
}
/**
 * Express middleware for consistent error handling
 */
export function errorHandlerMiddleware(error, _req, res, _next) {
    const serviceError = ErrorHandler.normalizeError(error);
    const response = ResponseBuilder.error(serviceError);
    return res.status(serviceError.statusCode || 500).json(response);
}
/**
 * Utility for measuring operation performance
 */
export class PerformanceTracker {
    startTime;
    operation;
    constructor(operation) {
        this.operation = operation;
        this.startTime = Date.now();
    }
    /**
     * Get the current processing time
     */
    getProcessingTime() {
        return Date.now() - this.startTime;
    }
    /**
     * Complete the operation and return processing time
     */
    complete() {
        return this.getProcessingTime();
    }
    /**
     * Create a success response with processing time
     */
    success(data, metadata) {
        const processingTime = this.complete();
        return ResponseBuilder.success(data, {
            processingTime,
            operation: this.operation,
            ...metadata
        });
    }
    /**
     * Create an error response with processing time
     */
    error(error, details) {
        const processingTime = this.complete();
        return ResponseBuilder.error(error, {
            processingTime,
            operation: this.operation,
            ...details
        });
    }
}
//# sourceMappingURL=response.js.map