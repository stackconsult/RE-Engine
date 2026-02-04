/**
 * Google Vertex AI Service
 * Integration with Google Vertex AI for AI/LLM completion services
 */
import { logSystemEvent, logError } from '../observability/logger.js';
export class VertexAIService {
    config;
    baseUrl;
    accessToken = null;
    tokenExpiry = 0;
    constructor(config) {
        this.config = config;
        this.baseUrl = `https://${config.region}-aiplatform.googleapis.com/v1`;
        // Validate configuration
        if (!config.projectId || !config.region) {
            throw new Error('Missing required Vertex AI configuration: projectId and region are required');
        }
        // Check for authentication method
        if (!config.oauthClientId && !config.apiKey) {
            throw new Error('Missing authentication: either OAuth credentials or API key required');
        }
    }
    async initialize() {
        try {
            logSystemEvent('vertex-ai-init', 'info', {
                projectId: this.config.projectId,
                region: this.config.region,
                serviceAccountEmail: this.config.serviceAccountEmail
            });
            // Authenticate using service account
            await this.authenticate();
            logSystemEvent('vertex-ai-init-success', 'info');
        }
        catch (error) {
            logError(error, 'vertex-ai-init-failed');
            throw error;
        }
    }
    async generateCompletion(request) {
        if (!this.accessToken || this.isTokenExpired()) {
            await this.authenticate();
        }
        try {
            const modelId = request.modelId || this.config.modelId || 'gemini-1.0-pro';
            const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models/${modelId}:predict`;
            const requestBody = {
                instances: [
                    {
                        content: request.prompt
                    }
                ],
                parameters: {
                    temperature: request.temperature || 0.7,
                    maxOutputTokens: request.maxTokens || 1024,
                    topP: request.topP || 0.9,
                    topK: request.topK || 40,
                    stopSequences: request.stopSequences || [],
                    candidateCount: request.candidateCount || 1
                }
            };
            const response = await this.makeRequest(endpoint, requestBody);
            logSystemEvent('vertex-ai-completion', 'info', {
                modelId,
                promptLength: request.prompt.length,
                responseCandidates: response.predictions?.length || 0
            });
            return this.formatCompletionResponse(response, modelId);
        }
        catch (error) {
            logError(error, 'vertex-ai-completion-failed', {
                promptLength: request.prompt.length
            });
            throw error;
        }
    }
    async generateEmbedding(request) {
        if (!this.accessToken || this.isTokenExpired()) {
            await this.authenticate();
        }
        try {
            const modelId = request.modelId || 'textembedding-gecko';
            const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models/${modelId}:predict`;
            const requestBody = {
                instances: [
                    {
                        content: request.content
                    }
                ]
            };
            const response = await this.makeRequest(endpoint, requestBody);
            logSystemEvent('vertex-ai-embedding', 'info', {
                modelId,
                contentLength: request.content.length
            });
            return this.formatEmbeddingResponse(response, modelId);
        }
        catch (error) {
            logError(error, 'vertex-ai-embedding-failed', {
                contentLength: request.content.length
            });
            throw error;
        }
    }
    async listModels() {
        if (!this.accessToken || this.isTokenExpired()) {
            await this.authenticate();
        }
        try {
            const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models`;
            const response = await this.makeRequest(endpoint, {}, 'GET');
            const models = response.models || [];
            const modelIds = models
                .filter((model) => model.supportedGenerationMethods?.includes('generateText'))
                .map((model) => model.name.split('/').pop());
            logSystemEvent('vertex-ai-list-models', 'info', {
                modelCount: modelIds.length
            });
            return modelIds;
        }
        catch (error) {
            logError(error, 'vertex-ai-list-models-failed');
            throw error;
        }
    }
    async getModelInfo(modelId) {
        if (!this.accessToken || this.isTokenExpired()) {
            await this.authenticate();
        }
        try {
            const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models/${modelId}`;
            const response = await this.makeRequest(endpoint, {}, 'GET');
            logSystemEvent('vertex-ai-model-info', 'info', { modelId });
            return response;
        }
        catch (error) {
            logError(error, 'vertex-ai-model-info-failed', { modelId });
            throw error;
        }
    }
    async authenticate() {
        try {
            // For Vertex AI, we use the API key directly in the x-goog-api-key header
            // No need for OAuth flow when using API keys
            this.accessToken = this.config.apiKey || null;
            this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour expiry
            logSystemEvent('vertex-ai-auth-success', 'info');
        }
        catch (error) {
            logError(error, 'vertex-ai-auth-failed');
            throw new Error('Failed to authenticate with Vertex AI');
        }
    }
    async makeRequest(endpoint, body = {}, method = 'POST') {
        const headers = {
            'Content-Type': 'application/json'
        };
        // Add API key header if available
        if (this.accessToken) {
            headers['x-goog-api-key'] = this.accessToken;
        }
        const options = {
            method,
            headers
        };
        if (method === 'POST' && Object.keys(body).length > 0) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
        }
        return response.json();
    }
    formatCompletionResponse(response, modelId) {
        const predictions = response.predictions || [];
        return {
            candidates: predictions.map((prediction) => ({
                content: prediction.content || prediction.text || '',
                score: prediction.score,
                safetyRatings: prediction.safetyRatings || []
            })),
            usage: {
                promptTokens: response.metadata?.tokenUsage?.promptTokens || 0,
                completionTokens: response.metadata?.tokenUsage?.completionTokens || 0,
                totalTokens: response.metadata?.tokenUsage?.totalTokens || 0
            },
            modelVersion: modelId,
            requestId: response.id || `req_${Date.now()}`
        };
    }
    formatEmbeddingResponse(response, modelId) {
        const predictions = response.predictions || [];
        const firstPrediction = predictions[0] || {};
        return {
            embeddings: {
                values: firstPrediction.embeddings?.values || [],
                statistics: {
                    tokenCount: firstPrediction.embeddings?.statistics?.tokenCount || 0,
                    truncated: firstPrediction.embeddings?.statistics?.truncated || false
                }
            },
            modelVersion: modelId,
            requestId: response.id || `req_${Date.now()}`
        };
    }
    isTokenExpired() {
        return Date.now() >= this.tokenExpiry;
    }
    // Health check method
    async healthCheck() {
        try {
            await this.listModels();
            return true;
        }
        catch (error) {
            logError(error, 'vertex-ai-health-check-failed');
            return false;
        }
    }
}
export default VertexAIService;
//# sourceMappingURL=vertex-ai.service.js.map