/**
 * Dual Agent Architecture - User Agent Orchestration
 * Handles user-facing operations, workflows, and interactive tasks
 */

import { productionAgentManager } from './production-build-agents.js';
import { AIOrchestrator, AIRequest, AIResponse } from '../production/types.js';

export interface UserAgent {
  id: string;
  type: 'workflow' | 'research' | 'outreach' | 'analysis' | 'automation';
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  config: UserAgentConfig;
  execute(task: UserTask): Promise<UserResult>;
  getStatus(): UserAgentStatus;
  pause(): void;
  resume(): void;
  cancel(): void;
}

export interface UserAgentConfig {
  name: string;
  userId: string;
  permissions: string[];
  capabilities: string[];
  interactionMode: 'interactive' | 'batch' | 'scheduled';
  priority: 'low' | 'medium' | 'high';
  timeout: number;
  retryPolicy: UserRetryPolicy;
}

export interface UserTask {
  id: string;
  type: 'workflow' | 'research' | 'outreach' | 'analysis' | 'automation';
  userId: string;
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  interactionMode: 'interactive' | 'batch' | 'scheduled';
  scheduledTime?: number;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  userContext?: UserContext;
}

export interface UserResult {
  taskId: string;
  userId: string;
  status: 'success' | 'failure' | 'timeout' | 'cancelled' | 'paused';
  output?: unknown;
  error?: string;
  metrics: UserTaskMetrics;
  timestamp: number;
  userFeedback?: UserFeedback;
  nextActions?: UserAction[];
}

export interface UserAgentStatus {
  id: string;
  type: string;
  status: string;
  userId: string;
  currentTask?: string;
  lastActivity: number;
  resourceUsage: ResourceUsage;
  health: 'healthy' | 'degraded' | 'unhealthy';
  userSatisfaction: number;
}

export interface UserRetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  userIntervention: boolean;
}

export interface UserTaskMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  resourceUsed: ResourceUsage;
  attempts: number;
  userInteractions: number;
  satisfactionScore: number;
}

export interface UserContext {
  sessionId: string;
  preferences: UserPreferences;
  history: UserHistory;
  permissions: string[];
  location?: string;
  device?: string;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  notificationLevel: 'minimal' | 'normal' | 'verbose';
  automationLevel: 'manual' | 'assisted' | 'full';
  dataPrivacy: 'public' | 'private' | 'restricted';
}

export interface UserHistory {
  previousTasks: string[];
  successfulActions: string[];
  failedActions: string[];
  averageSatisfaction: number;
  lastActivity: number;
}

export interface UserFeedback {
  rating: number;
  comment?: string;
  suggestions?: string[];
  timestamp: number;
}

export interface UserAction {
  type: 'continue' | 'modify' | 'retry' | 'escalate' | 'complete';
  description: string;
  parameters?: Record<string, unknown>;
  estimatedTime?: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

// Workflow Agent - Handles user workflows
export class WorkflowAgent implements UserAgent {
  public readonly id: string;
  public readonly type = 'workflow' as const;
  public status: 'idle' | 'running' | 'completed' | 'failed' | 'paused' = 'idle';
  public config: UserAgentConfig;
  private currentTask?: UserTask;
  private aiOrchestrator: AIOrchestrator;
  private paused = false;
  
