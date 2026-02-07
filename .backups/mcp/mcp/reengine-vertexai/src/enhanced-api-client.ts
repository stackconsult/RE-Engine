/**
 * Enhanced VertexAI API Client with improved reliability and features
 */

import { GoogleAuth } from 'google-auth-library';
import { VertexAI } from '@vertexai/nodejs';
import pino from 'pino';

const logger = pino();

interface EnhancedAPIConfig {
  projectId: string;
  location: string;
  model: string;
  enableCaching: boolean;
  enableRetry: boolean;
  maxRetries: number;
  timeoutMs: number;
}

interface ConversationContext {
  conversationId: string;
  userId: string;
  sessionId: string;
  history: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp: number;
    metadata?: any;
  }>;
  context: {
    domain?: string;
    intent?: string;
    entities?: Record<string, any>;
    sentiment?: string;
  };
}

interface GenerationMetrics {
  requestId: string;
  model: string;
  tokensUsed: number;
  latency: number;
  success: boolean;
  errorType?: string;
  qualityScore?: number;
  relevanceScore?: number;
}

export class EnhancedVertexAIClient {
  private vertexAI: VertexAI;
  private config: EnhancedAPIConfig;
  private conversationMemory = new Map<string, ConversationContext>();
  private metrics: GenerationMetrics[] = [];
  private cache = new Map<string, any>();

  constructor(config: EnhancedAPIConfig) {
    this.config = config;
    
    // Initialize VertexAI with proper error handling
    try {
      this.vertexAI = new VertexAI({
        project: config.projectId,
        location: config.location,
        googleAuthOptions: {
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        }
      });
    } catch (error) {
      logger.error('Failed to initialize VertexAI client', error);
      throw new Error('VertexAI initialization failed');
    }
  }

  /**
   * Enhanced content generation with conversation context and recall
   */
  async generateContentWithMemory(
    params: any,
    conversationId?: string,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Retrieve conversation context if available
      const context = conversationId ? this.getConversationContext(conversationId) : null;
      
      // Build enhanced request with context
      const enhancedRequest = this.buildContextualRequest(params, context);
      
      // Apply caching if enabled
      const cacheKey = this.generateCacheKey(enhancedRequest);
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        logger.info('Cache hit for request', { requestId, cacheKey });
        return this.cache.get(cacheKey);
      }

      // Execute with retry logic
      const response = await this.executeWithRetry(
        () => this.vertexAI.getGenerativeModel({
          model: this.config.model,
          generationConfig: enhancedRequest.generationConfig
        }).generateContent(enhancedRequest.contents),
        this.config.maxRetries
      );

      const latency = Date.now() - startTime;
      
      // Update conversation memory
      if (conversationId && userId) {
        this.updateConversationContext(conversationId, userId, params, response);
      }

