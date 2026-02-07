/**
 * Performance Monitor
 * Monitors system performance and provides metrics
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';

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

export interface PerformanceData {
  timestamp: number;
  workflowId?: string;
  component?: string;
  action: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private performanceData: PerformanceData[] = [];
  private logger: Logger;
  private aggregationInterval: NodeJS.Timeout | null = null;
  private maxDataPoints: number = 10000;

  constructor() {
    super();
    this.logger = new Logger('PerformanceMonitor', true);
    this.metrics = this.initializeMetrics();
    this.startAggregation();
  }

  /**
   * Record performance data
   */
  recordPerformance(data: PerformanceData): void {
    this.performanceData.push(data);

    // Keep data size manageable
    if (this.performanceData.length > this.maxDataPoints) {
      this.performanceData = this.performanceData.slice(-this.maxDataPoints / 2);
    }

    // Update relevant metrics
    this.updateMetrics(data);

    this.logger.debug('📊 Performance data recorded:', data);
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance data for a time range
   */
  getPerformanceData(startTime?: number, endTime?: number): PerformanceData[] {
    let data = [...this.performanceData];

    if (startTime) {
      data = data.filter(d => d.timestamp >= startTime);
    }

    if (endTime) {
      data = data.filter(d => d.timestamp <= endTime);
    }

    return data;
  }

  /**
   * Get performance summary for a workflow
   */
  getWorkflowPerformance(workflowId: string): any {
    const workflowData = this.performanceData.filter(d => d.workflowId === workflowId);

    if (workflowData.length === 0) {
      return null;
    }

    const totalDuration = workflowData.reduce((sum, d) => sum + d.duration, 0);
    const successCount = workflowData.filter(d => d.success).length;
    const averageDuration = totalDuration / workflowData.length;
    const successRate = (successCount / workflowData.length) * 100;

    return {
      workflowId,
      totalExecutions: workflowData.length,
      successCount,
      failureCount: workflowData.length - successCount,
      averageDuration,
      successRate,
      totalDuration
    };
  }

  /**
   * Get component performance
   */
  getComponentPerformance(component: string): any {
    const componentData = this.performanceData.filter(d => d.component === component);

    if (componentData.length === 0) {
      return null;
    }

    const totalDuration = componentData.reduce((sum, d) => sum + d.duration, 0);
    const successCount = componentData.filter(d => d.success).length;
    const averageDuration = totalDuration / componentData.length;
    const successRate = (successCount / componentData.length) * 100;

    return {
      component,
      totalCalls: componentData.length,
      successCount,
      failureCount: componentData.length - successCount,
      averageDuration,
      successRate,
      totalDuration
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.performanceData = [];
    this.logger.info('📊 Performance metrics reset');
  }

  /**
   * Shutdown performance monitor
   */
  shutdown(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }

    this.logger.info('📊 Performance monitor shutdown');
  }

  // Private Methods

  private initializeMetrics(): PerformanceMetrics {
    return {
      workflowExecution: {
        averageTime: 0,
        successRate: 100,
        throughput: 0,
        resourceUtilization: 0
      },
      modelSelection: {
        selectionTime: 0,
        accuracy: 0,
        fallbackRate: 0,
        performanceImprovement: 0
      },
      fallbackSystem: {
        recoveryTime: 0,
        successRate: 0,
        userInterventionRate: 0,
        systemUptime: 100
      },
      guardrails: {
        evaluationTime: 0,
        falsePositiveRate: 0,
        violationPrevention: 100,
        complianceRate: 100
      }
    };
  }

  private updateMetrics(data: PerformanceData): void {
    // Update workflow execution metrics
    if (data.action.includes('workflow')) {
      this.updateWorkflowMetrics(data);
    }

    // Update model selection metrics
    if (data.action.includes('model_selection')) {
      this.updateModelSelectionMetrics(data);
    }

    // Update fallback system metrics
    if (data.action.includes('fallback')) {
      this.updateFallbackMetrics(data);
    }

    // Update guardrail metrics
    if (data.action.includes('guardrail')) {
      this.updateGuardrailMetrics(data);
    }
  }

  private updateWorkflowMetrics(data: PerformanceData): void {
    const workflowData = this.performanceData.filter(d => d.action.includes('workflow'));

    if (workflowData.length === 0) return;

    // Calculate average time
    const totalTime = workflowData.reduce((sum, d) => sum + d.duration, 0);
    this.metrics.workflowExecution.averageTime = totalTime / workflowData.length;

    // Calculate success rate
    const successCount = workflowData.filter(d => d.success).length;
    this.metrics.workflowExecution.successRate = (successCount / workflowData.length) * 100;

    // Calculate throughput (executions per minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentExecutions = workflowData.filter(d => d.timestamp >= oneMinuteAgo);
    this.metrics.workflowExecution.throughput = recentExecutions.length;

    // Resource utilization (mock calculation)
    this.metrics.workflowExecution.resourceUtilization = this.calculateResourceUtilization();
  }

  private updateModelSelectionMetrics(data: PerformanceData): void {
    const modelData = this.performanceData.filter(d => d.action.includes('model_selection'));

    if (modelData.length === 0) return;

    // Calculate selection time
    const totalTime = modelData.reduce((sum, d) => sum + d.duration, 0);
    this.metrics.modelSelection.selectionTime = totalTime / modelData.length;

    // Calculate accuracy (mock - would be based on actual model performance)
    this.metrics.modelSelection.accuracy = 85 + Math.random() * 10; // 85-95%

    // Calculate fallback rate
    const fallbackData = this.performanceData.filter(d => d.action.includes('fallback'));
    const fallbackRate = modelData.length > 0 ? (fallbackData.length / modelData.length) * 100 : 0;
    this.metrics.modelSelection.fallbackRate = fallbackRate;

    // Calculate performance improvement (mock)
    this.metrics.modelSelection.performanceImprovement = 20 + Math.random() * 30; // 20-50%
  }

  private updateFallbackMetrics(data: PerformanceData): void {
    const fallbackData = this.performanceData.filter(d => d.action.includes('fallback'));

    if (fallbackData.length === 0) return;

    // Calculate recovery time
    const totalTime = fallbackData.reduce((sum, d) => sum + d.duration, 0);
    this.metrics.fallbackSystem.recoveryTime = totalTime / fallbackData.length;

    // Calculate success rate
    const successCount = fallbackData.filter(d => d.success).length;
    this.metrics.fallbackSystem.successRate = (successCount / fallbackData.length) * 100;

    // Calculate user intervention rate
    const interventionData = fallbackData.filter(d => d.metadata?.requiresManualIntervention);
    const interventionRate = fallbackData.length > 0 ? (interventionData.length / fallbackData.length) * 100 : 0;
    this.metrics.fallbackSystem.userInterventionRate = interventionRate;

    // System uptime (mock - would be based on actual system uptime)
    this.metrics.fallbackSystem.systemUptime = 99.5 + Math.random() * 0.5; // 99.5-100%
  }

  private updateGuardrailMetrics(data: PerformanceData): void {
    const guardrailData = this.performanceData.filter(d => d.action.includes('guardrail'));

    if (guardrailData.length === 0) return;

    // Calculate evaluation time
    const totalTime = guardrailData.reduce((sum, d) => sum + d.duration, 0);
    this.metrics.guardrails.evaluationTime = totalTime / guardrailData.length;

    // Calculate false positive rate (mock)
    this.metrics.guardrails.falsePositiveRate = 1 + Math.random() * 2; // 1-3%

    // Calculate violation prevention
    const violationData = guardrailData.filter(d => d.metadata?.violation);
    const preventionRate = guardrailData.length > 0 ?
      ((guardrailData.length - violationData.length) / guardrailData.length) * 100 : 100;
    this.metrics.guardrails.violationPrevention = preventionRate;

    // Calculate compliance rate
    this.metrics.guardrails.complianceRate = 98 + Math.random() * 2; // 98-100%
  }

  private calculateResourceUtilization(): number {
    // Mock calculation - would integrate with actual resource manager
    return 60 + Math.random() * 20; // 60-80%
  }

  private startAggregation(): void {
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
    }, 60000); // Aggregate every minute
  }

  private aggregateMetrics(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour ago

    // Get recent data for aggregation
    const recentData = this.performanceData.filter(d => d.timestamp >= oneHourAgo);

    if (recentData.length === 0) return;

    // Emit aggregated metrics
    this.emit('metrics:aggregated', {
      timestamp: now,
      metrics: this.metrics,
      dataPoints: recentData.length,
      timeRange: '1 hour'
    });

    this.logger.debug('📊 Metrics aggregated:', {
      dataPoints: recentData.length,
      workflowSuccessRate: this.metrics.workflowExecution.successRate,
      modelSelectionTime: this.metrics.modelSelection.selectionTime
    });
  }
}