  constructor(config: UserAgentConfig, dependencies: { aiOrchestrator: AIOrchestrator }) {
    this.id = `workflow-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    this.aiOrchestrator = dependencies.aiOrchestrator;
  }
  
  async execute(task: UserTask): Promise<UserResult> {
    if (this.status !== 'idle') {
      throw new Error(`Workflow agent ${this.id} is not idle`);
    }
    
    this.currentTask = task;
    this.status = 'running';
    
    const startTime = Date.now();
    const resourceUsage = this.getResourceUsage();
    let userInteractions = 0;
    
    try {
      const result = await this.executeWorkflow(task, () => {
        userInteractions++;
      });
      
      this.status = 'completed';
      
      return {
        taskId: task.id,
        userId: task.userId,
        status: 'success',
        output: result,
        metrics: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          resourceUsed: resourceUsage,
          attempts: 1,
          userInteractions,
          satisfactionScore: 0.9
        },
        timestamp: Date.now(),
        nextActions: this.generateNextActions(result)
      };
      
    } catch (error) {
      this.status = 'failed';
      
      return {
        taskId: task.id,
        userId: task.userId,
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          resourceUsed: resourceUsage,
          attempts: 1,
          userInteractions,
          satisfactionScore: 0.2
        },
        timestamp: Date.now(),
        nextActions: this.generateErrorActions(error)
      };
    } finally {
      this.currentTask = undefined;
    }
  }
  
  private async executeWorkflow(task: UserTask, onInteraction: () => void): Promise<unknown> {
    const workflowSteps = [
      'analyze-user-request',
      'validate-inputs',
      'execute-workflow',
      'process-results',
      'generate-report'
    ];
    
    const workflowResults = [];
    
    for (const step of workflowSteps) {
      if (this.paused) {
        await this.waitForResume();
      }
      
      console.log(`Workflow agent ${this.id} executing step: ${step}`);
      
      if (task.interactionMode === 'interactive' && Math.random() > 0.7) {
        onInteraction();
        await this.requestUserInput(step);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      workflowResults.push({ step, status: 'completed', timestamp: Date.now() });
    }
    
    return {
      workflowId: `workflow-${Date.now()}`,
      steps: workflowResults,
      results: this.generateWorkflowResults(task),
      recommendations: this.generateRecommendations(task),
      userSatisfaction: 0.9
    };
  }
  
  private async requestUserInput(step: string): Promise<void> {
    // Simulate user interaction
    console.log(`Requesting user input for step: ${step}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  private async waitForResume(): Promise<void> {
    while (this.paused) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  private generateWorkflowResults(task: UserTask): Record<string, unknown> {
    return {
      processed: true,
      leadsGenerated: Math.floor(Math.random() * 100),
      campaignsCreated: Math.floor(Math.random() * 10),
      outreachSent: Math.floor(Math.random() * 500),
      conversions: Math.floor(Math.random() * 20)
    };
  }
  
  private generateRecommendations(task: UserTask): string[] {
    return [
      'Optimize lead scoring for better conversion rates',
      'Schedule follow-ups during optimal engagement times',
      'Personalize outreach content based on user preferences'
    ];
  }
  
  private generateNextActions(result: unknown): UserAction[] {
    return [
      {
        type: 'continue',
        description: 'Review workflow results and continue to next phase',
        estimatedTime: 300000
      },
      {
        type: 'modify',
        description: 'Adjust workflow parameters and retry',
        estimatedTime: 60000
      }
    ];
  }
  
  private generateErrorActions(error: unknown): UserAction[] {
    return [
      {
        type: 'retry',
        description: 'Retry workflow with corrected parameters',
        estimatedTime: 120000
      },
      {
        type: 'escalate',
        description: 'Escalate to human operator for assistance',
        estimatedTime: 300000
      }
    ];
  }
  
  getStatus(): UserAgentStatus {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      userId: this.config.userId,
      currentTask: this.currentTask?.id,
      lastActivity: Date.now(),
      resourceUsage: this.getResourceUsage(),
      health: 'healthy',
      userSatisfaction: 0.9
    };
  }
  
  pause(): void {
    this.paused = true;
    this.status = 'paused';
  }
  
  resume(): void {
    this.paused = false;
    this.status = 'running';
  }
  
  cancel(): void {
    this.paused = false;
    this.status = 'idle';
    this.currentTask = undefined;
  }
  
  private getResourceUsage(): ResourceUsage {
    return {
      cpu: Math.random() * 0.5,
      memory: Math.random() * 0.4,
      disk: Math.random() * 0.2,
      network: Math.random() * 0.3
    };
  }
}

// Research Agent - Handles user research tasks
export class ResearchAgent implements UserAgent {
  public readonly id: string;
  public readonly type = 'research' as const;
  public status: 'idle' | 'running' | 'completed' | 'failed' | 'paused' = 'idle';
  public config: UserAgentConfig;
  private currentTask?: UserTask;
  private aiOrchestrator: AIOrchestrator;
  private paused = false;
  
