/**
 * Ollama AI Integration Module
 * Exports all Ollama-related components and types
 */

// Core client and service
export { OllamaClient } from './ollama.client.ts';
export { OllamaService } from './ollama.service.ts';

// Type definitions
export * from './types.ts';

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
} from './types.ts';

// Error classes
export {
  OllamaServiceError,
  OllamaConnectionError,
  OllamaModelNotFoundError,
  OllamaTimeoutError
} from './types.ts';

// Utility functions
export {
  isOllamaError,
  isLeadAnalysisRequest,
  isOutreachRequest,
  isScoringRequest
} from './types.ts';
