/**
 * Orchestration Type Definitions
 * Complete type system for the RE Engine orchestration layer
 */

// Core Component Types
export interface Component {
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'limited';
  execute(action: string, params: any): Promise<any>;
  getHealth?(): Promise<ComponentHealth>;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  metrics: Record<string, number>;
  errors?: string[];
}

// Workflow Types
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  guardrails: string[];
  fallbacks: FallbackStrategy[];
  retryPolicy: RetryPolicy;
  timeout: number;
  metadata?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'llm' | 'mcp' | 'web' | 'mobile' | 'database' | 'api';
  component: string;
  action: string;
  parameters: Record<string, any>;
  dependencies: string[];
  guardrails: string[];
  timeout: number;
  retryPolicy: RetryPolicy;
  fallbacks: FallbackStrategy[];
  metadata?: Record<string, any>;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'manual' | 'event';
  schedule?: string; // Cron expression
  endpoint?: string;
  permission?: string;
  event?: string;
  parameters?: Record<string, any>;
}

export interface WorkflowResult {
  workflowId: string;
  executionId: string;
  success: boolean;
  executionTime: number;
  stepsCompleted: number;
  stepsFailed: number;
  stepsTotal: number;
  results: Map<string, StepResult>;
  context: ExecutionContext;
  timestamp: string;
  error?: string;
}

export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  attempt: number;
  shouldStop?: boolean;
  fallbackUsed?: boolean;
}

// Execution Context
export interface ExecutionContext {
  workflowId: string;
  userId?: string;
  tenantId?: string;
  startTime: number;
  orchestratorId: string;
  traceId: string;
  variables?: Record<string, any>;
  permissions?: string[];
  metadata?: Record<string, any>;
}

// AI Model Types
export interface AIModel {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  provider: string;
  contextWindow: number;
  costPerToken: number;
  isLocal: boolean;
  capabilities: string[];
  specialties?: string[];
  performance: ModelPerformance;
  _rankingScore?: number; // Internal use for debugging
}

export interface ModelRequirements {
  minContextWindow: number;
  maxCostPerToken: number;
  capabilities?: string[];
  specialties?: string[];
  maxLatency?: number;
  minAccuracy?: number;
}

export interface ModelPerformance {
  latency: number;
  accuracy: number;
  reliability: number;
  errorRate: number;
  lastUpdated: number;
}

// Fallback Types
export interface FallbackStrategy {
  type: 'component-replacement' | 'parameter-adjustment' | 'workflow-modification' | 'manual-intervention';
  replacementComponent?: string;
  adjustments?: Record<string, any>;
  modifications?: Record<string, any>;
  reason?: string;
  priority?: number;
}

export interface WorkflowFailure {
  workflowId: string;
  stepId: string;
  error: string;
  context: ExecutionContext;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  component?: string;
  action: string;
  message: string;
  timestamp: number;
  requiresManualIntervention?: boolean;
}

// Guardrail Types
export interface GuardrailRule {
  id: string;
  name: string;
  type: 'data-privacy' | 'security' | 'compliance' | 'performance' | 'cost';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  enabled: boolean;
  conditions: GuardrailCondition[];
  actions: GuardrailAction[];
}

export interface GuardrailCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'greater-than' | 'less-than';
  value: any;
  caseSensitive?: boolean;
}

export interface GuardrailAction {
  type: 'block' | 'warn' | 'modify' | 'escalate';
  parameters?: Record<string, any>;
}

export interface ValidationResult {
  compliant: boolean;
  confidence: number;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  blocked?: boolean;
  requiresApproval?: boolean;
  warning?: boolean;
  info?: boolean;
}

export interface RuleEvaluation {
  compliant: boolean;
  confidence: number;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Action Types
export interface Action {
  id: string;
  type: string;
  component: string;
  action: string;
  parameters: Record<string, any>;
  timestamp: number;
  userId?: string;
  traceId?: string;
}

// Retry Policy
export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoff: 'exponential' | 'linear' | 'fixed';
  stopOnFailure?: boolean;
  retryableErrors?: string[];
}

// Resource Management
export interface ResourceRequirements {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  gpu?: number;
}

export interface ResourceAllocation {
  resources: AllocatedResource[];
  totalCost: number;
  duration: number;
  timestamp: number;
}

export interface AllocatedResource {
  id: string;
  type: string;
  amount: number;
  unit: string;
  cost: number;
  duration: number;
}

// Performance Monitoring
export interface PerformanceMetrics {
  workflowExecution: {
    averageTime: number;
    successRate: number;
    throughput: number;
    resourceUtilization: number;
  };
  modelSelection: {
    selectionTime: number;
    accuracy: number;
    fallbackRate: number;
    performanceImprovement: number;
  };
  fallbackSystem: {
    recoveryTime: number;
    successRate: number;
    userInterventionRate: number;
    systemUptime: number;
  };
  guardrails: {
    evaluationTime: number;
    falsePositiveRate: number;
    violationPrevention: number;
    complianceRate: number;
  };
}

