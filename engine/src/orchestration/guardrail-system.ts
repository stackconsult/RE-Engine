// @ts-nocheck - Type issues pending (Phase 2)
/**
 * Guardrail System
 * Comprehensive rule-based validation and enforcement
 */

import { EventEmitter } from 'events';
import { GuardrailRule, ValidationResult, RuleEvaluation, Action, Workflow, ExecutionContext } from '../types/orchestration.types';
import { Logger } from '../utils/logger';

export interface GuardrailSystemConfig {
  enableStrictMode: boolean;
  enableAuditLogging: boolean;
  enableRealTimeValidation: boolean;
  violationThreshold: number;
  alertThreshold: number;
}

export class GuardrailSystem extends EventEmitter {
  private rules: Map<string, GuardrailRule> = new Map();
  private violationCounts: Map<string, number> = new Map();
  private config: GuardrailSystemConfig;
  private logger: Logger;
  private auditLog: AuditEntry[] = [];

  constructor(config?: Partial<GuardrailSystemConfig>) {
    super();
    this.config = {
      enableStrictMode: true,
      enableAuditLogging: true,
      enableRealTimeValidation: true,
      violationThreshold: 3,
      alertThreshold: 5,
      ...config
    };
    this.logger = new Logger('GuardrailSystem', true);
  }

  /**
   * Initialize the guardrail system with default rules
   */
  async initialize(config: { rules: string[]; enforcement: string; logging: boolean; alerts: boolean }): Promise<void> {
    this.logger.info('🛡️ Initializing Guardrail System...');

    // Load default rules
    await this.loadDefaultRules();

    // Enable specified rules
    for (const ruleName of config.rules) {
      const rule = this.rules.get(ruleName);
      if (rule) {
        rule.enabled = true;
        this.logger.debug(`✅ Enabled guardrail rule: ${ruleName}`);
      }
    }

    // Set enforcement level
    if (config.enforcement === 'strict') {
      this.config.enableStrictMode = true;
    }

    this.logger.info(`✅ Guardrail System initialized with ${this.rules.size} rules`);
    this.emit('initialized', { rulesCount: this.rules.size, config });
  }

  /**
   * Validate a workflow against guardrails
   */
  async validateWorkflow(workflow: Workflow, context: ExecutionContext): Promise<ValidationResult> {
    this.logger.debug(`🔍 Validating workflow ${workflow.id}`);

    let overallCompliant = true;
    let overallReason = '';
    let overallSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const ruleName of workflow.guardrails || []) {
      const rule = this.rules.get(ruleName);
      if (!rule || !rule.enabled) {
        continue;
      }

      const result = await this.evaluateRule(rule, workflow, context);
      
      if (!result.compliant) {
        overallCompliant = false;
        overallReason = overallReason ? `${overallReason}; ${result.reason}` : result.reason;
        
        // Update severity to highest level
        if (this.getSeverityLevel(result.severity) > this.getSeverityLevel(overallSeverity)) {
          overallSeverity = result.severity || 'medium';
        }

        // Record violation
        this.recordViolation(ruleName, result);
      }
    }

    const validationResult: ValidationResult = {
      compliant: overallCompliant,
      confidence: overallCompliant ? 1.0 : 0.0,
      reason: overallReason,
      severity: overallSeverity,
      blocked: !overallCompliant && this.config.enableStrictMode,
      requiresApproval: !overallCompliant && !this.config.enableStrictMode
    };

    // Audit log
    if (this.config.enableAuditLogging) {
      this.auditLogEntry({
        timestamp: Date.now(),
        action: 'workflow_validation',
        workflowId: workflow.id,
        result: validationResult,
        context
      });
    }

