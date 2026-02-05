/**
 * Workflow API
 * RESTful API for workflow execution and management
 */

import { Router, Request, Response } from 'express';
import { WorkflowService, WorkflowTemplateService, workflowTemplateService } from '../services/workflow-service';
import { MasterOrchestrator } from '../orchestration/master-orchestrator';
import { Logger } from '../utils/logger';

export interface WorkflowAPIRequest {
  workflowId: string;
  context: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowAPIResponse {
  success: boolean;
  executionId?: string;
  status?: string;
  result?: any;
  error?: string;
  timestamp: string;
}

/**
 * Workflow API Router
 */
export function createWorkflowAPIRouter(
  workflowService: WorkflowService,
  orchestrator: MasterOrchestrator
): Router {
  const router = Router();
  const logger = new Logger('WorkflowAPI', true);

  /**
   * Execute a workflow
   * POST /api/workflows/execute
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const request: WorkflowAPIRequest = req.body;
      
      logger.info('🔄 API: Execute workflow request', {
        workflowId: request.workflowId,
        priority: request.priority,
        userId: req.headers['x-user-id']
      });

      // Validate request
      if (!request.workflowId) {
        return res.status(400).json({
          success: false,
          error: 'workflowId is required',
          timestamp: new Date().toISOString()
        } as WorkflowAPIResponse);
      }

      // Check if workflow exists
      const workflow = workflowService.getWorkflow(request.workflowId);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: `Workflow ${request.workflowId} not found`,
          timestamp: new Date().toISOString()
        } as WorkflowAPIResponse);
      }

      // Create execution context
      const context = {
        ...request.context,
        userId: req.headers['x-user-id'] as string,
        startTime: Date.now(),
        orchestratorId: 'api-request',
        traceId: generateTraceId(),
        permissions: req.headers['x-permissions']?.split(',') || [],
        metadata: {
          ...request.metadata,
          apiRequest: true,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      };

      // Execute workflow
      const executionId = await workflowService.executeWorkflow({
        workflowId: request.workflowId,
        context,
        priority: request.priority,
        timeout: request.timeout,
        metadata: request.metadata
      });

      const response: WorkflowAPIResponse = {
        success: true,
        executionId,
        timestamp: new Date().toISOString()
      };

      logger.info('✅ API: Workflow execution queued', {
        executionId,
        workflowId: request.workflowId
      });

      res.status(202).json(response);

    } catch (error) {
      logger.error('❌ API: Execute workflow error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      } as WorkflowAPIResponse);
    }
  });

  /**
   * Get workflow execution status
   * GET /api/workflows/:executionId/status
   */
  router.get('/:executionId/status', async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      
      logger.info('🔍 API: Get execution status', { executionId });

      const status = workflowService.getExecutionStatus(executionId);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          error: `Execution ${executionId} not found`,
          timestamp: new Date().toISOString()
        } as WorkflowAPIResponse);
      }

      const response: WorkflowAPIResponse = {
        success: true,
        status: status.status,
        result: {
          executionId: status.executionId,
          workflowId: status.workflowId,
          status: status.status,
          startTime: status.startTime,
          endTime: status.endTime,
          progress: status.progress,
          metadata: status.metadata
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Get execution status error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      } as WorkflowAPIResponse);
    }
  });

  /**
   * Cancel workflow execution
   * POST /api/workflows/:executionId/cancel
   */
  router.post('/:executionId/cancel', async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      
      logger.info('🛑 API: Cancel execution', { executionId });

      const cancelled = await workflowService.cancelExecution(executionId);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: `Execution ${executionId} not found or cannot be cancelled`,
          timestamp: new Date().toISOString()
        } as WorkflowAPIResponse);
      }

      const response: WorkflowAPIResponse = {
        success: true,
        status: 'cancelled',
        timestamp: new Date().toISOString()
      };

      logger.info('✅ API: Execution cancelled', { executionId });
      res.json(response);

    } catch (error) {
      logger.error('❌ API: Cancel execution error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      } as WorkflowAPIResponse);
    }
  });

  /**
   * Get available workflows
   * GET /api/workflows
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      
      logger.info('📋 API: Get workflows', { category });

      let workflows;
      if (category) {
        workflows = workflowService.getWorkflowsByCategory(category);
      } else {
        workflows = workflowService.getAvailableWorkflows();
      }

      const response = {
        success: true,
        workflows: workflows.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description,
          steps: w.steps.length,
          triggers: w.triggers.map(t => t.type),
          guardrails: w.guardrails,
          timeout: w.timeout
        })),
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Get workflows error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Get workflow details
   * GET /api/workflows/:workflowId
   */
  router.get('/:workflowId', async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      
      logger.info('🔍 API: Get workflow details', { workflowId });

      const workflow = workflowService.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: `Workflow ${workflowId} not found`,
          timestamp: new Date().toISOString()
        });
      }

      const response = {
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          steps: workflow.steps.map(step => ({
            id: step.id,
            name: step.name,
            type: step.type,
            component: step.component,
            action: step.action,
            dependencies: step.dependencies,
            guardrails: step.guardrails,
            timeout: step.timeout,
            retryPolicy: step.retryPolicy,
            fallbacks: step.fallbacks
          })),
          triggers: workflow.triggers,
          guardrails: workflow.guardrails,
          fallbacks: workflow.fallbacks,
          retryPolicy: workflow.retryPolicy,
          timeout: workflow.timeout
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Get workflow details error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Get service statistics
   * GET /api/workflows/stats
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      logger.info('📊 API: Get service stats');

      const stats = workflowService.getServiceStats();
      const healthStatus = await orchestrator.getHealthStatus();

      const response = {
        success: true,
        stats: {
          ...stats,
          systemHealth: healthStatus,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0'
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Get stats error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Get active executions
   * GET /api/workflows/executions
   */
  router.get('/executions', async (req: Request, res: Response) => {
    try {
      logger.info('📋 API: Get active executions');

      const executions = workflowService.getActiveExecutions();

      const response = {
        success: true,
        executions: executions.map(exec => ({
          executionId: exec.executionId,
          workflowId: exec.workflowId,
          status: exec.status,
          startTime: exec.startTime,
          endTime: exec.endTime,
          progress: exec.progress,
          metadata: exec.metadata
        })),
        count: executions.length,
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Get active executions error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Execute workflow immediately (synchronous)
   * POST /api/workflows/execute-immediate
   */
  router.post('/execute-immediate', async (req: Request, res: Response) => {
    try {
      const request: WorkflowAPIRequest = req.body;
      
      logger.info('🚀 API: Execute workflow immediately', {
        workflowId: request.workflowId,
        userId: req.headers['x-user-id']
      });

      // Validate request
      if (!request.workflowId) {
        return res.status(400).json({
          success: false,
          error: 'workflowId is required',
          timestamp: new Date().toISOString()
        } as WorkflowAPIResponse);
      }

      // Check if workflow exists
      const workflow = workflowService.getWorkflow(request.workflowId);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: `Workflow ${request.workflowId} not found`,
          timestamp: new Date().toISOString()
        } as WorkflowAPIResponse);
      }

      // Create execution context
      const context = {
        ...request.context,
        userId: req.headers['x-user-id'] as string,
        startTime: Date.now(),
        orchestratorId: 'api-request',
        traceId: generateTraceId(),
        permissions: req.headers['x-permissions']?.split(',') || [],
        metadata: {
          ...request.metadata,
          apiRequest: true,
          immediate: true
        }
      };

      // Execute workflow immediately
      const result = await workflowService.executeWorkflowImmediately({
        workflowId: request.workflowId,
        context,
        priority: request.priority,
        timeout: request.timeout,
        metadata: request.metadata
      });

      const response: WorkflowAPIResponse = {
        success: true,
        result,
        timestamp: new Date().toISOString()
      };

      logger.info('✅ API: Workflow executed immediately', {
        workflowId: request.workflowId,
        success: result.success,
        executionTime: result.executionTime
      });

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Execute workflow immediately error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      } as WorkflowAPIResponse);
    }
  });

  return router;
}

/**
 * Template API Router
 */
export function createTemplateAPIRouter(): Router {
  const router = Router();
  const logger = new Logger('TemplateAPI', true);

  /**
   * Generate lead generation context
   * POST /api/templates/lead-generation
   */
  router.post('/lead-generation', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      
      logger.info('🎨 API: Generate lead generation template', params);

      const context = workflowTemplateService.createLeadGenerationContext({
        location: params.location,
        propertyType: params.propertyType,
        priceRange: params.priceRange,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        userId: req.headers['x-user-id'] as string
      });

      const response = {
        success: true,
        context,
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Generate lead generation template error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Generate market analysis context
   * POST /api/templates/market-analysis
   */
  router.post('/market-analysis', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      
      logger.info('🎨 API: Generate market analysis template', params);

      const context = workflowTemplateService.createMarketAnalysisContext({
        location: params.location,
        timeRange: params.timeRange,
        audience: params.audience,
        userId: req.headers['x-user-id'] as string
      });

      const response = {
        success: true,
        context,
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Generate market analysis template error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Generate property valuation context
   * POST /api/templates/property-valuation
   */
  router.post('/property-valuation', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      
      logger.info('🎨 API: Generate property valuation template', params);

      const context = workflowTemplateService.createPropertyValuationContext({
        propertyUrl: params.propertyUrl,
        valuationMethod: params.valuationMethod,
        radius: params.radius,
        timeRange: params.timeRange,
        userId: req.headers['x-user-id'] as string
      });

      const response = {
        success: true,
        context,
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Generate property valuation template error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Generate client onboarding context
   * POST /api/templates/client-onboarding
   */
  router.post('/client-onboarding', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      
      logger.info('🎨 API: Generate client onboarding template', params);

      const context = workflowTemplateService.createClientOnboardingContext({
        clientInfo: params.clientInfo,
        preferences: params.preferences,
        userId: req.headers['x-user-id'] as string
      });

      const response = {
        success: true,
        context,
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ API: Generate client onboarding template error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

// Helper function
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
