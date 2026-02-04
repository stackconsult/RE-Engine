/**
 * Production Service Interface Definitions
 * Complete type definitions for production foundation services */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database/supabase.types.js';

// JWT Management Interface
export interface JWTManager {
  configure(config: JWTConfig): Promise<void>;
  configureRefreshTokens(config: RefreshTokenConfig): Promise<void>;
  generateToken(payload: JWTPayload): Promise<string>;
  verifyToken(token: string): Promise<JWTPayload>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
}

export interface JWTConfig {
  secret: string;
  algorithm: string;
  expiresIn: string;
  issuer: string;
  audience: string;
  clockTolerance: number;
}

export interface RefreshTokenConfig {
  secret: string;
  expiresIn: string;
  rotation: boolean;
}

export interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  [key: string]: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Encryption Management Interface
export interface EncryptionManager {
  configure(config: EncryptionConfig): Promise<void>;
  configureFieldEncryption(config: FieldEncryptionConfig): Promise<void>;
  encrypt(data: string): Promise<string>;
  decrypt(encryptedData: string): Promise<string>;
  encryptField(fieldName: string, value: any): Promise<string>;
  decryptField(fieldName: string, encryptedValue: string): Promise<any>;
  rotateKey(): Promise<void>;
}

export interface EncryptionConfig {
  algorithm: string;
  key: string;
  ivLength: number;
  tagLength?: number;
}

export interface FieldEncryptionConfig {
  fields: string[];
  algorithm: string;
  keyRotation: boolean;
  rotationInterval: number;
}

// Audit Logging Interface
export interface AuditLogger {
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  logSystemEvent(event: SystemEvent): Promise<void>;
  logUserAction(action: UserAction): Promise<void>;
  logDataAccess(access: DataAccessEvent): Promise<void>;
  getAuditLog(filters: AuditFilters): Promise<AuditLogEntry[]>;
}

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemEvent {
  type: string;
  component: string;
  message: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
}

export interface UserAction {
  userId: string;
  action: string;
  resource: string;
  timestamp: number;
  success: boolean;
  details?: any;
}

export interface DataAccessEvent {
  userId: string;
  resource: string;
  operation: 'read' | 'write' | 'delete';
  timestamp: number;
  success: boolean;
  recordId?: string;
}

export interface AuditFilters {
  startDate?: number;
  endDate?: number;
  userId?: string;
  eventType?: string;
  severity?: string;
}

export interface AuditLogEntry {
  id: string;
  type: string;
  timestamp: number;
  message: string;
  severity?: string;
  userId?: string;
  details?: any;
}

// Threat Detection Interface
export interface ThreatDetector {
  configure(config: ThreatDetectionConfig): Promise<void>;
  analyzeRequest(request: RequestAnalysis): Promise<ThreatAssessment>;
  analyzePattern(pattern: PatternAnalysis): Promise<ThreatAssessment>;
  blockIP(ipAddress: string, duration: number): Promise<void>;
  unblockIP(ipAddress: string): Promise<void>;
  getThreatIntelligence(): Promise<ThreatIntelligence>;
}

export interface ThreatDetectionConfig {
  enabled: boolean;
  rules: string[];
  alertThreshold: number;
  autoBlock: boolean;
  blockDuration: number;
}

export interface RequestAnalysis {
  ipAddress: string;
  userAgent: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
}

export interface PatternAnalysis {
  userId: string;
  action: string;
  frequency: number;
  timeWindow: number;
  pattern: string;
}

export interface ThreatAssessment {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  threats: string[];
  recommendations: string[];
  blocked: boolean;
}

export interface ThreatIntelligence {
  activeThreats: Threat[];
  blockedIPs: string[];
  recentAlerts: SecurityEvent[];
  statistics: ThreatStatistics;
}

export interface Threat {
  type: string;
  description: string;
  severity: string;
  source: string;
  timestamp: number;
}

export interface ThreatStatistics {
  totalThreats: number;
  blockedAttempts: number;
  falsePositives: number;
  averageResponseTime: number;
}

