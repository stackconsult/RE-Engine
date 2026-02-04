/**
 * RE Engine Client SDK - Main client interface
 * Follows RE Engine safety invariants and production rules
 */

import { Approval, CreateApprovalRequest, UpdateApprovalRequest, ApprovalFilter } from '../../a2d/models/approval.model';
import { Lead, CreateLeadRequest, UpdateLeadRequest, LeadFilter } from '../../a2d/models/lead.model';
import { ApprovalsRepository } from '../../a2d/repositories/approvals.repository';
import { LeadsRepository } from '../../a2d/repositories/leads.repository';
import { getOllamaService, OllamaChatRequest, OllamaService } from '../../services/ollama.service.js';
import { logger } from '../../observability/logger.js';

export interface REEngineClientOptions {
  dataDir: string;
  environment?: 'development' | 'staging' | 'production';
  apiKey?: string;
  timeout?: number;
  ollama?: {
    baseUrl?: string;
    apiKey?: string;
    defaultModel?: string;
    timeout?: number;
  };
}

export interface ClientResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    duration: number;
  };
}

export interface PaginatedResponse<T> extends ClientResponse<T[]> {
  pagination?: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Main RE Engine Client
 * Provides a high-level interface for interacting with the RE Engine
 */
export class REEngineClient {
  private approvals: ApprovalsRepository;
  private leads: LeadsRepository;
  private options: Required<REEngineClientOptions>;
  private ollama: OllamaService;

  constructor(options: REEngineClientOptions) {
    this.options = {
      environment: 'development',
      timeout: 30000,
      apiKey: '',
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        apiKey: process.env.OLLAMA_API_KEY,
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'qwen:7b',
        timeout: 30000
      },
      ...options
    } as Required<REEngineClientOptions>;

    this.approvals = new ApprovalsRepository({ dataDir: options.dataDir });
    this.leads = new LeadsRepository({ dataDir: options.dataDir });
    this.ollama = getOllamaService(this.options.ollama);
  }

  /**
   * Initialize the client and data stores
   */
  async initialize(): Promise<ClientResponse<boolean>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Initialize repositories
      const approvalsInit = await this.approvals.initialize();
      const leadsInit = await this.leads.initialize();

      if (!approvalsInit.success) {
        return this.createResponse<boolean>(requestId, startTime, false, undefined, approvalsInit.error);
      }

      if (!leadsInit.success) {
        return this.createResponse<boolean>(requestId, startTime, false, undefined, leadsInit.error);
      }

