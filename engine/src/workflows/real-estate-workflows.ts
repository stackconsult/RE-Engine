/**
 * Real Estate Workflows
 * Predefined workflows for real estate automation
 */

import { Workflow } from '../types/orchestration.types';
import { Logger } from '../utils/logger';

/**
 * Lead Generation Workflow
 * Automated lead generation from multiple sources
 */
export const leadGenerationWorkflow: Workflow = {
  id: 'real-estate-lead-generation',
  name: 'Automated Real Estate Lead Generation',
  description: 'Generate and qualify real estate leads from multiple sources with AI-powered analysis',
  steps: [
    {
      id: 'search-properties',
      name: 'Search for Properties',
      type: 'web',
      component: 'reengine-tinyfish',
      action: 'scrape_real_estate_listings',
      parameters: {
        location: '{{context.location}}',
        propertyType: '{{context.propertyType}}',
        priceRange: '{{context.priceRange}}',
        bedrooms: '{{context.bedrooms}}',
        bathrooms: '{{context.bathrooms}}',
        limit: 50
      },
      dependencies: [],
      guardrails: ['data-privacy', 'rate-limit'],
      timeout: 60000,
      retryPolicy: { maxAttempts: 3, baseDelay: 2000, maxDelay: 30000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'reengine-web-scraping', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { limit: 25 }, priority: 2 }
      ]
    },
    {
      id: 'enrich-property-data',
      name: 'Enrich Property Data with AI Analysis',
      type: 'llm',
      component: 'local-deepseek-r1:32b',
      action: 'analyze_property',
      parameters: {
        propertyData: '{{steps.search-properties.results}}',
        analysisType: 'comprehensive',
        includeMarketAnalysis: true,
        includeInvestmentPotential: true
      },
      dependencies: ['search-properties'],
      guardrails: ['data-quality', 'cost-control'],
      timeout: 90000,
      retryPolicy: { maxAttempts: 2, baseDelay: 5000, maxDelay: 30000, backoff: 'linear' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'cloud-gpt-4', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { analysisType: 'basic' }, priority: 2 }
      ]
    },
    {
      id: 'extract-owner-info',
      name: 'Extract Owner Contact Information',
      type: 'web',
      component: 'reengine-browser-automation',
      action: 'extract_contact_info',
      parameters: {
        propertyUrls: '{{steps.search-properties.results.map(p => p.url)}}',
        extractionType: 'owner',
        includePublicRecords: true,
        stealthMode: true
      },
      dependencies: ['search-properties'],
      guardrails: ['data-privacy', 'web-scraping-ethics'],
      timeout: 120000,
      retryPolicy: { maxAttempts: 3, baseDelay: 3000, maxDelay: 60000, backoff: 'exponential' },
      fallbacks: [
        { type: 'parameter-adjustment', adjustments: { sources: ['public-records'] }, priority: 1 },
        { type: 'manual-intervention', reason: 'Contact extraction failed', priority: 2 }
      ]
    },
    {
      id: 'qualify-leads',
      name: 'Qualify Leads with AI Scoring',
      type: 'llm',
      component: 'local-phi4-reasoning:14b',
      action: 'qualify_lead',
      parameters: {
        leads: '{{steps.extract-owner-info.results}}',
        qualificationCriteria: '{{context.qualificationCriteria}}',
        scoringModel: 'advanced',
        includeRiskAssessment: true
      },
      dependencies: ['extract-owner-info', 'enrich-property-data'],
      guardrails: ['fair-housing', 'compliance'],
      timeout: 60000,
      retryPolicy: { maxAttempts: 2, baseDelay: 3000, maxDelay: 30000, backoff: 'linear' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'cloud-claude-3-sonnet', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { scoringModel: 'basic' }, priority: 2 }
      ]
    },
    {
      id: 'send-outreach',
      name: 'Send Personalized Outreach Messages',
      type: 'mobile',
      component: 'mobile',
      action: 'send_imessage',
      parameters: {
        contacts: '{{steps.qualify-leads.qualifiedLeads}}',
        messageTemplate: '{{context.messageTemplate}}',
        scheduling: '{{context.scheduling}}',
        personalizationLevel: 'high'
      },
      dependencies: ['qualify-leads'],
      guardrails: ['communication-limits', 'spam-prevention'],
      timeout: 180000,
      retryPolicy: { maxAttempts: 3, baseDelay: 5000, maxDelay: 60000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'reengine-outreach', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { channel: 'email' }, priority: 2 }
      ]
    },
    {
      id: 'update-crm',
      name: 'Update CRM System with Results',
      type: 'database',
      component: 'database',
      action: 'insert_leads',
      parameters: {
        leads: '{{steps.send-outreach.results}}',
        metadata: {
          workflowId: 'real-estate-lead-generation',
          timestamp: '{{context.timestamp}}',
          source: 'automated-generation',
          campaignId: '{{context.campaignId}}'
        }
      },
      dependencies: ['send-outreach'],
      guardrails: ['data-integrity', 'backup-required'],
      timeout: 30000,
      retryPolicy: { maxAttempts: 5, baseDelay: 1000, maxDelay: 30000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'local-csv-backup', priority: 1 },
        { type: 'manual-intervention', reason: 'CRM update failed', priority: 2 }
      ]
    }
  ],
  triggers: [
    { type: 'schedule', schedule: '0 9 * * *' }, // Daily at 9 AM
    { type: 'webhook', endpoint: '/api/trigger-lead-generation' },
    { type: 'manual', permission: 'lead-generation:execute' }
  ],
  guardrails: ['overall-cost-limit', 'daily-lead-limit', 'compliance-check'],
  fallbacks: [
    { type: 'workflow-modification', modifications: { skipSteps: ['send-outreach'] }, priority: 1 },
    { type: 'manual-intervention', reason: 'Critical workflow failure', priority: 2 }
  ],
  retryPolicy: { maxAttempts: 2, baseDelay: 10000, maxDelay: 60000, backoff: 'exponential' },
  timeout: 600000 // 10 minutes
};

