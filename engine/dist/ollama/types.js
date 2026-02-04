/**
 * Type definitions for Ollama integration
 * Centralized types for AI/LLM operations
 */
// Error types
export class OllamaServiceError extends Error {
    code;
    status;
    details;
    constructor(message, code, status, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'OllamaServiceError';
    }
}
export class OllamaConnectionError extends OllamaServiceError {
    constructor(message, details) {
        super(message, 'CONNECTION_ERROR', undefined, details);
        this.name = 'OllamaConnectionError';
    }
}
export class OllamaModelNotFoundError extends OllamaServiceError {
    constructor(modelName) {
        super(`Model '${modelName}' not found`, 'MODEL_NOT_FOUND', 404, { modelName });
        this.name = 'OllamaModelNotFoundError';
    }
}
export class OllamaTimeoutError extends OllamaServiceError {
    constructor(timeout) {
        super(`Request timed out after ${timeout}ms`, 'TIMEOUT_ERROR', 408, { timeout });
        this.name = 'OllamaTimeoutError';
    }
}
// Type guards
export function isOllamaError(error) {
    return typeof error === 'object' && error !== null && 'error' in error;
}
export function isLeadAnalysisRequest(request) {
    return typeof request === 'object' &&
        request !== null &&
        'leadData' in request &&
        'analysisType' in request;
}
export function isOutreachRequest(request) {
    return typeof request === 'object' &&
        request !== null &&
        'leadData' in request &&
        'type' in request &&
        'tone' in request;
}
export function isScoringRequest(request) {
    return typeof request === 'object' &&
        request !== null &&
        'leadData' in request;
}
//# sourceMappingURL=types.js.map