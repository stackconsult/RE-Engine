/**
 * AI Service Manager
 * Manages multiple AI providers (Ollama, Vertex AI) with fallback capabilities
 */
import { logSystemEvent, logError } from '../observability/logger.js';
import VertexAIService from './vertex-ai.service.js';
export class AIServiceManager {
    config;
    ollamaService;
    vertexService;
    metrics = new Map();
    currentProvider;
    lastProviderSwitch;
    constructor(config) {
        this.config = config;
        this.currentProvider = config.primaryProvider;
        // Initialize metrics
        this.initializeMetrics();
    }
    async initialize() {
        try {
            logSystemEvent('ai-service-manager-init', 'info', {
                primaryProvider: this.config.primaryProvider,
                fallbackProvider: this.config.fallbackProvider
            });
            // Initialize Ollama service if configured
            if (this.config.ollamaConfig) {
                // This would import and initialize the Ollama service
                // For now, we'll create a placeholder
                this.ollamaService = {
                    generateCompletion: async (request) => {
                        // Placeholder implementation
                        throw new Error('Ollama service not implemented');
                    },
                    generateEmbedding: async (request) => {
                        // Placeholder implementation
                        throw new Error('Ollama service not implemented');
                    },
                    healthCheck: async () => false
                };
            }
            // Initialize Vertex AI service if configured
            if (this.config.vertexConfig) {
                this.vertexService = new VertexAIService(this.config.vertexConfig);
                await this.vertexService.initialize();
            }
            // Perform initial health checks
            await this.performHealthChecks();
            logSystemEvent('ai-service-manager-init-success', 'info');
        }
        catch (error) {
            logError(error, 'ai-service-manager-init-failed');
            throw error;
        }
    }
    async generateCompletion(request) {
        const startTime = Date.now();
        let provider = this.currentProvider;
        try {
            // Try primary provider first
            const response = await this.executeWithProvider('generateCompletion', request, provider);
            // Update metrics
            this.updateMetrics(provider, true, Date.now() - startTime);
            return response;
        }
        catch (error) {
            // Update error metrics
            this.updateMetrics(provider, false, Date.now() - startTime, error.message);
            // Try fallback if enabled and available
            if (this.config.enableFallback && this.config.fallbackProvider && this.config.fallbackProvider !== provider) {
                logSystemEvent('ai-service-fallback', 'warn', {
                    fromProvider: provider,
                    toProvider: this.config.fallbackProvider,
                    error: error.message
                });
                try {
                    const fallbackResponse = await this.executeWithProvider('generateCompletion', request, this.config.fallbackProvider);
                    // Update metrics for fallback provider
                    this.updateMetrics(this.config.fallbackProvider, true, Date.now() - startTime);
                    // Consider switching primary provider if error rate is high
                    this.considerProviderSwitch();
                    return fallbackResponse;
                }
                catch (fallbackError) {
                    // Update error metrics for fallback provider
                    this.updateMetrics(this.config.fallbackProvider, false, Date.now() - startTime, fallbackError.message);
                    logError(fallbackError, 'ai-service-fallback-failed', {
                        primaryProvider: provider,
                        fallbackProvider: this.config.fallbackProvider
                    });
                    throw new Error(`All AI providers failed. Primary: ${error.message}, Fallback: ${fallbackError.message}`);
                }
            }
            throw error;
        }
    }
    async generateEmbedding(request) {
        const startTime = Date.now();
        let provider = this.currentProvider;
        try {
            const response = await this.executeWithProvider('generateEmbedding', request, provider);
            this.updateMetrics(provider, true, Date.now() - startTime);
            return response;
        }
        catch (error) {
            this.updateMetrics(provider, false, Date.now() - startTime, error.message);
            if (this.config.enableFallback && this.config.fallbackProvider && this.config.fallbackProvider !== provider) {
                logSystemEvent('ai-service-fallback-embedding', 'warn', {
                    fromProvider: provider,
                    toProvider: this.config.fallbackProvider
                });
                try {
                    const fallbackResponse = await this.executeWithProvider('generateEmbedding', request, this.config.fallbackProvider);
                    this.updateMetrics(this.config.fallbackProvider, true, Date.now() - startTime);
                    this.considerProviderSwitch();
                    return fallbackResponse;
                }
                catch (fallbackError) {
                    this.updateMetrics(this.config.fallbackProvider, false, Date.now() - startTime, fallbackError.message);
                    throw new Error(`All AI providers failed for embedding. Primary: ${error.message}, Fallback: ${fallbackError.message}`);
                }
            }
            throw error;
        }
    }
    async healthCheck() {
        const results = [];
        for (const [provider] of this.metrics) {
            try {
                const healthy = await this.executeWithProvider('healthCheck', {}, provider);
                results.push({ provider, healthy });
            }
            catch (error) {
                results.push({ provider, healthy: false });
            }
        }
        return results;
    }
    getMetrics() {
        return new Map(this.metrics);
    }
    getCurrentProvider() {
        return this.currentProvider;
    }
    switchProvider(provider) {
        if (this.metrics.has(provider)) {
            const previousProvider = this.currentProvider;
            this.currentProvider = provider;
            this.lastProviderSwitch = new Date();
            logSystemEvent('ai-service-provider-switch', 'info', {
                from: previousProvider,
                to: provider
            });
        }
        else {
            throw new Error(`Provider ${provider} is not available`);
        }
    }
    async executeWithProvider(method, request, provider) {
        switch (provider) {
            case 'ollama':
                if (!this.ollamaService) {
                    throw new Error('Ollama service not initialized');
                }
                if (method === 'generateCompletion') {
                    return await this.ollamaService.generateCompletion(request);
                }
                else if (method === 'generateEmbedding') {
                    return await this.ollamaService.generateEmbedding(request);
                }
                else {
                    return await this.ollamaService.healthCheck();
                }
            case 'vertex-ai':
                if (!this.vertexService) {
                    throw new Error('Vertex AI service not initialized');
                }
                if (method === 'generateCompletion') {
                    return await this.vertexService.generateCompletion(request);
                }
                else if (method === 'generateEmbedding') {
                    return await this.vertexService.generateEmbedding(request);
                }
                else {
                    return await this.vertexService.healthCheck();
                }
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }
    initializeMetrics() {
        const providers = ['ollama', 'vertex-ai'];
        providers.forEach(provider => {
            this.metrics.set(provider, {
                provider,
                requestCount: 0,
                successCount: 0,
                errorCount: 0,
                averageResponseTime: 0
            });
        });
    }
    updateMetrics(provider, success, responseTime, error) {
        const metrics = this.metrics.get(provider);
        if (!metrics)
            return;
        metrics.requestCount++;
        if (success) {
            metrics.successCount++;
        }
        else {
            metrics.errorCount++;
            metrics.lastError = error;
            metrics.lastErrorTime = new Date();
        }
        // Update average response time
        const totalRequests = metrics.requestCount;
        metrics.averageResponseTime =
            (metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
    async performHealthChecks() {
        const healthResults = await this.healthCheck();
        healthResults.forEach(({ provider, healthy }) => {
            logSystemEvent('ai-service-health-check', 'info', { provider, healthy });
            if (!healthy && provider === this.currentProvider && this.config.enableFallback) {
                // Switch to fallback provider if current provider is unhealthy
                const availableProviders = healthResults
                    .filter(r => r.healthy)
                    .map(r => r.provider);
                if (availableProviders.length > 0) {
                    this.switchProvider(availableProviders[0]);
                }
            }
        });
    }
    considerProviderSwitch() {
        const currentMetrics = this.metrics.get(this.currentProvider);
        if (!currentMetrics || !this.config.fallbackProvider)
            return;
        const errorRate = currentMetrics.errorCount / currentMetrics.requestCount;
        if (errorRate > this.config.fallbackThreshold &&
            (!this.lastProviderSwitch ||
                Date.now() - this.lastProviderSwitch.getTime() > 300000)) { // 5 minutes cooldown
            const fallbackMetrics = this.metrics.get(this.config.fallbackProvider);
            if (fallbackMetrics && fallbackMetrics.requestCount > 0) {
                const fallbackErrorRate = fallbackMetrics.errorCount / fallbackMetrics.requestCount;
                if (fallbackErrorRate < errorRate) {
                    this.switchProvider(this.config.fallbackProvider);
                }
            }
        }
    }
}
export default AIServiceManager;
//# sourceMappingURL=ai-service-manager.js.map