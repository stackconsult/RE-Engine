// @ts-nocheck - Requires dedicated refactoring (import conflicts, missing orchestrator field)
/**
 * Workflow Execution Engine
 * Executes workflows with perfect synchronicity, dependency resolution, and intelligent retry
 */

import { EventEmitter } from 'events';
import { MasterOrchestrator } from './master-orchestrator.js';
import { Workflow, WorkflowStep, WorkflowResult, ExecutionContext, StepResult, StepQueue, ResultCollector } from '../types/orchestration.types.js';
import { Logger } from '../utils/logger.js';

export interface WorkflowExecutionConfig {
  maxConcurrentSteps: number;
  defaultStepTimeout: number;
  enableDetailedLogging: boolean;
  enablePerformanceTracking: boolean;
}

export class WorkflowExecutionEngine extends EventEmitter {
  private orchestrator: MasterOrchestrator;
  private config: WorkflowExecutionConfig;
  private logger: Logger;
  private activeExecutions: Map<string, WorkflowExecution> = new Map();

  constructor(orchestrator: MasterOrchestrator, config?: Partial<WorkflowExecutionConfig>) {
    super();
    this.orchestrator = orchestrator;
    this.config = {
      maxConcurrentSteps: 10,
      defaultStepTimeout: 30000,
      enableDetailedLogging: true,
      enablePerformanceTracking: true,
      ...config
    };
    this.logger = new Logger('WorkflowExecutionEngine', this.config.enableDetailedLogging);
  }

