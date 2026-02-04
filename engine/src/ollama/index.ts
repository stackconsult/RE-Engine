/**
 * Ollama AI Integration Module
 * Exports all Ollama-related components and types
 */

// Core client and service
export { OllamaClient } from './ollama.client.js';
export { OllamaService } from './ollama.service.js';

// Type definitions
export * from './types.js';

// Re-export commonly used types for convenience
export type {
  OllamaConfig,
  OllamaMessage,
  OllamaRequest,
  OllamaResponse,
  OllamaModel,
  AIRequest,
  AIResponse,
  LeadAnalysisRequest,
  LeadAnalysisResponse,
  OutreachRequest,
  OutreachResponse,
  ScoringRequest,
  ScoringResponse,
  HealthCheck,
  Metrics
} from './types.js';

// Error classes
export {
  OllamaServiceError,
  OllamaConnectionError,
  OllamaModelNotFoundError,
  OllamaTimeoutError
} from './types.js';

// Utility functions
export {
  isOllamaError,
  isLeadAnalysisRequest,
  isOutreachRequest,
  isScoringRequest
} from './types.js';
