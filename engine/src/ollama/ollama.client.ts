/**
 * Ollama AI Client Integration
 * Handles communication with Ollama local and cloud APIs
 */

export interface OllamaConfig {
  apiKey?: string;
  baseUrl: string;
  deviceKey?: string;
  model: string;
  timeout?: number;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaResponse {
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaError {
  error: string;
  status?: number;
}

export class OllamaClient {
  private config: OllamaConfig;
  private headers: Record<string, string>;

  constructor(config: OllamaConfig) {
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
  async generateCompletion(request: OllamaRequest): Promise<OllamaResponse> {
    try {
      const response = await this.makeRequest('/api/generate', {
        model: request.model || this.config.model,
        messages: request.messages,
        stream: request.stream || false,
        options: request.options
      }) as OllamaResponse;

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate a chat completion
   */
  async chatCompletion(messages: OllamaMessage[], options?: OllamaRequest['options']): Promise<OllamaResponse> {
    return this.generateCompletion({
      model: this.config.model,
      messages,
      options
    });
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.makeRequest('/api/tags') as { models: OllamaModel[] };
      return response.models || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get information about a specific model
   */
  async showModel(modelName: string): Promise<Partial<OllamaModel>> {
    try {
      return await this.makeRequest('/api/show', { name: modelName }) as Partial<OllamaModel>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Pull a model from Ollama
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      await this.makeRequest('/api/pull', { name: modelName });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      await this.makeRequest('/api/delete', { name: modelName });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(text: string, model?: string): Promise<number[]> {
    try {
      const response = await this.makeRequest('/api/embeddings', {
        model: model || this.config.model,
        prompt: text
      }) as { embedding: number[] };
      return response.embedding;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/api/version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make HTTP request to Ollama API
   */
  private async makeRequest(endpoint: string, data?: unknown): Promise<unknown> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method: data ? 'POST' : 'GET',
      headers: this.headers,
      signal: AbortSignal.timeout(this.config.timeout!)
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
  private handleError(error: unknown): OllamaError {
    if (error instanceof Error) {
      return {
        error: error.message,
        status: 500
      };
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      return error as OllamaError;
    }

    return {
      error: 'Unknown Ollama error occurred',
      status: 500
    };
  }

  /**
   * Create a configured Ollama client from environment variables
   */
  static fromEnvironment(): OllamaClient {
    const config: OllamaConfig = {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
      model: process.env.OLLAMA_MODEL || 'qwen:7b',
      apiKey: process.env.OLLAMA_API_KEY,
      deviceKey: process.env.OLLAMA_DEVICE_KEY,
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000')
    };

    return new OllamaClient(config);
  }
}
