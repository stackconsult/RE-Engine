/**
 * Real Estate Governance Rules - Cohesive rule sets for enhanced AI behavior
 */

import pino from 'pino';

const logger = pino();

export interface GovernanceRule {
  id: string;
  name: string;
  category: 'safety' | 'quality' | 'compliance' | 'performance' | 'ethics';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  condition: (context: any) => boolean;
  action: (context: any) => any;
  enabled: boolean;
}

export interface GovernanceContext {
  requestType: string;
  userId?: string;
  conversationId?: string;
  location?: string;
  propertyData?: any;
  clientProfile?: any;
  previousInteractions?: any[];
  systemMetrics?: any;
}

export interface GovernanceResult {
  ruleId: string;
  action: 'allow' | 'modify' | 'block' | 'escalate';
  reason: string;
  modifications?: any;
  confidence: number;
  metadata?: any;
}

export class RealEstateGovernanceRules {
  private rules: Map<string, GovernanceRule> = new Map();
  private ruleExecutionHistory: GovernanceResult[] = [];
  private complianceMetrics = {
    totalExecutions: 0,
    blockedRequests: 0,
    modifiedRequests: 0,
    escalatedRequests: 0
  };

  constructor() {
    this.initializeRules();
  }

  /**
   * Apply governance rules to request context
   */
  async applyGovernance(context: GovernanceContext): Promise<GovernanceResult[]> {
    const results: GovernanceResult[] = [];
    
    logger.info('Applying governance rules', {
      requestType: context.requestType,
      userId: context.userId,
      location: context.location
    });

    // Sort rules by priority
    const sortedRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

    for (const rule of sortedRules) {
      try {
        if (rule.condition(context)) {
          const result = await this.executeRule(rule, context);
          results.push(result);
          
          // Stop processing on critical blocks
          if (result.action === 'block' && rule.priority === 'critical') {
            logger.warn('Critical rule triggered block', {
              ruleId: rule.id,
              reason: result.reason
            });
            break;
          }
        }
      } catch (error) {
        logger.error('Rule execution failed', {
          ruleId: rule.id,
          error: error.message
        });
      }
    }

    // Update metrics
    this.updateComplianceMetrics(results);
    this.recordRuleExecution(results);

    return results;
  }

