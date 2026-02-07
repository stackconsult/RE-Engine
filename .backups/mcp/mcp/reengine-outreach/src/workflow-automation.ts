import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { WhapiIntegration, Lead, OutreachSequence, OutreachStep } from './whapi-integration.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: 'new_lead' | 'message_received' | 'score_threshold' | 'time_based' | 'group_activity';
  conditions: Record<string, any>;
  actions: WorkflowAction[];
  enabled: boolean;
  priority: number;
}

export interface WorkflowAction {
  type: 'create_sequence' | 'send_message' | 'update_score' | 'add_label' | 'notify_admin' | 'extract_group_leads';
  parameters: Record<string, any>;
  delay?: number; // minutes - made optional
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  leadId?: string;
  triggerData: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  results: any[];
  error?: string;
}

export class WorkflowAutomation {
  private whapi: WhapiIntegration;
  private rules: Map<string, WorkflowRule> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(whapi: WhapiIntegration) {
    this.whapi = whapi;
    this.initializeDefaultWorkflows();
    logger.info('Workflow Automation initialized');
  }

  private initializeDefaultWorkflows(): void {
    // Workflow 1: New Lead Welcome Sequence
    this.createRule({
      name: 'New Lead Welcome Sequence',
      trigger: 'new_lead',
      conditions: {
        source: ['whatsapp', 'group', 'newsletter']
      },
      actions: [
        {
          type: 'send_message',
          parameters: {
            message: 'Hi {{name}}! Thanks for reaching out. I\'m here to help you with your real estate needs. What specific property or service are you interested in today?',
            delay: 0
          }
        },
        {
          type: 'create_sequence',
          parameters: {
            sequenceName: 'Lead Nurturing Sequence',
            steps: [
              {
                type: 'follow_up',
                delay: 24,
                message: 'Following up on our conversation yesterday. Have you had a chance to think about what you\'re looking for in a property?'
              },
              {
                type: 'contextual_reply',
                delay: 72,
                message: 'I\'d love to share some properties that match what you\'re looking for. Would you prefer to see residential or commercial options?'
              },
              {
                type: 'product_share',
                delay: 120,
                message: 'Here are our featured properties this week. Let me know if any catch your eye!',
                mediaUrl: 'https://example.com/properties.jpg'
              }
            ]
          }
        }
      ],
      enabled: true,
      priority: 1
    });

    // Workflow 2: High Score Lead Priority
    this.createRule({
      name: 'High Score Lead Priority Handling',
      trigger: 'score_threshold',
      conditions: {
        score: { min: 80 },
        status: 'engaged'
      },
      actions: [
        {
          type: 'send_message',
          parameters: {
            message: 'Based on your interest level, I\'d like to offer you a personalized consultation. Would you be available for a quick call this week?',
            delay: 60
          }
        },
        {
          type: 'notify_admin',
          parameters: {
            message: 'Hot lead detected! {{name}} ({{phone}}) scored {{score}} and is ready for immediate follow-up.',
            delay: 0
          }
        }
      ],
      enabled: true,
      priority: 2
    });

    // Workflow 3: Group Lead Extraction
    this.createRule({
      name: 'Automatic Group Lead Extraction',
      trigger: 'time_based',
      conditions: {
        schedule: '0 9 * * *', // Daily at 9 AM
        groupTypes: ['real_estate', 'property', 'investment']
      },
      actions: [
        {
          type: 'extract_group_leads',
          parameters: {
            excludeExisting: true,
            minGroupSize: 10
          }
        },
        {
          type: 'send_message',
          parameters: {
            message: 'Hi {{name}}! I noticed you\'re interested in real estate discussions. I\'d love to connect and share some valuable insights about the current market.',
            delay: 120
          }
        }
      ],
      enabled: true,
      priority: 3
    });

    // Workflow 4: Inactive Lead Re-engagement
    this.createRule({
      name: 'Inactive Lead Re-engagement',
      trigger: 'time_based',
      conditions: {
        inactiveDays: 7,
        lastStatus: ['engaged', 'contacted']
      },
      actions: [
        {
          type: 'send_message',
          parameters: {
            message: 'Hi {{name}}! It\'s been a while since we connected. I wanted to share some exciting new property opportunities that just came on the market. Would you be interested in taking a look?',
            delay: 0
          }
        }
      ],
      enabled: true,
      priority: 4
    });

    logger.info(`Default workflows initialized: ${this.rules.size}`);
  }

  createRule(rule: Omit<WorkflowRule, 'id'>): WorkflowRule {
    const newRule: WorkflowRule = {
      ...rule,
      id: uuidv4()
    };

    this.rules.set(newRule.id, newRule);
    
    logger.info(`Workflow rule created: ${newRule.id}, name: ${newRule.name}`);
    
    // Audit log
    logger.info('WORKFLOW_RULE_CREATED %j', {
      ruleId: newRule.id,
      name: newRule.name,
      trigger: newRule.trigger,
      actions: newRule.actions.length,
      timestamp: new Date().toISOString()
    });

    return newRule;
  }

