/**
 * Shared Type Definitions
 * Centralized types to avoid conflicts and circular dependencies
 */

// Re-export domain types (excluding conflicting ones)
export type { 
  ISO8601, 
  Channel, 
  ApprovalStatus, 
  LeadStatus, 
  ApprovalActionType 
} from '../domain/types.ts';

// Re-export specific domain types with aliases to avoid conflicts
export type { Lead as DomainLead, Approval as DomainApproval } from '../domain/types.ts';

// Re-export database types
export * from '../database/supabase.types.ts';

// Common utility types
export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  lastChecked: number;
  responseTime?: number;
  details?: Record<string, unknown>;
}

// Service status types
export interface ServiceStatus {
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastHealthCheck: number;
  responseTime: number;
  resources: ResourceUsage;
}

// Security feature type (consolidated)
export interface SecurityFeature {
  name: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  lastChecked: number;
  configuration?: Record<string, unknown>;
}

// Rate limiting types (consolidated)
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  totalHits: number;
}

// Event system types
export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, unknown>;
  metadata: EventMetadata;
  occurredAt: number;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  version: number;
  source: string;
}

export interface EventHandler {
  (event: DomainEvent): Promise<void>;
}

export interface EventFilter {
  eventType?: string;
  aggregateType?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  userId?: string;
}

export interface EventAggregation {
  eventType: string;
  count: number;
  timeWindow: number;
  aggregationType: 'count' | 'sum' | 'avg' | 'min' | 'max';
  value?: number;
}

// Service orchestration types
export interface ServiceDefinition {
  id: string;
  name: string;
  type: string;
  version: string;
  host: string;
  port: number;
  endpoints: ServiceEndpoint[];
  healthCheck: HealthCheckEndpoint;
  metadata: Record<string, unknown>;
  registeredAt: number;
  lastHeartbeat: number;
}

export interface ServiceEndpoint {
  path: string;
  method: string;
  description: string;
  timeout?: number;
  retries?: number;
}

export interface HealthCheckEndpoint {
  path: string;
  interval: number;
  timeout: number;
  expectedStatus?: number;
}