// API Key Management Interface
export interface APIKeyManager {
  configure(config: APIKeyConfig): Promise<void>;
  generateKey(scopes: string[]): Promise<APIKey>;
  validateKey(key: string): Promise<APIKeyValidation>;
  revokeKey(keyId: string): Promise<void>;
  rotateKey(keyId: string): Promise<APIKey>;
  getAPIKeys(filters: APIKeyFilters): Promise<APIKey[]>;
}

export interface APIKeyConfig {
  algorithm: string;
  expiresIn: string;
  rateLimit: number;
  ipWhitelist: string[];
}

export interface APIKey {
  keyId: string;
  key: string;
  scopes: string[];
  createdAt: number;
  expiresAt: number;
  usageCount: number;
  lastUsed?: number;
  createdBy: string;
}

export interface APIKeyValidation {
  valid: boolean;
  keyId: string;
  scopes: string[];
  expiresAt: number;
  usageCount: number;
}

export interface APIKeyFilters {
  createdBy?: string;
  scopes?: string[];
  active?: boolean;
  expiresBefore?: number;
  expiresAfter?: number;
}

// Request Validation Interface
export interface RequestValidator {
  configure(config: RequestValidationConfig): Promise<void>;
  validateRequest(request: any): Promise<ValidationResult>;
  sanitizeInput(input: any): any;
  validateSchema(data: any, schema: any): Promise<SchemaValidationResult>;
}

export interface RequestValidationConfig {
  maxPayloadSize: string;
  allowedMethods: string[];
  allowedHeaders: string[];
  sanitizeInput: boolean;
  enableCSRFProtection: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

export interface SchemaValidationError {
  path: string;
  message: string;
  value: any;
}

// DDoS Protection Interface
export interface DDoSProtection {
  configure(config: DDoSProtectionConfig): Promise<void>;
  checkRequest(ipAddress: string): Promise<DDoSCheckResult>;
  blockIP(ipAddress: string, duration: number): Promise<void>;
  unblockIP(ipAddress: string): Promise<void>;
  getStatistics(): Promise<DDoSStatistics>;
}

export interface DDoSProtectionConfig {
  enabled: boolean;
  threshold: number;
  windowMs: number;
  blockDuration: number;
  whitelistIPs?: string[];
}

export interface DDoSCheckResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  blocked: boolean;
}

export interface DDoSStatistics {
  totalRequests: number;
  blockedRequests: number;
  activeBlocks: number;
  averageRequestsPerWindow: number;
}

// IP Whitelist Interface
export interface IPWhitelist {
  configure(config: IPWhitelistConfig): Promise<void>;
  isWhitelisted(ipAddress: string): Promise<boolean>;
  addIP(ipAddress: string): Promise<void>;
  removeIP(ipAddress: string): Promise<void>;
  getWhitelistedIPs(): Promise<string[]>;
}

export interface IPWhitelistConfig {
  enabled: boolean;
  allowedIPs: string[];
  defaultAction: 'allow' | 'deny';
}

// Metrics Collection Interface
export interface MetricsCollector {
  configure(config: MetricsConfig): Promise<void>;
  defineMetric(name: string, definition: MetricDefinition): Promise<void>;
  recordMetric(name: string, value: number, labels?: Record<string, string>): Promise<void>;
  incrementCounter(name: string, labels?: Record<string, string>): Promise<void>;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): Promise<void>;
  recordGauge(name: string, value: number, labels?: Record<string, string>): Promise<void>;
  getMetrics(): Promise<MetricsData>;
}

export interface MetricsConfig {
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
    collectDefaultMetrics: boolean;
  };
  customMetrics: string[];
}

export interface MetricDefinition {
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  buckets?: number[];
  labels?: string[];
}

export interface MetricsData {
  [metricName: string]: MetricValue[];
}

export interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

// Alert Management Interface
export interface AlertManager {
  configure(config: AlertConfig): Promise<void>;
  sendAlert(alert: Alert): Promise<void>;
  createRule(rule: AlertRule): Promise<void>;
  updateRule(ruleId: string, rule: AlertRule): Promise<void>;
  deleteRule(ruleId: string): Promise<void>;
  getAlerts(filters: AlertFilters): Promise<Alert[]>;
  getRules(): Promise<AlertRule[]>;
}

export interface AlertConfig {
  channels: AlertChannel[];
  rules: AlertRule[];
  escalationPolicy?: EscalationPolicy;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  config: Record<string, any>;
}