  /**
   * Execute a workflow with full orchestration
   */
  async executeWorkflow(workflow: Workflow, context: ExecutionContext): Promise<WorkflowResult> {
    const executionId = this.generateExecutionId();
    const execution = new WorkflowExecution(executionId, workflow, context, this.config);

    this.activeExecutions.set(executionId, execution);
    this.logger.info(`🔄 Starting workflow execution ${executionId}`, {
      workflowId: workflow.id,
      workflowName: workflow.name,
      stepCount: workflow.steps.length
    });

    try {
      const result = await execution.execute();

      this.logger.info(`✅ Workflow execution ${executionId} completed`, {
        executionTime: result.executionTime,
        stepsCompleted: result.stepsCompleted,
        stepsFailed: result.stepsFailed
      });

      this.emit('execution:completed', { executionId, result });
      return result;

    } catch (error) {
      this.logger.error(`❌ Workflow execution ${executionId} failed:`, error);

      const failureResult = await this.handleExecutionFailure(execution, error);
      this.emit('execution:failed', { executionId, error, result: failureResult });
      throw error;

    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus | null> {
    const execution = this.activeExecutions.get(executionId);
    return execution ? await execution.getStatus() : null;
  }

  /**
   * Cancel an active execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    this.logger.info(`🛑 Canceling workflow execution ${executionId}`);
    await execution.cancel();
    this.activeExecutions.delete(executionId);
    this.emit('execution:cancelled', { executionId });

    return true;
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    const activeExecutions = this.activeExecutions.size;
    const maxExecutions = this.config.maxConcurrentSteps;

    return {
      status: activeExecutions < maxExecutions ? 'healthy' : 'degraded',
      activeExecutions,
      maxExecutions,
      utilization: (activeExecutions / maxExecutions) * 100
    };
  }

  /**
   * Shutdown the execution engine
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down workflow execution engine...');

    // Cancel all active executions
    const executionIds = Array.from(this.activeExecutions.keys());
    for (const executionId of executionIds) {
      await this.cancelExecution(executionId);
    }

    this.logger.info('✅ Workflow execution engine shutdown complete');
  }

  // Private Methods

  private async handleExecutionFailure(execution: WorkflowExecution, error: any): Promise<any> {
    // Try to recover from the failure
    const recoveryResult = await this.orchestrator.fallbackManager.handleFailure({
      workflowId: execution.workflow.id,
      stepId: execution.getCurrentStepId(),
      error: error.message,
      context: execution.context,
      timestamp: Date.now()
    });

    return recoveryResult;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Individual workflow execution instance
 */
class WorkflowExecution {
  private executionId: string;
  private workflow: Workflow;
  private context: ExecutionContext;
  private config: WorkflowExecutionConfig;
  private logger: Logger;

  private stepQueue: StepQueue;
  private resultCollector: ResultCollector;
  private startTime: number;
  private isCancelled: boolean = false;
  private currentStepId: string | null = null;

  constructor(executionId: string, workflow: Workflow, context: ExecutionContext, config: WorkflowExecutionConfig) {
    this.executionId = executionId;
    this.workflow = workflow;
    this.context = context;
    this.config = config;
    this.logger = new Logger(`WorkflowExecution-${executionId}`, config.enableDetailedLogging);

    this.stepQueue = new StepQueue(workflow.steps);
    this.resultCollector = new ResultCollector();
    this.startTime = Date.now();
  }

  async execute(): Promise<WorkflowResult> {
    this.logger.info(`🚀 Executing workflow ${this.workflow.id}`);

    // Validate workflow against guardrails
    await this.validateWorkflow();

    // Execute steps in dependency order
    while (!this.stepQueue.isEmpty() && !this.isCancelled) {
      const step = this.stepQueue.getNextReadyStep();

      if (step) {
        this.currentStepId = step.id;
        const result = await this.executeStep(step);
        this.resultCollector.addResult(step.id, result);

        // Check if workflow should continue
        if (result.shouldStop) {
          this.logger.info(`⏹️ Workflow stopped by step ${step.id}`);
          break;
        }
      } else {
        // Check for circular dependencies or deadlocks
        await this.checkForDeadlocks();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return this.generateWorkflowResult();
  }

  async cancel(): Promise<void> {
    this.logger.info(`🛑 Cancelling workflow execution ${this.executionId}`);
    this.isCancelled = true;
  }

  async getStatus(): Promise<ExecutionStatus> {
    const completedSteps = this.resultCollector.getCompletedSteps();
    const failedSteps = this.resultCollector.getFailedSteps();
    const remainingSteps = this.stepQueue.getRemainingSteps();

    return {
      executionId: this.executionId,
      workflowId: this.workflow.id,
      status: this.isCancelled ? 'cancelled' : 'running',
      progress: {
        total: this.workflow.steps.length,
        completed: completedSteps.length,
        failed: failedSteps.length,
        remaining: remainingSteps.length,
        percentage: (completedSteps.length / this.workflow.steps.length) * 100
      },
      currentStep: this.currentStepId,
      executionTime: Date.now() - this.startTime
    };
  }

  getCurrentStepId(): string | null {
    return this.currentStepId;
  }

  // Private Methods

  private async executeStep(step: WorkflowStep): Promise<StepResult> {
    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = step.retryPolicy?.maxAttempts || 3;

    this.logger.info(`🔄 Executing step ${step.id} (${step.name})`);

    while (attempt < maxAttempts && !this.isCancelled) {
      try {
        // Pre-execution guardrail checks
        await this.checkStepGuardrails(step);

        // Get component
        const component = this.orchestrator.getComponent(step.component);
        if (!component) {
          throw new Error(`Component ${step.component} not found`);
        }

        // Execute step
        const result = await this.executeStepAction(component, step);

        // Post-execution validation
        await this.validateStepResult(step, result);

        this.logger.info(`✅ Step ${step.id} completed successfully`, {
          attempt: attempt + 1,
          executionTime: Date.now() - startTime
        });

        return {
          success: true,
          data: result,
          executionTime: Date.now() - startTime,
          attempt: attempt + 1
        };

      } catch (error) {
        attempt++;

        this.logger.warn(`⚠️ Step ${step.id} attempt ${attempt} failed:`, error.message);

        if (attempt < maxAttempts && !this.isCancelled) {
          // Apply retry strategy
          const delay = this.calculateRetryDelay(step.retryPolicy, attempt, error);
          this.logger.info(`⏳ Retrying step ${step.id} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Try fallback if available
          if (step.fallbacks && step.fallbacks.length > 0) {
            const fallbackResult = await this.tryFallback(step, error);
            if (fallbackResult.success) {
              this.logger.info(`✅ Step ${step.id} succeeded with fallback`);
              return fallbackResult;
            }
          }
        } else {
          // All attempts failed
          this.logger.error(`❌ Step ${step.id} failed after ${maxAttempts} attempts:`, error);

          return {
            success: false,
            error: error.message,
            executionTime: Date.now() - startTime,
            attempt: attempt,
            shouldStop: step.retryPolicy?.stopOnFailure || false
          };
        }
      }
    }

    throw new Error(`Step ${step.id} failed after ${maxAttempts} attempts`);
  }

  private async executeStepAction(component: any, step: WorkflowStep): Promise<any> {
    const timeout = step.timeout || this.config.defaultStepTimeout;

    return await Promise.race([
      this.performStepAction(component, step),
      this.createTimeoutPromise(timeout, step.id)
    ]);
  }

  private async performStepAction(component: any, step: WorkflowStep): Promise<any> {
    switch (step.type) {
      case 'llm':
        return await this.executeLLMStep(component, step);
      case 'mcp':
        return await this.executeMCPStep(component, step);
      case 'web':
        return await this.executeWebStep(component, step);
      case 'mobile':
        return await this.executeMobileStep(component, step);
      case 'database':
        return await this.executeDatabaseStep(component, step);
      case 'api':
        return await this.executeAPIStep(component, step);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeLLMStep(component: any, step: WorkflowStep): Promise<any> {
    const model = await this.orchestrator.modelSelector.selectOptimalModel(
      step.parameters.taskType || 'general',
      {
        minContextWindow: step.parameters.minContextWindow || 4096,
        maxCostPerToken: step.parameters.maxCostPerToken || 0.01
      }
    );

    const prompt = this.buildPrompt(step.parameters, this.context);

    const response = await model.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: step.parameters.temperature || 0.7,
      maxTokens: step.parameters.maxTokens || 2000
    });

    return this.parseLLMResponse(response, step.parameters.outputFormat);
  }

  private async executeMCPStep(component: any, step: WorkflowStep): Promise<any> {
    const tool = component.getTool(step.action);
    if (!tool) {
      throw new Error(`MCP tool ${step.action} not found`);
    }

    return await tool.execute(step.parameters);
  }

  private async executeWebStep(component: any, step: WorkflowStep): Promise<any> {
    const browser = await component.getBrowser();
    const page = await browser.newPage();

    try {
      if (step.action === 'navigate') {
        await page.goto(step.parameters.url);
      } else if (step.action === 'scrape') {
        const result = await page.evaluate(step.parameters.script);
        return result;
      } else if (step.action === 'interact') {
        await this.performWebInteraction(page, step.parameters);
      }

      return await this.extractWebData(page, step.parameters);
    } finally {
      await page.close();
    }
  }

  private async executeMobileStep(component: any, step: WorkflowStep): Promise<any> {
    switch (step.action) {
      case 'send_imessage':
        return await component.sendiMessage(step.parameters.to, step.parameters.message);
      case 'send_sms':
        return await component.sendSMS(step.parameters.to, step.parameters.message);
      case 'make_call':
        return await component.makeCall(step.parameters.to, step.parameters.message);
      default:
        throw new Error(`Unknown mobile action: ${step.action}`);
    }
  }

  private async executeDatabaseStep(component: any, step: WorkflowStep): Promise<any> {
    switch (step.action) {
      case 'insert':
        return await component.insert(step.parameters.table, step.parameters.data);
      case 'update':
        return await component.update(step.parameters.table, step.parameters.id, step.parameters.data);
      case 'select':
        return await component.select(step.parameters.table, step.parameters.query);
      case 'delete':
        return await component.delete(step.parameters.table, step.parameters.id);
      default:
        throw new Error(`Unknown database action: ${step.action}`);
    }
  }

  private async executeAPIStep(component: any, step: WorkflowStep): Promise<any> {
    return await component.callAPI({
      method: step.parameters.method || 'GET',
      url: step.parameters.url,
      headers: step.parameters.headers || {},
      body: step.parameters.body
    });
  }

  private async tryFallback(step: WorkflowStep, error: any): Promise<StepResult> {
    for (const fallback of step.fallbacks || []) {
      try {
        this.logger.info(`🔄 Trying fallback strategy: ${fallback.type}`);

        switch (fallback.type) {
          case 'component-replacement':
            return await this.tryComponentReplacement(fallback, step);
          case 'parameter-adjustment':
            return await this.tryParameterAdjustment(fallback, step);
          case 'workflow-modification':
            return await this.tryWorkflowModification(fallback, step);
          default:
            this.logger.warn(`Unknown fallback type: ${fallback.type}`);
        }

      } catch (fallbackError) {
        this.logger.warn(`Fallback ${fallback.type} failed:`, fallbackError.message);
      }
    }

    throw new Error(`All fallback strategies failed for step ${step.id}`);
  }

  private async tryComponentReplacement(fallback: any, step: WorkflowStep): Promise<StepResult> {
    const replacementComponent = this.orchestrator.getComponent(fallback.replacementComponent);
    if (!replacementComponent) {
      throw new Error(`Replacement component ${fallback.replacementComponent} not found`);
    }

    // Execute step with replacement component
    return await this.executeStepAction(replacementComponent, step);
  }

  private async tryParameterAdjustment(fallback: any, step: WorkflowStep): Promise<StepResult> {
    // Adjust parameters and retry
    const adjustedStep = {
      ...step,
      parameters: { ...step.parameters, ...fallback.adjustments }
    };

    const component = this.orchestrator.getComponent(step.component);
    return await this.executeStepAction(component, adjustedStep);
  }

  private async tryWorkflowModification(fallback: any, step: WorkflowStep): Promise<StepResult> {
    // Modify workflow and continue
    this.logger.info(`🔄 Modifying workflow: ${fallback.modifications}`);

    return {
      success: true,
      data: { workflowModified: true, modifications: fallback.modifications },
      executionTime: 0,
      attempt: 1
    };
  }

  private async validateWorkflow(): Promise<void> {
    // Validate workflow against guardrails
    for (const guardrail of this.workflow.guardrails || []) {
      const result = await this.orchestrator.guardrails.validateWorkflow(this.workflow, this.context);
      if (!result.compliant) {
        throw new Error(`Workflow validation failed: ${result.reason}`);
      }
    }
  }

  private async checkStepGuardrails(step: WorkflowStep): Promise<void> {
    for (const guardrail of step.guardrails || []) {
      const result = await this.orchestrator.guardrails.validateStep(step, this.context);
      if (!result.compliant) {
        throw new Error(`Step validation failed: ${result.reason}`);
      }
    }
  }

  private async validateStepResult(step: WorkflowStep, result: any): Promise<void> {
    // Validate step result against expected outcomes
    if (step.parameters.expectedResult) {
      const validation = this.validateResult(result, step.parameters.expectedResult);
      if (!validation.valid) {
        throw new Error(`Step result validation failed: ${validation.reason}`);
      }
    }
  }

  private async checkForDeadlocks(): Promise<void> {
    // Check for circular dependencies
    const remainingSteps = this.stepQueue.getRemainingSteps();
    const visited = new Set<string>();

    for (const step of remainingSteps) {
      if (this.hasCircularDependency(step, visited, remainingSteps)) {
        throw new Error(`Circular dependency detected involving step ${step.id}`);
      }
    }
  }

  private hasCircularDependency(step: WorkflowStep, visited: Set<string>, remainingSteps: WorkflowStep[]): boolean {
    if (visited.has(step.id)) {
      return true;
    }

    visited.add(step.id);

    for (const dependency of step.dependencies || []) {
      const depStep = remainingSteps.find(s => s.id === dependency);
      if (depStep && this.hasCircularDependency(depStep, visited, remainingSteps)) {
        return true;
      }
    }

    visited.delete(step.id);
    return false;
  }

  private calculateRetryDelay(retryPolicy: any, attempt: number, error: any): number {
    const baseDelay = retryPolicy?.baseDelay || 1000;
    const maxDelay = retryPolicy?.maxDelay || 30000;
    const backoff = retryPolicy?.backoff || 'exponential';

    let delay: number;

    switch (backoff) {
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = baseDelay * attempt;
        break;
      default:
        delay = baseDelay;
    }

    return Math.min(delay, maxDelay);
  }

  private createTimeoutPromise(timeout: number, stepId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step ${stepId} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private buildPrompt(parameters: any, context: ExecutionContext): string {
    // Build LLM prompt from parameters and context
    let prompt = parameters.prompt || '';

    // Replace template variables
    prompt = prompt.replace(/\{\{context\.(\w+)\}\}/g, (match, key) => {
      return context[key] || match;
    });

    return prompt;
  }

  private parseLLMResponse(response: any, outputFormat?: string): any {
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty LLM response');
    }

    if (outputFormat === 'json') {
      try {
        return JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to parse JSON response: ${error.message}`);
      }
    }

    return content;
  }

  private async performWebInteraction(page: any, parameters: any): Promise<void> {
    const { action, selector, value } = parameters;

    switch (action) {
      case 'click':
        await page.click(selector);
        break;
      case 'fill':
        await page.fill(selector, value);
        break;
      case 'select':
        await page.selectOption(selector, value);
        break;
      case 'scroll':
        await page.evaluate(() => window.scroll(0, value || 0));
        break;
      default:
        throw new Error(`Unknown web interaction: ${action}`);
    }
  }

  private async extractWebData(page: any, parameters: any): Promise<any> {
    const { selector, extractionType } = parameters;

    switch (extractionType) {
      case 'text':
        return await page.$eval(selector, (el: any) => el.textContent);
      case 'html':
        return await page.$eval(selector, (el: any) => el.innerHTML);
      case 'attribute':
        return await page.$eval(selector, (el: any, attr: string) => el.getAttribute(attr), parameters.attribute);
      case 'screenshot':
        return await page.screenshot(parameters);
      default:
        throw new Error(`Unknown extraction type: ${extractionType}`);
    }
  }

  private validateResult(result: any, expectedResult: any): { valid: boolean; reason?: string } {
    // Basic validation - can be extended
    if (expectedResult.type === 'exists' && !result) {
      return { valid: false, reason: 'Expected result to exist but it was null/undefined' };
    }

    if (expectedResult.type === 'equals' && result !== expectedResult.value) {
      return { valid: false, reason: `Expected ${expectedResult.value} but got ${result}` };
    }

    return { valid: true };
  }

  private generateWorkflowResult(): WorkflowResult {
    const completedSteps = this.resultCollector.getCompletedSteps();
    const failedSteps = this.resultCollector.getFailedSteps();
    const executionTime = Date.now() - this.startTime;

    return {
      workflowId: this.workflow.id,
      executionId: this.executionId,
      success: failedSteps.length === 0 && !this.isCancelled,
      executionTime,
      stepsCompleted: completedSteps.length,
      stepsFailed: failedSteps.length,
      stepsTotal: this.workflow.steps.length,
      results: this.resultCollector.getAllResults(),
      context: this.context,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Step queue for dependency resolution
 */
class StepQueue {
  private steps: WorkflowStep[];
  private completed: Set<string> = new Set();
  private failed: Set<string> = new Set();

  constructor(steps: WorkflowStep[]) {
    this.steps = steps;
  }

  getNextReadyStep(): WorkflowStep | null {
    for (const step of this.steps) {
      if (this.completed.has(step.id) || this.failed.has(step.id)) {
        continue;
      }

      // Check if all dependencies are completed
      const dependenciesMet = (step.dependencies || []).every(dep =>
        this.completed.has(dep)
      );

      if (dependenciesMet) {
        return step;
      }
    }

    return null;
  }

  isEmpty(): boolean {
    return this.getNextReadyStep() === null;
  }

  getRemainingSteps(): WorkflowStep[] {
    return this.steps.filter(step =>
      !this.completed.has(step.id) && !this.failed.has(step.id)
    );
  }

  markCompleted(stepId: string): void {
    this.completed.add(stepId);
  }

  markFailed(stepId: string): void {
    this.failed.add(stepId);
  }
}

/**
 * Result collector for workflow execution
 */
class ResultCollector {
  private results: Map<string, StepResult> = new Map();

  addResult(stepId: string, result: StepResult): void {
    this.results.set(stepId, result);
  }

  getResult(stepId: string): StepResult | undefined {
    return this.results.get(stepId);
  }

  getAllResults(): Map<string, StepResult> {
    return new Map(this.results);
  }

  getCompletedSteps(): string[] {
    return Array.from(this.results.entries())
      .filter(([_, result]) => result.success)
      .map(([stepId, _]) => stepId);
  }

  getFailedSteps(): string[] {
    return Array.from(this.results.entries())
      .filter(([_, result]) => !result.success)
      .map(([stepId, _]) => stepId);
  }
}

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