/**
 * Market Analysis Workflow
 * Comprehensive market analysis and trend identification
 */
export const marketAnalysisWorkflow: Workflow = {
  id: 'market-analysis',
  name: 'Real Estate Market Analysis',
  description: 'Comprehensive market analysis with AI-powered insights and trend identification',
  steps: [
    {
      id: 'collect-market-data',
      name: 'Collect Market Data from Multiple Sources',
      type: 'web',
      component: 'reengine-tinyfish',
      action: 'scrape_market_data',
      parameters: {
        location: '{{context.location}}',
        dataType: ['prices', 'inventory', 'days-on-market', 'rental-rates'],
        timeRange: '{{context.timeRange}}',
        sources: ['zillow', 'realtor.com', 'redfin', 'mls']
      },
      dependencies: [],
      guardrails: ['data-privacy', 'rate-limit'],
      timeout: 120000,
      retryPolicy: { maxAttempts: 3, baseDelay: 3000, maxDelay: 60000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'reengine-web-scraping', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { sources: ['cached-data'] }, priority: 2 }
      ]
    },
    {
      id: 'analyze-trends',
      name: 'Analyze Market Trends with AI',
      type: 'llm',
      component: 'local-qwen2.5:32b',
      action: 'analyze_market_trends',
      parameters: {
        marketData: '{{steps.collect-market-data.results}}',
        analysisType: 'comprehensive',
        predictiveModels: true,
        includeSeasonalAnalysis: true
      },
      dependencies: ['collect-market-data'],
      guardrails: ['data-quality', 'model-accuracy'],
      timeout: 180000,
      retryPolicy: { maxAttempts: 2, baseDelay: 5000, maxDelay: 60000, backoff: 'linear' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'cloud-gemini-pro', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { analysisType: 'basic' }, priority: 2 }
      ]
    },
    {
      id: 'generate-report',
      name: 'Generate Comprehensive Market Report',
      type: 'llm',
      component: 'local-llama3.1:8b',
      action: 'generate_report',
      parameters: {
        analysisResults: '{{steps.analyze-trends.results}}',
        reportFormat: 'comprehensive',
        includeVisualizations: true,
        targetAudience: '{{context.audience}}'
      },
      dependencies: ['analyze-trends'],
      guardrails: ['report-quality', 'brand-compliance'],
      timeout: 90000,
      retryPolicy: { maxAttempts: 2, baseDelay: 3000, maxDelay: 30000, backoff: 'linear' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'cloud-claude-3-sonnet', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { reportFormat: 'summary' }, priority: 2 }
      ]
    },
    {
      id: 'save-report',
      name: 'Save Report to Storage',
      type: 'database',
      component: 'database',
      action: 'save_report',
      parameters: {
        report: '{{steps.generate-report.results}}',
        metadata: {
          location: '{{context.location}}',
          analysisDate: '{{context.timestamp}}',
          workflowId: 'market-analysis',
          reportType: 'comprehensive'
        }
      },
      dependencies: ['generate-report'],
      guardrails: ['data-integrity', 'backup-required'],
      timeout: 30000,
      retryPolicy: { maxAttempts: 5, baseDelay: 1000, maxDelay: 30000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'local-file-backup', priority: 1 },
        { type: 'manual-intervention', reason: 'Report save failed', priority: 2 }
      ]
    }
  ],
  triggers: [
    { type: 'schedule', schedule: '0 8 * * 1' }, // Weekly on Monday at 8 AM
    { type: 'webhook', endpoint: '/api/trigger-market-analysis' },
    { type: 'manual', permission: 'market-analysis:execute' }
  ],
  guardrails: ['data-accuracy', 'report-quality'],
  fallbacks: [
    { type: 'workflow-modification', modifications: { skipSteps: ['generate-report'] }, priority: 1 },
    { type: 'manual-intervention', reason: 'Market analysis failed', priority: 2 }
  ],
  retryPolicy: { maxAttempts: 2, baseDelay: 15000, maxDelay: 60000, backoff: 'exponential' },
  timeout: 300000 // 5 minutes
};