export interface ServiceCriteria {
  type?: string;
  version?: string;
  status?: 'running' | 'stopped' | 'error';
  tags?: string[];
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

export interface ServiceResponse {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  body?: unknown;
  duration: number;
  success: boolean;
  error?: string;
}

export interface ServiceEvent {
  id: string;
  type: 'service_registered' | 'service_deregistered' | 'service_health_changed' | 'service_error';
  serviceId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// AI service types
export interface AIRequest {
  id: string;
  prompt: string;
  taskType: string;
  requirements?: AIRequirements;
  options?: AIOptions;
  userId?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface AIRequirements {
  maxLatency?: number;
  requiredAccuracy?: string;
  maxCost?: string;
  complexity?: string;
  modelType?: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface AIResponse {
  requestId: string;
  provider: string;
  model: string;
  content: string;
  tokens: number;
  processingTime: number;
  confidence: number;
  metadata: Record<string, any>;
  cost?: number;
}

export interface ModelSelection {
  provider: string;
  model: string;
  confidence: number;
  reasoning: string;
  estimatedCost?: number;
  estimatedLatency?: number;
  alternatives?: ModelSelection[];
}

export interface ModelConfig {
  name: string;
  provider: string;
  type: string;
  capabilities: string[];
  cost: number;
  performance: ModelPerformance;
  configuration: Record<string, any>;
}

export interface ModelPerformance {
  accuracy: number;
  speed: number;
  reliability: number;
  costEfficiency: number;
  averageLatency: number;
  throughput: number;
}

export interface ModelMetrics {
  modelName: string;
  timestamp: number;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  averageCost: number;
  userSatisfaction?: number;
}

export interface OptimizationResult {
  optimized: boolean;
  improvements: OptimizationImprovement[];
  performanceGain: number;
  costSavings?: number;
  recommendations: string[];
}

export interface OptimizationImprovement {
  area: string;
  before: number;
  after: number;
  improvement: number;
  impact: 'low' | 'medium' | 'high';
}

export interface ResourceAllocation {
  model: string;
  allocatedResources: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
  maxConcurrentRequests: number;
  priority: number;
}

// MCP service types
export interface MCPServer {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
  capabilities: string[];
  configuration: Record<string, any>;
  registeredAt: number;
  lastHealthCheck: number;
}

export interface MCPService {
  id: string;
  name: string;
  type: string;
  description: string;
  serverId: string;
  methods: MCPMethod[];
  configuration: Record<string, any>;
}

export interface MCPMethod {
  name: string;
  description: string;
  parameters: Record<string, any>;
  returnType: string;
  timeout?: number;
}

export interface MCPRequest {
  id: string;
  serviceId: string;
  method: string;
  parameters: Record<string, any>;
  timeout?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface MCPResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  cached: boolean;
}

export interface MCPServerHealth {
  serverId: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastHealthCheck: number;
  details?: Record<string, any>;
}

export interface ServerMetrics {
  serverId: string;
  timestamp: number;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

// Workflow engine types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  configuration: WorkflowConfiguration;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  configuration: Record<string, any>;
  dependencies?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  conditions?: WorkflowCondition[];
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowVariable {
  name: string;
  type: string;
  defaultValue?: any;
  required: boolean;
  description?: string;
}

export interface WorkflowCondition {
  type: string;
  configuration: Record<string, any>;
}

export interface WorkflowConfiguration {
  timeout?: number;
  retryPolicy?: RetryPolicy;
  parallelism?: number;
  errorHandling?: 'stop' | 'continue' | 'retry';
}

export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  stepResults: Record<string, any>;
  metadata: Record<string, any>;
  startTime: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  startTime: number;
  endTime?: number;
  currentStep?: string;
  completedSteps: string[];
  context: WorkflowContext;
  error?: string;
}

export interface WorkflowStatus {
  executionId: string;
  status: string;
  progress: number;
  currentStep?: string;
  estimatedCompletion?: number;
  error?: string;
}

export interface PerformanceAnalysis {
  workflowId: string;
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  bottlenecks: WorkflowBottleneck[];
  recommendations: string[];
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface WorkflowBottleneck {
  stepId: string;
  stepName: string;
  averageDuration: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
}

export interface OptimizationOpportunity {
  type: string;
  description: string;
  estimatedImprovement: number;
  implementation: 'easy' | 'medium' | 'hard';
}

// Data flow types
export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  configuration: PipelineConfiguration;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: string;
  configuration: Record<string, any>;
  inputSchema?: DataSchema;
  outputSchema?: DataSchema;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface PipelineConfiguration {
  batchSize?: number;
  parallelism?: number;
  errorHandling?: 'stop' | 'continue' | 'retry';
  monitoring?: boolean;
  logging?: boolean;
}

export interface DataSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface DataStream {
  id: string;
  data: any[];
  schema: DataSchema;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface DataBatch {
  id: string;
  items: any[];
  batchSize: number;
  batchNumber: number;
  totalBatches: number;
  timestamp: number;
}

export interface ProcessedData {
  processed: boolean;
  data: any[];
  errors: ProcessingError[];
  warnings: ProcessingWarning[];
  metadata: ProcessingMetadata;
}

export interface ProcessedDataBatch {
  batchId: string;
  processed: boolean;
  items: any[];
  errors: ProcessingError[];
  warnings: ProcessingWarning[];
  metadata: ProcessingMetadata;
}

export interface ProcessingError {
  id: string;
  type: string;
  message: string;
  item?: any;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProcessingWarning {
  id: string;
  type: string;
  message: string;
  item?: any;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ProcessingMetadata {
  processedCount: number;
  errorCount: number;
  warningCount: number;
  processingTime: number;
  throughput: number;
  quality: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitized?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CleansedData {
  original: any;
  cleansed: any;
  transformations: DataTransformation[];
  quality: number;
}

export interface DataTransformation {
  type: string;
  description: string;
  before: any;
  after: any;
  timestamp: number;
}

export interface DataFlowMetrics {
  pipelineId: string;
  timestamp: number;
  processedItems: number;
  errorCount: number;
  warningCount: number;
  averageProcessingTime: number;
  throughput: number;
  quality: number;
}

export interface Anomaly {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  timestamp: number;
  confidence: number;
  recommendations: string[];
}

// API Gateway types
export interface APIRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  userId?: string;
  timestamp: number;
}

export interface APIResponse {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  body?: any;
  duration: number;
  cached: boolean;
  error?: string;
}

export interface AuthenticationResult {
  authenticated: boolean;
  userId?: string;
  permissions: string[];
  roles: string[];
  expiresAt?: number;
  error?: string;
}

export interface TransformedRequest {
  original: APIRequest;
  transformed: APIRequest;
  transformations: RequestTransformation[];
}

export interface TransformedResponse {
  original: APIResponse;
  transformed: APIResponse;
  transformations: ResponseTransformation[];
}

export interface RequestTransformation {
  type: string;
  description: string;
  applied: boolean;
  timestamp: number;
}

export interface ResponseTransformation {
  type: string;
  description: string;
  applied: boolean;
  timestamp: number;
}

export interface APIDocumentation {
  version: string;
  title: string;
  description: string;
  endpoints: APIEndpoint[];
  schemas: Record<string, any>;
  authentication: AuthenticationScheme[];
}

export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  parameters: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
  authentication?: boolean;
  rateLimit?: RateLimitConfig;
}

export interface APIParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  location: 'query' | 'path' | 'header';
}

export interface APIRequestBody {
  description: string;
  contentType: string;
  schema: DataSchema;
  required: boolean;
}

export interface AuthenticationScheme {
  type: 'jwt' | 'api_key' | 'oauth2';
  name: string;
  description: string;
  configuration: Record<string, any>;
}
