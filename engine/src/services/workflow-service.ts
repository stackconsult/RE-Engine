/**
 * Workflow Service
 * High-level service for workflow execution and management
 */

import { EventEmitter } from 'events';
import { MasterOrchestrator } from '../orchestration/master-orchestrator';
import { Workflow, ExecutionContext, WorkflowResult } from '../types/orchestration.types';
import { workflowRegistry } from '../workflows/real-estate-workflows';
import { Logger } from '../utils/logger';

export interface WorkflowServiceConfig {
  defaultTimeout: number;
  maxConcurrentWorkflows: number;
  enableDetailedLogging: boolean;
  enableAutoRetry: boolean;
}

export interface WorkflowExecutionRequest {
  workflowId: string;
  context: ExecutionContext;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowExecutionStatus {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  progress: number;
  result?: WorkflowResult;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow Service
 * High-level service for managing workflow execution
 */
export class WorkflowService extends EventEmitter {
  private orchestrator: MasterOrchestrator;
  private config: WorkflowServiceConfig;
  private logger: Logger;
  private activeExecutions: Map<string, WorkflowExecutionStatus> = new Map();
  private executionQueue: WorkflowExecutionRequest[] = [];
  private isProcessingQueue: boolean = false;

  constructor(orchestrator: MasterOrchestrator, config?: Partial<WorkflowServiceConfig>) {
    super();
    this.orchestrator = orchestrator;
    this.config = {
      defaultTimeout: 600000, // 10 minutes
      maxConcurrentWorkflows: 10,
      enableDetailedLogging: true,
      enableAutoRetry: true,
      ...config
    };
    this.logger = new Logger('WorkflowService', this.config.enableDetailedLogging);
    
    this.startQueueProcessor();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(request: WorkflowExecutionRequest): Promise<string> {
    const executionId = this.generateExecutionId();
    
    this.logger.info(`🔄 Queueing workflow execution: ${request.workflowId}`, {
      executionId,
      priority: request.priority || 'medium'
    });

    // Add to queue
    this.executionQueue.push({
      ...request,
      metadata: {
        ...request.metadata,
        executionId,
        queuedAt: Date.now()
      }
    });

    // Process queue
    this.processQueue();

    return executionId;
  }

  /**
   * Execute workflow immediately (bypass queue)
   */
  async executeWorkflowImmediately(request: WorkflowExecutionRequest): Promise<WorkflowResult> {
    const executionId = this.generateExecutionId();
    
    this.logger.info(`🚀 Executing workflow immediately: ${request.workflowId}`, {
      executionId
    });

    // Create execution status
    const executionStatus: WorkflowExecutionStatus = {
      executionId,
      workflowId: request.workflowId,
      status: 'running',
      startTime: Date.now(),
      progress: 0,
      metadata: request.metadata
    };

    this.activeExecutions.set(executionId, executionStatus);
    this.emit('execution:started', { executionId, request });

    try {
      // Execute workflow
      const result = await this.orchestrator.executeWorkflow(request.workflowId, request.context);
      
      // Update status
      executionStatus.status = 'completed';
      executionStatus.endTime = Date.now();
      executionStatus.progress = 100;
      executionStatus.result = result;

      this.logger.info(`✅ Workflow execution completed: ${request.workflowId}`, {
        executionId,
        executionTime: result.executionTime,
        success: result.success
      });

      this.emit('execution:completed', { executionId, result });
      return result;

    } catch (error) {
      // Update status
      executionStatus.status = 'failed';
      executionStatus.endTime = Date.now();
      executionStatus.error = error instanceof Error ? error.message : String(error);

      this.logger.error(`❌ Workflow execution failed: ${request.workflowId}`, {
        executionId,
        error: executionStatus.error
      });

      this.emit('execution:failed', { executionId, error });
      throw error;

    } finally {
      // Clean up
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): WorkflowExecutionStatus | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): WorkflowExecutionStatus[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    
    if (!execution) {
      return false;
    }

    if (execution.status === 'completed' || execution.status === 'failed') {
      return false;
    }

    this.logger.info(`🛑 Cancelling workflow execution: ${execution.workflowId}`, {
      executionId
    });

    // Update status
    execution.status = 'cancelled';
    execution.endTime = Date.now();

    // Remove from active executions
    this.activeExecutions.delete(executionId);

    this.emit('execution:cancelled', { executionId });
    return true;
  }

  /**
   * Get available workflows
   */
  getAvailableWorkflows(): Workflow[] {
    return Array.from(workflowRegistry.getAllWorkflows().values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return workflowRegistry.getWorkflow(workflowId);
  }

  /**
   * Get workflows by category
   */
  getWorkflowsByCategory(category: string): Workflow[] {
    return workflowRegistry.getWorkflowsByCategory(category);
  }

  /**
   * Get service statistics
   */
  getServiceStats(): any {
    const activeExecutions = this.getActiveExecutions();
    const completedToday = this.getCompletedExecutionsToday();
    const queueLength = this.executionQueue.length;

    return {
      activeExecutions: activeExecutions.length,
      queueLength,
      completedToday: completedToday.length,
      maxConcurrentWorkflows: this.config.maxConcurrentWorkflows,
      averageExecutionTime: this.calculateAverageExecutionTime(completedToday),
      successRate: this.calculateSuccessRate(completedToday)
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down workflow service...');

    // Cancel all active executions
    const executionIds = Array.from(this.activeExecutions.keys());
    for (const executionId of executionIds) {
      await this.cancelExecution(executionId);
    }

    // Clear queue
    this.executionQueue = [];
    this.isProcessingQueue = false;

    this.logger.info('✅ Workflow service shutdown complete');
  }

  // Private Methods

  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 1000); // Process queue every second
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) {
      return;
    }

    if (this.activeExecutions.size >= this.config.maxConcurrentWorkflows) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Sort queue by priority
      this.executionQueue.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority || 'medium'];
        const bPriority = priorityOrder[b.priority || 'medium'];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // If same priority, sort by queue time (FIFO)
        return (a.metadata?.queuedAt || 0) - (b.metadata?.queuedAt || 0);
      });