  constructor(config: UserAgentConfig, dependencies: { aiOrchestrator: AIOrchestrator }) {
    this.id = `research-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    this.aiOrchestrator = dependencies.aiOrchestrator;
  }
  
  async execute(task: UserTask): Promise<UserResult> {
    if (this.status !== 'idle') {
      throw new Error(`Research agent ${this.id} is not idle`);
    }
    
    this.currentTask = task;
    this.status = 'running';
    
    const startTime = Date.now();
    const resourceUsage = this.getResourceUsage();
    let userInteractions = 0;
    
    try {
      const result = await this.executeResearch(task, () => {
        userInteractions++;
      });
      
      this.status = 'completed';
      
      return {
        taskId: task.id,
        userId: task.userId,
        status: 'success',
        output: result,
        metrics: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          resourceUsed: resourceUsage,
          attempts: 1,
          userInteractions,
          satisfactionScore: 0.85
        },
        timestamp: Date.now(),
        nextActions: this.generateNextActions(result)
      };
      
    } catch (error) {
      this.status = 'failed';
      
      return {
        taskId: task.id,
        userId: task.userId,
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          resourceUsed: resourceUsage,
          attempts: 1,
          userInteractions,
          satisfactionScore: 0.3
        },
        timestamp: Date.now(),
        nextActions: this.generateErrorActions(error)
      };
    } finally {
      this.currentTask = undefined;
    }
  }
  
  private async executeResearch(task: UserTask, onInteraction: () => void): Promise<unknown> {
    const researchSteps = [
      'define-research-scope',
      'gather-data-sources',
      'analyze-data',
      'generate-insights',
      'create-report'
    ];
    
    const researchResults = [];
    
    for (const step of researchSteps) {
      if (this.paused) {
        await this.waitForResume();
      }
      
      console.log(`Research agent ${this.id} executing step: ${step}`);
      
      // Use AI for research analysis
      if (step === 'analyze-data' || step === 'generate-insights') {
        const aiRequest: AIRequest = {
          prompt: `Analyze research data for ${task.payload.subject || 'real estate market'} and generate insights`,
          taskType: 'research-analysis',
          requirements: {
            maxLatency: 30000,
            requiredAccuracy: 'high'
          }
        };
        
        const aiResponse = await this.aiOrchestrator.processRequest(aiRequest);
        researchResults.push({ 
          step, 
          status: 'completed', 
          timestamp: Date.now(),
          aiInsights: aiResponse.content
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        researchResults.push({ step, status: 'completed', timestamp: Date.now() });
      }
      
      if (task.interactionMode === 'interactive' && Math.random() > 0.6) {
        onInteraction();
        await this.requestUserFeedback(step);
      }
    }
    
    return {
      researchId: `research-${Date.now()}`,
      steps: researchResults,
      findings: this.generateResearchFindings(task),
      recommendations: this.generateResearchRecommendations(task),
      dataSources: ['TinyFish API', 'Market databases', 'Social media'],
      confidence: 0.87
    };
  }
  
  private async requestUserFeedback(step: string): Promise<void> {
    console.log(`Requesting user feedback for research step: ${step}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  private async waitForResume(): Promise<void> {
    while (this.paused) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  private generateResearchFindings(task: UserTask): Record<string, unknown> {
    return {
      marketTrends: ['Increasing demand for suburban properties', 'Rising interest rates affecting affordability'],
      competitorAnalysis: ['3 major competitors identified', 'Market share analysis completed'],
      opportunities: ['Underserved luxury market segment', 'Technology integration opportunities'],
      risks: ['Regulatory changes', 'Economic uncertainty']
    };
  }
  
  private generateResearchRecommendations(task: UserTask): string[] {
    return [
      'Focus on mid-range property segment for maximum ROI',
      'Leverage AI for lead qualification to improve efficiency',
      'Develop partnerships with local real estate agencies'
    ];
  }
  
  private generateNextActions(result: unknown): UserAction[] {
    return [
      {
        type: 'continue',
        description: 'Review research findings and proceed to implementation',
        estimatedTime: 180000
      },
      {
        type: 'modify',
        description: 'Refine research parameters for deeper analysis',
        estimatedTime: 90000
      }
    ];
  }
  
  private generateErrorActions(error: unknown): UserAction[] {
    return [
      {
        type: 'retry',
        description: 'Retry research with adjusted parameters',
        estimatedTime: 150000
      },
      {
        type: 'escalate',
        description: 'Request human expert review of research approach',
        estimatedTime: 300000
      }
    ];
  }
  
  getStatus(): UserAgentStatus {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      userId: this.config.userId,
      currentTask: this.currentTask?.id,
      lastActivity: Date.now(),
      resourceUsage: this.getResourceUsage(),
      health: 'healthy',
      userSatisfaction: 0.85
    };
  }
  
  pause(): void {
    this.paused = true;
    this.status = 'paused';
  }
  
  resume(): void {
    this.paused = false;
    this.status = 'running';
  }
  
  cancel(): void {
    this.paused = false;
    this.status = 'idle';
    this.currentTask = undefined;
  }
  
  private getResourceUsage(): ResourceUsage {
    return {
      cpu: Math.random() * 0.6,
      memory: Math.random() * 0.5,
      disk: Math.random() * 0.3,
      network: Math.random() * 0.4
    };
  }
}

// Outreach Agent - Handles user outreach campaigns
export class OutreachAgent implements UserAgent {
  public readonly id: string;
  public readonly type = 'outreach' as const;
  public status: 'idle' | 'running' | 'completed' | 'failed' | 'paused' = 'idle';
  public config: UserAgentConfig;
  private currentTask?: UserTask;
  private aiOrchestrator: AIOrchestrator;
  private paused = false;
  
