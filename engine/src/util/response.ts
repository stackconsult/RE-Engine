/**
 * Standardized Response Utilities
 * Consistent API response patterns across the RE Engine
 */

import { ServiceError, ErrorHandler } from './error-handler.ts';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    timestamp: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    processingTime?: number;
    operation?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationErrorResponse extends ApiResponse<never> {
  error: {
    code: string;
    message: string;
    timestamp: string;
    details: {
      validationErrors: ValidationErrorDetail[];
    };
  };
}

/**
 * Response builder utility
 */
export class ResponseBuilder {
  /**
   * Create a successful response
   */
  static success<T>(
    data: T,
    metadata?: Partial<ApiResponse<T>['metadata']>
  ): ApiResponse<T> {
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
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    metadata?: Partial<ApiResponse<T[]>['metadata']>
  ): PaginatedResponse<T> {
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
  static error(
    error: ServiceError | string,
    details?: Record<string, unknown>
  ): ApiResponse<never> {
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
  static validationError(
    validationErrors: ValidationErrorDetail[],
    message: string = 'Validation failed'
  ): ValidationErrorResponse {
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
  static notFound(resource: string, identifier?: string): ApiResponse<never> {
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
  static unauthorized(message: string = 'Authentication required'): ApiResponse<never> {
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
  static forbidden(message: string = 'Access denied'): ApiResponse<never> {
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
  static conflict(message: string, details?: Record<string, unknown>): ApiResponse<never> {
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
  static rateLimited(
    retryAfter?: number,
    message: string = 'Rate limit exceeded'
  ): ApiResponse<never> {
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
  static timeout(
    timeout: number,
    message?: string
  ): ApiResponse<never> {
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
export function errorHandlerMiddleware(
  error: unknown,
  _req: unknown,
  res: any,
  _next: unknown
) {
  const serviceError = ErrorHandler.normalizeError(error);
  const response = ResponseBuilder.error(serviceError);
  
  return res.status(serviceError.statusCode || 500).tson(response);
}

/**
 * Utility for measuring operation performance
 */
export class PerformanceTracker {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  /**
   * Get the current processing time
   */
  getProcessingTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Complete the operation and return processing time
   */
  complete(): number {
    return this.getProcessingTime();
  }

  /**
   * Create a success response with processing time
   */
  success<T>(data: T, metadata?: Record<string, unknown>): ApiResponse<T> {
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
  error(error: ServiceError | string, details?: Record<string, unknown>): ApiResponse<never> {
    const processingTime = this.complete();
    
    return ResponseBuilder.error(error, {
      processingTime,
      operation: this.operation,
      ...details
    });
  }
}
