/**
 * Real Estate Analyst Skill - Enhanced AI capabilities for real estate domain
 */

import { EnhancedVertexAIClient } from '../enhanced-api-client';
import pino from 'pino';

const logger = pino();

export interface RealEstateAnalysisRequest {
  type: 'market_analysis' | 'property_valuation' | 'investment_analysis' | 'lead_qualification';
  location?: string;
  propertyData?: any;
  marketData?: any;
  clientProfile?: any;
  preferences?: {
    detailLevel: 'basic' | 'comprehensive' | 'expert';
    focusAreas: string[];
    format: 'report' | 'summary' | 'recommendations';
  };
}

export interface RealEstateAnalysisResult {
  analysis: {
    type: string;
    insights: string[];
    recommendations: string[];
    confidence: number;
    dataPoints: any[];
  };
  marketContext: {
    trends: string[];
    comparables: any[];
    riskFactors: string[];
    opportunities: string[];
  };
  qualityMetrics: {
    accuracy: number;
    completeness: number;
    relevance: number;
    timeliness: number;
  };
  metadata: {
    model: string;
    processingTime: number;
    tokensUsed: number;
    confidence: number;
  };
}

export class RealEstateAnalystSkill {
  private aiClient: EnhancedVertexAIClient;
  private knowledgeBase = new Map<string, any>();
  private analysisCache = new Map<string, RealEstateAnalysisResult>();

  constructor(aiClient: EnhancedVertexAIClient) {
    this.aiClient = aiClient;
    this.initializeKnowledgeBase();
  }