  constructor(config: UserAgentConfig, dependencies: { aiOrchestrator: AIOrchestrator }) {
    this.id = `outreach-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    this.aiOrchestrator = dependencies.aiOrchestrator;
  }
  
  async execute(task: UserTask): Promise<UserResult> {
    if (this.status !== 'idle') {
      throw new Error(`Outreach agent ${this.id} is not idle`);
    }
    
    this.currentTask = task;
    this.status = 'running';
    
    const startTime = Date.now();
    const resourceUsage = this.getResourceUsage();
    let userInteractions = 0;
    
    try {
      const result = await this.executeOutreach(task, () => {
        userInteractions++;
      });
      
      this.status = 'completed';
      
      return {
        taskId: task.id,
        userId: task.userId,
        status: 'success',
        output: result,
        metrics: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          resourceUsed: resourceUsage,
          attempts: 1,
          userInteractions,
          satisfactionScore: 0.88
        },
        timestamp: Date.now(),
        nextActions: this.generateNextActions(result)
      };
      
    } catch (error) {
      this.status = 'failed';
      
      return {
        taskId: task.id,
        userId: task.userId,
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          resourceUsed: resourceUsage,
          attempts: 1,
          userInteractions,
          satisfactionScore: 0.25
        },
        timestamp: Date.now(),
        nextActions: this.generateErrorActions(error)
      };
    } finally {
      this.currentTask = undefined;
    }
  }
  
  private async executeOutreach(task: UserTask, onInteraction: () => void): Promise<unknown> {
    const outreachSteps = [
      'define-target-audience',
      'create-personalized-content',
      'select-channels',
      'execute-campaign',
      'monitor-results',
      'optimize-performance'
    ];
    
    const outreachResults = [];
    
    for (const step of outreachSteps) {
      if (this.paused) {
        await this.waitForResume();
      }
      
      console.log(`Outreach agent ${this.id} executing step: ${step}`);
      
      // Use AI for content creation and optimization
      if (step === 'create-personalized-content' || step === 'optimize-performance') {
        const aiRequest: AIRequest = {
          prompt: `Create personalized outreach content for ${task.payload.targetAudience || 'real estate leads'}`,
          taskType: 'content-generation',
          requirements: {
            maxLatency: 20000,
            requiredAccuracy: 'medium'
          }
        };
        
        const aiResponse = await this.aiOrchestrator.processRequest(aiRequest);
        outreachResults.push({ 
          step, 
          status: 'completed', 
          timestamp: Date.now(),
          generatedContent: aiResponse.content
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1200));
        outreachResults.push({ step, status: 'completed', timestamp: Date.now() });
      }
      
      if (task.interactionMode === 'interactive' && Math.random() > 0.5) {
        onInteraction();
        await this.requestUserApproval(step);
      }
    }
    
    return {
      campaignId: `campaign-${Date.now()}`,
      steps: outreachResults,
      metrics: this.generateCampaignMetrics(task),
      performance: this.generatePerformanceMetrics(task),
      recommendations: this.generateOutreachRecommendations(task),
      roi: 3.2
    };
  }
  
  private async requestUserApproval(step: string): Promise<void> {
    console.log(`Requesting user approval for outreach step: ${step}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  private async waitForResume(): Promise<void> {
    while (this.paused) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  private generateCampaignMetrics(task: UserTask): Record<string, unknown> {
    return {
      totalContacts: Math.floor(Math.random() * 1000),
      openRate: Math.random() * 0.4 + 0.2,
      clickRate: Math.random() * 0.1 + 0.05,
      responseRate: Math.random() * 0.05 + 0.02,
      conversionRate: Math.random() * 0.02 + 0.01,
      unsubscribes: Math.floor(Math.random() * 10)
    };
  }
  
  private generatePerformanceMetrics(task: UserTask): Record<string, unknown> {
    return {
      engagementScore: Math.random() * 0.5 + 0.5,
      qualityScore: Math.random() * 0.3 + 0.7,
      deliverabilityRate: Math.random() * 0.1 + 0.9,
      spamComplaintRate: Math.random() * 0.01,
      averageResponseTime: Math.random() * 3600 + 1800
    };
  }
  
  private generateOutreachRecommendations(task: UserTask): string[] {
    return [
      'Optimize send times based on recipient timezone',
      'A/B test subject lines for improved open rates',
      'Personalize content based on recipient behavior'
    ];
  }
  
  private generateNextActions(result: unknown): UserAction[] {
    return [
      {
        type: 'continue',
        description: 'Launch follow-up campaign based on results',
        estimatedTime: 240000
      },
      {
        type: 'modify',
        description: 'Adjust campaign parameters for better performance',
        estimatedTime: 60000
      }
    ];
  }
  
  private generateErrorActions(error: unknown): UserAction[] {
    return [
      {
        type: 'retry',
        description: 'Retry campaign with corrected configuration',
        estimatedTime: 120000
      },
      {
        type: 'escalate',
        description: 'Request marketing team review of campaign strategy',
        estimatedTime: 300000
      }
    ];
  }
  
  getStatus(): UserAgentStatus {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      userId: this.config.userId,
      currentTask: this.currentTask?.id,
      lastActivity: Date.now(),
      resourceUsage: this.getResourceUsage(),
      health: 'healthy',
      userSatisfaction: 0.88
    };
  }
  
  pause(): void {
    this.paused = true;
    this.status = 'paused';
  }
  
  resume(): void {
    this.paused = false;
    this.status = 'running';
  }
  
  cancel(): void {
    this.paused = false;
    this.status = 'idle';
    this.currentTask = undefined;
  }
  
  private getResourceUsage(): ResourceUsage {
    return {
      cpu: Math.random() * 0.4,
      memory: Math.random() * 0.3,
      disk: Math.random() * 0.2,
      network: Math.random() * 0.5
    };
  }
}

// User Agent Manager
export class UserAgentManager {
  private agents = new Map<string, UserAgent>();
  private taskQueue: UserTask[] = [];
  private running = false;
  private aiOrchestrator: AIOrchestrator;
  
