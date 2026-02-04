/**
 * Fallback Manager
 * Handles intelligent fallback strategies for component failures
 */

import { EventEmitter } from 'events';
import { FallbackStrategy, WorkflowFailure, RecoveryResult } from '../types/orchestration.types';
import { Logger } from '../utils/logger';

export interface FallbackManagerConfig {
  enableAutoRecovery: boolean;
  maxFallbackAttempts: number;
  fallbackTimeout: number;
  enableManualIntervention: boolean;
}

export class FallbackManager extends EventEmitter {
  private strategies: Map<string, FallbackStrategy[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private config: FallbackManagerConfig;
  private logger: Logger;

  constructor(config?: Partial<FallbackManagerConfig>) {
    super();
    this.config = {
      enableAutoRecovery: true,
      maxFallbackAttempts: 3,
      fallbackTimeout: 30000,
      enableManualIntervention: true,
      ...config
    };
    this.logger = new Logger('FallbackManager', true);
  }

  /**
   * Handle workflow failure with intelligent fallback
   */
  async handleFailure(failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.info(`🔄 Handling failure for workflow ${failure.workflowId}`, {
      stepId: failure.stepId,
      error: failure.error,
      severity: failure.severity
    });

    try {
      const strategy = await this.selectFallbackStrategy(failure);
      
      if (!strategy) {
        return await this.handleNoStrategyAvailable(failure);
      }

      return await this.executeFallback(strategy, failure);
    } catch (error) {
      this.logger.error(`❌ Fallback handling failed:`, error);
      return await this.handleCriticalFailure(failure);
    }
  }

  /**
   * Register fallback strategies for a component type
   */
  registerStrategies(componentType: string, strategies: FallbackStrategy[]): void {
    this.strategies.set(componentType, strategies);
    this.logger.info(`📝 Registered ${strategies.length} fallback strategies for ${componentType}`);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Map<string, CircuitBreakerStatus> {
    const status = new Map<string, CircuitBreakerStatus>();
    
    this.circuitBreakers.forEach((breaker, key) => {
      status.set(key, breaker.getStatus());
    });
    
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers(): void {
    this.circuitBreakers.forEach((breaker, key) => {
      breaker.reset();
      this.logger.debug(`🔄 Reset circuit breaker for ${key}`);
    });
  }

  // Private Methods

  private async selectFallbackStrategy(failure: WorkflowFailure): Promise<FallbackStrategy | null> {
    const strategies = this.strategies.get(failure.workflowId) || 
                      this.strategies.get('default') || 
                      [];

    // Filter applicable strategies
    const applicableStrategies = strategies.filter(strategy => 
      this.isStrategyApplicable(strategy, failure)
    );

    if (applicableStrategies.length === 0) {
      return null;
    }

    // Sort by priority
    applicableStrategies.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Check circuit breaker for each strategy
    for (const strategy of applicableStrategies) {
      const circuitBreaker = this.getCircuitBreaker(strategy.type);
      
      if (circuitBreaker.canExecute()) {
        return strategy;
      } else {
        this.logger.warn(`⚠️ Circuit breaker open for strategy ${strategy.type}`);
      }
    }

    return null;
  }

  private async executeFallback(strategy: FallbackStrategy, failure: WorkflowFailure): Promise<RecoveryResult> {
    const startTime = Date.now();
    const circuitBreaker = this.getCircuitBreaker(strategy.type);

    try {
      circuitBreaker.recordCall();

      switch (strategy.type) {
        case 'component-replacement':
          return await this.replaceComponent(strategy, failure);
        case 'parameter-adjustment':
          return await this.adjustParameters(strategy, failure);
        case 'workflow-modification':
          return await this.modifyWorkflow(strategy, failure);
        case 'manual-intervention':
          return await this.requestManualIntervention(strategy, failure);
        default:
          throw new Error(`Unknown fallback strategy: ${strategy.type}`);
      }
    } catch (error) {
      circuitBreaker.recordFailure();
      
      this.logger.error(`❌ Fallback strategy ${strategy.type} failed:`, error);
      return await this.handleFallbackFailure(error, strategy, failure);
    } finally {
      const duration = Date.now() - startTime;
      this.logger.debug(`⏱️ Fallback execution took ${duration}ms`);
    }
  }

  private async replaceComponent(strategy: FallbackStrategy, failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.info(`🔄 Replacing component with ${strategy.replacementComponent}`);

    // Simulate component replacement
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      strategy: 'component-replacement',
      component: strategy.replacementComponent,
      action: 'Replaced failed component',
      message: `Successfully replaced component with ${strategy.replacementComponent}`,
      timestamp: Date.now()
    };
  }

  private async adjustParameters(strategy: FallbackStrategy, failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.info(`🔧 Adjusting parameters:`, strategy.adjustments);

    // Simulate parameter adjustment
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      strategy: 'parameter-adjustment',
      action: 'Adjusted execution parameters',
      message: `Successfully adjusted parameters: ${JSON.stringify(strategy.adjustments)}`,
      timestamp: Date.now()
    };
  }

  private async modifyWorkflow(strategy: FallbackStrategy, failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.info(`🔄 Modifying workflow:`, strategy.modifications);

    // Simulate workflow modification
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      strategy: 'workflow-modification',
      action: 'Modified workflow execution',
      message: `Successfully modified workflow: ${JSON.stringify(strategy.modifications)}`,
      timestamp: Date.now()
    };
  }