  /**
   * Initialize comprehensive rule sets
   */
  private initializeRules(): void {
    // SAFETY RULES
    this.addRule({
      id: 'sensitive_data_protection',
      name: 'Sensitive Data Protection',
      category: 'safety',
      priority: 'critical',
      description: 'Prevent exposure of sensitive personal and financial information',
      condition: (context) => this.containsSensitiveData(context),
      action: (context) => ({
        action: 'block',
        reason: 'Request contains sensitive data that cannot be processed',
        confidence: 0.95,
        metadata: {
          detectedDataTypes: this.detectSensitiveDataTypes(context)
        }
      }),
      enabled: true
    });

    this.addRule({
      id: 'illegal_activity_detection',
      name: 'Illegal Activity Detection',
      category: 'safety',
      priority: 'critical',
      description: 'Block requests involving illegal real estate activities',
      condition: (context) => this.detectsIllegalActivity(context),
      action: (context) => ({
        action: 'block',
        reason: 'Request may involve illegal real estate activities',
        confidence: 0.85,
        metadata: {
          flaggedTerms: this.getFlaggedTerms(context)
        }
      }),
      enabled: true
    });

    // QUALITY RULES
    this.addRule({
      id: 'minimum_information_requirement',
      name: 'Minimum Information Requirement',
      category: 'quality',
      priority: 'high',
      description: 'Ensure sufficient information for meaningful analysis',
      condition: (context) => !this.hasMinimumRequiredInfo(context),
      action: (context) => ({
        action: 'modify',
        reason: 'Insufficient information provided, requesting additional details',
        confidence: 0.8,
        modifications: {
          additionalInfoRequired: this.getMissingInformation(context),
          suggestedClarifications: this.generateClarificationRequests(context)
        }
      }),
      enabled: true
    });

    this.addRule({
      id: 'location_validation',
      name: 'Location Validation',
      category: 'quality',
      priority: 'medium',
      description: 'Validate and normalize location information',
      condition: (context) => context.location && !this.isValidLocation(context.location),
      action: (context) => ({
        action: 'modify',
        reason: 'Location format needs validation or normalization',
        confidence: 0.7,
        modifications: {
          suggestedLocation: this.normalizeLocation(context.location),
          alternatives: this.getLocationAlternatives(context.location)
        }
      }),
      enabled: true
    });

    // COMPLIANCE RULES
    this.addRule({
      id: 'fair_housing_compliance',
      name: 'Fair Housing Compliance',
      category: 'compliance',
      priority: 'critical',
      description: 'Ensure compliance with Fair Housing Act requirements',
      condition: (context) => this.detectsProtectedClassDiscrimination(context),
      action: (context) => ({
        action: 'block',
        reason: 'Request may violate Fair Housing Act regulations',
        confidence: 0.9,
        metadata: {
          protectedClasses: this.getFlaggedProtectedClasses(context),
          complianceGuidance: this.getFairHousingGuidance()
        }
      }),
      enabled: true
    });

    this.addRule({
      id: 'licensing_verification',
      name: 'Licensing Verification',
      category: 'compliance',
      priority: 'high',
      description: 'Verify real estate licensing requirements',
      condition: (context) => this.requiresProfessionalLicense(context),
      action: (context) => ({
        action: 'modify',
        reason: 'Request requires professional real estate licensing',
        confidence: 0.8,
        modifications: {
          licensingRequired: this.getRequiredLicenses(context),
          disclaimer: this.getLicensingDisclaimer(),
          professionalConsultationRecommended: true
        }
      }),
      enabled: true
    });

    // PERFORMANCE RULES
    this.addRule({
      id: 'rate_limiting',
      name: 'Rate Limiting',
      category: 'performance',
      priority: 'medium',
      description: 'Prevent abuse through rate limiting',
      condition: (context) => this.exceedsRateLimit(context),
      action: (context) => ({
        action: 'block',
        reason: 'Request rate exceeded limits',
        confidence: 1.0,
        metadata: {
          currentRate: this.getCurrentRate(context.userId),
          limit: this.getRateLimit(context.userId),
          resetTime: this.getRateLimitResetTime(context.userId)
        }
      }),
      enabled: true
    });

    this.addRule({
      id: 'complexity_management',
      name: 'Complexity Management',
      category: 'performance',
      priority: 'medium',
      description: 'Manage request complexity to ensure timely responses',
      condition: (context) => this.exceedsComplexityLimit(context),
      action: (context) => ({
        action: 'modify',
        reason: 'Request complexity exceeds optimal parameters',
        confidence: 0.7,
        modifications: {
          simplifiedScope: this.simplifyRequestScope(context),
          estimatedProcessingTime: this.estimateProcessingTime(context),
          recommendations: this.getComplexityRecommendations(context)
        }
      }),
      enabled: true
    });

    // ETHICS RULES
    this.addRule({
      id: 'conflict_of_interest_detection',
      name: 'Conflict of Interest Detection',
      category: 'ethics',
      priority: 'high',
      description: 'Detect potential conflicts of interest in recommendations',
      condition: (context) => this.detectsConflictOfInterest(context),
      action: (context) => ({
        action: 'escalate',
        reason: 'Potential conflict of interest detected',
        confidence: 0.75,
        metadata: {
          conflictFactors: this.getConflictFactors(context),
          escalationRequired: true,
          humanReviewRecommended: true
        }
      }),
      enabled: true
    });

    this.addRule({
      id: 'bias_mitigation',
      name: 'Bias Mitigation',
      category: 'ethics',
      priority: 'high',
      description: 'Identify and mitigate potential biases in analysis',
      condition: (context) => this.detectsPotentialBias(context),
      action: (context) => ({
        action: 'modify',
        reason: 'Potential bias detected, applying mitigation measures',
        confidence: 0.7,
        modifications: {
          biasFactors: this.identifyBiasFactors(context),
          mitigationStrategies: this.getBiasMitigationStrategies(context),
          enhancedObjectivity: true
        }
      }),
      enabled: true
    });
  }

  /**
   * Rule condition implementations
   */
  private containsSensitiveData(context: GovernanceContext): boolean {
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/, // SSN patterns
      /\b\d{9,12}\b/, // Account numbers
      /password|pin|secret/i,
      /bank account|routing number/i
    ];

