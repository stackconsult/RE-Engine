/**
 * Ollama AI Client Integration
 * Handles communication with Ollama local and cloud APIs
 */
export class OllamaClient {
    config;
    headers;
    constructor(config) {
        this.config = {
            timeout: 30000,
            ...config
        };
        this.headers = {
            'Content-Type': 'application/json'
        };
        // Add authentication headers based on available credentials
        if (this.config.apiKey) {
            this.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
    }
    /**
     * Generate a completion from Ollama
     */
    async generateCompletion(request) {
        try {
            const response = await this.makeRequest('/api/generate', {
                model: request.model || this.config.model,
                messages: request.messages,
                stream: request.stream || false,
                options: request.options
            });
            return response;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Generate a chat completion
     */
    async chatCompletion(messages, options) {
        return this.generateCompletion({
            model: this.config.model,
            messages,
            options
        });
    }
    /**
     * List available models
     */
    async listModels() {
        try {
            const response = await this.makeRequest('/api/tags');
            return response.models || [];
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get information about a specific model
     */
    async showModel(modelName) {
        try {
            return await this.makeRequest('/api/show', { name: modelName });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Pull a model from Ollama
     */
    async pullModel(modelName) {
        try {
            await this.makeRequest('/api/pull', { name: modelName });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Delete a model
     */
    async deleteModel(modelName) {
        try {
            await this.makeRequest('/api/delete', { name: modelName });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Generate embeddings
     */
    async generateEmbeddings(text, model) {
        try {
            const response = await this.makeRequest('/api/embeddings', {
                model: model || this.config.model,
                prompt: text
            });
            return response.embedding;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Check if Ollama is available
     */
    async healthCheck() {
        try {
            await this.makeRequest('/api/version');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Make HTTP request to Ollama API
     */
    async makeRequest(endpoint, data) {
        const url = `${this.config.baseUrl}${endpoint}`;
        const options = {
            method: data ? 'POST' : 'GET',
            headers: this.headers,
            signal: AbortSignal.timeout(this.config.timeout)
        };
        if (data) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Ollama API error: ${response.status} ${errorData.error || response.statusText}`);
        }
        return response.json();
    }
    /**
     * Handle and format errors
     */
    handleError(error) {
        if (error instanceof Error) {
            return {
                error: error.message,
                status: 500
            };
        }
        if (typeof error === 'object' && error !== null && 'error' in error) {
            return error;
        }
        return {
            error: 'Unknown Ollama error occurred',
            status: 500
        };
    }
    /**
     * Create a configured Ollama client from environment variables
     */
    static fromEnvironment() {
        const config = {
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
            model: process.env.OLLAMA_MODEL || 'qwen:7b',
            apiKey: process.env.OLLAMA_API_KEY,
            deviceKey: process.env.OLLAMA_DEVICE_KEY,
            timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000')
        };
        return new OllamaClient(config);
    }
}
//# sourceMappingURL=ollama.client.js.map