      // Cache response if enabled
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, response);
      }

      // Record metrics
      this.recordMetrics({
        requestId,
        model: this.config.model,
        tokensUsed: response.response?.usageMetadata?.totalTokenCount || 0,
        latency,
        success: true
      });

      // Analyze response quality
      const qualityAnalysis = this.analyzeResponseQuality(response, params);
      
      logger.info('Content generated successfully', {
        requestId,
        latency,
        tokensUsed: response.response?.usageMetadata?.totalTokenCount,
        qualityScore: qualityAnalysis.score
      });

      return {
        ...response,
        context: context?.context,
        quality: qualityAnalysis,
        metrics: {
          requestId,
          latency,
          tokensUsed: response.response?.usageMetadata?.totalTokenCount || 0
        }
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.recordMetrics({
        requestId,
        model: this.config.model,
        tokensUsed: 0,
        latency,
        success: false,
        errorType: error.name
      });

      logger.error('Content generation failed', {
        requestId,
        error: error.message,
        latency
      });

      throw error;
    }
  }

  /**
   * Build contextual request with conversation history and domain knowledge
   */
  private buildContextualRequest(params: any, context?: ConversationContext): any {
    const request = {
      contents: [...(params.contents || [])],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topK: 40,
        topP: 0.95,
        ...params.generationConfig
      }
    };

    // Add conversation context if available
    if (context && context.history.length > 0) {
      const contextPrompt = this.buildContextPrompt(context);
      request.contents.unshift({
        role: 'user',
        parts: [{ text: contextPrompt }]
      });
    }

    // Add system instructions for real estate domain
    if (this.isRealEstateRequest(params)) {
      request.contents.unshift({
        role: 'user',
        parts: [{ text: this.getRealEstateSystemPrompt() }]
      });
    }

    return request;
  }

  /**
   * Build context prompt from conversation history
   */
  private buildContextPrompt(context: ConversationContext): string {
    const recentHistory = context.history.slice(-5); // Last 5 interactions
    const contextSummary = recentHistory.map(item => 
      `${item.role}: ${item.content}`
    ).join('\n');

    return `CONVERSATION CONTEXT:
Previous interactions:
${contextSummary}

Current context: ${JSON.stringify(context.context)}

Please consider this context when responding to the current request.`;
  }

  /**
   * Real estate domain-specific system prompt
   */
  private getRealEstateSystemPrompt(): string {
    return `SYSTEM: You are a specialized AI assistant for real estate professionals and clients. 

DOMAIN EXPERTISE:
- Property valuation and market analysis
- Lead generation and client management
- Real estate investment analysis
- Property search and recommendations
- Market trends and forecasting

RESPONSE GUIDELINES:
- Provide accurate, data-driven insights
- Consider local market conditions
- Maintain professional and helpful tone
- Ask clarifying questions when needed
- Provide actionable recommendations

CONTEXT: Current request is within the real estate domain.`;
  }

  /**
   * Determine if request is real estate related
   */
  private isRealEstateRequest(params: any): boolean {
    const realEstateKeywords = [
      'property', 'real estate', 'home', 'house', 'apartment',
      'market', 'valuation', 'price', 'listing', 'agent', 'broker',
      'mortgage', 'rental', 'investment', 'neighborhood', 'location'
    ];

    const text = JSON.stringify(params).toLowerCase();
    return realEstateKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Conversation memory management
   */
  private getConversationContext(conversationId: string): ConversationContext | undefined {
    return this.conversationMemory.get(conversationId);
  }

  private updateConversationContext(
    conversationId: string,
    userId: string,
    request: any,
    response: any
  ): void {
    let context = this.conversationMemory.get(conversationId);
    
    if (!context) {
      context = {
        conversationId,
        userId,
        sessionId: this.generateSessionId(),
        history: [],
        context: {}
      };
      this.conversationMemory.set(conversationId, context);
    }

    // Add user message
    context.history.push({
      role: 'user',
      content: JSON.stringify(request),
      timestamp: Date.now()
    });

    // Add model response
    context.history.push({
      role: 'model',
      content: JSON.stringify(response),
      timestamp: Date.now()
    });

    // Update context analysis
    context.context = this.analyzeConversationContext(context.history);
  }

  /**
   * Analyze conversation context for intent and entities
   */
  private analyzeConversationContext(history: any[]): any {
    // Simple context analysis - can be enhanced with NLP
    const recentMessages = history.slice(-3);
    const allText = recentMessages.map(m => m.content).join(' ').toLowerCase();

    return {
      domain: this.isRealEstateRequest({ contents: allText }) ? 'real_estate' : 'general',
      intent: this.extractIntent(allText),
      entities: this.extractEntities(allText),
      sentiment: this.analyzeSentiment(allText)
    };
  }

  private extractIntent(text: string): string {
    if (text.includes('price') || text.includes('value')) return 'valuation';
    if (text.includes('search') || text.includes('find')) return 'search';
    if (text.includes('market') || text.includes('trend')) return 'market_analysis';
    if (text.includes('recommend') || text.includes('suggest')) return 'recommendation';
    return 'general_inquiry';
  }

  private extractEntities(text: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    // Extract numbers (prices, sizes)
    const numbers = text.match(/\$?\d+(?:,\d+)*(?:\.\d+)?/g);
    if (numbers) entities.numbers = numbers;
    
    // Extract locations
    const locations = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (locations) entities.locations = locations;
    
    return entities;
  }

  private analyzeSentiment(text: string): string {
    const positive = ['good', 'great', 'excellent', 'perfect', 'amazing'];
    const negative = ['bad', 'terrible', 'awful', 'poor', 'disappoint'];
    
    const positiveCount = positive.filter(word => text.includes(word)).length;
    const negativeCount = negative.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Response quality analysis
   */
  private analyzeResponseQuality(response: any, request: any): { score: number; factors: any } {
    const factors = {
      length: 0,
      relevance: 0,
      structure: 0,
      completeness: 0
    };

    const generatedText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Length scoring
    if (generatedText.length > 50) factors.length = 0.8;
    else if (generatedText.length > 20) factors.length = 0.5;
    else factors.length = 0.2;

    // Relevance scoring (simplified)
    const requestText = JSON.stringify(request).toLowerCase();
    const responseText = generatedText.toLowerCase();
    const commonWords = requestText.split(' ').filter(word => 
      word.length > 3 && responseText.includes(word)
    ).length;
    factors.relevance = Math.min(commonWords / 10, 1);

    // Structure scoring
    if (generatedText.includes('\n') || generatedText.includes('.')) factors.structure = 0.8;
    else factors.structure = 0.4;

    // Completeness scoring
    if (generatedText.includes('?') || generatedText.length > 100) factors.completeness = 0.8;
    else factors.completeness = 0.5;

    const score = Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;

    return { score, factors };
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(request: any): string {
    return Buffer.from(JSON.stringify(request)).toString('base64');
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
          error: lastError.message,
          delay
        });
      }
    }
    
    throw lastError!;
  }

  private recordMetrics(metrics: GenerationMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Analytics and monitoring
   */
  getPerformanceMetrics(): any {
    const recentMetrics = this.metrics.slice(-100);
    
    return {
      totalRequests: this.metrics.length,
      recentRequests: recentMetrics.length,
      successRate: recentMetrics.filter(m => m.success).length / recentMetrics.length,
      averageLatency: recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length,
      averageTokensUsed: recentMetrics.reduce((sum, m) => sum + m.tokensUsed, 0) / recentMetrics.length,
      errorTypes: this.getErrorTypeDistribution(recentMetrics),
      cacheHitRate: this.cache.size > 0 ? this.cache.size / recentMetrics.length : 0
    };
  }

  private getErrorTypeDistribution(metrics: GenerationMetrics[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    metrics.filter(m => !m.success && m.errorType).forEach(m => {
      distribution[m.errorType!] = (distribution[m.errorType!] || 0) + 1;
    });
    
    return distribution;
  }

  getConversationInsights(): any {
    const conversations = Array.from(this.conversationMemory.values());
    
    return {
      totalConversations: conversations.length,
      averageMessagesPerConversation: conversations.reduce((sum, c) => sum + c.history.length, 0) / conversations.length,
      domainDistribution: this.getDomainDistribution(conversations),
      intentDistribution: this.getIntentDistribution(conversations)
    };
  }

  private getDomainDistribution(conversations: ConversationContext[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    conversations.forEach(c => {
      const domain = c.context.domain || 'general';
      distribution[domain] = (distribution[domain] || 0) + 1;
    });
    
    return distribution;
  }

  private getIntentDistribution(conversations: ConversationContext[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    conversations.forEach(c => {
      const intent = c.context.intent || 'general_inquiry';
      distribution[intent] = (distribution[intent] || 0) + 1;
    });
    
    return distribution;
  }
}