export interface AlertRule {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  cooldown: number;
  message: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleName: string;
  severity: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  labels: Record<string, string>;
}

export interface AlertFilters {
  severity?: string;
  resolved?: boolean;
  startDate?: number;
  endDate?: number;
  ruleName?: string;
}

export interface EscalationPolicy {
  level1: { delay: number; channels: string[] };
  level2: { delay: number; channels: string[] };
  level3: { delay: number; channels: string[] };
}

// Dashboard Service Interface
export interface DashboardService {
  configure(config: DashboardConfig): Promise<void>;
  createDashboard(dashboard: Dashboard): Promise<Dashboard>;
  updateDashboard(dashboardId: string, dashboard: Dashboard): Promise<Dashboard>;
  deleteDashboard(dashboardId: string): Promise<void>;
  getDashboard(dashboardId: string): Promise<Dashboard>;
  listDashboards(): Promise<Dashboard[]>;
  getDashboardData(dashboardId: string, timeRange: TimeRange): Promise<DashboardData>;
}

export interface DashboardConfig {
  grafana?: {
    enabled: boolean;
    url: string;
    apiKey: string;
  };
  dashboards: Dashboard[];
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  timeRange: TimeRange;
  refreshInterval: number;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'stat' | 'graph' | 'gauge' | 'histogram' | 'table';
  metric: string;
  query: string;
  position: PanelPosition;
}

export interface PanelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TimeRange {
  from: string;
  to: string;
}

export interface DashboardData {
  dashboardId: string;
  timeRange: TimeRange;
  panels: PanelData[];
}

export interface PanelData {
  panelId: string;
  data: any[];
  timestamp: number;
}

// Tracing Service Interface
export interface TracingService {
  configure(config: TracingConfig): Promise<void>;
  configureTracing(operation: string, config: TracingOperationConfig): Promise<void>;
  startSpan(operation: string, parentSpan?: Span): Span;
  finishSpan(span: Span, error?: Error): void;
  getTrace(traceId: string): Promise<Trace>;
  getTraces(filters: TraceFilters): Promise<Trace[]>;
}

export interface TracingConfig {
  jaeger?: {
    endpoint: string;
    serviceName: string;
    sampleRate: number;
  };
  spans: string[];
}

export interface TracingOperationConfig {
  tags: string[];
  includeError: boolean;
  includeDuration: boolean;
  includeModelInfo?: boolean;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  tags: Record<string, any>;
  logs: SpanLog[];
  error?: Error;
}

export interface SpanLog {
  timestamp: number;
  level: string;
  message: string;
  fields: Record<string, any>;
}

export interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime: number;
  duration: number;
  services: string[];
}

export interface TraceFilters {
  serviceName?: string;
  operation?: string;
  minDuration?: number;
  maxDuration?: number;
  startTime?: number;
  endTime?: number;
}

// Health Monitoring Interface
export interface HealthMonitor {
  setupEndpoints(endpoints: HealthEndpoints): Promise<void>;
  setupMetrics(config: MetricsConfig): Promise<void>;
  setupAlerting(config: AlertingConfig): Promise<void>;
  setupTracing(config: TracingConfig): Promise<void>;
  registerService(service: ServiceRegistration): Promise<void>;
  checkAllServices(): Promise<Record<string, HealthCheckResult>>;
  checkService(serviceName: string): Promise<HealthCheckResult>;
  getHealthStatus(): Promise<HealthStatus>;
}

export interface HealthEndpoints {
  liveness: string;
  readiness: string;
  startup: string;
}

