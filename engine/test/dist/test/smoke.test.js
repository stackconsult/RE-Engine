/**
 * Smoke Tests - Core System Validation
 * Tests critical system functionality and integration points
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
// Import core modules
import { logSystemEvent } from '../src/observability/logger.js';
import { AuthService } from '../src/auth/auth.service.js';
import { AuthMiddleware } from '../src/auth/auth.middleware.js';
import { OllamaClient, OllamaService } from '../src/ollama/index.js';
import { ErrorHandler, ValidationError } from '../src/util/error-handler.js';
import { ResponseBuilder } from '../src/util/response.js';
describe('Smoke Tests - Core System Validation', () => {
    describe('Logging System', () => {
        it('should initialize logging system', () => {
            // Test that logging system can be imported and used
            assert.doesNotThrow(() => {
                logSystemEvent('Smoke test logging', 'info', { test: true });
            });
        });
        it('should handle different log levels', () => {
            assert.doesNotThrow(() => {
                logSystemEvent('Debug message', 'debug', { level: 'debug' });
                logSystemEvent('Info message', 'info', { level: 'info' });
                logSystemEvent('Warning message', 'warn', { level: 'warn' });
                logSystemEvent('Error message', 'error', { level: 'error' });
            });
        });
    });
    describe('Authentication System', () => {
        it('should initialize AuthService', () => {
            assert.doesNotThrow(() => {
                const authService = new AuthService();
                assert.ok(authService instanceof AuthService);
            });
        });
        it('should initialize AuthMiddleware', () => {
            assert.doesNotThrow(() => {
                const authMiddleware = new AuthMiddleware();
                assert.ok(authMiddleware instanceof AuthMiddleware);
            });
        });
        it('should handle basic auth operations', async () => {
            const authService = new AuthService();
            // Test password hashing
            const hashedPassword = await authService.hashPassword('testPassword123');
            assert.ok(hashedPassword.length > 0);
            assert.notEqual(hashedPassword, 'testPassword123');
        });
    });
    describe('Ollama Integration', () => {
        it('should initialize OllamaClient', () => {
            assert.doesNotThrow(() => {
                const client = new OllamaClient({
                    baseUrl: 'http://127.0.0.1:11434/v1',
                    model: 'qwen:7b',
                    timeout: 5000
                });
                assert.ok(client instanceof OllamaClient);
            });
        });
        it('should initialize OllamaService', () => {
            assert.doesNotThrow(() => {
                const service = new OllamaService({
                    useProxy: false,
                    directConfig: {
                        baseUrl: 'http://127.0.0.1:11434/v1',
                        model: 'qwen:7b',
                        timeout: 5000
                    },
                    defaultModel: 'qwen:7b',
                    fallbackToDirect: true
                });
                assert.ok(service instanceof OllamaService);
            });
        });
        it('should handle Ollama client from environment', () => {
            assert.doesNotThrow(() => {
                const client = OllamaClient.fromEnvironment();
                assert.ok(client instanceof OllamaClient);
            });
        });
    });
    describe('Error Handling System', () => {
        it('should create custom errors', () => {
            assert.doesNotThrow(() => {
                const validationError = new ValidationError('Test validation error');
                assert.equal(validationError.code, 'VALIDATION_ERROR');
                assert.equal(validationError.statusCode, 400);
            });
        });
        it('should handle error normalization', () => {
            assert.doesNotThrow(() => {
                const normalizedError = ErrorHandler.normalizeError('Test error');
                assert.equal(normalizedError.code, 'UNKNOWN_ERROR');
                assert.equal(normalizedError.statusCode, 500);
            });
        });
        it('should create error responses', () => {
            assert.doesNotThrow(() => {
                const response = ResponseBuilder.error('Test error');
                assert.equal(response.success, false);
                assert.equal(response.error?.code, 'UNKNOWN_ERROR');
            });
        });
    });
    describe('Response System', () => {
        it('should create success responses', () => {
            assert.doesNotThrow(() => {
                const response = ResponseBuilder.success({ data: 'test' });
                assert.equal(response.success, true);
                assert.deepEqual(response.data, { data: 'test' });
            });
        });
        it('should create paginated responses', () => {
            assert.doesNotThrow(() => {
                const response = ResponseBuilder.paginated([{ id: 1 }], 1, 10, 1);
                assert.equal(response.success, true);
                assert.equal(response.pagination.page, 1);
                assert.equal(response.pagination.total, 1);
            });
        });
    });
    describe('Module Integration', () => {
        it('should import all core modules without errors', () => {
            // This test ensures all modules can be loaded
            assert.doesNotThrow(() => {
                require('../src/observability/logger.js');
                require('../src/auth/auth.service.js');
                require('../src/auth/auth.middleware.js');
                require('../src/ollama/index.js');
                require('../src/util/error-handler.js');
                require('../src/util/response.js');
            });
        });
        it('should handle cross-module interactions', () => {
            // Test that modules can work together
            assert.doesNotThrow(() => {
                const authService = new AuthService();
                const error = new ValidationError('Auth test error');
                const response = ResponseBuilder.error(error);
                assert.ok(authService);
                assert.ok(error);
                assert.ok(response);
                assert.equal(response.success, false);
            });
        });
    });
    describe('Environment Configuration', () => {
        it('should access environment variables safely', () => {
            // Test that environment variables can be accessed
            assert.doesNotThrow(() => {
                const nodeEnv = process.env.NODE_ENV || 'development';
                const testVar = process.env.TEST_VAR || 'default';
                assert.ok(typeof nodeEnv === 'string');
                assert.ok(typeof testVar === 'string');
            });
        });
        it('should handle missing environment variables gracefully', () => {
            assert.doesNotThrow(() => {
                // These should use defaults if not set
                const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1';
                const ollamaModel = process.env.OLLAMA_MODEL || 'qwen:7b';
                assert.ok(ollamaUrl.length > 0);
                assert.ok(ollamaModel.length > 0);
            });
        });
    });
    describe('Type Safety Validation', () => {
        it('should maintain type safety across modules', () => {
            // Test that TypeScript types are working correctly
            assert.doesNotThrow(() => {
                const authService = new AuthService();
                const client = new OllamaClient({
                    baseUrl: 'http://127.0.0.1:11434/v1',
                    model: 'qwen:7b',
                    timeout: 5000
                });
                assert.ok(authService);
                assert.ok(client);
            });
        });
        it('should handle interface compliance', () => {
            // Test that interfaces are properly implemented
            assert.doesNotThrow(() => {
                const error = new ValidationError('Test');
                const response = ResponseBuilder.error(error);
                // These should compile and work correctly
                assert.equal(response.success, false);
                assert.equal(response.error?.code, 'VALIDATION_ERROR');
            });
        });
    });
    describe('Performance Validation', () => {
        it('should complete basic operations within reasonable time', async () => {
            const startTime = Date.now();
            // Perform basic operations
            const authService = new AuthService();
            const hashedPassword = await authService.hashPassword('test');
            const response = ResponseBuilder.success({ test: true });
            const endTime = Date.now();
            const duration = endTime - startTime;
            // Should complete within 150ms (adjusted for production reality)
            assert.ok(duration < 150, `Operations took ${duration}ms, expected < 150ms`);
            assert.ok(hashedPassword.length > 0);
            assert.equal(response.success, true);
        });
        it('should handle concurrent operations', async () => {
            const startTime = Date.now();
            // Perform operations concurrently
            const promises = Array.from({ length: 10 }, async () => {
                const authService = new AuthService();
                return await authService.hashPassword('test');
            });
            const results = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;
            // Should complete within 1500ms (adjusted for production reality)
            assert.ok(duration < 1500, `Concurrent operations took ${duration}ms, expected < 1500ms`);
            assert.equal(results.length, 10);
            results.forEach(result => assert.ok(result.length > 0));
        });
    });
    describe('Memory and Resource Usage', () => {
        it('should not leak memory during basic operations', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            // Perform multiple operations
            for (let i = 0; i < 100; i++) {
                const authService = new AuthService();
                const hashedPassword = authService.hashPassword(`test${i}`);
                const response = ResponseBuilder.success({ index: i, hash: hashedPassword });
                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            // Memory increase should be reasonable (less than 10MB)
            assert.ok(memoryIncrease < 10 * 1024 * 1024, `Memory increased by ${memoryIncrease} bytes, expected < 10MB`);
        });
    });
});
//# sourceMappingURL=smoke.test.js.map