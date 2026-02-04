/**
 * Unified Ollama AI Service
 * Consolidated Ollama integration for RE Engine
 * Combines the best features from multiple Ollama service implementations
 */

import { EventEmitter } from 'events';
import { logSystemEvent, logError } from '../observability/logger.js';

export interface OllamaConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  timeout?: number;
  useProxy?: boolean;
  proxyUrl?: string;
  proxyKey?: string;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  tool_calls?: ToolCall[];
  tool_name?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  tools?: Tool[];
  format?: string | object;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_predict?: number;
    num_ctx?: number;
    seed?: number;
    tfs_z?: number;
    typical_p?: number;
    repeat_last_n?: number;
    temperature_last?: boolean;
    use_mmap?: boolean;
    use_mlock?: boolean;
    embedding_only?: boolean;
    rope_frequency_base?: number;
    rope_frequency_scale?: number;
    num_thread?: number;
    num_gpu?: number;
    main_gpu?: number;
    low_vram?: boolean;
    f16_kv?: boolean;
    logits_all?: boolean;
    vocab_only?: boolean;
    numa?: boolean;
  };
  keep_alive?: string;
  think?: boolean | string;
  truncate?: boolean;
  shift?: boolean;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  context?: number[];
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

export interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbedResponse {
  embedding: number[];
}

export class OllamaUnifiedService extends EventEmitter {
  private config: Required<OllamaConfig>;
  private headers: Record<string, string>;

  constructor(config: Partial<OllamaConfig> = {}) {
    super();
    
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      apiKey: config.apiKey || '',
      defaultModel: config.defaultModel || 'qwen:7b',
      timeout: config.timeout || 30000,
      useProxy: config.useProxy || false,
      proxyUrl: config.proxyUrl || 'http://localhost:4000',
      proxyKey: config.proxyKey || ''
    };

    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': `re-engine/1.0.0 ollama-unified-client`
    };

    if (this.config.apiKey) {
      this.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    logSystemEvent('Ollama unified service initialized', 'info', {
      baseUrl: this.config.baseUrl,
      defaultModel: this.config.defaultModel,
      useProxy: this.config.useProxy
    });
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetch('/api/version', {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const version = await response.json();
        logSystemEvent('Ollama connection successful', 'info', { version });
        this.emit('connected', version);
        return true;
      }
      
      logSystemEvent('Ollama connection failed', 'error', { status: response.status });
      return false;
    } catch (error) {
      logSystemEvent('Ollama connection error', 'error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Generate chat completion
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const startTime = Date.now();
    
    try {
      logSystemEvent('Chat request started', 'info', {
        model: request.model,
        messageCount: request.messages.length,
        hasTools: !!request.tools
      });

      const response = await this.fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model || this.config.defaultModel,
          messages: request.messages,
          tools: request.tools,
          format: request.format,
          stream: request.stream || false,
          options: request.options,
          keep_alive: request.keep_alive,
          think: request.think,
          truncate: request.truncate,
          shift: request.shift
        })
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as OllamaChatResponse;
      
      logSystemEvent('Chat response received', 'info', {
        model: result.model,
        done: result.done,
        hasToolCalls: !!result.message.tool_calls
      });

      this.emit('chatCompleted', result);
      return result;

    } catch (error) {
      logSystemEvent('Chat request failed', 'error', {
        model: request.model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async embed(request: OllamaEmbedRequest): Promise<number[]> {
    try {
      const response = await this.fetch('/api/embed', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model || this.config.defaultModel,
          prompt: request.prompt
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as OllamaEmbedResponse;
      return result.embedding;

    } catch (error) {
      logSystemEvent('Embedding request failed', 'error', {
        model: request.model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.fetch('/api/tags');
      
      if (!response.ok) {
        throw new Error(`List models failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as { models: OllamaModel[] };
      return result.models || [];

    } catch (error) {
      logSystemEvent('Failed to list models', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.name === modelName);
    } catch (error) {
      logSystemEvent('Failed to check model availability', 'error', {
        model: modelName,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Pull a model
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      logSystemEvent('Pulling model', 'info', { model: modelName });

      const response = await this.fetch('/api/pull', {
        method: 'POST',
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`Pull model failed: ${response.status} ${response.statusText}`);
      }

      logSystemEvent('Model pull completed', 'info', { model: modelName });
      this.emit('modelPulled', modelName);

    } catch (error) {
      logSystemEvent('Failed to pull model', 'error', {
        model: modelName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; details: Record<string, unknown> }> {
    try {
      const is_connected = await this.testConnection();
      const models = await this.listModels();
      
      return {
        status: is_connected ? 'healthy' : 'unhealthy',
        details: {
          connected: is_connected,
          modelCount: models.length,
          availableModels: models.map(m => m.name),
          defaultModel: this.config.defaultModel,
          baseUrl: this.config.baseUrl
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Make HTTP request to Ollama API
   */
  private async fetch(endpoint: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: this.headers,
      signal: AbortSignal.timeout(options.timeout || this.config.timeout)
    };

    if (options.body) {
      requestOptions.body = options.body;
    }

    const response = await fetch(url, requestOptions);
    return response;
  }

  /**
   * Get service configuration
   */
  getConfig(): Omit<OllamaConfig, 'apiKey' | 'proxyKey'> {
    return {
      baseUrl: this.config.baseUrl,
      defaultModel: this.config.defaultModel,
      timeout: this.config.timeout,
      useProxy: this.config.useProxy,
      proxyUrl: this.config.proxyUrl
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.apiKey) {
      this.headers['Authorization'] = `Bearer ${updates.apiKey}`;
    }
    
    logSystemEvent('Ollama service configuration updated', 'info', {
      updatedKeys: Object.keys(updates)
    });
  }
}

// Factory function for easy instantiation
export function createOllamaService(config?: Partial<OllamaConfig>): OllamaUnifiedService {
  return new OllamaUnifiedService(config);
}

// Export types for external use
export type { OllamaConfig as OllamaServiceConfig };