    this.logger.debug(`🔍 Workflow validation result: ${validationResult.compliant ? 'COMPLIANT' : 'VIOLATION'}`);
    return validationResult;
  }

  /**
   * Validate a step against guardrails
   */
  async validateStep(step: any, context: ExecutionContext): Promise<ValidationResult> {
    this.logger.debug(`🔍 Validating step ${step.id}`);

    let overallCompliant = true;
    let overallReason = '';
    let overallSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const ruleName of step.guardrails || []) {
      const rule = this.rules.get(ruleName);
      if (!rule || !rule.enabled) {
        continue;
      }

      const result = await this.evaluateRule(rule, step, context);
      
      if (!result.compliant) {
        overallCompliant = false;
        overallReason = overallReason ? `${overallReason}; ${result.reason}` : result.reason;
        
        if (this.getSeverityLevel(result.severity) > this.getSeverityLevel(overallSeverity)) {
          overallSeverity = result.severity || 'medium';
        }

        this.recordViolation(ruleName, result);
      }
    }

    const validationResult: ValidationResult = {
      compliant: overallCompliant,
      confidence: overallCompliant ? 1.0 : 0.0,
      reason: overallReason,
      severity: overallSeverity,
      blocked: !overallCompliant && this.config.enableStrictMode,
      requiresApproval: !overallCompliant && !this.config.enableStrictMode
    };

    // Audit log
    if (this.config.enableAuditLogging) {
      this.auditLogEntry({
        timestamp: Date.now(),
        action: 'step_validation',
        stepId: step.id,
        result: validationResult,
        context
      });
    }

    return validationResult;
  }

  /**
   * Validate an action against guardrails
   */
  async validateAction(action: Action, context: ExecutionContext): Promise<ValidationResult> {
    this.logger.debug(`🔍 Validating action ${action.type}`);

    let overallCompliant = true;
    let overallReason = '';
    let overallSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check all applicable rules
    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      const result = await this.evaluateRuleForAction(rule, action, context);
      
      if (!result.compliant) {
        overallCompliant = false;
        overallReason = overallReason ? `${overallReason}; ${result.reason}` : result.reason;
        
        if (this.getSeverityLevel(result.severity) > this.getSeverityLevel(overallSeverity)) {
          overallSeverity = result.severity || 'medium';
        }

        this.recordViolation(rule.id, result);
      }
    }

    const validationResult: ValidationResult = {
      compliant: overallCompliant,
      confidence: overallCompliant ? 1.0 : 0.0,
      reason: overallReason,
      severity: overallSeverity,
      blocked: !overallCompliant && this.config.enableStrictMode,
      requiresApproval: !overallCompliant && !this.config.enableStrictMode
    };

    // Audit log
    if (this.config.enableAuditLogging) {
      this.auditLogEntry({
        timestamp: Date.now(),
        action: 'action_validation',
        actionId: action.id,
        result: validationResult,
        context
      });
    }

    return validationResult;
  }

  /**
   * Add a new guardrail rule
   */
  addRule(rule: GuardrailRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info(`📝 Added guardrail rule: ${rule.id}`);
    this.emit('rule:added', { rule });
  }

  /**
   * Remove a guardrail rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.logger.info(`🗑️ Removed guardrail rule: ${ruleId}`);
    this.emit('rule:removed', { ruleId });
  }

  /**
   * Get all rules
   */
  getRules(): Map<string, GuardrailRule> {
    return new Map(this.rules);
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): Map<string, number> {
    return new Map(this.violationCounts);
  }

  /**
   * Get audit log
   */
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
    this.logger.info('🗑️ Audit log cleared');
  }

  // Private Methods

  private async loadDefaultRules(): Promise<void> {
    const defaultRules: GuardrailRule[] = [
      {
        id: 'no-sensitive-data-exposure',
        name: 'No Sensitive Data Exposure',
        type: 'data-privacy',
        severity: 'critical',
        description: 'Prevents exposure of sensitive data like SSN, credit cards, passwords',
        enabled: true,
        conditions: [
          { field: 'parameters', operator: 'regex', value: /\b\d{3}-\d{2}-\d{4}\b/ }, // SSN pattern
          { field: 'parameters', operator: 'regex', value: /\b4\d{12}\b/ }, // Credit card pattern
          { field: 'parameters', operator: 'contains', value: 'password' },
          { field: 'parameters', operator: 'contains', value: 'api_key' }
        ],
        actions: [
          { type: 'block', parameters: { reason: 'Sensitive data detected' } }
        ]
      },
      {
        id: 'no-unauthorized-access',
        name: 'No Unauthorized Access',
        type: 'security',
        severity: 'high',
        description: 'Prevents unauthorized access to protected resources',
        enabled: true,
        conditions: [
          { field: 'permissions', operator: 'equals', value: undefined }
        ],
        actions: [
          { type: 'block', parameters: { reason: 'Unauthorized access attempt' } }
        ]
      },
      {
        id: 'no-excessive-api-calls',
        name: 'No Excessive API Calls',
        type: 'performance',
        severity: 'medium',
        description: 'Prevents excessive API calls that could impact performance',
        enabled: true,
        conditions: [
          { field: 'action', operator: 'contains', value: 'api_call' },
          { field: 'context.apiCallCount', operator: 'greater-than', value: 100 }
        ],
        actions: [
          { type: 'warn', parameters: { reason: 'High API call volume detected' } }
        ]
      },
      {
        id: 'no-illegal-activities',
        name: 'No Illegal Activities',
        type: 'compliance',
        severity: 'critical',
        description: 'Prevents activities that violate laws or regulations',
        enabled: true,
        conditions: [
          { field: 'parameters', operator: 'regex', value: /(?i)(fraud|scam|illegal|hack)/ }
        ],
        actions: [
          { type: 'block', parameters: { reason: 'Illegal activity detected' } }
        ]
      },
      {
        id: 'no-data-privacy-violations',
        name: 'No Data Privacy Violations',
        type: 'data-privacy',
        severity: 'high',
        description: 'Ensures compliance with data privacy regulations',
        enabled: true,
        conditions: [
          { field: 'parameters', operator: 'contains', value: 'personal_data' },
          { field: 'context.dataConsent', operator: 'equals', value: false }
        ],
        actions: [
          { type: 'block', parameters: { reason: 'Data privacy violation' } }
        ]
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }
  }

  private async evaluateRule(rule: GuardrailRule, target: any, context: ExecutionContext): Promise<RuleEvaluation> {
    switch (rule.type) {
      case 'data-privacy':
        return await this.evaluateDataPrivacyRule(rule, target, context);
      case 'security':
        return await this.evaluateSecurityRule(rule, target, context);
      case 'compliance':
        return await this.evaluateComplianceRule(rule, target, context);
      case 'performance':
        return await this.evaluatePerformanceRule(rule, target, context);
      case 'cost':
        return await this.evaluateCostRule(rule, target, context);
      default:
        return { compliant: true, confidence: 1.0 };
    }
  }

  private async evaluateRuleForAction(rule: GuardrailRule, action: Action, context: ExecutionContext): Promise<RuleEvaluation> {
    // Extract relevant data from action
    const target = {
      parameters: action.parameters,
      type: action.type,
      component: action.component
    };

    return await this.evaluateRule(rule, target, context);
  }

  private async evaluateDataPrivacyRule(rule: GuardrailRule, target: any, context: ExecutionContext): Promise<RuleEvaluation> {
    const sensitiveDataPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b4\d{12}\b/, // Credit card
      /\b\d{10}\b/, // Phone number
      /password/i,
      /api[_-]?key/i,
      /secret/i,
      /token/i
    ];

    const targetData = JSON.stringify(target.parameters || {});
    const hasSensitiveData = sensitiveDataPatterns.some(pattern => pattern.test(targetData));

    if (hasSensitiveData) {
      return {
        compliant: false,
        confidence: 0.9,
        reason: 'Sensitive data detected in action parameters',
        severity: 'critical'
      };
    }

    return { compliant: true, confidence: 0.95 };
  }

  private async evaluateSecurityRule(rule: GuardrailRule, target: any, context: ExecutionContext): Promise<RuleEvaluation> {
    // Check for proper authorization
    if (!context.permissions || context.permissions.length === 0) {
      return {
        compliant: false,
        confidence: 0.8,
        reason: 'No permissions found in context',
        severity: 'high'
      };
    }

    // Check if action requires specific permission
    const requiredPermission = this.getRequiredPermission(target.type, target.action);
    if (requiredPermission && !context.permissions.includes(requiredPermission)) {
      return {
        compliant: false,
        confidence: 0.9,
        reason: `Required permission '${requiredPermission}' not found`,
        severity: 'high'
      };
    }

    return { compliant: true, confidence: 0.95 };
  }

  private async evaluateComplianceRule(rule: GuardrailRule, target: any, context: ExecutionContext): Promise<RuleEvaluation> {
    // Check for fair housing compliance
    if (target.type === 'real-estate' && target.parameters) {
      const prohibitedTerms = ['race', 'religion', 'nationality', 'gender', 'familial_status'];
      const targetText = JSON.stringify(target.parameters).toLowerCase();
      
      for (const term of prohibitedTerms) {
        if (targetText.includes(term)) {
          return {
            compliant: false,
            confidence: 0.8,
            reason: `Potential fair housing violation: ${term}`,
            severity: 'high'
          };
        }
      }
    }

    return { compliant: true, confidence: 0.9 };
  }

  private async evaluatePerformanceRule(rule: GuardrailRule, target: any, context: ExecutionContext): Promise<RuleEvaluation> {
    // Check for performance issues
    if (target.parameters && target.parameters.batchSize > 1000) {
      return {
        compliant: false,
        confidence: 0.7,
        reason: 'Batch size too large, may impact performance',
        severity: 'medium'
      };
    }

    return { compliant: true, confidence: 0.9 };
  }

  private async evaluateCostRule(rule: GuardrailRule, target: any, context: ExecutionContext): Promise<RuleEvaluation> {
    // Check for cost control
    if (target.parameters && target.parameters.maxCost > 100) {
      return {
        compliant: false,
        confidence: 0.8,
        reason: 'Cost limit exceeded',
        severity: 'medium'
      };
    }

    return { compliant: true, confidence: 0.9 };
  }

  private recordViolation(ruleId: string, result: RuleEvaluation): void {
    const currentCount = this.violationCounts.get(ruleId) || 0;
    this.violationCounts.set(ruleId, currentCount + 1);

    this.logger.warn(`⚠️ Guardrail violation recorded: ${ruleId} - ${result.reason}`);

    // Check if alert threshold reached
    if (currentCount + 1 >= this.config.alertThreshold) {
      this.emit('violation:threshold-reached', {
        ruleId,
        count: currentCount + 1,
        threshold: this.config.alertThreshold,
        result
      });
    }

    // Audit log
    if (this.config.enableAuditLogging) {
      this.auditLogEntry({
        timestamp: Date.now(),
        action: 'violation',
        ruleId,
        result,
        severity: result.severity
      });
    }
  }

  private getSeverityLevel(severity?: string): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity as keyof typeof levels] || 1;
  }

  private getRequiredPermission(actionType: string, action: string): string | null {
    const permissionMap: Record<string, string> = {
      'database': 'database:write',
      'api': 'api:call',
      'mobile': 'mobile:send',
      'web': 'web:automate'
    };

    return permissionMap[actionType] || null;
  }

  private auditLogEntry(entry: Partial<AuditEntry>): void {
    const auditEntry: AuditEntry = {
      id: this.generateId(),
      timestamp: entry.timestamp || Date.now(),
      action: entry.action || 'unknown',
      ...entry
    } as AuditEntry;

    this.auditLog.push(auditEntry);

    // Keep audit log size manageable
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000); // Keep last 5000 entries
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  workflowId?: string;
  stepId?: string;
  actionId?: string;
  ruleId?: string;
  result?: ValidationResult | RuleEvaluation;
  context?: ExecutionContext;
  severity?: string;
}