/**
 * Property Valuation Workflow
 * Automated property valuation with AI analysis
 */
export const propertyValuationWorkflow: Workflow = {
  id: 'property-valuation',
  name: 'Automated Property Valuation',
  description: 'Automated property valuation with comparable sales analysis and AI-powered insights',
  steps: [
    {
      id: 'collect-property-data',
      name: 'Collect Property Information',
      type: 'web',
      component: 'reengine-browser-automation',
      action: 'extract_property_details',
      parameters: {
        propertyUrl: '{{context.propertyUrl}}',
        includeImages: true,
        includeAgentInfo: true,
        includeHistory: true
      },
      dependencies: [],
      guardrails: ['data-privacy', 'web-scraping-ethics'],
      timeout: 60000,
      retryPolicy: { maxAttempts: 3, baseDelay: 2000, maxDelay: 30000, backoff: 'exponential' },
      fallbacks: [
        { type: 'parameter-adjustment', adjustments: { includeImages: false }, priority: 1 }
      ]
    },
    {
      id: 'find-comparable-sales',
      name: 'Find Comparable Sales',
      type: 'web',
      component: 'reengine-tinyfish',
      action: 'scrape_comparable_sales',
      parameters: {
        propertyData: '{{steps.collect-property-data.results}}',
        radius: '{{context.radius}}',
        timeRange: '{{context.timeRange}}',
        maxComparables: 10
      },
      dependencies: ['collect-property-data'],
      guardrails: ['data-privacy', 'rate-limit'],
      timeout: 90000,
      retryPolicy: { maxAttempts: 3, baseDelay: 3000, maxDelay: 60000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'reengine-web-scraping', priority: 1 }
      ]
    },
    {
      id: 'calculate-valuation',
      name: 'Calculate Property Valuation',
      type: 'llm',
      component: 'local-deepseek-r1:32b',
      action: 'calculate_property_valuation',
      parameters: {
        propertyData: '{{steps.collect-property-data.results}}',
        comparableSales: '{{steps.find-comparable-sales.results}}',
        valuationMethod: '{{context.valuationMethod}}',
        includeMarketAdjustments: true
      },
      dependencies: ['collect-property-data', 'find-comparable-sales'],
      guardrails: ['data-quality', 'accuracy-requirements'],
      timeout: 60000,
      retryPolicy: { maxAttempts: 2, baseDelay: 3000, maxDelay: 30000, backoff: 'linear' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'cloud-gpt-4', priority: 1 }
      ]
    },
    {
      id: 'generate-valuation-report',
      name: 'Generate Valuation Report',
      type: 'llm',
      component: 'local-llama3.1:8b',
      action: 'generate_valuation_report',
      parameters: {
        valuation: '{{steps.calculate-valuation.results}}',
        propertyData: '{{steps.collect-property-data.results}}',
        comparables: '{{steps.find-comparable-sales.results}}',
        reportFormat: 'professional'
      },
      dependencies: ['calculate-valuation'],
      guardrails: ['report-quality', 'compliance'],
      timeout: 45000,
      retryPolicy: { maxAttempts: 2, baseDelay: 2000, maxDelay: 30000, backoff: 'linear' },
      fallbacks: [
        { type: 'parameter-adjustment', adjustments: { reportFormat: 'summary' }, priority: 1 }
      ]
    },
    {
      id: 'save-valuation',
      name: 'Save Valuation Results',
      type: 'database',
      component: 'database',
      action: 'save_valuation',
      parameters: {
        valuation: '{{steps.calculate-valuation.results}}',
        report: '{{steps.generate-valuation-report.results}}',
        metadata: {
          propertyUrl: '{{context.propertyUrl}}',
          valuationDate: '{{context.timestamp}}',
          workflowId: 'property-valuation'
        }
      },
      dependencies: ['calculate-valuation', 'generate-valuation-report'],
      guardrails: ['data-integrity', 'backup-required'],
      timeout: 30000,
      retryPolicy: { maxAttempts: 5, baseDelay: 1000, maxDelay: 30000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'local-file-backup', priority: 1 }
      ]
    }
  ],
  triggers: [
    { type: 'webhook', endpoint: '/api/trigger-valuation' },
    { type: 'manual', permission: 'valuation:execute' }
  ],
  guardrails: ['valuation-accuracy', 'data-integrity'],
  fallbacks: [
    { type: 'workflow-modification', modifications: { skipSteps: ['generate-valuation-report'] }, priority: 1 }
  ],
  retryPolicy: { maxAttempts: 2, baseDelay: 10000, maxDelay: 60000, backoff: 'exponential' },
  timeout: 240000 // 4 minutes
};

