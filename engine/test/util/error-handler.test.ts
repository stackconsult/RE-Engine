/**
 * Error Handler Utility Tests
 * Comprehensive testing of standardized error handling system
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  BaseError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  TimeoutError,
  RateLimitError,
  ErrorHandler,
  isServiceError,
  handleErrors
} from '../../src/util/error-handler.js';

describe('Error Handler Utilities', () => {
  describe('Custom Error Classes', () => {
    it('should create BaseError with proper properties', () => {
      const error = new BaseError('Test error', 'TEST_ERROR', 400, {
        operation: 'test-operation',
        userId: 'user-123'
      });

      assert.equal(error.message, 'Test error');
      assert.equal(error.code, 'TEST_ERROR');
      assert.equal(error.statusCode, 400);
      assert.equal(error.name, 'BaseError');
      assert.equal(error.context?.operation, 'test-operation');
      assert.equal(error.context?.userId, 'user-123');
      assert.ok(error.timestamp);
      assert.ok(error.stack);
    });

    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Invalid input');
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.statusCode, 400);
      assert.equal(error.name, 'ValidationError');
    });

    it('should create DatabaseError with correct defaults', () => {
      const error = new DatabaseError('Connection failed');
      assert.equal(error.code, 'DATABASE_ERROR');
      assert.equal(error.statusCode, 500);
      assert.equal(error.name, 'DatabaseError');
    });

    it('should create AuthenticationError with correct defaults', () => {
      const error = new AuthenticationError('Unauthorized');
      assert.equal(error.code, 'AUTHENTICATION_ERROR');
      assert.equal(error.statusCode, 401);
      assert.equal(error.name, 'AuthenticationError');
    });

    it('should create AuthorizationError with correct defaults', () => {
      const error = new AuthorizationError('Access denied');
      assert.equal(error.code, 'AUTHORIZATION_ERROR');
      assert.equal(error.statusCode, 403);
      assert.equal(error.name, 'AuthorizationError');
    });

    it('should create NotFoundError with correct defaults', () => {
      const error = new NotFoundError('Resource not found');
      assert.equal(error.code, 'NOT_FOUND');
      assert.equal(error.statusCode, 404);
      assert.equal(error.name, 'NotFoundError');
    });

    it('should create ConflictError with correct defaults', () => {
      const error = new ConflictError('Resource already exists');
      assert.equal(error.code, 'CONFLICT');
      assert.equal(error.statusCode, 409);
      assert.equal(error.name, 'ConflictError');
    });

    it('should create ExternalServiceError with service context', () => {
      const error = new ExternalServiceError('API call failed', 'payment-service');
      assert.equal(error.code, 'EXTERNAL_SERVICE_ERROR');
      assert.equal(error.statusCode, 502);
      assert.equal(error.context?.service, 'payment-service');
      assert.equal(error.name, 'ExternalServiceError');
    });

    it('should create TimeoutError with timeout context', () => {
      const error = new TimeoutError('Request timed out', 5000);
      assert.equal(error.code, 'TIMEOUT');
      assert.equal(error.statusCode, 408);
      assert.equal(error.context?.timeout, 5000);
      assert.equal(error.name, 'TimeoutError');
    });

    it('should create RateLimitError with retryAfter context', () => {
      const error = new RateLimitError('Too many requests', 60);
      assert.equal(error.code, 'RATE_LIMIT');
      assert.equal(error.statusCode, 429);
      assert.equal(error.context?.retryAfter, 60);
      assert.equal(error.name, 'RateLimitError');
    });
  });

  describe('ErrorHandler Utility', () => {
    it('should handle BaseError correctly', () => {
      const originalError = new ValidationError('Test validation error');
      const handledError = ErrorHandler.handle(originalError, {
        operation: 'test-validation',
        userId: 'user-456'
      });

      assert.equal(handledError, originalError);
      assert.equal(handledError.context?.operation, 'test-validation');
      assert.equal(handledError.context?.userId, 'user-456');
    });

    it('should normalize Error to ServiceError', () => {
      const originalError = new Error('Generic error');
      const normalizedError = ErrorHandler.normalizeError(originalError, {
        operation: 'test-normalization'
      });

      assert.ok(isServiceError(normalizedError));
      assert.equal(normalizedError.message, 'Generic error');
      assert.equal(normalizedError.code, 'UNKNOWN_ERROR');
      assert.equal(normalizedError.statusCode, 500);
      assert.equal(normalizedError.context?.operation, 'test-normalization');
    });

    it('should normalize string to ServiceError', () => {
      const errorMessage = 'String error message';
      const normalizedError = ErrorHandler.normalizeError(errorMessage);

      assert.ok(isServiceError(normalizedError));
      assert.equal(normalizedError.message, errorMessage);
      assert.equal(normalizedError.code, 'UNKNOWN_ERROR');
      assert.equal(normalizedError.statusCode, 500);
    });

    it('should normalize object error to ServiceError', () => {
      const objError = {
        message: 'Object error',
        code: 'CUSTOM_ERROR',
        status: 422,
        additionalProp: 'value'
      };
      const normalizedError = ErrorHandler.normalizeError(objError);

      assert.ok(isServiceError(normalizedError));
      assert.equal(normalizedError.message, 'Object error');
      assert.equal(normalizedError.code, 'CUSTOM_ERROR');
      assert.equal(normalizedError.statusCode, 422);
    });

    it('should create error response correctly', () => {
      const error = new ValidationError('Invalid email format');
      const response = ErrorHandler.createErrorResponse(error);

      assert.equal(response.statusCode, 400);
      assert.equal(response.error.code, 'VALIDATION_ERROR');
      assert.equal(response.error.message, 'Invalid email format');
      assert.ok(response.error.timestamp);
      assert.equal(response.error.context, error.context);
    });

    it('should identify retryable errors correctly', () => {
      const retryableErrors = [
        new TimeoutError('Request timeout', 5000),
        new ExternalServiceError('API down', 'external-api'),
        new DatabaseError('Connection lost'),
        new RateLimitError('Rate limit', 60)
      ];

      retryableErrors.forEach(error => {
        assert.ok(ErrorHandler.isRetryable(error), `${error.code} should be retryable`);
      });
    });

    it('should identify non-retryable errors correctly', () => {
      const nonRetryableErrors = [
        new ValidationError('Invalid input'),
        new AuthenticationError('Unauthorized'),
        new NotFoundError('Not found'),
        new ConflictError('Conflict')
      ];

      nonRetryableErrors.forEach(error => {
        assert.ok(!ErrorHandler.isRetryable(error), `${error.code} should not be retryable`);
      });
    });

    it('should calculate retry delay with exponential backoff', () => {
      const delay1 = ErrorHandler.getRetryDelay(1, 1000);
      const delay2 = ErrorHandler.getRetryDelay(2, 1000);
      const delay3 = ErrorHandler.getRetryDelay(3, 1000);

      assert.equal(delay1, 1000);
      assert.equal(delay2, 2000);
      assert.equal(delay3, 4000);
    });

    it('should cap retry delay at maximum', () => {
      const delay = ErrorHandler.getRetryDelay(10, 1000);
      assert.equal(delay, 30000); // Max delay
    });

    it('should wrap operations with error handling', async () => {
      const successOperation = async () => 'success';
      const result = await ErrorHandler.withErrorHandling(successOperation, {
        operation: 'test-success'
      });

      assert.equal(result, 'success');
    });

    it('should handle operation errors correctly', async () => {
      const failingOperation = async () => {
        throw new Error('Operation failed');
      };

      try {
        await ErrorHandler.withErrorHandling(failingOperation, {
          operation: 'test-failure'
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(isServiceError(error));
        assert.equal((error as BaseError).context?.operation, 'test-failure');
      }
    });

    it('should create error context correctly', () => {
      const context = ErrorHandler.createContext('test-operation', {
        userId: 'user-789',
        metadata: { key: 'value' }
      });

      assert.equal(context.operation, 'test-operation');
      assert.equal(context.userId, 'user-789');
      assert.deepEqual(context.metadata, { key: 'value' });
    });
  });

  describe('Type Guards', () => {
    it('should identify ServiceError correctly', () => {
      const serviceError = new ValidationError('Test error');
      const regularError = new Error('Regular error');
      const stringError = 'String error';
      const objectError = { message: 'Object error', code: 'TEST', timestamp: '2023-01-01' };

      assert.ok(isServiceError(serviceError));
      assert.ok(!isServiceError(regularError));
      assert.ok(!isServiceError(stringError));
      assert.ok(isServiceError(objectError));
    });
  });
});