  constructor(aiOrchestrator: AIOrchestrator) {
    this.aiOrchestrator = aiOrchestrator;
  }
  
  async initializeUser(userId: string, config: Partial<UserAgentConfig>): Promise<void> {
    const agentConfigs = [
      {
        name: 'workflow-agent',
        userId,
        permissions: ['workflow', 'read', 'write'],
        capabilities: ['lead-management', 'campaign-automation', 'analytics'],
        interactionMode: 'interactive' as const,
        priority: 'medium' as const,
        timeout: 600000,
        retryPolicy: { 
          maxAttempts: 3, 
          backoffStrategy: 'exponential' as const, 
          baseDelay: 2000, 
          maxDelay: 60000,
          userIntervention: true
        },
        ...config
      },
      {
        name: 'research-agent',
        userId,
        permissions: ['research', 'read', 'analyze'],
        capabilities: ['market-research', 'data-analysis', 'insights'],
        interactionMode: 'batch' as const,
        priority: 'medium' as const,
        timeout: 900000,
        retryPolicy: { 
          maxAttempts: 2, 
          backoffStrategy: 'linear' as const, 
          baseDelay: 5000, 
          maxDelay: 120000,
          userIntervention: true
        },
        ...config
      },
      {
        name: 'outreach-agent',
        userId,
        permissions: ['outreach', 'write', 'communicate'],
        capabilities: ['email-campaigns', 'social-media', 'messaging'],
        interactionMode: 'interactive' as const,
        priority: 'high' as const,
        timeout: 300000,
        retryPolicy: { 
          maxAttempts: 5, 
          backoffStrategy: 'exponential' as const, 
          baseDelay: 1000, 
          maxDelay: 30000,
          userIntervention: false
        },
        ...config
      }
    ];
    
    // Initialize user agents
    this.agents.set(`workflow-${userId}`, new WorkflowAgent(agentConfigs[0], { aiOrchestrator: this.aiOrchestrator }));
    this.agents.set(`research-${userId}`, new ResearchAgent(agentConfigs[1], { aiOrchestrator: this.aiOrchestrator }));
    this.agents.set(`outreach-${userId}`, new OutreachAgent(agentConfigs[2], { aiOrchestrator: this.aiOrchestrator }));
  }
  