// Queue Types
export interface StepQueue {
  getNextReadyStep(): WorkflowStep | null;
  isEmpty(): boolean;
  getRemainingSteps(): WorkflowStep[];
  markCompleted(stepId: string): void;
  markFailed(stepId: string): void;
}

export interface ResultCollector {
  addResult(stepId: string, result: StepResult): void;
  getResult(stepId: string): StepResult | undefined;
  getAllResults(): Map<string, StepResult>;
  getCompletedSteps(): string[];
  getFailedSteps(): string[];
}

// Health Status
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: any;
  workflows: any;
  resources: any;
  activeWorkflows: number;
  uptime: number;
  timestamp: string;
}

// Execution Status
export interface ExecutionStatus {
  executionId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    remaining: number;
    percentage: number;
  };
  currentStep: string | null;
  executionTime: number;
}

// Task Types
export type TaskType = 
  | 'lead_analysis'
  | 'property_description'
  | 'code_generation'
  | 'document_analysis'
  | 'market_analysis'
  | 'content_generation'
  | 'data_extraction'
  | 'classification'
  | 'summarization'
  | 'translation'
  | 'general';

// Event Types
export interface OrchestrationEvent {
  type: string;
  timestamp: number;
  data: any;
  source: string;
  traceId?: string;
}

// Configuration Types
export interface OrchestrationConfig {
  maxConcurrentWorkflows: number;
  maxConcurrentSteps: number;
  defaultTimeout: number;
  healthCheckInterval: number;
  enableAutoScaling: boolean;
  enableDetailedLogging: boolean;
  enablePerformanceTracking: boolean;
  enableCostOptimization: boolean;
  enableLocalPreference: boolean;
  performanceHistorySize: number;
  fallbackChainDepth: number;
}

// Error Types
export class OrchestrationError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly retryable: boolean;
  public readonly context?: any;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    retryable: boolean = false,
    context?: any
  ) {
    super(message);
    this.name = 'OrchestrationError';
    this.code = code;
    this.severity = severity;
    this.retryable = retryable;
    this.context = context;
  }
}

// Utility Types
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  status?: string[];
  type?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userId?: string;
  tenantId?: string;
}

export interface SearchOptions {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
}

// Audit Types
export interface AuditEvent {
  id: string;
  timestamp: number;
  action: string;
  userId?: string;
  workflowId?: string;
  stepId?: string;
  component: string;
  details: any;
  severity: 'info' | 'warn' | 'error' | 'critical';
  traceId?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  channels: ('email' | 'sms' | 'push' | 'webhook')[];
  data?: any;
  timestamp: number;
  read: boolean;
}

// Analytics Types
export interface WorkflowAnalytics {
  workflowId: string;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  errorRate: number;
  mostCommonErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  performanceTrends: Array<{
    date: string;
    executionTime: number;
    successRate: number;
  }>;
}

export interface ComponentAnalytics {
  componentId: string;
  totalCalls: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  utilization: number;
  cost: number;
}

// Integration Types
export interface MCPIntegration {
  name: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  capabilities: string[];
  lastHealthCheck: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema?: any;
  enabled: boolean;
}

// Mobile Integration Types
export interface MobileIntegration {
  platform: 'ios' | 'android';
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
  deviceInfo?: any;
  lastHealthCheck: number;
}

// Web Automation Types
export interface WebAutomationConfig {
  engines: string[];
  stealthMode: boolean;
  humanBehavior: boolean;
  defaultTimeout: number;
  retryPolicy: RetryPolicy;
  proxyConfig?: ProxyConfig;
}

export interface ProxyConfig {
  enabled: boolean;
  rotation: boolean;
  servers: ProxyServer[];
}

export interface ProxyServer {
  url: string;
  username?: string;
  password?: string;
  country?: string;
  weight: number;
}

// Database Types
export interface DatabaseConfig {
  primary: string;
  fallback: string;
  local: string;
  connectionPool?: {
    min: number;
    max: number;
    idleTimeout: number;
  };
  backup?: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
}

// Cache Types
export interface CacheConfig {
  levels: string[];
  ttl: Record<string, number>;
  maxSize?: Record<string, number>;
  compression?: boolean;
  encryption?: boolean;
}

// Security Types
export interface SecurityConfig {
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm: string;
  };
  authentication: {
    providers: string[];
    mfa: boolean;
    sessionTimeout: number;
  };
  authorization: {
    rbac: boolean;
    permissions: string[];
  };
  audit: {
    enabled: boolean;
    retention: number;
    level: 'basic' | 'detailed' | 'comprehensive';
  };
}
