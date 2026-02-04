/**
 * Type definitions for Ollama integration
 * Centralized types for AI/LLM operations
 */

// Core Ollama types
export interface OllamaConfig {
  apiKey?: string;
  baseUrl: string;
  deviceKey?: string;
  model: string;
  timeout?: number;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: OllamaGenerationOptions;
}

export interface OllamaGenerationOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  num_ctx?: number;
  repeat_last_n?: number;
  repeat_penalty?: number;
  seed?: number;
  tfs_z?: number;
  typical_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  mirostat?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

export interface OllamaModelDetails {
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface OllamaVersion {
  version: string;
}

export interface OllamaError {
  error: string;
  status?: number;
  details?: Record<string, unknown>;
}

// AI Service types
export interface AIRequest {
  prompt: string;
  context?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  options?: Partial<OllamaGenerationOptions>;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  processingTime: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Lead analysis types
export interface LeadData {
  company?: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  website?: string;
  linkedin?: string;
  employees?: number;
  revenue?: string;
  technologies?: string[];
}

export interface LeadAnalysisRequest {
  leadData: LeadData;
  analysisType: 'outreach' | 'qualification' | 'enrichment' | 'scoring';
  options?: LeadAnalysisOptions;
}

export interface LeadAnalysisOptions {
  includeRecommendations?: boolean;
  includeInsights?: boolean;
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  customPrompt?: string;
}

export interface LeadAnalysisResponse {
  insights: string[];
  recommendations: string[];
  outreachStrategy?: string;
  qualificationScore?: number;
  confidence: number;
  model: string;
  processingTime: number;
  metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// Outreach generation types
export interface OutreachRequest {
  leadData: LeadData;
  type: 'email' | 'linkedin' | 'cold_call' | 'follow_up';
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  length: 'short' | 'medium' | 'long';
  customInstructions?: string;
}

export interface OutreachResponse {
  message: string;
  subject?: string;
  tone: string;
  type: string;
  wordCount: number;
  model: string;
  processingTime: number;
  success: boolean;
  error?: string;
}

// Lead scoring types
export interface ScoringRequest {
  leadData: LeadData;
  criteria?: ScoringCriteria;
  weights?: ScoringWeights;
}

export interface ScoringCriteria {
  industry?: number;
  companySize?: number;
  revenue?: number;
  technology?: number;
  location?: number;
  description?: number;
}

export interface ScoringWeights {
  industry?: number;
  companySize?: number;
  revenue?: number;
  technology?: number;
  location?: number;
  description?: number;
}

export interface ScoringResponse {
  overallScore: number;
  breakdown: Record<string, number>;
  confidence: number;
  reasoning: string[];
  model: string;
  processingTime: number;
}

// Batch processing types
export interface BatchRequest {
  requests: (LeadAnalysisRequest | OutreachRequest | ScoringRequest)[];
  options?: BatchOptions;
}

export interface BatchOptions {
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
  continueOnError?: boolean;
}

export interface BatchResponse {
  results: (LeadAnalysisResponse | OutreachResponse | ScoringResponse)[];
  errors: BatchError[];
  summary: BatchSummary;
}

export interface BatchError {
  index: number;
  request: LeadAnalysisRequest | OutreachRequest | ScoringRequest;
  error: string;
  retryCount?: number;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
}

// Health and monitoring types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime: number;
  modelAvailable: boolean;
  availableModels: string[];
  error?: string;
}

export interface Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  tokensUsed: number;
  modelsUsed: Record<string, number>;
  errorTypes: Record<string, number>;
  uptime: number;
}

// Configuration types
export interface OllamaServiceConfig extends OllamaConfig {
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  metricsEnabled?: boolean;
  defaultTimeout?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface ModelConfig {
  name: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  contextWindow?: number;
  costPerToken?: number;
  capabilities?: ModelCapabilities;
}

export interface ModelCapabilities {
  chat: boolean;
  completion: boolean;
  embedding: boolean;
  imageGeneration?: boolean;
  codeGeneration?: boolean;
  multilingual?: boolean;
}

// Error types
export class OllamaServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OllamaServiceError';
  }
}

export class OllamaConnectionError extends OllamaServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', undefined, details);
    this.name = 'OllamaConnectionError';
  }
}

export class OllamaModelNotFoundError extends OllamaServiceError {
  constructor(modelName: string) {
    super(`Model '${modelName}' not found`, 'MODEL_NOT_FOUND', 404, { modelName });
    this.name = 'OllamaModelNotFoundError';
  }
}

export class OllamaTimeoutError extends OllamaServiceError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT_ERROR', 408, { timeout });
    this.name = 'OllamaTimeoutError';
  }
}

// Event types
export interface OllamaEvent {
  type: 'request_start' | 'request_complete' | 'request_error' | 'model_loaded' | 'model_unloaded';
  timestamp: string;
  data: Record<string, unknown>;
}

export interface RequestStartEvent extends OllamaEvent {
  type: 'request_start';
  data: {
    requestId: string;
    model: string;
    promptLength: number;
  };
}

export interface RequestCompleteEvent extends OllamaEvent {
  type: 'request_complete';
  data: {
    requestId: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

export interface RequestErrorEvent extends OllamaEvent {
  type: 'request_error';
  data: {
    requestId: string;
    model: string;
    error: string;
    processingTime: number;
  };
}

// Utility types
export type OllamaEventType = OllamaEvent['type'];
export type AnalysisType = LeadAnalysisRequest['analysisType'];
export type OutreachType = OutreachRequest['type'];
export type OutreachTone = OutreachRequest['tone'];
export type OutreachLength = OutreachRequest['length'];
export type DetailLevel = LeadAnalysisOptions['detailLevel'];

// Type guards
export function isOllamaError(error: unknown): error is OllamaError {
  return typeof error === 'object' && error !== null && 'error' in error;
}

export function isLeadAnalysisRequest(request: unknown): request is LeadAnalysisRequest {
  return typeof request === 'object' && 
         request !== null && 
         'leadData' in request && 
         'analysisType' in request;
}

export function isOutreachRequest(request: unknown): request is OutreachRequest {
  return typeof request === 'object' && 
         request !== null && 
         'leadData' in request && 
         'type' in request && 
         'tone' in request;
}

export function isScoringRequest(request: unknown): request is ScoringRequest {
  return typeof request === 'object' && 
         request !== null && 
         'leadData' in request;
}