    const text = JSON.stringify(context).toLowerCase();
    return sensitivePatterns.some(pattern => pattern.test(text));
  }

  private detectsIllegalActivity(context: GovernanceContext): boolean {
    const illegalTerms = [
      'money laundering', 'fraud', 'discrimination', 'redlining',
      'blockbusting', 'steering', 'predatory lending', 'illegal flipping'
    ];

    const text = JSON.stringify(context).toLowerCase();
    return illegalTerms.some(term => text.includes(term));
  }

  private hasMinimumRequiredInfo(context: GovernanceContext): boolean {
    switch (context.requestType) {
      case 'property_valuation':
        return !!(context.propertyData?.type || context.location);
      case 'market_analysis':
        return !!context.location;
      case 'investment_analysis':
        return !!(context.propertyData || context.marketData);
      case 'lead_qualification':
        return !!(context.clientProfile);
      default:
        return true;
    }
  }

  private isValidLocation(location: string): boolean {
    // Basic location validation - can be enhanced with geocoding
    const locationPatterns = [
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}$/, // City, State
      /^\d+\s+[A-Za-z0-9\s]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}$/, // Address, City, State
      /^[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z]{2}$/ // City, County, State
    ];

    return locationPatterns.some(pattern => pattern.test(location));
  }

  private detectsProtectedClassDiscrimination(context: GovernanceContext): boolean {
    const protectedClasses = [
      'race', 'color', 'religion', 'sex', 'national origin',
      'disability', 'familial status', 'age', 'gender identity',
      'sexual orientation', 'marital status'
    ];

    const discriminatoryTerms = [
      'only', 'excludes', 'prohibits', 'restricted to', 'no',
      'prefer', 'avoid', 'exclude based on'
    ];

    const text = JSON.stringify(context).toLowerCase();
    
    return protectedClasses.some(cls => 
      text.includes(cls) && discriminatoryTerms.some(term => text.includes(term))
    );
  }

  private requiresProfessionalLicense(context: GovernanceContext): boolean {
    const professionalServices = [
      'legal advice', 'appraisal', 'inspection', 'property management',
      'mortgage advice', 'investment advice', 'tax advice'
    ];

    const text = JSON.stringify(context).toLowerCase();
    return professionalServices.some(service => text.includes(service));
  }

  private exceedsRateLimit(context: GovernanceContext): boolean {
    // Simplified rate limiting - would use proper rate limiting in production
    const currentRate = this.getCurrentRate(context.userId);
    const limit = this.getRateLimit(context.userId);
    return currentRate > limit;
  }

  private exceedsComplexityLimit(context: GovernanceContext): boolean {
    // Analyze request complexity
    const textLength = JSON.stringify(context).length;
    const dataPoints = this.countDataPoints(context);
    
    return textLength > 10000 || dataPoints > 50;
  }

  private detectsConflictOfInterest(context: GovernanceContext): boolean {
    // Check for potential conflicts based on user relationships and affiliations
    const conflictIndicators = [
      context.clientProfile?.agentRelationship,
      context.propertyData?.ownershipInterest,
      context.previousInteractions?.some(interaction => 
        interaction.type === 'transaction' && 
        interaction.parties?.includes(context.userId)
      )
    ];

    return conflictIndicators.some(indicator => indicator);
  }

  private detectsPotentialBias(context: GovernanceContext): boolean {
    // Check for potential bias indicators
    const biasIndicators = [
      /only.*\b(white|black|asian|hispanic|latino)\b/i,
      /prefer.*\b(men|women|families|singles)\b/i,
      /avoid.*\b(children|elderly|students)\b/i
    ];

    const text = JSON.stringify(context);
    return biasIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Rule action implementations
   */
  private async executeRule(rule: GovernanceRule, context: GovernanceContext): Promise<GovernanceResult> {
    try {
      const result = await rule.action(context);
      
      return {
        ruleId: rule.id,
        action: result.action,
        reason: result.reason,
        modifications: result.modifications,
        confidence: result.confidence || 0.5,
        metadata: {
          ruleName: rule.name,
          category: rule.category,
          priority: rule.priority,
          timestamp: new Date().toISOString(),
          ...result.metadata
        }
      };
    } catch (error) {
      logger.error('Rule action execution failed', {
        ruleId: rule.id,
        error: error.message
      });

      return {
        ruleId: rule.id,
        action: 'allow',
        reason: 'Rule execution failed, allowing request',
        confidence: 0.1,
        metadata: {
          error: error.message,
          fallback: true
        }
      };
    }
  }

  /**
   * Helper methods
   */
  private getPriorityWeight(priority: string): number {
    const weights = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };
    return weights[priority as keyof typeof weights] || 0;
  }

  private detectSensitiveDataTypes(context: GovernanceContext): string[] {
    const text = JSON.stringify(context);
    const types = [];
    
    if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(text)) types.push('credit_card');
    if (/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/.test(text)) types.push('ssn');
    if (/password|pin|secret/i.test(text)) types.push('credentials');
    
    return types;
  }

  private getFlaggedTerms(context: GovernanceContext): string[] {
    const text = JSON.stringify(context).toLowerCase();
    const illegalTerms = [
      'money laundering', 'fraud', 'discrimination', 'redlining',
      'blockbusting', 'steering', 'predatory lending'
    ];

    return illegalTerms.filter(term => text.includes(term));
  }

  private getMissingInformation(context: GovernanceContext): string[] {
    const missing = [];
    
    if (!context.location && context.requestType !== 'lead_qualification') {
      missing.push('location');
    }
    if (!context.propertyData && ['property_valuation', 'investment_analysis'].includes(context.requestType)) {
      missing.push('property details');
    }
    if (!context.clientProfile && context.requestType === 'lead_qualification') {
      missing.push('client information');
    }
    
    return missing;
  }

  private generateClarificationRequests(context: GovernanceContext): string[] {
    const requests = [];
    
    if (!context.location) {
      requests.push('Please specify the property location (city, state or full address)');
    }
    if (!context.propertyData?.type && context.requestType === 'property_valuation') {
      requests.push('Please provide property type (single family, condo, etc.)');
    }
    if (!context.clientProfile?.budget && context.requestType === 'lead_qualification') {
      requests.push('Please provide budget range or financing pre-approval status');
    }
    
    return requests;
  }

  private normalizeLocation(location: string): string {
    // Basic location normalization
    return location
      .replace(/\s+/g, ' ')
      .replace(/,\s*/g, ', ')
      .trim();
  }

  private getLocationAlternatives(location: string): string[] {
    // Would use geocoding API in production
    return [
      `${location}, USA`,
      location.replace(/,\s*[A-Z]{2}$/, ''),
      location.split(',')[0]
    ];
  }

  private getFlaggedProtectedClasses(context: GovernanceContext): string[] {
    const text = JSON.stringify(context).toLowerCase();
    const protectedClasses = [
      'race', 'color', 'religion', 'sex', 'national origin',
      'disability', 'familial status', 'age'
    ];

    return protectedClasses.filter(cls => text.includes(cls));
  }

  private getFairHousingGuidance(): string[] {
    return [
      'Fair Housing Act prohibits discrimination based on protected classes',
      'All marketing and communications must be inclusive',
      'Focus on property features and amenities, not buyer characteristics',
      'Apply consistent criteria to all applicants'
    ];
  }

  private getRequiredLicenses(context: GovernanceContext): string[] {
    const licenses = [];
    
    if (context.requestType === 'property_valuation') {
      licenses.push('Real Estate Appraiser License');
    }
    if (context.requestType === 'market_analysis') {
      licenses.push('Real Estate License');
    }
    if (context.requestType === 'investment_analysis') {
      licenses.push('Real Estate License', 'Investment Advisor License');
    }
    
    return licenses;
  }

  private getLicensingDisclaimer(): string {
    return 'This analysis is for informational purposes only and does not constitute professional advice. Consult with licensed professionals for specific guidance.';
  }

  private getCurrentRate(userId?: string): number {
    // Simplified rate tracking - would use proper rate limiting service
    return Math.floor(Math.random() * 10);
  }

  private getRateLimit(userId?: string): number {
    // Different limits for different user types
    return userId ? 100 : 50; // Authenticated users get higher limits
  }

  private getRateLimitResetTime(userId?: string): string {
    const resetTime = new Date(Date.now() + 3600000); // 1 hour from now
    return resetTime.toISOString();
  }

  private countDataPoints(context: GovernanceContext): number {
    let count = 0;
    
    if (context.propertyData) count += Object.keys(context.propertyData).length;
    if (context.marketData) count += Object.keys(context.marketData).length;
    if (context.clientProfile) count += Object.keys(context.clientProfile).length;
    if (context.previousInteractions) count += context.previousInteractions.length;
    
    return count;
  }

  private simplifyRequestScope(context: GovernanceContext): any {
    return {
      focusAreas: ['primary_analysis'],
      detailLevel: 'basic',
      excludeAdvancedFeatures: true
    };
  }

  private estimateProcessingTime(context: GovernanceContext): number {
    const complexity = this.countDataPoints(context);
    return Math.min(30000, complexity * 100); // Max 30 seconds
  }

  private getComplexityRecommendations(context: GovernanceContext): string[] {
    return [
      'Consider breaking down complex requests into smaller, focused queries',
      'Provide specific parameters to narrow the analysis scope',
      'Use multiple requests for different aspects of comprehensive analysis'
    ];
  }

  private getConflictFactors(context: GovernanceContext): string[] {
    const factors = [];
    
    if (context.clientProfile?.agentRelationship) {
      factors.push('Agent relationship with client');
    }
    if (context.propertyData?.ownershipInterest) {
      factors.push('Ownership interest in property');
    }
    
    return factors;
  }

  private identifyBiasFactors(context: GovernanceContext): string[] {
    const text = JSON.stringify(context).toLowerCase();
    const factors = [];
    
    if (text.includes('only') || text.includes('excludes')) {
      factors.push('Exclusionary language detected');
    }
    if (text.includes('prefer') || text.includes('avoid')) {
      factors.push('Preference-based language detected');
    }
    
    return factors;
  }

  private getBiasMitigationStrategies(context: GovernanceContext): string[] {
    return [
      'Use inclusive language focusing on property features',
      'Apply consistent criteria across all candidates',
      'Avoid demographic-based filtering or preferences',
      'Focus on objective, measurable criteria'
    ];
  }

  /**
   * Metrics and monitoring
   */
  private updateComplianceMetrics(results: GovernanceResult[]): void {
    this.complianceMetrics.totalExecutions++;
    
    results.forEach(result => {
      switch (result.action) {
        case 'block':
          this.complianceMetrics.blockedRequests++;
          break;
        case 'modify':
          this.complianceMetrics.modifiedRequests++;
          break;
        case 'escalate':
          this.complianceMetrics.escalatedRequests++;
          break;
      }
    });
  }

  private recordRuleExecution(results: GovernanceResult[]): void {
    this.ruleExecutionHistory.push(...results);
    
    // Keep only last 1000 executions
    if (this.ruleExecutionHistory.length > 1000) {
      this.ruleExecutionHistory = this.ruleExecutionHistory.slice(-1000);
    }
  }

  /**
   * Public API methods
   */
  addRule(rule: GovernanceRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Governance rule added', { ruleId: rule.id, name: rule.name });
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.info('Governance rule removed', { ruleId });
    }
    return removed;
  }

  enableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info('Governance rule enabled', { ruleId });
      return true;
    }
    return false;
  }

  disableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info('Governance rule disabled', { ruleId });
      return true;
    }
    return false;
  }

  getGovernanceMetrics(): any {
    return {
      ...this.complianceMetrics,
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      recentExecutions: this.ruleExecutionHistory.slice(-100),
      ruleDistribution: this.getRuleDistribution(),
      averageConfidence: this.calculateAverageConfidence()
    };
  }

  private getRuleDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    this.ruleExecutionHistory.forEach(result => {
      const category = this.rules.get(result.ruleId)?.category || 'unknown';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateAverageConfidence(): number {
    if (this.ruleExecutionHistory.length === 0) return 0;
    
    const totalConfidence = this.ruleExecutionHistory.reduce((sum, result) => 
      sum + result.confidence, 0
    );
    return totalConfidence / this.ruleExecutionHistory.length;
  }
}