export interface AlertingConfig {
  webhook?: string;
  thresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface ServiceRegistration {
  name: string;
  type: string;
  endpoint: string;
  interval: number;
  timeout?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  lastChecked: number;
  responseTime?: number;
  details?: any;
}

export interface HealthStatus {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: Record<string, HealthCheckResult>;
  uptime: number;
  version: string;
}

// Circuit Breaker Interface
export interface CircuitBreaker {
  configure(config: CircuitBreakerConfig): Promise<void>;
  execute<T>(operation: () => Promise<T>, serviceName: string): Promise<T>;
  getState(serviceName: string): CircuitBreakerState;
  reset(serviceName: string): Promise<void>;
  getStatistics(): Promise<CircuitBreakerStatistics>;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  monitoringEnabled?: boolean;
}

export interface CircuitBreakerState {
  service: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: number;
  nextAttempt?: number;
}

export interface CircuitBreakerStatistics {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  totalTimeouts: number;
  averageResponseTime: number;
}

// Rate Limiter Interface
export interface RateLimiter {
  configure(config: RateLimitConfig): Promise<void>;
  checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  getRemainingRequests(key: string, limit: number, windowMs: number): Promise<number>;
  resetKey(key: string): Promise<void>;
}

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

// Self-Healing Manager Interface
export interface SelfHealingManager {
  configureAutoRestart(config: AutoRestartConfig): Promise<void>;
  configureCircuitBreakerHealing(config: CircuitBreakerHealingConfig): Promise<void>;
  configureDatabaseHealing(config: DatabaseHealingConfig): Promise<void>;
  configureAIHealing(config: AIHealingConfig): Promise<void>;
  enableSelfHealing(): Promise<void>;
  disableSelfHealing(): Promise<void>;
  getHealingStatus(): Promise<HealingStatus>;
}

export interface AutoRestartConfig {
  enabled: boolean;
  maxRestarts: number;
  restartDelay: number;
  healthCheckInterval: number;
}

export interface CircuitBreakerHealingConfig {
  enabled: boolean;
  halfOpenMaxCalls: number;
  resetTimeout: number;
}

export interface DatabaseHealingConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export interface AIHealingConfig {
  enabled: boolean;
  fallbackModels: boolean;
  modelReloadTimeout: number;
}

export interface HealingStatus {
  enabled: boolean;
  autoRestart: boolean;
  circuitBreakerHealing: boolean;
  databaseHealing: boolean;
  aiHealing: boolean;
  lastHealingAction?: HealingAction;
}

export interface HealingAction {
  type: string;
  service: string;
  timestamp: number;
  success: boolean;
  details?: any;
}

// Service Registry Interface
export interface ServiceRegistry {
  initialize(config: ServiceRegistryConfig): Promise<void>;
  register(service: ServiceDefinition): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceType: string): Promise<ServiceDefinition[]>;
  getService(serviceId: string): Promise<ServiceDefinition | null>;
  getAllServices(): Promise<ServiceDefinition[]>;
  healthCheck(): Promise<void>;
}

export interface ServiceRegistryConfig {
  discoveryEnabled: boolean;
  healthCheckInterval: number;
  deregisterAfter: number;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  type: string;
  version: string;
  host: string;
  port: number;
  endpoints: ServiceEndpoint[];
  healthCheck: HealthCheckEndpoint;
  metadata: Record<string, any>;
  registeredAt: number;
  lastHeartbeat: number;
}

export interface ServiceEndpoint {
  path: string;
  method: string;
  description: string;
}

export interface HealthCheckEndpoint {
  path: string;
  interval: number;
  timeout: number;
}

// Message Queue Interface
export interface MessageQueue {
  connect(config: MessageQueueConfig): Promise<void>;
  setupQueues(queues: QueueDefinition[]): Promise<void>;
  publish(queueName: string, message: Message): Promise<void>;
  subscribe(queueName: string, handler: MessageHandler): Promise<void>;
  unsubscribe(queueName: string): Promise<void>;
  getQueueStats(queueName: string): Promise<QueueStats>;
  getConnectionStatus(): Promise<ConnectionStatus>;
}

export interface MessageQueueConfig {
  url: string;
  prefetch: number;
  retryDelay: number;
  maxRetries: number;
  durable?: boolean;
}

