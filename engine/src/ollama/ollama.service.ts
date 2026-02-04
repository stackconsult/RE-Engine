/**
 * Ollama AI Service Integration
 * High-level service for AI operations within RE Engine
 * Supports both direct Ollama access and LiteLLM proxy for Claude Code compatibility
 */

import { OllamaClient, OllamaConfig, OllamaMessage, OllamaRequest } from './ollama.client.js';
import { LiteLLMProxyService, LiteLLMConfig } from '../ai/litellm-proxy.service.js';
import { logPerformance, logError, logSystemEvent } from '../observability/logger.js';

export interface AIRequest {
  prompt: string;
  context?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  claudeModel?: string; // For Claude Code compatibility
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  processingTime: number;
  success: boolean;
  error?: string;
  provider: 'direct' | 'proxy';
}

export interface OllamaServiceConfig {
  useProxy: boolean;
  proxyConfig?: LiteLLMConfig;
  directConfig?: OllamaConfig;
  defaultModel: string;
  claudeModelMappings?: Record<string, string>;
  fallbackToDirect: boolean;
}

export interface LeadAnalysisRequest {
  leadData: {
    company?: string;
    domain?: string;
    industry?: string;
    size?: string;
    location?: string;
    description?: string;
  };
  analysisType: 'outreach' | 'qualification' | 'enrichment';
}

export interface LeadAnalysisResponse {
  insights: string[];
  recommendations: string[];
  outreachStrategy?: string;
  qualificationScore?: number;
  confidence: number;
  model: string;
  processingTime: number;
}

export class OllamaService {
  private client: OllamaClient;
  private proxyService?: LiteLLMProxyService;
  private config: OllamaServiceConfig;
  private defaultModel: string;
  private useProxy: boolean;

  constructor(config: OllamaServiceConfig) {
    this.config = config;
    this.useProxy = config.useProxy;
    this.defaultModel = config.defaultModel;

    // Initialize direct client
    if (config.directConfig) {
      this.client = new OllamaClient(config.directConfig);
    }

    // Initialize proxy service
    if (config.useProxy && config.proxyConfig) {
      this.proxyService = new LiteLLMProxyService(config.proxyConfig);
    }
  }

  async initialize(): Promise<void> {
    try {
      logSystemEvent('ollama-service-init', 'info', {
        useProxy: this.useProxy,
        defaultModel: this.defaultModel
      });

      // Initialize proxy if enabled
      if (this.proxyService) {
        await this.proxyService.initialize();
      }

      // Initialize direct client
      if (this.client) {
        await this.client.healthCheck();
      }

      logSystemEvent('ollama-service-init-success', 'info');

    } catch (error) {
      logError(error as Error, 'ollama-service-init-failed');
      throw error;
    }
  }

  async generateCompletion(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      logSystemEvent('ollama-completion-start', 'info', {
        model: request.model || this.defaultModel,
        useProxy: this.useProxy,
        claudeModel: request.claudeModel
      });

      let response: AIResponse;

      if (this.useProxy && this.proxyService) {
        response = await this.generateViaProxy(request);
      } else {
        response = await this.generateDirectly(request);
      }

      response.processingTime = Date.now() - startTime;

      logSystemEvent('ollama-completion-success', 'info', {
        model: response.model,
        provider: response.provider,
        processingTime: response.processingTime,
        tokensUsed: response.tokensUsed
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logError(error as Error, 'ollama-completion-failed', {
        model: request.model || this.defaultModel,
        useProxy: this.useProxy,
        processingTime
      });

      // Fallback to direct if proxy fails
      if (this.useProxy && this.config.fallbackToDirect && this.client) {
        logSystemEvent('ollama-completion-fallback', 'warn', {
          fromProvider: 'proxy',
          toProvider: 'direct'
        });
        
        return await this.generateDirectly(request);
      }

      return {
        content: '',
        model: request.model || this.defaultModel,
        processingTime,
        success: false,
        error: (error as Error).message,
        provider: this.useProxy ? 'proxy' : 'direct'
      };
    }
  }

  private async generateViaProxy(request: AIRequest): Promise<AIResponse> {
    if (!this.proxyService) {
      throw new Error('Proxy service not initialized');
    }

    // Map Claude model to Ollama model if specified
    let ollamaModel = request.model;
    if (request.claudeModel) {
      ollamaModel = await this.proxyService.getModelMapping(request.claudeModel);
    }

    // Create request for LiteLLM proxy (Claude API compatible)
    const claudeRequest = {
      model: request.claudeModel || 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: request.context ? `${request.context}\n\n${request.prompt}` : request.prompt
        }
      ],
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7
    };