  private async requestManualIntervention(strategy: FallbackStrategy, failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.info(`👤 Requesting manual intervention for ${failure.workflowId}`);

    if (!this.config.enableManualIntervention) {
      throw new Error('Manual intervention is disabled');
    }

    // Create manual intervention request
    const interventionRequest = {
      id: this.generateId(),
      workflowId: failure.workflowId,
      stepId: failure.stepId,
      error: failure.error,
      severity: failure.severity,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Emit event for manual intervention
    this.emit('manual:intervention:required', interventionRequest);

    return {
      success: false,
      strategy: 'manual-intervention',
      action: 'Manual intervention requested',
      message: `Manual intervention required for ${failure.workflowId}`,
      timestamp: Date.now(),
      requiresManualIntervention: true,
      interventionId: interventionRequest.id
    };
  }

  private async handleNoStrategyAvailable(failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.warn(`⚠️ No fallback strategy available for ${failure.workflowId}`);

    return {
      success: false,
      strategy: 'none-available',
      action: 'No fallback available',
      message: `No fallback strategy available for ${failure.workflowId}`,
      timestamp: Date.now()
    };
  }

  private async handleCriticalFailure(failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.error(`🚨 Critical failure in ${failure.workflowId}:`, failure.error);

    return {
      success: false,
      strategy: 'critical-failure',
      action: 'Critical failure handling',
      message: `Critical failure in ${failure.workflowId}: ${failure.error}`,
      timestamp: Date.now(),
      requiresManualIntervention: true
    };
  }

  private async handleFallbackFailure(error: any, strategy: FallbackStrategy, failure: WorkflowFailure): Promise<RecoveryResult> {
    this.logger.error(`❌ Fallback failure for strategy ${strategy.type}:`, error);

    // Try next strategy if available
    const nextStrategy = await this.getNextStrategy(strategy, failure);
    
    if (nextStrategy) {
      this.logger.info(`🔄 Trying next fallback strategy: ${nextStrategy.type}`);
      return await this.executeFallback(nextStrategy, failure);
    }

    // No more strategies available
    return {
      success: false,
      strategy: 'all-strategies-failed',
      action: 'All fallback strategies failed',
      message: `All fallback strategies failed for ${failure.workflowId}`,
      timestamp: Date.now(),
      requiresManualIntervention: true
    };
  }

  private async getNextStrategy(currentStrategy: FallbackStrategy, failure: WorkflowFailure): Promise<FallbackStrategy | null> {
    const strategies = this.strategies.get(failure.workflowId) || 
                      this.strategies.get('default') || [];

    const currentIndex = strategies.findIndex(s => s.type === currentStrategy.type);
    
    if (currentIndex === -1 || currentIndex === strategies.length - 1) {
      return null;
    }

    return strategies[currentIndex + 1];
  }

  private isStrategyApplicable(strategy: FallbackStrategy, failure: WorkflowFailure): boolean {
    // Check if strategy is applicable based on failure severity and type
    if (strategy.type === 'manual-intervention' && failure.severity !== 'critical') {
      return false;
    }

    if (strategy.type === 'component-replacement' && !strategy.replacementComponent) {
      return false;
    }

    if (strategy.type === 'parameter-adjustment' && !strategy.adjustments) {
      return false;
    }

    return true;
  }

  private getCircuitBreaker(strategyType: string): CircuitBreaker {
    if (!this.circuitBreakers.has(strategyType)) {
      this.circuitBreakers.set(strategyType, new CircuitBreaker(strategyType));
    }
    
    return this.circuitBreakers.get(strategyType)!;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

/**
 * Circuit Breaker Pattern Implementation
 */
class CircuitBreaker {
  private name: string;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  // Circuit breaker configuration
  private failureThreshold: number = 5;
  private recoveryTimeout: number = 60000; // 1 minute
  private successThreshold: number = 3; // Successes needed to close circuit

  constructor(name: string) {
    this.name = name;
  }

  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'closed':
        return true;
      case 'open':
        if (now >= this.nextAttemptTime) {
          this.state = 'half-open';
          this.successCount = 0;
          return true;
        }
        return false;
      case 'half-open':
        return true;
      default:
        return false;
    }
  }

  recordCall(): void {
    // Call recorded, result will be handled by recordSuccess/recordFailure
  }

  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.open();
    } else if (this.failureCount >= this.failureThreshold) {
      this.open();
    }
  }

  getStatus(): CircuitBreakerStatus {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }

  private open(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.recoveryTimeout;
  }

  private close(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

export interface CircuitBreakerStatus {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}
