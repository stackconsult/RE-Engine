/**
 * Ollama AI Integration Module
 * Exports all Ollama-related components and types
 */
// Core client and service
export { OllamaClient } from './ollama.client.js';
export { OllamaService } from './ollama.service.js';
// Type definitions
export * from './types.js';
// Error classes
export { OllamaServiceError, OllamaConnectionError, OllamaModelNotFoundError, OllamaTimeoutError } from './types.js';
// Utility functions
export { isOllamaError, isLeadAnalysisRequest, isOutreachRequest, isScoringRequest } from './types.js';
//# sourceMappingURL=index.js.map