/**
 * Client Onboarding Workflow
 * Automated client onboarding and setup
 */
export const clientOnboardingWorkflow: Workflow = {
  id: 'client-onboarding',
  name: 'Automated Client Onboarding',
  description: 'Automated client onboarding with personalized setup and welcome sequence',
  steps: [
    {
      id: 'validate-client-info',
      name: 'Validate Client Information',
      type: 'llm',
      component: 'local-phi4-reasoning:14b',
      action: 'validate_client_info',
      parameters: {
        clientInfo: '{{context.clientInfo}}',
        validationRules: ['contact-info', 'requirements', 'preferences'],
        complianceCheck: true
      },
      dependencies: [],
      guardrails: ['data-privacy', 'compliance'],
      timeout: 30000,
      retryPolicy: { maxAttempts: 2, baseDelay: 2000, maxDelay: 30000, backoff: 'linear' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'cloud-claude-3-sonnet', priority: 1 }
      ]
    },
    {
      id: 'create-client-profile',
      name: 'Create Client Profile',
      type: 'database',
      component: 'database',
      action: 'create_client_profile',
      parameters: {
        clientInfo: '{{context.clientInfo}}',
        preferences: '{{context.preferences}}',
        onboardingDate: '{{context.timestamp}}'
      },
      dependencies: ['validate-client-info'],
      guardrails: ['data-integrity', 'privacy'],
      timeout: 30000,
      retryPolicy: { maxAttempts: 5, baseDelay: 1000, maxDelay: 30000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'local-file-backup', priority: 1 }
      ]
    },
    {
      id: 'personalize-welcome',
      name: 'Generate Personalized Welcome Message',
      type: 'llm',
      component: 'local-llama3.1:8b',
      action: 'generate_welcome_message',
      parameters: {
        clientInfo: '{{context.clientInfo}}',
        preferences: '{{context.preferences}}',
        tone: 'professional-friendly',
        includeNextSteps: true
      },
      dependencies: ['validate-client-info'],
      guardrails: ['communication-standards', 'brand-compliance'],
      timeout: 30000,
      retryPolicy: { maxAttempts: 2, baseDelay: 2000, maxDelay: 30000, backoff: 'linear' },
      fallbacks: [
        { type: 'parameter-adjustment', adjustments: { tone: 'professional' }, priority: 1 }
      ]
    },
    {
      id: 'send-welcome',
      name: 'Send Welcome Message',
      type: 'mobile',
      component: 'mobile',
      action: 'send_imessage',
      parameters: {
        contacts: ['{{context.clientInfo.contact}}'],
        message: '{{steps.personalize-welcome.results}}',
        scheduling: 'immediate'
      },
      dependencies: ['personalize-welcome', 'create-client-profile'],
      guardrails: ['communication-limits', 'spam-prevention'],
      timeout: 60000,
      retryPolicy: { maxAttempts: 3, baseDelay: 3000, maxDelay: 60000, backoff: 'exponential' },
      fallbacks: [
        { type: 'component-replacement', replacementComponent: 'reengine-outreach', priority: 1 },
        { type: 'parameter-adjustment', adjustments: { channel: 'email' }, priority: 2 }
      ]
    },
    {
      id: 'setup-alerts',
      name: 'Setup Client Alerts and Notifications',
      type: 'database',
      component: 'database',
      action: 'setup_client_alerts',
      parameters: {
        clientId: '{{steps.create-client-profile.results.clientId}}',
        alertPreferences: '{{context.preferences.alerts}}',
        notificationChannels: '{{context.preferences.channels}}'
      },
      dependencies: ['create-client-profile'],
      guardrails: ['privacy', 'notification-limits'],
      timeout: 30000,
      retryPolicy: { maxAttempts: 3, baseDelay: 2000, maxDelay: 30000, backoff: 'exponential' },
      fallbacks: [
        { type: 'manual-intervention', reason: 'Alert setup failed', priority: 1 }
      ]
    }
  ],
  triggers: [
    { type: 'webhook', endpoint: '/api/trigger-onboarding' },
    { type: 'manual', permission: 'onboarding:execute' }
  ],
  guardrails: ['client-privacy', 'communication-standards'],
  fallbacks: [
    { type: 'workflow-modification', modifications: { skipSteps: ['send-welcome'] }, priority: 1 }
  ],
  retryPolicy: { maxAttempts: 2, baseDelay: 10000, maxDelay: 60000, backoff: 'exponential' },
  timeout: 180000 // 3 minutes
};