      return this.createResponse(requestId, startTime, true, true);
    } catch (error) {
      return this.createResponse<boolean>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  // ===== APPROVALS =====

  /**
   * Create a new approval
   */
  async createApproval(data: CreateApprovalRequest): Promise<ClientResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.create(data);
      
      if (!result.success) {
        return this.createResponse<Approval>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Approval>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Query approvals
   */
  async queryApprovals(filter: ApprovalFilter = {}): Promise<PaginatedResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.query(filter);
      
      if (!result.success) {
        return this.createResponse<Approval[]>(requestId, startTime, false, undefined, result.error) as PaginatedResponse<Approval>;
      }

      const response: PaginatedResponse<Approval> = this.createResponse(requestId, startTime, true, result.data);
      
      if (result.total !== undefined) {
        response.pagination = {
          total: result.total,
          offset: filter.offset || 0,
          limit: filter.limit || 100,
          hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
        };
      }

      return response;
    } catch (error) {
      return this.createResponse<Approval[]>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error)) as PaginatedResponse<Approval>;
    }
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: string): Promise<ClientResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.getById(approvalId);
      
      if (!result.success) {
        return this.createResponse<Approval>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Approval>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update approval
   */
  async updateApproval(approvalId: string, data: UpdateApprovalRequest): Promise<ClientResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.update(approvalId, data);
      
      if (!result.success) {
        return this.createResponse<Approval>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Approval>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Approve an approval
   */
  async approveApproval(approvalId: string, approvedBy?: string): Promise<ClientResponse<Approval>> {
    return this.updateApproval(approvalId, { 
      status: 'approved', 
      approved_by: approvedBy 
    });
  }

  /**
   * Reject an approval
   */
  async rejectApproval(approvalId: string, reason?: string, rejectedBy?: string): Promise<ClientResponse<Approval>> {
    return this.updateApproval(approvalId, { 
      status: 'rejected', 
      notes: reason,
      approved_by: rejectedBy 
    });
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<PaginatedResponse<Approval>> {
    return this.queryApprovals({ status: 'pending' });
  }

  /**
   * Get approvals ready to send
   */
  async getReadyToSendApprovals(): Promise<PaginatedResponse<Approval>> {
    return this.queryApprovals({ status: 'approved' });
  }

  // ===== LEADS =====

  /**
   * Create a new lead
   */
  async createLead(data: CreateLeadRequest): Promise<ClientResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.create(data);
      
      if (!result.success) {
        return this.createResponse<Lead>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Lead>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Query leads
   */
  async queryLeads(filter: LeadFilter = {}): Promise<PaginatedResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.query(filter);
      
      if (!result.success) {
        return this.createResponse<Lead[]>(requestId, startTime, false, undefined, result.error) as PaginatedResponse<Lead>;
      }

      const response: PaginatedResponse<Lead> = this.createResponse(requestId, startTime, true, result.data);
      
      if (result.total !== undefined) {
        response.pagination = {
          total: result.total,
          offset: filter.offset || 0,
          limit: filter.limit || 100,
          hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
        };
      }

      return response;
    } catch (error) {
      return this.createResponse<Lead[]>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error)) as PaginatedResponse<Lead>;
    }
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId: string): Promise<ClientResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.getById(leadId);
      
      if (!result.success) {
        return this.createResponse<Lead>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Lead>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update lead
   */
  async updateLead(leadId: string, data: UpdateLeadRequest): Promise<ClientResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.update(leadId, data);
      
      if (!result.success) {
        return this.createResponse<Lead>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Lead>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  // ===== AI CAPABILITIES =====

  /**
   * Generate AI-powered outreach message
   */
  async generateOutreachMessage(
    lead: Lead,
    template?: string,
    options?: {
      tone?: 'professional' | 'friendly' | 'urgent';
      length?: 'short' | 'medium' | 'long';
      customInstructions?: string;
    }
  ): Promise<ClientResponse<{ message: string; confidence: number }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const systemPrompt = this.buildOutreachSystemPrompt(options);
      const userPrompt = this.buildOutreachUserPrompt(lead, template);

      const request: OllamaChatRequest = {
        model: this.options.ollama.defaultModel!,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        options: {
          temperature: 0.7,
          num_predict: 500
        }
      };

      const response = await this.ollama.chat(request);
      
      if (!response.done) {
        throw new Error('Incomplete AI response');
      }

      const message = response.message.content;
      const confidence = this.calculateMessageConfidence(message, lead);

      logger.info('Outreach message generated', {
        requestId,
        leadId: lead.lead_id,
        model: response.model,
        confidence
      });

      return this.createResponse(requestId, startTime, true, { message, confidence });
    } catch (error) {
      logger.error('Failed to generate outreach message', {
        requestId,
        leadId: lead.lead_id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.createResponse<{ message: string; confidence: number }>(
        requestId, 
        startTime, 
        false, 
        undefined, 
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Analyze lead with AI for scoring and insights
   */
  async analyzeLead(lead: Lead): Promise<ClientResponse<{
    score: number;
    insights: string[];
    recommendations: string[];
    confidence: number;
  }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const systemPrompt = `You are a real estate expert AI assistant. Analyze leads and provide:
1. A lead score from 0-100
2. Key insights about the lead
3. Actionable recommendations
4. Confidence in your analysis

Respond in JSON format with keys: score, insights (array), recommendations (array), confidence (0-1)`;

      const userPrompt = this.buildLeadAnalysisPrompt(lead);

      const request: OllamaChatRequest = {
        model: this.options.ollama.defaultModel!,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        format: { type: 'object' },
        options: {
          temperature: 0.3,
          num_predict: 800
        }
      };

      const response = await this.ollama.chat(request);
      
      if (!response.done) {
        throw new Error('Incomplete AI response');
      }

      let analysis;
      try {
        analysis = JSON.parse(response.message.content);
      } catch (parseError) {
        // Fallback: extract structured data from text
        console.warn('Failed to parse AI response as JSON:', parseError);
        analysis = this.extractAnalysisFromText(response.message.content);
      }

      // Validate and sanitize analysis
      analysis = this.validateAnalysis(analysis);

      logger.info('Lead analysis completed', {
        requestId,
        leadId: lead.lead_id,
        score: analysis.score,
        confidence: analysis.confidence
      });

      return this.createResponse(requestId, startTime, true, analysis);
    } catch (error) {
      logger.error('Failed to analyze lead', {
        requestId,
        leadId: lead.lead_id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.createResponse<{
        score: number;
        insights: string[];
        recommendations: string[];
        confidence: number;
      }>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Generate AI-powered response to lead communication
   */
  async generateResponse(
    lead: Lead,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>,
    newMessage: string,
    options?: {
      tone?: 'professional' | 'friendly' | 'urgent';
      purpose?: 'answer_question' | 'schedule_viewing' | 'negotiate' | 'follow_up';
    }
  ): Promise<ClientResponse<{ response: string; suggestedActions: string[] }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const systemPrompt = this.buildResponseSystemPrompt(lead, options);
      const messages = this.buildConversationMessages(conversationHistory, newMessage);

      messages.unshift({ role: 'system', content: systemPrompt });

      const request: OllamaChatRequest = {
        model: this.options.ollama.defaultModel!,
        messages,
        options: {
          temperature: 0.8,
          num_predict: 600
        }
      };

      const response = await this.ollama.chat(request);
      
      if (!response.done) {
        throw new Error('Incomplete AI response');
      }

      const aiResponse = response.message.content;
      const suggestedActions = this.extractSuggestedActions(aiResponse);

      logger.info('AI response generated', {
        requestId,
        leadId: lead.lead_id,
        messageCount: messages.length,
        responseLength: aiResponse.length
      });

      return this.createResponse(requestId, startTime, true, { 
        response: aiResponse, 
        suggestedActions 
      });
    } catch (error) {
      logger.error('Failed to generate AI response', {
        requestId,
        leadId: lead.lead_id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.createResponse<{ response: string; suggestedActions: string[] }>(
        requestId, 
        startTime, 
        false, 
        undefined, 
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get AI service health and status
   */
  async getAIStatus(): Promise<ClientResponse<{
    connected: boolean;
    modelCount: number;
    availableModels: string[];
    defaultModel: string;
    health: 'healthy' | 'unhealthy';
  }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const health = await this.ollama.healthCheck();
      const models = await this.ollama.listModels();

      const status = {
        connected: health.details.connected,
        modelCount: models.length,
        availableModels: models.map(m => m.name),
        defaultModel: this.options.ollama.defaultModel!,
        health: health.status
      };

      return this.createResponse(requestId, startTime, true, status);
    } catch (error) {
      return this.createResponse<{
        connected: boolean;
        modelCount: number;
        availableModels: string[];
        defaultModel: string;
        health: 'healthy' | 'unhealthy';
      }>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // ===== HELPER METHODS FOR AI FUNCTIONS =====

  private buildOutreachSystemPrompt(options?: {
    tone?: 'professional' | 'friendly' | 'urgent';
    length?: 'short' | 'medium' | 'long';
    customInstructions?: string;
  }): string {
    let prompt = `You are a professional real estate assistant crafting personalized outreach messages. `;
    
    if (options?.tone) {
      prompt += `Use a ${options.tone} tone. `;
    }
    
    if (options?.length) {
      const lengthGuides = {
        short: 'Keep the message under 100 words.',
        medium: 'Keep the message between 100-200 words.',
        long: 'Write a comprehensive message of 200-300 words.'
      };
      prompt += `${lengthGuides[options.length]} `;
    }
    
    if (options?.customInstructions) {
      prompt += `Additional instructions: ${options.customInstructions}. `;
    }
    
    prompt += `Be genuine, mention specific details about the property or their needs, and include a clear call to action.`;
    
    return prompt;
  }

  private buildOutreachUserPrompt(
    lead: Lead, 
    template?: string
  ): string {
    let prompt = `Generate an outreach message for this lead:\n\n`;
    prompt += `Lead Details:\n`;
    prompt += `- Name: ${lead.first_name} ${lead.last_name}\n`;
    prompt += `- Email: ${lead.email}\n`;
    prompt += `- Phone: ${lead.phone_e164}\n`;
    
    if (lead.metadata?.property_preferences) {
      prompt += `- Property Preferences: ${lead.metadata.property_preferences}\n`;
    }
    
    if (lead.metadata?.budget_range) {
      prompt += `- Budget Range: ${lead.metadata.budget_range}\n`;
    }
    
    if (lead.metadata?.location_preferences) {
      prompt += `- Location Preferences: ${lead.metadata.location_preferences}\n`;
    }
    
    prompt += `- Lead Source: ${lead.source}\n`;
    
    if (template) {
      prompt += `\nTemplate to follow:\n${template}\n`;
    }
    
    prompt += `\nGenerate a personalized message that will resonate with this lead.`;
    
    return prompt;
  }

  private buildLeadAnalysisPrompt(lead: Lead): string {
    let prompt = `Analyze this real estate lead:\n\n`;
    prompt += `Name: ${lead.first_name} ${lead.last_name}\n`;
    prompt += `Email: ${lead.email}\n`;
    prompt += `Phone: ${lead.phone_e164}\n`;
    
    if (lead.metadata?.property_preferences) {
      prompt += `Property Preferences: ${lead.metadata.property_preferences}\n`;
    }
    
    if (lead.metadata?.budget_range) {
      prompt += `Budget Range: ${lead.metadata.budget_range}\n`;
    }
    
    if (lead.metadata?.location_preferences) {
      prompt += `Location Preferences: ${lead.metadata.location_preferences}\n`;
    }
    
    prompt += `Lead Source: ${lead.source}\n`;
    
    if (lead.created_at) {
      prompt += `Created: ${lead.created_at}\n`;
    }
    
    prompt += `\nProvide comprehensive analysis and recommendations.`;
    
    return prompt;
  }

  private buildResponseSystemPrompt(
    lead: Lead, 
    options?: {
      tone?: 'professional' | 'friendly' | 'urgent';
      purpose?: 'answer_question' | 'schedule_viewing' | 'negotiate' | 'follow_up';
    }
  ): string {
    let prompt = `You are a professional real estate assistant responding to a lead. `;
    
    prompt += `Lead context: ${lead.first_name} ${lead.last_name}, `;
    
    if (lead.metadata?.property_preferences) {
      prompt += `interested in ${lead.metadata.property_preferences}. `;
    }
    
    if (options?.purpose) {
      const purposeGuides = {
        answer_question: 'Focus on answering their question clearly and helpfully.',
        schedule_viewing: 'Focus on scheduling a property viewing.',
        negotiate: 'Focus on negotiation points and finding common ground.',
        follow_up: 'Focus on following up and maintaining engagement.'
      };
      prompt += `${purposeGuides[options.purpose]} `;
    }
    
    if (options?.tone) {
      prompt += `Use a ${options.tone} tone. `;
    }
    
    prompt += `Be helpful, professional, and include specific next steps or suggested actions when appropriate.`;
    
    return prompt;
  }

  private buildConversationMessages(
    history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>,
    newMessage: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // Add conversation history (limit to last 10 messages for context)
    history.slice(-10).forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add new message
    messages.push({
      role: 'user',
      content: newMessage
    });
    
    return messages;
  }

  private calculateMessageConfidence(message: string, lead: Lead): number {
    // Simple confidence calculation based on message quality
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for longer, more detailed messages
    if (message.length > 100) confidence += 0.1;
    if (message.length > 200) confidence += 0.1;
    
    // Increase confidence for personalization
    if (message.toLowerCase().includes(lead.first_name.toLowerCase())) confidence += 0.1;
    if (message.toLowerCase().includes(lead.last_name.toLowerCase())) confidence += 0.1;
    
    // Increase confidence for call to action
    if (message.toLowerCase().includes('call') || 
        message.toLowerCase().includes('email') || 
        message.toLowerCase().includes('schedule') || 
        message.toLowerCase().includes('contact')) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractAnalysisFromText(text: string): {
    score: number;
    insights: string[];
    recommendations: string[];
    confidence: number;
  } {
    // Fallback extraction if JSON parsing fails
    const analysis = {
      score: 50,
      insights: [] as string[],
      recommendations: [] as string[],
      confidence: 0.5
    };
    
    // Extract score (look for numbers 0-100)
    const scoreMatch = text.match(/(?:score|rating)[^\d]*(\d+)/i);
    if (scoreMatch) {
      analysis.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
    }
    
    // Extract insights (look for sentences with "insight" or key observations)
    const sentences = text.split(/[.!?]+/);
    analysis.insights = sentences
      .filter(s => s.trim().length > 20)
      .slice(0, 3)
      .map(s => s.trim());
    
    // Extract recommendations (look for action items)
    analysis.recommendations = sentences
      .filter(s => s.toLowerCase().includes('recommend') || 
                   s.toLowerCase().includes('suggest') || 
                   s.toLowerCase().includes('should'))
      .slice(0, 3)
      .map(s => s.trim());
    
    return analysis;
  }

  private validateAnalysis(analysis: Record<string, unknown>): {
    score: number;
    insights: string[];
    recommendations: string[];
    confidence: number;
  } {
    return {
      score: Math.min(100, Math.max(0, (analysis.score as number) || 50)),
      insights: Array.isArray(analysis.insights) ? analysis.insights.slice(0, 5) : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations.slice(0, 5) : [],
      confidence: Math.min(1, Math.max(0, (analysis.confidence as number) || 0.5))
    };
  }

  private extractSuggestedActions(response: string): string[] {
    const actions: string[] = [];
    
    // Look for action-oriented phrases
    const actionPatterns = [
      /(?:should|recommend|suggest)[^.]*([^.]*\b(call|email|schedule|contact|meet|visit|follow)[^.]*\.)/gi,
      /(?:next step|action)[^.]*([^.]*\b(call|email|schedule|contact|meet|visit|follow)[^.]*\.)/gi
    ];
    
    actionPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        actions.push(...matches.map(m => m.trim()));
      }
    });
    
    return actions.slice(0, 3); // Limit to 3 actions
  }

  /**
   * Get client status and health
   */
  async getStatus(): Promise<ClientResponse<{
    environment: string;
    dataDir: string;
    repositories: {
      approvals: boolean;
      leads: boolean;
    };
  }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const approvalsStats = this.approvals.getStats('approvals.csv');
      const leadsStats = this.leads.getStats('leads.csv');

      return this.createResponse(requestId, startTime, true, {
        environment: this.options.environment,
        dataDir: this.options.dataDir,
        repositories: {
          approvals: approvalsStats?.exists || false,
          leads: leadsStats?.exists || false
        }
      });
    } catch (error) {
      return this.createResponse<{environment: string; dataDir: string; repositories: {approvals: boolean; leads: boolean;}}>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a standardized response
   */
  private createResponse<T>(
    requestId: string,
    startTime: number,
    success: boolean,
    data?: T,
    error?: string
  ): ClientResponse<T> {
    const duration = Date.now() - startTime;

    const response: ClientResponse<T> = {
      success,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        duration
      }
    };

    if (data !== undefined) {
      response.data = data;
    }

    if (error) {
      response.error = error;
    }

    return response as ClientResponse<T>;
  }
}

/**
 * Factory function to create RE Engine client
 */
export function createREEngineClient(options: REEngineClientOptions): REEngineClient {
  return new REEngineClient(options);
}