  async executeWorkflow(trigger: string, triggerData: any): Promise<WorkflowExecution[]> {
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled && rule.trigger === trigger)
      .filter(rule => this.evaluateConditions(rule.conditions, triggerData))
      .sort((a, b) => b.priority - a.priority);

    const executions: WorkflowExecution[] = [];

    for (const rule of applicableRules) {
      const execution = await this.executeRule(rule, triggerData);
      executions.push(execution);
    }

    logger.info(`Workflows executed: ${trigger}, rules: ${executions.length}`);

    return executions;
  }

  private async executeRule(rule: WorkflowRule, triggerData: any): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: uuidv4(),
      ruleId: rule.id,
      leadId: triggerData.leadId,
      triggerData,
      status: 'running',
      startedAt: new Date().toISOString(),
      results: []
    };

    this.executions.set(execution.id, execution);

    try {
      logger.info(`Executing workflow rule: ${execution.id}, rule: ${rule.id}, name: ${rule.name}`);

      for (const action of rule.actions) {
        const result = await this.executeAction(action, triggerData);
        execution.results.push(result);

        // Add delay if specified
        if (action.delay && action.delay > 0) {
          await this.sleep(action.delay * 60 * 1000); // Convert minutes to milliseconds
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();

      logger.info(`Workflow rule completed: ${execution.id}, results: ${execution.results.length}`);

      // Audit log
      logger.info(`WORKFLOW_COMPLETED: ${JSON.stringify({
        executionId: execution.id,
        ruleId: rule.id,
        leadId: execution.leadId,
        resultsCount: execution.results.length,
        timestamp: new Date().toISOString()
      })}`);

    } catch (error) {
      execution.status = 'failed';
      execution.error = (error as Error).message;
      
      logger.error('Workflow rule failed %j', {
        executionId: execution.id,
        ruleId: rule.id,
        error: (error as Error).message
      });

      // Audit log
      logger.info('WORKFLOW_FAILED %j', {
        executionId: execution.id,
        ruleId: rule.id,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }

    return execution;
  }

  private async executeAction(action: WorkflowAction, triggerData: any): Promise<any> {
    logger.debug(`Executing action: ${action.type}`);

    switch (action.type) {
      case 'send_message':
        return await this.executeSendMessage(action, triggerData);
      
      case 'create_sequence':
        return await this.executeCreateSequence(action, triggerData);
      
      case 'update_score':
        return await this.executeUpdateScore(action, triggerData);
      
      case 'add_label':
        return await this.executeAddLabel(action, triggerData);
      
      case 'notify_admin':
        return await this.executeNotifyAdmin(action, triggerData);
      
      case 'extract_group_leads':
        return await this.executeExtractGroupLeads(action, triggerData);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeSendMessage(action: WorkflowAction, triggerData: any): Promise<any> {
    const { message, delay = 0 } = action.parameters;
    const lead = triggerData.lead;

    if (!lead) {
      throw new Error('Lead data required for send_message action');
    }

    // Template substitution
    const personalizedMessage = message
      .replace('{{name}}', lead.name || 'there')
      .replace('{{phone}}', lead.phone)
      .replace('{{score}}', lead.score?.toString() || '0');

    if (delay > 0) {
      await this.sleep(delay * 60 * 1000);
    }

    const result = await this.whapi.sendTextMessage(lead.phone, personalizedMessage);
    
    logger.info(`Message sent via workflow: lead=${lead.id}, message=${result.id}, length=${personalizedMessage.length}`);

    return { type: 'message_sent', messageId: result.id, message: personalizedMessage };
  }

  private async executeCreateSequence(action: WorkflowAction, triggerData: any): Promise<any> {
    const { sequenceName, steps } = action.parameters;
    const lead = triggerData.lead;

    if (!lead) {
      throw new Error('Lead data required for create_sequence action');
    }

    const outreachSteps: OutreachStep[] = steps.map((step: any) => ({
      id: uuidv4(),
      type: step.type,
      delay: step.delay,
      message: step.message,
      mediaType: step.mediaType,
      mediaUrl: step.mediaUrl,
      status: 'pending'
    }));

    const sequence = await this.whapi.createOutreachSequence(lead.id, sequenceName, outreachSteps);
    
    logger.info(`Sequence created via workflow: ${sequence.id}, lead=${lead.id}, steps=${outreachSteps.length}`);

    return { type: 'sequence_created', sequenceId: sequence.id, stepsCount: outreachSteps.length };
  }

  private async executeUpdateScore(action: WorkflowAction, triggerData: any): Promise<any> {
    const { factors } = action.parameters;
    const lead = triggerData.lead;

    if (!lead) {
      throw new Error('Lead data required for update_score action');
    }

    const updatedLead = await this.whapi.updateLeadScore(lead.id, factors);
    
    logger.info(`Lead score updated via workflow: ${lead.id}, old=${lead.score}, new=${updatedLead.score}`);

    return { type: 'score_updated', leadId: lead.id, oldScore: lead.score, newScore: updatedLead.score };
  }

  private async executeAddLabel(action: WorkflowAction, triggerData: any): Promise<any> {
    const { label } = action.parameters;
    const lead = triggerData.lead;

    if (!lead) {
      throw new Error('Lead data required for add_label action');
    }

    // This would integrate with Whapi's label system
    // For now, we'll just log it
    logger.info(`Label added via workflow: ${lead.id}, label=${label}`);

    return { type: 'label_added', leadId: lead.id, label };
  }

  private async executeNotifyAdmin(action: WorkflowAction, triggerData: any): Promise<any> {
    const { message } = action.parameters;
    const lead = triggerData.lead;

    // Template substitution
    const adminMessage = message
      .replace('{{name}}', lead?.name || 'Unknown')
      .replace('{{phone}}', lead?.phone || 'Unknown')
      .replace('{{score}}', lead?.score?.toString() || '0');

    // Send notification to admin (could be email, Slack, etc.)
    logger.info(`Admin notification sent: ${adminMessage}`);

    return { type: 'admin_notified', message: adminMessage };
  }

  private async executeExtractGroupLeads(action: WorkflowAction, triggerData: any): Promise<any> {
    const { excludeExisting, minGroupSize } = action.parameters;

    const newLeads = await this.whapi.extractLeadsFromGroups();
    
    let filteredLeads = newLeads;
    
    if (excludeExisting) {
      // Filter out leads that already exist
      filteredLeads = newLeads.filter(lead => lead.status === 'new');
    }

    logger.info(`Group leads extracted via workflow: total=${newLeads.length}, filtered=${filteredLeads.length}`);

    return { 
      type: 'group_leads_extracted', 
      totalLeads: newLeads.length,
      filteredLeads: filteredLeads.length 
    };
  }

  private evaluateConditions(conditions: Record<string, any>, triggerData: any): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'source':
          if (Array.isArray(value) && !value.includes(triggerData.lead?.source)) {
            return false;
          }
          break;
        
        case 'score':
          if (typeof value === 'object') {
            if (value.min && triggerData.lead?.score < value.min) return false;
            if (value.max && triggerData.lead?.score > value.max) return false;
          }
          break;
        
        case 'status':
          if (Array.isArray(value) && !value.includes(triggerData.lead?.status)) {
            return false;
          }
          break;
        
        case 'schedule':
          // This would require cron-like evaluation
          // For simplicity, we'll return true for now
          break;
        
        case 'inactiveDays':
          // Check if lead has been inactive for specified days
          if (triggerData.lead?.lastActivity) {
            const daysSinceLastActivity = Math.floor(
              (Date.now() - new Date(triggerData.lead.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastActivity < value) return false;
          }
          break;
      }
    }

    return true;
  }

  // Scheduling and Automation
  scheduleWorkflow(ruleId: string, schedule: string): void {
    // This would implement cron-like scheduling
    // For simplicity, we'll use setTimeout for demonstration
    logger.info(`Workflow scheduled: ${ruleId}, schedule=${schedule}`);
  }

  // Analytics and Monitoring
  getWorkflowAnalytics(): any {
    const executions = Array.from(this.executions.values());
    const rules = Array.from(this.rules.values());

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(rule => rule.enabled).length,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(exec => exec.status === 'completed').length,
      failedExecutions: executions.filter(exec => exec.status === 'failed').length,
      averageExecutionTime: this.calculateAverageExecutionTime(executions),
      mostTriggeredRules: this.getMostTriggeredRules(executions)
    };
  }

  private calculateAverageExecutionTime(executions: WorkflowExecution[]): number {
    const completedExecutions = executions.filter(exec => 
      exec.status === 'completed' && exec.startedAt && exec.completedAt
    );

    if (completedExecutions.length === 0) return 0;

    const totalTime = completedExecutions.reduce((sum, exec) => {
      const start = new Date(exec.startedAt!).getTime();
      const end = new Date(exec.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return totalTime / completedExecutions.length / 1000; // Convert to seconds
  }

  private getMostTriggeredRules(executions: WorkflowExecution[]): Array<{ruleId: string, count: number}> {
    const ruleCounts = executions.reduce((acc, exec) => {
      acc[exec.ruleId] = (acc[exec.ruleId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(ruleCounts)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup and Maintenance
  async cleanup(): Promise<void> {
    // Clear scheduled jobs
    for (const [id, timeout] of this.scheduledJobs) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();

    // Clean up old executions (keep last 1000)
    const executions = Array.from(this.executions.entries());
    if (executions.length > 1000) {
      const toDelete = executions
        .sort((a, b) => new Date(b[1].startedAt || '').getTime() - new Date(a[1].startedAt || '').getTime())
        .slice(1000);

      for (const [id] of toDelete) {
        this.executions.delete(id);
      }
    }

    logger.info('Workflow cleanup completed');
  }
}