  /**
   * Main analysis entry point with enhanced context and recall
   */
  async analyzeRealEstateRequest(
    request: RealEstateAnalysisRequest,
    conversationId?: string,
    userId?: string
  ): Promise<RealEstateAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting real estate analysis', {
        type: request.type,
        location: request.location,
        conversationId
      });

      // Build enhanced prompt with domain expertise
      const enhancedPrompt = this.buildDomainSpecificPrompt(request);
      
      // Execute with conversation memory and context
      const response = await this.aiClient.generateContentWithMemory(
        {
          contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for analytical tasks
            maxOutputTokens: 4096,
            topK: 40,
            topP: 0.8
          }
        },
        conversationId,
        userId
      );

      // Parse and enhance response
      const analysisResult = await this.parseAndEnhanceResponse(
        response,
        request,
        startTime
      );

      // Cache result for future reference
      const cacheKey = this.generateCacheKey(request);
      this.analysisCache.set(cacheKey, analysisResult);

      logger.info('Real estate analysis completed', {
        type: request.type,
        confidence: analysisResult.analysis.confidence,
        processingTime: Date.now() - startTime
      });

      return analysisResult;

    } catch (error) {
      logger.error('Real estate analysis failed', {
        error: error.message,
        type: request.type
      });
      throw error;
    }
  }

  /**
   * Build domain-specific prompt with enhanced context
   */
  private buildDomainSpecificPrompt(request: RealEstateAnalysisRequest): string {
    const basePrompt = this.getBaseAnalysisPrompt(request.type);
    const contextPrompt = this.buildContextualPrompt(request);
    const dataPrompt = this.buildDataPrompt(request);
    const formatPrompt = this.buildFormatPrompt(request.preferences);

    return `${basePrompt}

${contextPrompt}

${dataPrompt}

${formatPrompt}

ANALYSIS REQUIREMENTS:
1. Provide data-driven insights with specific metrics
2. Include confidence levels for each recommendation
3. Consider current market conditions and trends
4. Identify potential risks and opportunities
5. Structure response with clear sections and actionable advice

Please provide a comprehensive analysis based on the above requirements.`;
  }

  private getBaseAnalysisPrompt(type: string): string {
    const prompts = {
      market_analysis: `You are a senior real estate market analyst with 15+ years of experience.
      
TASK: Conduct a comprehensive market analysis for the specified area.

EXPERTISE AREAS:
- Local market trends and patterns
- Supply and demand dynamics
- Price appreciation and depreciation factors
- Economic indicators affecting real estate
- Demographic and migration trends
- Development and zoning changes

ANALYSIS FRAMEWORK:
1. Market Overview (current state, key metrics)
2. Trend Analysis (historical data, future projections)
3. Competitive Landscape (inventory, absorption rates)
4. Economic Factors (employment, interest rates, inflation)
5. Risk Assessment (market volatility, external factors)
6. Investment Outlook (opportunities, timing considerations)`,

      property_valuation: `You are a certified real estate appraiser with expertise in multiple property types.

TASK: Provide an accurate property valuation with detailed analysis.

VALUATION METHODOLOGY:
- Sales Comparison Approach
- Cost Approach
- Income Approach (if applicable)
- Automated Valuation Models (AVM) integration

ANALYSIS COMPONENTS:
1. Property Characteristics (size, condition, features)
2. Location Analysis (neighborhood, accessibility, amenities)
3. Market Comparables (recent sales, active listings)
4. Value Adjustments (condition, features, market conditions)
5. Value Range (most probable, high/low scenarios)
6. Confidence Assessment (data reliability, market stability)`,

      investment_analysis: `You are a real estate investment analyst specializing in ROI optimization.

TASK: Conduct comprehensive investment analysis and risk assessment.

INVESTMENT FRAMEWORK:
- Cash Flow Analysis
- Return on Investment (ROI)
- Capitalization Rate (Cap Rate)
- Internal Rate of Return (IRR)
- Net Present Value (NPV)
- Risk-Adjusted Returns

ANALYSIS AREAS:
1. Financial Performance (income, expenses, cash flow)
2. Market Position (competitive advantage, market share)
3. Risk Factors (market, operational, financial risks)
4. Growth Potential (appreciation, development opportunities)
5. Exit Strategy (timing, methods, expected returns)
6. Portfolio Fit (diversification, synergy effects)`,

      lead_qualification: `You are a real estate lead qualification specialist with expertise in buyer/seller profiling.

TASK: Qualify and analyze real estate leads for conversion potential.

QUALIFICATION CRITERIA:
- Financial Capacity (pre-approval, budget range)
- Motivation Level (urgency, commitment)
- Timeline (buying/selling timeframe)
- Property Requirements (needs vs wants, flexibility)
- Decision Making Process (stakeholders, criteria)

LEAD ANALYSIS:
1. Lead Profile (demographics, background, preferences)
2. Qualification Score (likelihood to convert)
3. Engagement Strategy (optimal approach, communication)
4. Conversion Timeline (expected closing timeframe)
5. Potential Obstacles (objections, concerns, competition)
6. Action Plan (next steps, follow-up strategy)`
    };

    return prompts[type as keyof typeof prompts] || prompts.market_analysis;
  }

  private buildContextualPrompt(request: RealEstateAnalysisRequest): string {
    let context = '';

    if (request.location) {
      context += `LOCATION: ${request.location}\n`;
      context += `Geographic Context: ${this.getLocationContext(request.location)}\n\n`;
    }

    if (request.clientProfile) {
      context += `CLIENT PROFILE:\n`;
      context += `- Experience Level: ${request.clientProfile.experience || 'first-time'}\n`;
      context += `- Budget Range: ${request.clientProfile.budget || 'not specified'}\n`;
      context += `- Timeline: ${request.clientProfile.timeline || 'flexible'}\n`;
      context += `- Risk Tolerance: ${request.clientProfile.riskTolerance || 'moderate'}\n\n`;
    }

    if (request.propertyData) {
      context += `PROPERTY DATA:\n`;
      context += `- Type: ${request.propertyData.type || 'residential'}\n`;
      context += `- Size: ${request.propertyData.size || 'not specified'}\n`;
      context += `- Condition: ${request.propertyData.condition || 'unknown'}\n`;
      context += `- Features: ${request.propertyData.features?.join(', ') || 'none specified'}\n\n`;
    }

    return context;
  }

  private buildDataPrompt(request: RealEstateAnalysisRequest): string {
    let dataPrompt = 'AVAILABLE DATA:\n';

    if (request.marketData) {
      dataPrompt += 'Market Data:\n';
      dataPrompt += `- Median Home Price: $${request.marketData.medianPrice || 'N/A'}\n`;
      dataPrompt += `- Days on Market: ${request.marketData.daysOnMarket || 'N/A'}\n`;
      dataPrompt += `- Inventory Levels: ${request.marketData.inventory || 'N/A'}\n`;
      dataPrompt += `- Price Trends: ${request.marketData.priceTrend || 'N/A'}\n\n`;
    }

    // Add knowledge base insights
    const kbInsights = this.getKnowledgeBaseInsights(request);
    if (kbInsights.length > 0) {
      dataPrompt += 'KNOWLEDGE BASE INSIGHTS:\n';
      kbInsights.forEach(insight => {
        dataPrompt += `- ${insight}\n`;
      });
      dataPrompt += '\n';
    }

    return dataPrompt;
  }

  private buildFormatPrompt(preferences?: any): string {
    const defaults = {
      detailLevel: 'comprehensive',
      focusAreas: ['analysis', 'recommendations', 'risks'],
      format: 'report'
    };

    const prefs = { ...defaults, ...preferences };

    return `OUTPUT REQUIREMENTS:
- Detail Level: ${prefs.detailLevel}
- Focus Areas: ${prefs.focusAreas.join(', ')}
- Format: ${prefs.format}
- Include confidence scores for all recommendations
- Provide specific, actionable insights
- Cite data sources and methodology`;
  }

  /**
   * Parse and enhance AI response with additional analysis
   */
  private async parseAndEnhanceResponse(
    response: any,
    request: RealEstateAnalysisRequest,
    startTime: number
  ): Promise<RealEstateAnalysisResult> {
    const generatedText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract structured data from response
    const analysis = this.extractAnalysisFromText(generatedText);
    const marketContext = this.extractMarketContext(generatedText);
    
    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(
      generatedText,
      request,
      response.quality?.score || 0
    );

    return {
      analysis: {
        type: request.type,
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
        confidence: analysis.confidence || 0.7,
        dataPoints: analysis.dataPoints || []
      },
      marketContext: {
        trends: marketContext.trends || [],
        comparables: marketContext.comparables || [],
        riskFactors: marketContext.riskFactors || [],
        opportunities: marketContext.opportunities || []
      },
      qualityMetrics,
      metadata: {
        model: response.model || 'gemini-2.5-flash-lite',
        processingTime: Date.now() - startTime,
        tokensUsed: response.metrics?.tokensUsed || 0,
        confidence: response.quality?.score || 0.7
      }
    };
  }

  private extractAnalysisFromText(text: string): any {
    // Simple text parsing - can be enhanced with NLP
    const analysis: any = {
      insights: [],
      recommendations: [],
      confidence: 0.7,
      dataPoints: []
    };

    // Extract insights (sentences with analytical content)
    const sentences = text.split('.').filter(s => s.trim().length > 20);
    analysis.insights = sentences.filter(s => 
      s.toLowerCase().includes('analysis') ||
      s.toLowerCase().includes('indicates') ||
      s.toLowerCase().includes('shows') ||
      s.toLowerCase().includes('suggests')
    ).slice(0, 5);

    // Extract recommendations
    analysis.recommendations = sentences.filter(s => 
      s.toLowerCase().includes('recommend') ||
      s.toLowerCase().includes('suggest') ||
      s.toLowerCase().includes('advise') ||
      s.toLowerCase().includes('should')
    ).slice(0, 5);

    return analysis;
  }

  private extractMarketContext(text: string): any {
    const context: any = {
      trends: [],
      comparables: [],
      riskFactors: [],
      opportunities: []
    };

    // Extract trends
    const trendKeywords = ['trend', 'increasing', 'decreasing', 'rising', 'falling', 'stable'];
    context.trends = this.extractSentencesWithKeywords(text, trendKeywords).slice(0, 3);

    // Extract risks
    const riskKeywords = ['risk', 'concern', 'challenge', 'threat', 'volatile'];
    context.riskFactors = this.extractSentencesWithKeywords(text, riskKeywords).slice(0, 3);

    // Extract opportunities
    const opportunityKeywords = ['opportunity', 'potential', 'growth', 'advantage', 'benefit'];
    context.opportunities = this.extractSentencesWithKeywords(text, opportunityKeywords).slice(0, 3);

    return context;
  }

  private extractSentencesWithKeywords(text: string, keywords: string[]): string[] {
    const sentences = text.split('.').filter(s => s.trim().length > 10);
    return sentences.filter(sentence => 
      keywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );
  }

  private calculateQualityMetrics(
    responseText: string,
    request: RealEstateAnalysisRequest,
    baseQuality: number
  ): any {
    const metrics = {
      accuracy: baseQuality,
      completeness: 0,
      relevance: 0,
      timeliness: 1.0
    };

    // Completeness: check for required sections
    const requiredSections = ['analysis', 'recommendation', 'risk', 'opportunity'];
    const foundSections = requiredSections.filter(section => 
      responseText.toLowerCase().includes(section)
    ).length;
    metrics.completeness = foundSections / requiredSections.length;

    // Relevance: check for domain-specific terms
    const domainTerms = ['property', 'market', 'price', 'value', 'investment', 'real estate'];
    const foundTerms = domainTerms.filter(term => 
      responseText.toLowerCase().includes(term)
    ).length;
    metrics.relevance = Math.min(foundTerms / domainTerms.length, 1.0);

    return metrics;
  }

  /**
   * Knowledge base management
   */
  private initializeKnowledgeBase(): void {
    // Initialize with real estate domain knowledge
    this.knowledgeBase.set('market_indicators', {
      price_trends: ['median_price', 'price_per_sqft', 'price_appreciation'],
      inventory_metrics: ['days_on_market', 'inventory_levels', 'absorption_rate'],
      economic_factors: ['interest_rates', 'employment_rate', 'gdp_growth']
    });

    this.knowledgeBase.set('property_types', {
      residential: ['single_family', 'condo', 'townhouse', 'multi_family'],
      commercial: ['office', 'retail', 'industrial', 'hospitality'],
      mixed_use: ['residential_commercial', 'live_work', 'retail_residential']
    });

    this.knowledgeBase.set('valuation_methods', {
      approaches: ['sales_comparison', 'cost_approach', 'income_approach'],
      adjustments: ['condition', 'location', 'features', 'market_conditions'],
      confidence_factors: ['data_quality', 'market_stability', 'comparables']
    });
  }

  private getLocationContext(location: string): string {
    // Simplified location context - can be enhanced with geolocation APIs
    const contexts: Record<string, string> = {
      'urban': 'High-density area with strong demand and limited supply',
      'suburban': 'Family-oriented with good schools and amenities',
      'rural': 'Low-density with agricultural and recreational opportunities',
      'coastal': 'Premium location with tourism and retirement appeal'
    };

    const locationType = Object.keys(contexts).find(type => 
      location.toLowerCase().includes(type)
    );

    return contexts[locationType] || 'Standard residential area';
  }

  private getKnowledgeBaseInsights(request: RealEstateAnalysisRequest): string[] {
    const insights: string[] = [];

    // Add type-specific insights
    if (request.type === 'market_analysis') {
      insights.push('Current market conditions favor buyer opportunities in many regions');
      insights.push('Interest rate environment continues to impact affordability');
    }

    if (request.type === 'property_valuation') {
      insights.push('Recent comparable sales show 5-10% appreciation in most markets');
      insights.push('Property condition significantly impacts valuation accuracy');
    }

    return insights;
  }

  private generateCacheKey(request: RealEstateAnalysisRequest): string {
    return Buffer.from(JSON.stringify({
      type: request.type,
      location: request.location,
      propertyData: request.propertyData,
      timestamp: Date.now() - (Date.now() % 3600000) // Hourly cache
    })).toString('base64');
  }

  /**
   * Analytics and monitoring
   */
  getSkillMetrics(): any {
    return {
      totalAnalyses: this.analysisCache.size,
      knowledgeBaseEntries: this.knowledgeBase.size,
      averageConfidence: this.calculateAverageConfidence(),
      typeDistribution: this.getAnalysisTypeDistribution()
    };
  }

  private calculateAverageConfidence(): number {
    const analyses = Array.from(this.analysisCache.values());
    if (analyses.length === 0) return 0;
    
    const totalConfidence = analyses.reduce((sum, analysis) => 
      sum + analysis.analysis.confidence, 0
    );
    return totalConfidence / analyses.length;
  }

  private getAnalysisTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    Array.from(this.analysisCache.values()).forEach(analysis => {
      const type = analysis.analysis.type;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return distribution;
  }
}
