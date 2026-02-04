/**
 * Ollama AI Service Integration
 * High-level service for AI operations within RE Engine
 * Supports both direct Ollama access and LiteLLM proxy for Claude Code compatibility
 */
import { OllamaClient } from './ollama.client.js';
import { LiteLLMProxyService } from '../ai/litellm-proxy.service.js';
import { logError, logSystemEvent } from '../observability/logger.js';
export class OllamaService {
    client;
    proxyService;
    config;
    defaultModel;
    useProxy;
    constructor(config) {
        this.config = {
            useProxy: false,
            defaultModel: 'qwen:7b',
            fallbackToDirect: true,
            ...config
        };
        this.useProxy = this.config.useProxy;
        this.defaultModel = this.config.defaultModel;
        // Initialize direct client
        if (this.config.directConfig) {
            this.client = new OllamaClient(this.config.directConfig);
        }
        // Initialize proxy service
        if (this.config.useProxy && this.config.proxyConfig) {
            this.proxyService = new LiteLLMProxyService(this.config.proxyConfig);
        }
    }
    async initialize() {
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
        }
        catch (error) {
            logError(error, 'ollama-service-init-failed');
            throw error;
        }
    }
    async embed(request) {
        try {
            const startTime = Date.now();
            if (this.useProxy && this.proxyService) {
                return await this.embedViaProxy(request);
            }
            else if (this.client) {
                return await this.embedDirectly(request);
            }
            else {
                throw new Error('No available embedding provider');
            }
        }
        catch (error) {
            logError(error, 'ollama-embed-failed');
            throw error;
        }
    }
    async embedViaProxy(request) {
        if (!this.proxyService) {
            throw new Error('Proxy service not initialized');
        }
        const response = await fetch(`${this.config.proxyConfig?.proxyUrl || 'http://localhost:4000'}/v1/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.proxyConfig?.masterKey}`
            },
            body: JSON.stringify({
                model: request.model,
                input: request.prompt
            })
        });
        if (!response.ok) {
            throw new Error(`Embedding request failed: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data[0].embedding;
    }
    async embedDirectly(request) {
        if (!this.client) {
            throw new Error('Direct client not initialized');
        }
        return await this.client?.generateEmbeddings(request.prompt, request.model) || [];
    }
    async generateCompletion(request) {
        const startTime = Date.now();
        try {
            logSystemEvent('ollama-completion-start', 'info', {
                model: request.model || this.defaultModel,
                useProxy: this.useProxy,
                claudeModel: request.claudeModel
            });
            let response;
            if (this.useProxy && this.proxyService) {
                response = await this.generateViaProxy(request);
            }
            else {
                response = await this.generateDirectly(request);
            }
            response.processingTime = Date.now() - startTime;
            logSystemEvent('ollama-completion-success', 'info', {
                model: response.model || this.defaultModel,
                provider: response.provider,
                processingTime: response.processingTime,
                tokensUsed: response.tokensUsed
            });
            return response;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logError(error, 'ollama-completion-failed', {
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
                error: error.message,
                provider: this.useProxy ? 'proxy' : 'direct'
            };
        }
    }
    async generateViaProxy(request) {
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
        const response = await fetch(`${this.config.proxyConfig?.proxyUrl || 'http://localhost:4000'}/v1/messages`, {
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
    async generateDirectly(request) {
        if (!this.client) {
            throw new Error('Direct Ollama client not initialized');
        }
        const ollamaRequest = {
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
    async analyzeLead(request) {
        const prompt = this.buildLeadAnalysisPrompt(request);
        const aiRequest = {
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
    async healthCheck() {
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
        }
        catch (error) {
            logError(error, 'ollama-health-check-failed');
            return false;
        }
    }
    async listAvailableModels() {
        try {
            if (this.useProxy && this.proxyService) {
                return await this.proxyService.listAvailableModels();
            }
            if (this.client) {
                const models = await this.client.listModels();
                return models.map(model => model.name);
            }
            return [];
        }
        catch (error) {
            logError(error, 'ollama-list-models-failed');
            return [];
        }
    }
    async switchProvider(useProxy) {
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
    getStatus() {
        return {
            useProxy: this.useProxy,
            proxyStatus: this.proxyService?.getStatus(),
            directHealthy: this.client ? true : undefined,
            availableModels: [] // Will be populated asynchronously
        };
    }
    buildLeadAnalysisPrompt(request) {
        const { leadData, analysisType } = request;
        let prompt = `Analyze the following lead data for ${analysisType}:\n\n`;
        if (leadData.company)
            prompt += `Company: ${leadData.company}\n`;
        if (leadData.domain)
            prompt += `Domain: ${leadData.domain}\n`;
        if (leadData.industry)
            prompt += `Industry: ${leadData.industry}\n`;
        if (leadData.size)
            prompt += `Size: ${leadData.size}\n`;
        if (leadData.location)
            prompt += `Location: ${leadData.location}\n`;
        if (leadData.description)
            prompt += `Description: ${leadData.description}\n`;
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
    parseLeadAnalysisResponse(content, model, processingTime) {
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
    extractScore(content) {
        const scoreMatch = content.match(/(\d+)\/10|score[^\d]*(\d+)/i);
        if (scoreMatch) {
            return Math.min(10, Math.max(1, parseInt(scoreMatch[1] || scoreMatch[2])));
        }
        return 5; // Default middle score
    }
    async cleanup() {
        if (this.proxyService) {
            await this.proxyService.cleanup();
        }
    }
}
//# sourceMappingURL=ollama.service.js.map