export interface QueueDefinition {
  name: string;
  durable: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

export interface Message {
  id: string;
  payload: any;
  headers: Record<string, any>;
  timestamp: number;
  priority?: number;
  expiration?: number;
}

export interface MessageHandler {
  (message: Message): Promise<void>;
}

export interface QueueStats {
  name: string;
  messageCount: number;
  consumerCount: number;
  rate: number;
}

export interface ConnectionStatus {
  connected: boolean;
  url: string;
  connectedAt?: number;
  lastActivity?: number;
}

// Performance Optimizer Interface
export interface PerformanceOptimizer {
  configureMemory(config: MemoryConfig): Promise<void>;
  configureCPU(config: CPUConfig): Promise<void>;
  configureNetwork(config: NetworkConfig): Promise<void>;
  configureDatabase(config: DatabaseConfig): Promise<void>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  optimize(): Promise<OptimizationResult>;
  validateConfiguration(): Promise<ValidationResult>;
}

export interface MemoryConfig {
  maxHeapSize: string;
  gcStrategy: string;
  gcInterval: number;
}

export interface CPUConfig {
  maxWorkers: number;
  workerTimeout: number;
  taskQueueSize: number;
}

export interface NetworkConfig {
  keepAlive: boolean;
  timeout: number;
  maxSockets: number;
  maxFreeSockets: number;
}

export interface DatabaseConfig {
  queryTimeout: number;
  connectionTimeout: number;
  statementTimeout: number;
}

export interface PerformanceMetrics {
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  network: NetworkMetrics;
  database: DatabaseMetrics;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  heapUsed: number;
  heapTotal: number;
  gcCount: number;
  gcDuration: number;
}

export interface CPUMetrics {
  usage: number;
  loadAverage: number[];
  activeWorkers: number;
  idleWorkers: number;
}

export interface NetworkMetrics {
  connections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  throughput: number;
}

export interface DatabaseMetrics {
  connections: number;
  queryTime: number;
  queryCount: number;
  errorCount: number;
}

export interface OptimizationResult {
  optimized: boolean;
  improvements: OptimizationImprovement[];
  performanceGain: number;
}

export interface OptimizationImprovement {
  area: string;
  before: number;
  after: number;
  improvement: number;
}

// MCP Server Interface
export interface MCPServer {
  name: string;
  port: number;
  start(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<void>;
  call(method: string, params?: any): Promise<any>;
  getStatus(): Promise<MCPServerStatus>;
}

export interface MCPServerStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastHealthCheck: number;
  responseTime: number;
}

// AI Orchestrator Interface
export interface AIOrchestrator {
  configure(config: AIOrchestratorConfig): Promise<void>;
  processRequest(request: AIRequest): Promise<AIResponse>;
  selectModel(requirements: AIRequirements): Promise<ModelSelection>;
  getModels(): Promise<AIModel[]>;
  getModelPerformance(modelName: string): Promise<ModelPerformance>;
}

export interface AIOrchestratorConfig {
  defaultProvider: string;
  fallbackProvider: string;
  modelSelectionStrategy: string;
  loadBalancing: boolean;
  timeout: number;
}

export interface AIRequest {
  prompt: string;
  taskType: string;
  requirements?: AIRequirements;
  options?: AIOptions;
}

export interface AIRequirements {
  maxLatency?: number;
  requiredAccuracy?: string;
  maxCost?: string;
  complexity?: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIResponse {
  provider: string;
  model: string;
  content: string;
  tokens: number;
  processingTime: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface ModelSelection {
  provider: string;
  model: string;
  confidence: number;
  reasoning: string;
  alternatives?: ModelSelection[];
}

export interface AIModel {
  name: string;
  provider: string;
  type: string;
  capabilities: string[];
  cost: number;
  performance: ModelPerformance;
}

export interface ModelPerformance {
  accuracy: number;
  speed: number;
  reliability: number;
  costEfficiency: number;
}

// Service Status Interfaces
export interface ServiceStatus {
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastHealthCheck: number;
  responseTime: number;
  resources: ResourceUsage;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  lastChecked: number;
  responseTime?: number;
  details?: any;
}

export interface SecurityStatus {
  status: 'secure' | 'warning' | 'compromised';
  features: SecurityFeature[];
  threats: SecurityThreat[];
  lastSecurityCheck: number;
}

export interface SecurityFeature {
  name: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  lastChecked: number;
}

export interface SecurityThreat {
  type: string;
  severity: string;
  description: string;
  timestamp: number;
  resolved: boolean;
}

export interface PerformanceMetrics {
  cpu: number;
  memory: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

// Supabase Service Interface
export interface SupabaseService {
  configure(config: SupabaseConfig): Promise<void>;
  connect(connectionConfig: SupabaseConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  configurePool(config: SupabasePoolConfig): Promise<void>;
  healthCheck(): Promise<SupabaseHealthCheckResult>;
  checkMigrations(): Promise<MigrationStatus>;
  optimizeIndexes(): Promise<IndexOptimizationResult>;
  getClient(): SupabaseClient<Database>;
  getRealtimeClient(): SupabaseRealtimeClient;
  executeQuery<T>(query: SupabaseQuery): Promise<SupabaseQueryResult<T>>;
  executeTransaction<T>(operations: SupabaseOperation[]): Promise<SupabaseTransactionResult<T>>;
  subscribeToChanges(subscription: SupabaseSubscription): Promise<SupabaseSubscriptionHandle>;
  unsubscribe(subscriptionId: string): Promise<void>;
  getMetrics(): Promise<SupabaseMetrics>;
  getStatistics(): Promise<SupabaseStatistics>;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
  schema?: string;
  realtime?: {
    enabled: boolean;
    reconnectInterval: number;
    maxRetries: number;
  };
  auth?: {
    autoRefreshTokens: boolean;
    persistSession: boolean;
    detectSessionInUrl: boolean;
  };
  storage?: {
    buckets: string[];
    defaultBucket: string;
  };
}

export interface SupabaseConnectionConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
  poolSize: number;
  timeout: number;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export interface SupabasePoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  reapIntervalMillis?: number;
}

export interface SupabaseHealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  connection: boolean;
  database: boolean;
  realtime: boolean;
  storage: boolean;
  auth: boolean;
  latency: number;
  lastChecked: number;
  details?: Record<string, unknown>;
}

export interface MigrationStatus {
  current: string;
  latest: string;
  pending: string[];
  completed: string[];
  status: 'up-to-date' | 'pending' | 'error';
  lastMigration?: string;
  lastMigrationTime?: number;
}

export interface IndexOptimizationResult {
  optimized: boolean;
  indexesOptimized: string[];
  improvements: IndexImprovement[];
  performanceGain: number;
  duration: number;
}

export interface IndexImprovement {
  indexName: string;
  tableName: string;
  beforeSize: number;
  afterSize: number;
  improvement: number;
}

export interface SupabaseQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  columns?: string[];
  filters?: SupabaseFilter[];
  orderBy?: SupabaseOrderBy[];
  limit?: number;
  offset?: number;
  data?: Record<string, unknown>;
  returning?: string[];
}

export interface SupabaseFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

export interface SupabaseOrderBy {
  column: string;
  ascending: boolean;
}

export interface SupabaseQueryResult<T> {
  success: boolean;
  data: T[];
  count?: number;
  error?: string;
  executionTime: number;
  cached: boolean;
}

export interface SupabaseOperation {
  type: 'insert' | 'update' | 'delete';
  table: string;
  data?: Record<string, unknown>;
  filters?: SupabaseFilter[];
}

export interface SupabaseTransactionResult<T> {
  success: boolean;
  data: T;
  rollback: boolean;
  error?: string;
  executionTime: number;
}

export interface SupabaseSubscription {
  id: string;
  table: string;
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  filter?: SupabaseFilter[];
  callback: (payload: SupabaseChangePayload) => Promise<void>;
}

export interface SupabaseChangePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  oldRecord?: Record<string, unknown>;
  timestamp: number;
  eventId: string;
}

export interface SupabaseSubscriptionHandle {
  id: string;
  status: 'active' | 'paused' | 'error';
  createdAt: number;
  lastEvent?: number;
  eventCount: number;
  unsubscribe: () => Promise<void>;
}

export interface SupabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageExecutionTime: number;
  };
  realtime: {
    subscriptions: number;
    messages: number;
    errors: number;
  };
  storage: {
    uploads: number;
    downloads: number;
    bytesTransferred: number;
  };
}

export interface SupabaseStatistics {
  uptime: number;
  totalQueries: number;
  totalTransactions: number;
  totalSubscriptions: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  lastReset: number;
}

export interface SupabaseRealtimeClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(channel: string, events: string[], callback: (payload: unknown) => void): Promise<string>;
  unsubscribe(channel: string): Promise<void>;
  isConnected(): boolean;
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error';
}