      // Execute next workflow
      const request = this.executionQueue.shift();
      
      if (request) {
        // Execute in background
        this.executeWorkflowImmediately(request).catch(error => {
          this.logger.error('Queue execution failed:', error);
        });
      }

    } catch (error) {
      this.logger.error('Queue processing error:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCompletedExecutionsToday(): WorkflowExecutionStatus[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // This would typically come from a database
    // For now, return empty array
    return [];
  }

  private calculateAverageExecutionTime(executions: WorkflowExecutionStatus[]): number {
    if (executions.length === 0) {
      return 0;
    }

    const totalTime = executions.reduce((sum, exec) => {
      if (exec.endTime && exec.startTime) {
        return sum + (exec.endTime - exec.startTime);
      }
      return sum;
    }, 0);

    return totalTime / executions.length;
  }

  private calculateSuccessRate(executions: WorkflowExecutionStatus[]): number {
    if (executions.length === 0) {
      return 100;
    }

    const successfulExecutions = executions.filter(exec => exec.status === 'completed').length;
    return (successfulExecutions / executions.length) * 100;
  }
}

/**
 * Workflow Template Service
 * Provides templates for common real estate workflows
 */
export class WorkflowTemplateService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('WorkflowTemplateService', true);
  }

  /**
   * Create lead generation context
   */
  createLeadGenerationContext(params: {
    location: string;
    propertyType: string;
    priceRange: { min: number; max: number };
    bedrooms?: number;
    bathrooms?: number;
    userId?: string;
  }): ExecutionContext {
    return {
      workflowId: 'real-estate-lead-generation',
      userId: params.userId,
      startTime: Date.now(),
      orchestratorId: 'workflow-service',
      traceId: this.generateTraceId(),
      variables: {
        location: params.location,
        propertyType: params.propertyType,
        priceRange: params.priceRange,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms
      },
      permissions: ['lead-generation:execute', 'web-scraping:use', 'mobile:send'],
      metadata: {
        campaignId: this.generateId(),
        timestamp: Date.now()
      }
    };
  }

  /**
   * Create market analysis context
   */
  createMarketAnalysisContext(params: {
    location: string;
    timeRange: string;
    audience?: string;
    userId?: string;
  }): ExecutionContext {
    return {
      workflowId: 'market-analysis',
      userId: params.userId,
      startTime: Date.now(),
      orchestratorId: 'workflow-service',
      traceId: this.generateTraceId(),
      variables: {
        location: params.location,
        timeRange: params.timeRange,
        audience: params.audience || 'investor'
      },
      permissions: ['market-analysis:execute', 'web-scraping:use'],
      metadata: {
        reportId: this.generateId(),
        timestamp: Date.now()
      }
    };
  }

  /**
   * Create property valuation context
   */
  createPropertyValuationContext(params: {
    propertyUrl: string;
    valuationMethod?: string;
    radius?: number;
    timeRange?: string;
    userId?: string;
  }): ExecutionContext {
    return {
      workflowId: 'property-valuation',
      userId: params.userId,
      startTime: Date.now(),
      orchestratorId: 'workflow-service',
      traceId: this.generateTraceId(),
      variables: {
        propertyUrl: params.propertyUrl,
        valuationMethod: params.valuationMethod || 'comparative',
        radius: params.radius || 1,
        timeRange: params.timeRange || '6-months'
      },
      permissions: ['valuation:execute', 'web-scraping:use'],
      metadata: {
        valuationId: this.generateId(),
        timestamp: Date.now()
      }
    };
  }

  /**
   * Create client onboarding context
   */
  createClientOnboardingContext(params: {
    clientInfo: any;
    preferences?: any;
    userId?: string;
  }): ExecutionContext {
    return {
      workflowId: 'client-onboarding',
      userId: params.userId,
      startTime: Date.now(),
      orchestratorId: 'workflow-service',
      traceId: this.generateTraceId(),
      variables: {
        clientInfo: params.clientInfo,
        preferences: params.preferences || {}
      },
      permissions: ['onboarding:execute', 'database:write', 'mobile:send'],
      metadata: {
        onboardingId: this.generateId(),
        timestamp: Date.now()
      }
    };
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const workflowTemplateService = new WorkflowTemplateService();
