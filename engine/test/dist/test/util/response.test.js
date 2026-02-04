/**
 * Response Utility Tests
 * Comprehensive testing of standardized response patterns
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ResponseBuilder, errorHandlerMiddleware, PerformanceTracker } from '../../src/util/response.js';
import { ValidationError } from '../../src/util/error-handler.js';
describe('Response Builder Utilities', () => {
    describe('Success Responses', () => {
        it('should create basic success response', () => {
            const data = { id: 1, name: 'Test' };
            const response = ResponseBuilder.success(data);
            assert.equal(response.success, true);
            assert.deepEqual(response.data, data);
            assert.ok(response.metadata?.timestamp);
            assert.equal(response.metadata?.version, '1.0.0');
        });
        it('should create success response with custom metadata', () => {
            const data = { message: 'Success' };
            const response = ResponseBuilder.success(data, {
                requestId: 'req-123',
                processingTime: 150
            });
            assert.equal(response.success, true);
            assert.deepEqual(response.data, data);
            assert.equal(response.metadata?.requestId, 'req-123');
            assert.equal(response.metadata?.processingTime, 150);
        });
    });
    describe('Paginated Responses', () => {
        it('should create paginated response correctly', () => {
            const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
            const response = ResponseBuilder.paginated(data, 1, 10, 25);
            assert.equal(response.success, true);
            assert.deepEqual(response.data, data);
            assert.equal(response.pagination.page, 1);
            assert.equal(response.pagination.limit, 10);
            assert.equal(response.pagination.total, 25);
            assert.equal(response.pagination.totalPages, 3);
            assert.equal(response.pagination.hasNext, true);
            assert.equal(response.pagination.hasPrev, false);
        });
        it('should handle last page correctly', () => {
            const data = [{ id: 24 }, { id: 25 }];
            const response = ResponseBuilder.paginated(data, 3, 10, 25);
            assert.equal(response.pagination.page, 3);
            assert.equal(response.pagination.totalPages, 3);
            assert.equal(response.pagination.hasNext, false);
            assert.equal(response.pagination.hasPrev, true);
        });
        it('should handle single page correctly', () => {
            const data = [{ id: 1 }];
            const response = ResponseBuilder.paginated(data, 1, 10, 1);
            assert.equal(response.pagination.page, 1);
            assert.equal(response.pagination.totalPages, 1);
            assert.equal(response.pagination.hasNext, false);
            assert.equal(response.pagination.hasPrev, false);
        });
    });
    describe('Error Responses', () => {
        it('should create error response from string', () => {
            const response = ResponseBuilder.error('Something went wrong');
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'UNKNOWN_ERROR');
            assert.equal(response.error?.message, 'Something went wrong');
            assert.ok(response.error?.timestamp);
        });
        it('should create error response from ServiceError', () => {
            const error = new ValidationError('Invalid input');
            const response = ResponseBuilder.error(error);
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'VALIDATION_ERROR');
            assert.equal(response.error?.message, 'Invalid input');
            assert.ok(response.error?.timestamp);
        });
        it('should include error details', () => {
            const response = ResponseBuilder.error('Test error', {
                field: 'email',
                value: 'invalid-email'
            });
            assert.equal(response.success, false);
            assert.deepEqual(response.error?.details, {
                field: 'email',
                value: 'invalid-email'
            });
        });
    });
    describe('Validation Error Responses', () => {
        it('should create validation error response', () => {
            const validationErrors = [
                { field: 'email', message: 'Invalid email format', value: 'invalid' },
                { field: 'password', message: 'Password too short' }
            ];
            const response = ResponseBuilder.validationError(validationErrors);
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'VALIDATION_ERROR');
            assert.equal(response.error?.message, 'Validation failed');
            assert.deepEqual(response.error?.details?.validationErrors, validationErrors);
        });
        it('should create validation error with custom message', () => {
            const validationErrors = [{ field: 'name', message: 'Required field' }];
            const response = ResponseBuilder.validationError(validationErrors, 'Custom validation message');
            assert.equal(response.error?.message, 'Custom validation message');
        });
    });
    describe('Specific Error Responses', () => {
        it('should create not found response', () => {
            const response = ResponseBuilder.notFound('User', '123');
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'NOT_FOUND');
            assert.equal(response.error?.message, 'User with identifier \'123\' not found');
        });
        it('should create not found response without identifier', () => {
            const response = ResponseBuilder.notFound('Resource');
            assert.equal(response.error?.message, 'Resource not found');
        });
        it('should create unauthorized response', () => {
            const response = ResponseBuilder.unauthorized('Custom auth message');
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'UNAUTHORIZED');
            assert.equal(response.error?.message, 'Custom auth message');
        });
        it('should create forbidden response', () => {
            const response = ResponseBuilder.forbidden('Access denied to resource');
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'FORBIDDEN');
            assert.equal(response.error?.message, 'Access denied to resource');
        });
        it('should create conflict response', () => {
            const response = ResponseBuilder.conflict('Email already exists', {
                email: 'test@example.com'
            });
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'CONFLICT');
            assert.equal(response.error?.message, 'Email already exists');
            assert.deepEqual(response.error?.details, { email: 'test@example.com' });
        });
        it('should create rate limited response', () => {
            const response = ResponseBuilder.rateLimited(60, 'Too many requests');
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'RATE_LIMIT');
            assert.equal(response.error?.message, 'Too many requests');
            assert.deepEqual(response.error?.details, { retryAfter: 60 });
        });
        it('should create timeout response', () => {
            const response = ResponseBuilder.timeout(5000, 'Request timed out');
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'TIMEOUT');
            assert.equal(response.error?.message, 'Request timed out');
            assert.deepEqual(response.error?.details, { timeout: 5000 });
        });
    });
    describe('Performance Tracker', () => {
        it('should track processing time', () => {
            const tracker = new PerformanceTracker('test-operation');
            // Simulate some work
            const start = Date.now();
            while (Date.now() - start < 10) {
                // Wait at least 10ms
            }
            const processingTime = tracker.getProcessingTime();
            assert.ok(processingTime >= 10);
        });
        it('should complete and return processing time', () => {
            const tracker = new PerformanceTracker('test-operation');
            // Simulate work
            const start = Date.now();
            while (Date.now() - start < 5) {
                // Wait at least 5ms
            }
            const processingTime = tracker.complete();
            assert.ok(processingTime >= 5);
        });
        it('should create success response with processing time', () => {
            const tracker = new PerformanceTracker('test-operation');
            const data = { result: 'success' };
            // Simulate work
            const start = Date.now();
            while (Date.now() - start < 5) {
                // Wait at least 5ms
            }
            const response = tracker.success(data);
            assert.equal(response.success, true);
            assert.deepEqual(response.data, data);
            assert.ok(response.metadata?.processingTime);
            assert.equal(response.metadata?.operation, 'test-operation');
        });
        it('should create error response with processing time', () => {
            const tracker = new PerformanceTracker('test-operation');
            const error = new ValidationError('Test error');
            // Simulate work
            const start = Date.now();
            while (Date.now() - start < 5) {
                // Wait at least 5ms
            }
            const response = tracker.error(error);
            assert.equal(response.success, false);
            assert.equal(response.error?.code, 'VALIDATION_ERROR');
            assert.ok(response.metadata?.processingTime);
            assert.equal(response.metadata?.operation, 'test-operation');
        });
    });
    describe('Error Handler Middleware', () => {
        it('should handle errors and return proper response', () => {
            const error = new ValidationError('Test validation error');
            const mockRes = {
                status: (code) => ({
                    json: (data) => ({ statusCode: code, data })
                })
            };
            const result = errorHandlerMiddleware(error, null, mockRes, null);
            // The middleware should return the response
            assert.ok(result.statusCode);
            assert.equal(result.statusCode, 400);
            assert.equal(result.data.success, false);
            assert.equal(result.data.error?.code, 'VALIDATION_ERROR');
        });
        it('should handle string errors', () => {
            const error = 'String error message';
            const mockRes = {
                status: (code) => ({
                    json: (data) => ({ statusCode: code, data })
                })
            };
            const result = errorHandlerMiddleware(error, null, mockRes, null);
            assert.equal(result.statusCode, 500);
            assert.equal(result.data.error?.code, 'UNKNOWN_ERROR');
            assert.equal(result.data.error?.message, 'String error message');
        });
    });
    describe('Type Guards and Interfaces', () => {
        it('should maintain proper response types', () => {
            const successResponse = ResponseBuilder.success('test');
            const errorResponse = ResponseBuilder.error('test');
            const paginatedResponse = ResponseBuilder.paginated([{ id: 1 }], 1, 10, 1);
            const validationResponse = ResponseBuilder.validationError([{ field: 'test', message: 'error' }]);
            // These should compile without type errors
            assert.equal(successResponse.data, 'test');
            assert.equal(errorResponse.success, false);
            assert.equal(paginatedResponse.pagination.page, 1);
            assert.ok(validationResponse.error?.details?.validationErrors);
        });
    });
});
//# sourceMappingURL=response.test.js.map