    const response = await fetch(`${this.proxyService.getStatus().proxyUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.proxyConfig?.masterKey}`
      },
      body: JSON.stringify(claudeRequest)
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.content?.[0]?.text || '',
      model: data.model || ollamaModel || this.defaultModel,
      tokensUsed: data.usage?.total_tokens,
      processingTime: 0, // Will be set by caller
      success: true,
      provider: 'proxy'
    };
  }

  private async generateDirectly(request: AIRequest): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Direct Ollama client not initialized');
    }

    const ollamaRequest: OllamaRequest = {
      model: request.model || this.defaultModel,
      messages: [
        {
          role: 'user',
          content: request.context ? `${request.context}\n\n${request.prompt}` : request.prompt
        }
      ],
      options: {
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000
      }
    };

    const response = await this.client.generateCompletion(ollamaRequest);

    return {
      content: response.message?.content || '',
      model: response.model || this.defaultModel,
      tokensUsed: response.eval_count,
      processingTime: 0, // Will be set by caller
      success: true,
      provider: 'direct'
    };
  }

  async analyzeLead(request: LeadAnalysisRequest): Promise<LeadAnalysisResponse> {
    const prompt = this.buildLeadAnalysisPrompt(request);
    
    const aiRequest: AIRequest = {
      prompt,
      model: this.defaultModel,
      temperature: 0.3, // Lower temperature for consistent analysis
      maxTokens: 500
    };

    const response = await this.generateCompletion(aiRequest);

    if (!response.success) {
      throw new Error(`Lead analysis failed: ${response.error}`);
    }

    return this.parseLeadAnalysisResponse(response.content, response.model, response.processingTime);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const checks = [];

      // Check proxy health if enabled
      if (this.proxyService) {
        const proxyHealth = await this.proxyService.healthCheck();
        checks.push(proxyHealth);
      }

      // Check direct client health if available
      if (this.client) {
        const directHealth = await this.client.healthCheck();
        checks.push(directHealth);
      }

      return checks.length > 0 ? checks.every(check => check) : false;

    } catch (error) {
      logError(error as Error, 'ollama-health-check-failed');
      return false;
    }
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      if (this.useProxy && this.proxyService) {
        return await this.proxyService.listAvailableModels();
      }

      if (this.client) {
        const models = await this.client.listModels();
        return models.map(model => model.name);
      }

      return [];

    } catch (error) {
      logError(error as Error, 'ollama-list-models-failed');
      return [];
    }
  }

  async switchProvider(useProxy: boolean): Promise<void> {
    logSystemEvent('ollama-switch-provider', 'info', {
      fromProvider: this.useProxy ? 'proxy' : 'direct',
      toProvider: useProxy ? 'proxy' : 'direct'
    });

    this.useProxy = useProxy;

    // Validate the switch
    if (useProxy && !this.proxyService) {
      throw new Error('Cannot switch to proxy: proxy service not initialized');
    }

    if (!useProxy && !this.client) {
      throw new Error('Cannot switch to direct: direct client not initialized');
    }

    // Verify health of new provider
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error(`Switch to ${useProxy ? 'proxy' : 'direct'} provider failed health check`);
    }

    logSystemEvent('ollama-switch-provider-success', 'info');
  }

  getStatus(): {
    useProxy: boolean;
    proxyStatus?: any;
    directHealthy?: boolean;
    availableModels: string[];
  } {
    return {
      useProxy: this.useProxy,
      proxyStatus: this.proxyService?.getStatus(),
      directHealthy: this.client ? true : undefined,
      availableModels: [] // Will be populated asynchronously
    };
  }

  private buildLeadAnalysisPrompt(request: LeadAnalysisRequest): string {
    const { leadData, analysisType } = request;
    
    let prompt = `Analyze the following lead data for ${analysisType}:\n\n`;
    
    if (leadData.company) prompt += `Company: ${leadData.company}\n`;
    if (leadData.domain) prompt += `Domain: ${leadData.domain}\n`;
    if (leadData.industry) prompt += `Industry: ${leadData.industry}\n`;
    if (leadData.size) prompt += `Size: ${leadData.size}\n`;
    if (leadData.location) prompt += `Location: ${leadData.location}\n`;
    if (leadData.description) prompt += `Description: ${leadData.description}\n`;

    switch (analysisType) {
      case 'outreach':
        prompt += '\nProvide specific outreach strategies and talking points.';
        break;
      case 'qualification':
        prompt += '\nProvide a qualification score (1-10) and reasoning.';
        break;
      case 'enrichment':
        prompt += '\nProvide additional insights and recommendations.';
        break;
    }

    return prompt;
  }

  private parseLeadAnalysisResponse(content: string, model: string, processingTime: number): LeadAnalysisResponse {
    // Simple parsing - in production, you'd want more sophisticated parsing
    const lines = content.split('\n').filter(line => line.trim());
    
    return {
      insights: lines.filter(line => line.includes('insight') || line.includes('finding')),
      recommendations: lines.filter(line => line.includes('recommend') || line.includes('suggest')),
      outreachStrategy: lines.find(line => line.includes('strategy')) || '',
      qualificationScore: this.extractScore(content),
      confidence: 0.8, // Would be calculated based on response quality
      model,
      processingTime
    };
  }

  private extractScore(content: string): number {
    const scoreMatch = content.match(/(\d+)\/10|score[^\d]*(\d+)/i);
    if (scoreMatch) {
      return Math.min(10, Math.max(1, parseInt(scoreMatch[1] || scoreMatch[2])));
    }
    return 5; // Default middle score
  }

  async cleanup(): Promise<void> {
    if (this.proxyService) {
      await this.proxyService.cleanup();
    }
  }
}