/**
 * Workflow Registry
 * Central registry for all real estate workflows
 */
export class WorkflowRegistry {
  private workflows: Map<string, Workflow> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('WorkflowRegistry', true);
    this.registerWorkflows();
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Map<string, Workflow> {
    return new Map(this.workflows);
  }

  /**
   * Get workflows by category
   */
  getWorkflowsByCategory(category: string): Workflow[] {
    const categoryWorkflows: Workflow[] = [];
    
    for (const workflow of this.workflows.values()) {
      if (this.getWorkflowCategory(workflow) === category) {
        categoryWorkflows.push(workflow);
      }
    }
    
    return categoryWorkflows;
  }

  /**
   * Register a new workflow
   */
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    this.logger.info(`📝 Registered workflow: ${workflow.id}`);
  }

  /**
   * Remove a workflow
   */
  removeWorkflow(id: string): boolean {
    const removed = this.workflows.delete(id);
    if (removed) {
      this.logger.info(`🗑️ Removed workflow: ${id}`);
    }
    return removed;
  }

  // Private Methods

  private registerWorkflows(): void {
    // Register all predefined workflows
    this.registerWorkflow(leadGenerationWorkflow);
    this.registerWorkflow(marketAnalysisWorkflow);
    this.registerWorkflow(propertyValuationWorkflow);
    this.registerWorkflow(clientOnboardingWorkflow);
    
    this.logger.info(`📋 Registered ${this.workflows.size} workflows`);
  }

  private getWorkflowCategory(workflow: Workflow): string {
    if (workflow.id.includes('lead')) return 'lead-generation';
    if (workflow.id.includes('market')) return 'market-analysis';
    if (workflow.id.includes('valuation')) return 'valuation';
    if (workflow.id.includes('onboarding')) return 'client-management';
    return 'general';
  }
}

// Export singleton instance
export const workflowRegistry = new WorkflowRegistry();
