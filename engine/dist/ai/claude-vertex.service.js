/**
 * Claude on Vertex AI Service
 * Integration with Anthropic Claude models through Google Vertex AI
 * Uses OAuth 2.0 authentication for secure desktop app deployment
 */
import { logger, logSystemEvent, logError } from '../observability/logger.js';
export class ClaudeVertexService {
    config;
    accessToken = null;
    tokenExpiry = 0;
    anthropicClient = null;
    constructor(config) {
        this.config = config;
        // Validate configuration
        if (!config.projectId || !config.region) {
            throw new Error('Missing required Claude Vertex AI configuration: projectId and region are required');
        }
        if (!config.oauthClientId || !config.oauthClientSecret) {
            throw new Error('Missing OAuth credentials: oauthClientId and oauthClientSecret are required');
        }
    }
    async initialize() {
        try {
            logSystemEvent('claude-vertex-init', 'info', {
                projectId: this.config.projectId,
                region: this.config.region,
                modelId: this.config.modelId || 'claude-sonnet-4-5@20250929'
            });
            // Authenticate with OAuth 2.0
            await this.authenticate();
            // Initialize Anthropic Vertex client
            await this.initializeAnthropicClient();
            logSystemEvent('claude-vertex-init-success', 'info');
        }
        catch (error) {
            logError(error, 'claude-vertex-init-failed');
            throw error;
        }
    }
    async authenticate() {
        try {
            // For desktop apps, use application default credentials or service account
            const { GoogleAuth } = await import('google-auth-library');
            const auth = new GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            // Get access token using application default credentials
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            this.accessToken = tokenResponse.token || null;
            this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour expiry
            logSystemEvent('claude-vertex-oauth-auth-success', 'info');
        }
        catch (error) {
            logError(error, 'claude-vertex-oauth-auth-failed');
            throw new Error('Authentication failed. Please ensure you have run `gcloud auth application-default login` or have proper service account credentials configured.');
        }
    }
    async initializeAnthropicClient() {
        try {
            // Import Anthropic Vertex SDK dynamically
            const { AnthropicVertex } = await import('@anthropic-ai/vertex-sdk');
            this.anthropicClient = new AnthropicVertex({
                projectId: this.config.projectId,
                region: this.config.region,
                // The SDK will handle OAuth authentication automatically
                // We can pass custom auth if needed
            });
            logSystemEvent('claude-vertex-client-init-success', 'info');
        }
        catch (error) {
            logError(error, 'claude-vertex-client-init-failed');
            // Fallback to manual API calls if SDK is not available
            logger.warn('Anthropic Vertex SDK not available, using manual API calls');
            this.anthropicClient = null;
        }
    }
    isTokenExpired() {
        return Date.now() >= this.tokenExpiry;
    }
    async ensureAuthenticated() {
        if (!this.accessToken || this.isTokenExpired()) {
            await this.authenticate();
            if (this.anthropicClient) {
                await this.initializeAnthropicClient();
            }
        }
    }
    async generateCompletion(request) {
        await this.ensureAuthenticated();
        try {
            const model = request.model || this.config.modelId || 'claude-sonnet-4-5@20250929';
            logSystemEvent('claude-vertex-completion-start', 'info', {
                model,
                messageCount: request.messages.length,
                maxTokens: request.maxTokens || this.config.maxTokens || 1024
            });
            let response;
            if (this.anthropicClient) {
                // Use Anthropic Vertex SDK
                response = await this.generateCompletionWithSDK(request, model);
            }
            else {
                // Use manual API calls
                response = await this.generateCompletionManual(request, model);
            }
            logSystemEvent('claude-vertex-completion-success', 'info', {
                model,
                inputTokens: response.usage.inputTokens,
                outputTokens: response.usage.outputTokens,
                stopReason: response.stopReason
            });
            return response;
        }
        catch (error) {
            logError(error, 'claude-vertex-completion-failed', {
                model: request.model || this.config.modelId
            });
            throw error;
        }
    }
    async generateCompletionWithSDK(request, model) {
        const result = await this.anthropicClient.messages.create({
            model,
            max_tokens: request.maxTokens || this.config.maxTokens || 1024,
            temperature: request.temperature ?? this.config.temperature ?? 0.7,
            messages: request.messages,
            stop_sequences: request.stopSequences,
            stream: false
        });
        // Transform SDK response to our interface
        return {
            id: result.id,
            type: result.type,
            role: result.role,
            content: result.content,
            model: result.model,
            stopReason: result.stop_reason,
            usage: {
                inputTokens: result.usage.input_tokens,
                outputTokens: result.usage.output_tokens
            }
        };
    }
    async generateCompletionManual(request, model) {
        // Manual API call to Vertex AI for Claude
        const endpoint = `https://${this.config.region}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/publishers/anthropic/models/${model}:streamRawPredict`;
        const requestBody = {
            anthropic_version: 'vertex-2023-10-16',
            messages: request.messages,
            max_tokens: request.maxTokens || this.config.maxTokens || 1024,
            temperature: request.temperature ?? this.config.temperature ?? 0.7,
            top_p: request.topP,
            top_k: request.topK,
            stop_sequences: request.stopSequences,
            stream: false
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude Vertex AI API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        // Transform response to our interface
        return {
            id: result.id,
            type: result.type,
            role: result.role,
            content: result.content,
            model: result.model,
            stopReason: result.stop_reason,
            usage: {
                inputTokens: result.usage.input_tokens,
                outputTokens: result.usage.output_tokens
            }
        };
    }
    async countTokens(request) {
        await this.ensureAuthenticated();
        try {
            const model = request.model || this.config.modelId || 'claude-sonnet-4-5@20250929';
            logSystemEvent('claude-vertex-token-count-start', 'info', {
                model,
                messageCount: request.messages.length
            });
            if (this.anthropicClient) {
                // Use Anthropic Vertex SDK
                const result = await this.anthropicClient.messages.countTokens({
                    model,
                    messages: request.messages
                });
                logSystemEvent('claude-vertex-token-count-success', 'info', {
                    model,
                    inputTokens: result.input_tokens
                });
                return {
                    inputTokens: result.input_tokens
                };
            }
            else {
                // Manual token counting (approximation)
                // In a real implementation, you'd use the token counting API
                const text = request.messages.map(m => typeof m.content === 'string' ? m.content :
                    m.content.filter(c => c.type === 'text').map(c => c.text).join(' ')).join(' ');
                const approximateTokens = Math.ceil(text.length / 4); // Rough approximation
                logSystemEvent('claude-vertex-token-count-success', 'info', {
                    model,
                    inputTokens: approximateTokens,
                    method: 'approximation'
                });
                return {
                    inputTokens: approximateTokens
                };
            }
        }
        catch (error) {
            logError(error, 'claude-vertex-token-count-failed', {
                model: request.model || this.config.modelId
            });
            throw error;
        }
    }
    async healthCheck() {
        try {
            await this.ensureAuthenticated();
            // Simple health check - try to count tokens for a short message
            await this.countTokens({
                messages: [{ role: 'user', content: 'Hello' }]
            });
            return true;
        }
        catch (error) {
            logError(error, 'claude-vertex-health-check-failed');
            return false;
        }
    }
    async listAvailableModels() {
        // Claude models available on Vertex AI
        return [
            'claude-sonnet-4-5@20250929',
            'claude-sonnet-4@20250514',
            'claude-3-7-sonnet@20250219',
            'claude-opus-4-5@20251101',
            'claude-opus-4-1@20250805',
            'claude-opus-4@20250514',
            'claude-haiku-4-5@20251001',
            'claude-3-5-haiku@20241022',
            'claude-3-haiku@20240307'
        ];
    }
    getModelInfo(modelId) {
        const modelInfo = {
            'claude-sonnet-4-5@20250929': {
                name: 'Claude Sonnet 4.5',
                description: 'Most capable model for complex tasks',
                contextWindow: 200000,
                inputPrice: 0.015, // per 1K tokens
                outputPrice: 0.075 // per 1K tokens
            },
            'claude-sonnet-4@20250514': {
                name: 'Claude Sonnet 4',
                description: 'Balanced model for most tasks',
                contextWindow: 200000,
                inputPrice: 0.015,
                outputPrice: 0.075
            },
            'claude-3-7-sonnet@20250219': {
                name: 'Claude Sonnet 3.7',
                description: 'Previous generation capable model',
                contextWindow: 200000,
                inputPrice: 0.003,
                outputPrice: 0.015
            },
            'claude-opus-4-5@20251101': {
                name: 'Claude Opus 4.5',
                description: 'Most powerful model for complex reasoning',
                contextWindow: 200000,
                inputPrice: 0.075,
                outputPrice: 0.375
            },
            'claude-opus-4-1@20250805': {
                name: 'Claude Opus 4.1',
                description: 'High-performance reasoning model',
                contextWindow: 200000,
                inputPrice: 0.075,
                outputPrice: 0.375
            },
            'claude-opus-4@20250514': {
                name: 'Claude Opus 4',
                description: 'Advanced reasoning model',
                contextWindow: 200000,
                inputPrice: 0.075,
                outputPrice: 0.375
            },
            'claude-haiku-4-5@20251001': {
                name: 'Claude Haiku 4.5',
                description: 'Fast and efficient model for simple tasks',
                contextWindow: 200000,
                inputPrice: 0.001,
                outputPrice: 0.005
            },
            'claude-3-5-haiku@20241022': {
                name: 'Claude Haiku 3.5',
                description: 'Fast model for quick responses',
                contextWindow: 200000,
                inputPrice: 0.00025,
                outputPrice: 0.00125
            },
            'claude-3-haiku@20240307': {
                name: 'Claude Haiku 3',
                description: 'Lightweight model for simple tasks',
                contextWindow: 200000,
                inputPrice: 0.00025,
                outputPrice: 0.00125
            }
        };
        return modelInfo[modelId] || {
            name: modelId,
            description: 'Claude model',
            contextWindow: 200000,
            inputPrice: 0.01,
            outputPrice: 0.05
        };
    }
}
//# sourceMappingURL=claude-vertex.service.js.map