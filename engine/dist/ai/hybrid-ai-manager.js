/**
 * Hybrid AI Manager - Advanced Multi-Model AI Orchestration
 *
 * This system provides:
 * 1. Unified interface for both Ollama and Vertex AI models
 * 2. Intelligent model selection and routing
 * 3. Ensemble/prediction combination capabilities
 * 4. Fallback and redundancy mechanisms
 * 5. Performance monitoring and optimization
 */
import { OllamaService } from '../ollama/index.js';
import { VertexAIService } from './vertex-ai.service.js';
import { ClaudeVertexService } from './claude-vertex.service.js';
import { AIServiceManager } from './ai-service-manager.js';
import { logSystemEvent } from '../observability/logger.js';
import { ErrorHandler } from '../util/error-handler.js';
export class HybridAIManager {
    ollamaService;
    vertexService;
    claudeService;
    aiManager;
    modelRegistry = new Map();
    performanceMetrics = new Map();
    constructor() {
        this.ollamaService = new OllamaService();
        this.vertexService = new VertexAIService();
        this.claudeService = new ClaudeVertexService();
        this.aiManager = new AIServiceManager();
        this.initializeModelRegistry();
        this.initializePerformanceTracking();
    }
    /**
     * Initialize the model registry with all available models
     */
    initializeModelRegistry() {
        // Ollama Models
        const ollamaModels = [
            {
                provider: 'ollama',
                modelId: 'qwen:7b',
                capabilities: ['completion', 'chat', 'analysis'],
                maxTokens: 2048,
                priority: 1,
                costPerToken: 0.0001,
                latency: 500,
                reliability: 0.95
            },
            {
                provider: 'ollama',
                modelId: 'llama2:7b',
                capabilities: ['completion', 'chat', 'creative'],
                maxTokens: 4096,
                priority: 2,
                costPerToken: 0.0001,
                latency: 600,
                reliability: 0.93
            },
            {
                provider: 'ollama',
                modelId: 'codellama:7b',
                capabilities: ['completion', 'analysis', 'code'],
                maxTokens: 2048,
                priority: 3,
                costPerToken: 0.0001,
                latency: 700,
                reliability: 0.92
            }
        ];
        // Vertex AI Models
        const vertexModels = [
            {
                provider: 'vertex',
                modelId: 'text-bison',
                capabilities: ['completion', 'analysis'],
                maxTokens: 1024,
                priority: 1,
                costPerToken: 0.0005,
                latency: 300,
                reliability: 0.99
            },
            {
                provider: 'vertex',
                modelId: 'textembedding-gecko',
                capabilities: ['embedding'],
                maxTokens: 8192,
                priority: 1,
                costPerToken: 0.0001,
                latency: 200,
                reliability: 0.99
            }
        ];
        // Claude on Vertex AI Models
        const claudeModels = [
            {
                provider: 'claude-vertex',
                modelId: 'claude-sonnet-4-5@20250929',
                capabilities: ['completion', 'chat', 'analysis', 'creative'],
                maxTokens: 4096,
                priority: 1,
                costPerToken: 0.003,
                latency: 400,
                reliability: 0.98
            }
        ];
        // Register all models
        [...ollamaModels, ...vertexModels, ...claudeModels].forEach(model => {
            this.modelRegistry.set(`${model.provider}:${model.modelId}`, model);
        });
        logSystemEvent('Hybrid AI Manager initialized', 'info', {
            totalModels: this.modelRegistry.size,
            ollamaModels: ollamaModels.length,
            vertexModels: vertexModels.length,
            claudeModels: claudeModels.length
        });
    }
    /**
     * Initialize performance tracking
     */
    initializePerformanceTracking() {
        // Initialize performance metrics for each model
        this.modelRegistry.forEach((config, key) => {
            this.performanceMetrics.set(key, {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageLatency: 0,
                totalCost: 0,
                lastUsed: null,
                uptime: 0
            });
        });
    }
    /**
     * Main entry point for AI requests
     */
    async processRequest(request) {
        const startTime = Date.now();
        try {
            logSystemEvent('Hybrid AI request started', 'info', {
                taskType: request.taskType,
                strategy: request.strategy,
                preferredProvider: request.preferredProvider
            });
            let response;
            switch (request.strategy) {
                case 'single':
                    response = await this.handleSingleModel(request);
                    break;
                case 'ensemble':
                    response = await this.handleEnsemble(request);
                    break;
                case 'fallback':
                    response = await this.handleFallback(request);
                    break;
                case 'load-balance':
                    response = await this.handleLoadBalance(request);
                    break;
                default:
                    throw new Error(`Unknown strategy: ${request.strategy}`);
            }
            // Update performance metrics
            this.updatePerformanceMetrics(response.provider, response.modelId, response.latency, response.cost, true);
            const totalLatency = Date.now() - startTime;
            logSystemEvent('Hybrid AI request completed', 'info', {
                provider: response.provider,
                modelId: response.modelId,
                strategy: response.strategy,
                latency: totalLatency,
                confidence: response.confidence
            });
            return response;
        }
        catch (error) {
            const normalizedError = ErrorHandler.normalizeError(error);
            logSystemEvent('Hybrid AI request failed', 'error', {
                error: normalizedError.message,
                strategy: request.strategy,
                taskType: request.taskType
            });
            throw normalizedError;
        }
    }
    /**
     * Handle single model requests
     */
    async handleSingleModel(request) {
        const selectedModel = this.selectBestModel(request);
        const result = await this.executeModelRequest(selectedModel, request);
        return {
            result: result.content,
            provider: selectedModel.provider,
            modelId: selectedModel.modelId,
            confidence: result.confidence || 0.8,
            latency: result.latency,
            cost: result.cost || 0,
            metadata: {
                strategy: 'single',
                performance: {
                    accuracy: result.confidence || 0.8,
                    speed: result.latency,
                    efficiency: result.cost || 0
                }
            }
        };
    }
    /**
     * Handle ensemble requests (multiple models combined)
     */
    async handleEnsemble(request) {
        const selectedModels = this.selectEnsembleModels(request);
        const promises = selectedModels.map(model => this.executeModelRequest(model, request));
        const results = await Promise.allSettled(promises);
        const successfulResults = results
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
        if (successfulResults.length === 0) {
            throw new Error('All models failed in ensemble');
        }
        // Combine results based on task type
        const combinedResult = this.combineResults(successfulResults, request.taskType);
        return {
            result: combinedResult.content,
            provider: 'ensemble',
            modelId: selectedModels.map(m => m.modelId).join('+'),
            confidence: combinedResult.confidence,
            latency: Math.max(...successfulResults.map(r => r.latency)),
            cost: successfulResults.reduce((sum, r) => sum + (r.cost || 0), 0),
            metadata: {
                strategy: 'ensemble',
                allResults: successfulResults,
                performance: {
                    accuracy: combinedResult.confidence,
                    speed: Math.max(...successfulResults.map(r => r.latency)),
                    efficiency: successfulResults.reduce((sum, r) => sum + (r.cost || 0), 0),
                    diversity: successfulResults.length / selectedModels.length
                }
            }
        };
    }
    /**
     * Handle fallback requests (try preferred, then fallback)
     */
    async handleFallback(request) {
        const fallbackChain = this.buildFallbackChain(request);
        let lastError = null;
        for (const model of fallbackChain) {
            try {
                const result = await this.executeModelRequest(model, request);
                return {
                    result: result.content,
                    provider: model.provider,
                    modelId: model.modelId,
                    confidence: result.confidence || 0.8,
                    latency: result.latency,
                    cost: result.cost || 0,
                    metadata: {
                        strategy: 'fallback',
                        fallbacks: lastError ? [lastError.message] : [],
                        performance: {
                            accuracy: result.confidence || 0.8,
                            speed: result.latency,
                            efficiency: result.cost || 0
                        }
                    }
                };
            }
            catch (error) {
                lastError = error;
                this.updatePerformanceMetrics(model.provider, model.modelId, 0, 0, false);
                continue;
            }
        }
        throw lastError || new Error('All fallback models failed');
    }
    /**
     * Handle load-balanced requests
     */
    async handleLoadBalance(request) {
        const selectedModel = this.selectLoadBalancedModel(request);
        const result = await this.executeModelRequest(selectedModel, request);
        return {
            result: result.content,
            provider: selectedModel.provider,
            modelId: selectedModel.modelId,
            confidence: result.confidence || 0.8,
            latency: result.latency,
            cost: result.cost || 0,
            metadata: {
                strategy: 'load-balance',
                performance: {
                    accuracy: result.confidence || 0.8,
                    speed: result.latency,
                    efficiency: result.cost || 0
                }
            }
        };
    }
    /**
     * Select the best model for a given request
     */
    selectBestModel(request) {
        const candidates = Array.from(this.modelRegistry.values())
            .filter(model => model.capabilities.includes(request.taskType));
        if (request.preferredProvider) {
            const preferredCandidates = candidates.filter(m => m.provider === request.preferredProvider);
            if (preferredCandidates.length > 0) {
                return this.rankModels(preferredCandidates, request)[0];
            }
        }
        if (request.modelPreferences && request.modelPreferences.length > 0) {
            const preferredModels = request.modelPreferences.filter(pref => candidates.some(c => c.provider === pref.provider && c.modelId === pref.modelId));
            if (preferredModels.length > 0) {
                return preferredModels[0];
            }
        }
        return this.rankModels(candidates, request)[0];
    }
    /**
     * Select multiple models for ensemble
     */
    selectEnsembleModels(request) {
        const candidates = Array.from(this.modelRegistry.values())
            .filter(model => model.capabilities.includes(request.taskType));
        // Select top 3 models for ensemble
        return this.rankModels(candidates, request).slice(0, 3);
    }
    /**
     * Build fallback chain
     */
    buildFallbackChain(request) {
        const candidates = Array.from(this.modelRegistry.values())
            .filter(model => model.capabilities.includes(request.taskType));
        const ranked = this.rankModels(candidates, request);
        // If preferred provider is specified, put it first
        if (request.preferredProvider) {
            const preferred = ranked.filter(m => m.provider === request.preferredProvider);
            const others = ranked.filter(m => m.provider !== request.preferredProvider);
            return [...preferred, ...others];
        }
        return ranked;
    }
    /**
     * Select load-balanced model
     */
    selectLoadBalancedModel(request) {
        const candidates = Array.from(this.modelRegistry.values())
            .filter(model => model.capabilities.includes(request.taskType));
        // Select model with lowest current load
        return candidates.reduce((best, current) => {
            const bestMetrics = this.performanceMetrics.get(`${best.provider}:${best.modelId}`);
            const currentMetrics = this.performanceMetrics.get(`${current.provider}:${current.modelId}`);
            const bestLoad = bestMetrics?.totalRequests || 0;
            const currentLoad = currentMetrics?.totalRequests || 0;
            return currentLoad < bestLoad ? current : best;
        });
    }
    /**
     * Rank models by suitability
     */
    rankModels(models, request) {
        return models.sort((a, b) => {
            // Calculate score based on multiple factors
            const scoreA = this.calculateModelScore(a, request);
            const scoreB = this.calculateModelScore(b, request);
            return scoreB - scoreA;
        });
    }
    /**
     * Calculate model suitability score
     */
    calculateModelScore(model, request) {
        const metrics = this.performanceMetrics.get(`${model.provider}:${model.modelId}`);
        let score = 0;
        // Base priority score
        score += model.priority || 1;
        // Reliability score
        score += (model.reliability || 0.9) * 10;
        // Performance score
        if (metrics) {
            const successRate = metrics.totalRequests > 0
                ? metrics.successfulRequests / metrics.totalRequests
                : model.reliability || 0.9;
            score += successRate * 5;
            // Latency penalty (lower is better)
            score += Math.max(0, 5 - (model.latency || 500) / 200);
        }
        // Cost penalty (lower is better)
        score += Math.max(0, 3 - (model.costPerToken || 0.001) * 1000);
        // Provider preference
        if (request.preferredProvider === model.provider) {
            score += 10;
        }
        return score;
    }
    /**
     * Execute request on specific model
     */
    async executeModelRequest(model, request) {
        const startTime = Date.now();
        try {
            let result;
            switch (model.provider) {
                case 'ollama':
                    result = await this.executeOllamaRequest(model, request);
                    break;
                case 'vertex':
                    result = await this.executeVertexRequest(model, request);
                    break;
                case 'claude-vertex':
                    result = await this.executeClaudeRequest(model, request);
                    break;
                default:
                    throw new Error(`Unknown provider: ${model.provider}`);
            }
            const latency = Date.now() - startTime;
            return {
                ...result,
                latency,
                cost: this.calculateCost(model, result)
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.updatePerformanceMetrics(model.provider, model.modelId, latency, 0, false);
            throw error;
        }
    }
    /**
     * Execute Ollama request
     */
    async executeOllamaRequest(model, request) {
        switch (request.taskType) {
            case 'completion':
            case 'chat':
                return await this.ollamaService.generateCompletion({
                    prompt: request.prompt,
                    model: model.modelId,
                    maxTokens: model.maxTokens,
                    temperature: model.temperature
                });
            case 'embedding':
                return await this.ollamaService.generateEmbedding({
                    content: request.prompt,
                    model: model.modelId
                });
            default:
                throw new Error(`Ollama does not support task type: ${request.taskType}`);
        }
    }
    /**
     * Execute Vertex AI request
     */
    async executeVertexRequest(model, request) {
        switch (request.taskType) {
            case 'completion':
            case 'chat':
                return await this.vertexService.generateCompletion({
                    prompt: request.prompt,
                    model: model.modelId,
                    maxTokens: model.maxTokens,
                    temperature: model.temperature
                });
            case 'embedding':
                return await this.vertexService.generateEmbedding({
                    content: request.prompt,
                    model: model.modelId
                });
            default:
                throw new Error(`Vertex AI does not support task type: ${request.taskType}`);
        }
    }
    /**
     * Execute Claude on Vertex AI request
     */
    async executeClaudeRequest(model, request) {
        switch (request.taskType) {
            case 'completion':
            case 'chat':
            case 'creative':
                return await this.claudeService.generateCompletion({
                    prompt: request.prompt,
                    model: model.modelId,
                    maxTokens: model.maxTokens,
                    temperature: model.temperature
                });
            default:
                throw new Error(`Claude Vertex does not support task type: ${request.taskType}`);
        }
    }
    /**
     * Combine results from multiple models
     */
    combineResults(results, taskType) {
        switch (taskType) {
            case 'completion':
            case 'chat':
            case 'creative':
                return this.combineTextResults(results);
            case 'embedding':
                return this.combineEmbeddingResults(results);
            case 'analysis':
                return this.combineAnalysisResults(results);
            default:
                return results[0]; // Fallback to first result
        }
    }
    /**
     * Combine text generation results
     */
    combineTextResults(results) {
        // Use voting or averaging for text results
        const contents = results.map(r => r.content || r.text);
        // Simple implementation: return the highest confidence result
        const bestResult = results.reduce((best, current) => (current.confidence || 0.8) > (best.confidence || 0.8) ? current : best);
        return {
            content: bestResult.content || bestResult.text,
            confidence: bestResult.confidence || 0.8,
            method: 'best-confidence'
        };
    }
    /**
     * Combine embedding results
     */
    combineEmbeddingResults(results) {
        // Average the embeddings
        const embeddings = results.map(r => r.embeddings || r.values);
        const dimension = embeddings[0].length;
        const averaged = new Array(dimension).fill(0);
        embeddings.forEach(embedding => {
            embedding.forEach((value, i) => {
                averaged[i] += value;
            });
        });
        return {
            embeddings: {
                values: averaged.map(v => v / embeddings.length),
                statistics: {
                    tokenCount: Math.max(...results.map(r => r.embeddings?.statistics?.tokenCount || 0))
                }
            },
            confidence: 0.9,
            method: 'averaging'
        };
    }
    /**
     * Combine analysis results
     */
    combineAnalysisResults(results) {
        // For analysis, combine insights from multiple models
        const insights = results.map(r => r.content || r.text).filter(Boolean);
        return {
            content: insights.join('\n\n--- Additional Analysis ---\n\n'),
            confidence: Math.min(...results.map(r => r.confidence || 0.8)),
            method: 'insight-combination'
        };
    }
    /**
     * Calculate cost for a request
     */
    calculateCost(model, result) {
        const costPerToken = model.costPerToken || 0.001;
        const tokens = this.estimateTokens(result);
        return tokens * costPerToken;
    }
    /**
     * Estimate token count
     */
    estimateTokens(result) {
        if (result.usage?.totalTokens) {
            return result.usage.totalTokens;
        }
        // Rough estimation: 1 token ≈ 4 characters
        const text = result.content || result.text || '';
        return Math.ceil(text.length / 4);
    }
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(provider, modelId, latency, cost, success) {
        const key = `${provider}:${modelId}`;
        const metrics = this.performanceMetrics.get(key);
        if (metrics) {
            metrics.totalRequests++;
            if (success) {
                metrics.successfulRequests++;
            }
            else {
                metrics.failedRequests++;
            }
            // Update average latency
            metrics.averageLatency = (metrics.averageLatency * (metrics.totalRequests - 1) + latency) / metrics.totalRequests;
            metrics.totalCost += cost;
            metrics.lastUsed = new Date();
        }
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const result = {};
        this.performanceMetrics.forEach((metrics, key) => {
            result[key] = {
                ...metrics,
                successRate: metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0,
                averageCostPerRequest: metrics.totalRequests > 0 ? metrics.totalCost / metrics.totalRequests : 0
            };
        });
        return result;
    }
    /**
     * Get available models
     */
    getAvailableModels() {
        return Array.from(this.modelRegistry.values());
    }
    /**
     * Health check for all services
     */
    async healthCheck() {
        const results = {};
        try {
            results.ollama = await this.ollamaService.healthCheck();
        }
        catch (error) {
            results.ollama = false;
        }
        try {
            results.vertex = await this.vertexService.healthCheck();
        }
        catch (error) {
            results.vertex = false;
        }
        try {
            results.claude = await this.claudeService.healthCheck();
        }
        catch (error) {
            results.claude = false;
        }
        return results;
    }
}
//# sourceMappingURL=hybrid-ai-manager.js.map