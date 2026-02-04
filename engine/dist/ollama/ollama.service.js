/**
 * Ollama AI Service Integration
 * High-level service for AI operations within RE Engine
 */
import { OllamaClient } from './ollama.client.js';
import { logPerformance, logError, logSystemEvent } from '../observability/logger.js';
export class OllamaService {
    client;
    defaultModel;
    constructor(config) {
        this.client = config ? new OllamaClient(config) : OllamaClient.fromEnvironment();
        this.defaultModel = this.client['config'].model;
    }
    /**
     * Initialize the Ollama service
     */
    async initialize() {
        try {
            const isHealthy = await this.client.healthCheck();
            if (!isHealthy) {
                throw new Error('Ollama service is not available');
            }
            // Verify default model is available
            const models = await this.client.listModels();
            const hasDefaultModel = models.some(model => model.name === this.defaultModel);
            if (!hasDefaultModel) {
                logSystemEvent('Default model not found, pulling model...', 'warn', {
                    model: this.defaultModel
                });
                await this.client.pullModel(this.defaultModel);
            }
            logSystemEvent('Ollama service initialized successfully', 'info', {
                model: this.defaultModel,
                availableModels: models.length
            });
        }
        catch (error) {
            logError(error, 'Failed to initialize Ollama service');
            throw error;
        }
    }
    /**
     * Generate AI completion
     */
    async generateCompletion(request) {
        const startTime = Date.now();
        try {
            const messages = [];
            // Add system context if provided
            if (request.context) {
                messages.push({
                    role: 'system',
                    content: request.context
                });
            }
            // Add user prompt
            messages.push({
                role: 'user',
                content: request.prompt
            });
            const ollamaRequest = {
                model: request.model || this.defaultModel,
                messages,
                options: {
                    temperature: request.temperature || 0.7,
                    max_tokens: request.maxTokens || 1000
                }
            };
            const response = await this.client.generateCompletion(ollamaRequest);
            const processingTime = Date.now() - startTime;
            logPerformance('ollama_completion', processingTime, {
                model: response.message?.role || 'unknown',
                messageCount: messages.length
            });
            return {
                content: response.message?.content || '',
                model: request.model || this.defaultModel,
                tokensUsed: response.eval_count,
                processingTime,
                success: true
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logError(error, 'AI completion failed', {
                model: request.model || this.defaultModel,
                processingTime
            });
            return {
                content: '',
                model: request.model || this.defaultModel,
                processingTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Analyze lead data using AI
     */
    async analyzeLead(request) {
        const startTime = Date.now();
        try {
            const prompt = this.buildLeadAnalysisPrompt(request);
            const aiResponse = await this.generateCompletion({
                prompt,
                context: this.getLeadAnalysisContext(request.analysisType),
                temperature: 0.3, // Lower temperature for more consistent analysis
                maxTokens: 2000
            });
            if (!aiResponse.success) {
                throw new Error(aiResponse.error || 'AI analysis failed');
            }
            const analysis = this.parseLeadAnalysisResponse(aiResponse.content, request.analysisType);
            const processingTime = Date.now() - startTime;
            logPerformance('lead_analysis', processingTime, {
                analysisType: request.analysisType,
                model: aiResponse.model
            });
            return {
                ...analysis,
                model: aiResponse.model,
                processingTime
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logError(error, 'Lead analysis failed', {
                analysisType: request.analysisType,
                processingTime
            });
            return {
                insights: [],
                recommendations: [],
                confidence: 0,
                model: this.defaultModel,
                processingTime
            };
        }
    }
    /**
     * Generate outreach message
     */
    async generateOutreachMessage(leadData) {
        const prompt = `
Generate a personalized outreach message for the following lead:

Company: ${leadData.company || 'Unknown'}
Domain: ${leadData.domain || 'Unknown'}
Industry: ${leadData.industry || 'Unknown'}
Size: ${leadData.size || 'Unknown'}
Location: ${leadData.location || 'Unknown'}
Description: ${leadData.description || 'No description available'}

Requirements:
- Keep it under 150 words
- Make it professional but friendly
- Reference their industry or company when possible
- Include a clear call-to-action
- Avoid generic sales language

Format the response as a complete email message.
    `.trim();
        const response = await this.generateCompletion({
            prompt,
            context: 'You are a professional sales development representative specializing in personalized outreach.',
            temperature: 0.5,
            maxTokens: 300
        });
        return response.content;
    }
    /**
     * Generate lead qualification score
     */
    async generateQualificationScore(leadData) {
        const prompt = `
Rate the lead quality on a scale of 0-100 based on:

Company: ${leadData.company || 'Unknown'}
Industry: ${leadData.industry || 'Unknown'}
Size: ${leadData.size || 'Unknown'}
Description: ${leadData.description || 'No description'}

Consider:
- Industry relevance
- Company size (preferably 50-1000 employees)
- Clear business description
- Technology adoption likelihood

Respond with only a number between 0-100.
    `.trim();
        const response = await this.generateCompletion({
            prompt,
            temperature: 0.1, // Very low temperature for consistent scoring
            maxTokens: 10
        });
        const score = parseInt(response.content.replace(/\D/g, ''));
        return Math.min(100, Math.max(0, isNaN(score) ? 50 : score));
    }
    /**
     * Get available models
     */
    async getAvailableModels() {
        try {
            const models = await this.client.listModels();
            return models.map(model => model.name);
        }
        catch (error) {
            logError(error, 'Failed to get available models');
            return [this.defaultModel];
        }
    }
    /**
     * Build lead analysis prompt based on analysis type
     */
    buildLeadAnalysisPrompt(request) {
        const { leadData, analysisType } = request;
        const baseInfo = `
Company: ${leadData.company || 'Unknown'}
Domain: ${leadData.domain || 'Unknown'}
Industry: ${leadData.industry || 'Unknown'}
Size: ${leadData.size || 'Unknown'}
Location: ${leadData.location || 'Unknown'}
Description: ${leadData.description || 'No description'}
    `.trim();
        switch (analysisType) {
            case 'outreach':
                return `
${baseInfo}

Analyze this lead for outreach strategy and provide:
1. 3 key insights about the company
2. 2-3 specific outreach recommendations
3. A brief outreach strategy paragraph

Focus on personalization angles and timing considerations.
        `.trim();
            case 'qualification':
                return `
${baseInfo}

Evaluate this lead's qualification and provide:
1. 3 qualification insights (strengths/concerns)
2. 2-3 recommendations for next steps
3. A qualification score (0-100)

Consider BANT criteria: Budget, Authority, Need, Timeline.
        `.trim();
            case 'enrichment':
                return `
${baseInfo}

Enrich this lead data and provide:
1. 3 insights about their business needs
2. 2-3 data enrichment recommendations
3. Potential technology stack or tools they might use

Focus on actionable intelligence for sales.
        `.trim();
            default:
                return baseInfo;
        }
    }
    /**
     * Get context for lead analysis
     */
    getLeadAnalysisContext(analysisType) {
        const contexts = {
            outreach: 'You are an expert sales development strategist specializing in personalized outreach campaigns.',
            qualification: 'You are a seasoned sales expert skilled at B2B lead qualification using frameworks like BANT and MEDDIC.',
            enrichment: 'You are a business intelligence expert specializing in company research and data enrichment for sales teams.'
        };
        return contexts[analysisType] || 'You are a helpful AI assistant for business analysis.';
    }
    /**
     * Parse lead analysis response
     */
    parseLeadAnalysisResponse(content, analysisType) {
        // Basic parsing - in production, this would be more sophisticated
        const lines = content.split('\n').filter(line => line.trim());
        const insights = [];
        const recommendations = [];
        let outreachStrategy;
        let qualificationScore;
        const confidence = 0.7; // Default confidence
        // Simple parsing logic - would be enhanced with better NLP
        lines.forEach(line => {
            if (line.toLowerCase().includes('insight') || line.toLowerCase().includes('finding')) {
                insights.push(line.trim());
            }
            else if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('suggest')) {
                recommendations.push(line.trim());
            }
            else if (analysisType === 'outreach' && line.toLowerCase().includes('strategy')) {
                outreachStrategy = line.trim();
            }
            else if (analysisType === 'qualification' && line.includes('score:')) {
                const score = parseInt(line.replace(/\D/g, ''));
                if (!isNaN(score))
                    qualificationScore = score;
            }
        });
        return {
            insights: insights.slice(0, 3), // Limit to 3 insights
            recommendations: recommendations.slice(0, 3), // Limit to 3 recommendations
            outreachStrategy,
            qualificationScore,
            confidence
        };
    }
    /**
     * Close the service
     */
    async close() {
        // No explicit cleanup needed for HTTP client
        logSystemEvent('Ollama service closed', 'info');
    }
}
//# sourceMappingURL=ollama.service.js.map