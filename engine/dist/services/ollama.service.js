/**
 * Ollama AI Service
 * Native Ollama client for RE Engine integration
 */
import { logger } from '../observability/logger.js';
import { EventEmitter } from 'events';
export class OllamaService extends EventEmitter {
    config;
    baseUrl;
    headers;
    constructor(config = {}) {
        super();
        this.config = {
            baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            apiKey: config.apiKey || process.env.OLLAMA_API_KEY,
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            defaultModel: config.defaultModel || 'qwen:7b',
            defaultOptions: {
                temperature: 0.7,
                top_p: 0.9,
                top_k: 40,
                repeat_penalty: 1.1,
                num_predict: 2048,
                num_ctx: 32768,
                ...config.defaultOptions
            }
        };
        this.baseUrl = this.config.baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': `re-engine/1.0.0 ollama-client`
        };
        if (this.config.apiKey) {
            this.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        logger.info('Ollama service initialized', {
            baseUrl: this.baseUrl,
            defaultModel: this.config.defaultModel
        });
    }
    /**
     * Test connection to Ollama server
     */
    async testConnection() {
        try {
            const response = await this.fetch('/api/version', {
                method: 'GET',
                timeout: 5000
            });
            if (response.ok) {
                const version = await response.json();
                logger.info('Ollama connection successful', { version });
                this.emit('connected', version);
                return true;
            }
            logger.error('Ollama connection failed', { status: response.status });
            return false;
        }
        catch (error) {
            logger.error('Ollama connection error', { error: error.message });
            return false;
        }
    }
    /**
     * List available models
     */
    async listModels() {
        try {
            const response = await this.fetch('/api/tags', {
                method: 'GET'
            });
            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.status}`);
            }
            const data = await response.json();
            return data.models || [];
        }
        catch (error) {
            logger.error('Failed to list models', { error: error.message });
            throw error;
        }
    }
    /**
     * Check if a model is available
     */
    async hasModel(modelName) {
        try {
            const models = await this.listModels();
            return models.some(model => model.name === modelName);
        }
        catch (error) {
            logger.error('Failed to check model availability', {
                model: modelName,
                error: error.message
            });
            return false;
        }
    }
    /**
     * Pull a model
     */
    async pullModel(modelName, onProgress) {
        try {
            logger.info('Pulling model', { model: modelName });
            const response = await this.fetch('/api/pull', {
                method: 'POST',
                body: JSON.stringify({ name: modelName })
            });
            if (!response.ok) {
                throw new Error(`Failed to pull model: ${response.status}`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const progress = JSON.parse(line);
                            onProgress?.(progress);
                            if (progress.status === 'success') {
                                logger.info('Model pull completed', { model: modelName });
                                return;
                            }
                        }
                        catch (e) {
                            // Ignore JSON parse errors for partial lines
                        }
                    }
                }
            }
        }
        catch (error) {
            logger.error('Failed to pull model', {
                model: modelName,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generate chat completion
     */
    async chat(request) {
        try {
            // Apply default options
            const mergedRequest = {
                model: request.model || this.config.defaultModel,
                messages: request.messages,
                stream: false,
                options: {
                    ...this.config.defaultOptions,
                    ...request.options
                },
                ...request
            };
            logger.debug('Chat request', {
                model: mergedRequest.model,
                messageCount: mergedRequest.messages.length,
                hasTools: !!mergedRequest.tools
            });
            const response = await this.fetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify(mergedRequest)
            });
            if (!response.ok) {
                throw new Error(`Chat request failed: ${response.status}`);
            }
            const result = await response.json();
            logger.debug('Chat response', {
                model: result.model,
                done: result.done,
                hasToolCalls: !!result.message.tool_calls
            });
            this.emit('chat:response', result);
            return result;
        }
        catch (error) {
            logger.error('Chat request failed', {
                model: request.model,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generate streaming chat completion
     */
    async *chatStream(request) {
        try {
            // Apply default options
            const mergedRequest = {
                model: request.model || this.config.defaultModel,
                messages: request.messages,
                stream: true,
                options: {
                    ...this.config.defaultOptions,
                    ...request.options
                },
                ...request
            };
            logger.debug('Stream chat request', {
                model: mergedRequest.model,
                messageCount: mergedRequest.messages.length
            });
            const response = await this.fetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify(mergedRequest)
            });
            if (!response.ok) {
                throw new Error(`Stream chat request failed: ${response.status}`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const chunk = JSON.parse(line);
                            this.emit('chat:chunk', chunk);
                            yield chunk;
                            if (chunk.done) {
                                return;
                            }
                        }
                        catch (e) {
                            // Ignore JSON parse errors for partial lines
                        }
                    }
                }
            }
        }
        catch (error) {
            logger.error('Stream chat request failed', {
                model: request.model,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generate embeddings
     */
    async embed(model, prompt) {
        try {
            const response = await this.fetch('/api/embed', {
                method: 'POST',
                body: JSON.stringify({
                    model,
                    prompt
                })
            });
            if (!response.ok) {
                throw new Error(`Embedding request failed: ${response.status}`);
            }
            const result = await response.json();
            return result.embeddings;
        }
        catch (error) {
            logger.error('Embedding request failed', {
                model,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generate text completion
     */
    async generate(model, prompt, options) {
        try {
            const response = await this.fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: {
                        ...this.config.defaultOptions,
                        ...options
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`Generate request failed: ${response.status}`);
            }
            const result = await response.json();
            return result.response;
        }
        catch (error) {
            logger.error('Generate request failed', {
                model,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Get model information
     */
    async showModel(modelName) {
        try {
            const response = await this.fetch('/api/show', {
                method: 'POST',
                body: JSON.stringify({ name: modelName })
            });
            if (!response.ok) {
                throw new Error(`Show model request failed: ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            logger.error('Show model request failed', {
                model: modelName,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Delete a model
     */
    async deleteModel(modelName) {
        try {
            const response = await this.fetch('/api/delete', {
                method: 'DELETE',
                body: JSON.stringify({ name: modelName })
            });
            if (!response.ok) {
                throw new Error(`Delete model request failed: ${response.status}`);
            }
            logger.info('Model deleted', { model: modelName });
        }
        catch (error) {
            logger.error('Delete model request failed', {
                model: modelName,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generic fetch method with retry logic
     */
    async fetch(path, options) {
        const url = `${this.baseUrl}${path}`;
        const timeout = options.timeout || this.config.timeout;
        let lastError;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, {
                    ...options,
                    headers: this.headers,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.status >= 500 && attempt < this.config.maxRetries) {
                    lastError = new Error(`Server error: ${response.status}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                return response;
            }
            catch (error) {
                lastError = error;
                if (attempt < this.config.maxRetries) {
                    logger.warn(`Request attempt ${attempt} failed, retrying...`, {
                        path,
                        error: error.message
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        throw lastError || new Error('Max retries exceeded');
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const is_connected = await this.testConnection();
            const models = await this.listModels();
            return {
                status: is_connected ? 'healthy' : 'unhealthy',
                details: {
                    connected: is_connected,
                    modelCount: models.length,
                    models: models.map(m => m.name),
                    baseUrl: this.baseUrl
                }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error.message,
                    baseUrl: this.baseUrl
                }
            };
        }
    }
    /**
     * Close service
     */
    close() {
        this.removeAllListeners();
        logger.info('Ollama service closed');
    }
}
// Singleton instance
let ollamaService = null;
export function getOllamaService(config) {
    if (!ollamaService) {
        ollamaService = new OllamaService(config);
    }
    return ollamaService;
}
export function resetOllamaService() {
    if (ollamaService) {
        ollamaService.close();
        ollamaService = null;
    }
}
//# sourceMappingURL=ollama.service.js.map