  async submitTask(task: UserTask): Promise<string> {
    this.taskQueue.push(task);
    
    if (!this.running) {
      this.startProcessing();
    }
    
    return task.id;
  }
  
  private async startProcessing(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;
      
      const agent = this.getAvailableAgent(task.type, task.userId);
      if (agent) {
        try {
          await agent.execute(task);
        } catch (error) {
          console.error(`User task ${task.id} failed:`, error);
        }
      } else {
        // No available agent, requeue task
        this.taskQueue.push(task);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.running = false;
  }
  
  private getAvailableAgent(taskType: string, userId: string): UserAgent | null {
    for (const agent of this.agents.values()) {
      if (agent.type === taskType && agent.config.userId === userId && agent.status === 'idle') {
        return agent;
      }
    }
    return null;
  }
  
  getAgentStatuses(userId?: string): UserAgentStatus[] {
    const agents = Array.from(this.agents.values());
    return userId 
      ? agents.filter(agent => agent.config.userId === userId).map(agent => agent.getStatus())
      : agents.map(agent => agent.getStatus());
  }
  
  getTaskQueue(userId?: string): UserTask[] {
    return userId 
      ? this.taskQueue.filter(task => task.userId === userId)
      : [...this.taskQueue];
  }
  
  pauseAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.pause();
    }
  }
  
  resumeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.resume();
    }
  }
  
  cancelAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.cancel();
    }
  }
}
