/**
 * Ollama AI Service
 * Native Ollama client for RE Engine integration
 */

import { logger, logSystemEvent } from '../observability/logger.ts';
import { EventEmitter } from 'events';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  tool_calls?: ToolCall[];
  tool_name?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
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

export interface OllamaConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
  defaultModel: string;
  defaultOptions: OllamaChatRequest['options'];
}

export class OllamaService extends EventEmitter {
  private config: OllamaConfig;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: Partial<OllamaConfig> = {}) {
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

    logSystemEvent('Ollama service initialized', 'info', {
      baseUrl: this.baseUrl,
      defaultModel: this.config.defaultModel
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
      logSystemEvent('Ollama connection error', 'error', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.fetch('/api/tags', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to list models');
      throw error;
    }
  }

  /**
   * Check if a model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.name === modelName);
    } catch (error) {
      logger.error({
        model: modelName,
        error: error.message
      }, 'Failed to check model availability');
      return false;
    }
  }

  /**
   * Pull a model
   */
  async pullModel(modelName: string, onProgress?: (progress: { status: string; completed?: number; total?: number }) => void): Promise<void> {
    try {
      logger.info({ model: modelName }, 'Pulling model');

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

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line);
              onProgress?.(progress);

              if (progress.status === 'success') {
                logger.info({ model: modelName }, 'Model pull completed');
                return;
              }
            } catch (e) {
              // Ignore JSON parse errors for partial lines
            }
          }
        }
      }
    } catch (error) {
      logger.error({
        model: modelName,
        error: error.message
      }, 'Failed to pull model');
      throw error;
    }
  }

  /**
   * Generate chat completion
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    try {
      // Apply default options
      const mergedRequest: OllamaChatRequest = {
        model: request.model || this.config.defaultModel,
        messages: request.messages,
        stream: false,
        options: {
          ...this.config.defaultOptions,
          ...request.options
        },
        ...request
      };

      logger.debug({
        model: mergedRequest.model,
        messageCount: mergedRequest.messages.length,
        hasTools: !!mergedRequest.tools
      }, 'Chat request');

      const response = await this.fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify(mergedRequest)
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const result = await response.json();

      logger.debug({
        model: result.model,
        done: result.done,
        hasToolCalls: !!result.message.tool_calls
      }, 'Chat response');

      this.emit('chat:response', result);
      return result;
    } catch (error) {
      logger.error({
        model: request.model,
        error: error.message
      }, 'Chat request failed');
      throw error;
    }
  }

  /**
   * Generate streaming chat completion
   */
  async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse> {
    try {
      // Apply default options
      const mergedRequest: OllamaChatRequest = {
        model: request.model || this.config.defaultModel,
        messages: request.messages,
        stream: true,
        options: {
          ...this.config.defaultOptions,
          ...request.options
        },
        ...request
      };

      logger.debug({
        model: mergedRequest.model,
        messageCount: mergedRequest.messages.length
      }, 'Stream chat request');

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

        if (done) break;

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
            } catch (e) {
              // Ignore JSON parse errors for partial lines
            }
          }
        }
      }
    } catch (error) {
      logger.error({
        model: request.model,
        error: error.message
      }, 'Stream chat request failed');
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async embed(model: string, prompt: string): Promise<number[]> {
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
    } catch (error) {
      logger.error({
        model,
        error: error.message
      }, 'Embedding request failed');
      throw error;
    }
  }

  /**
   * Generate text completion
   */
  async generate(model: string, prompt: string, options?: OllamaChatRequest['options']): Promise<string> {
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
    } catch (error) {
      logger.error({
        model,
        error: error.message
      }, 'Generate request failed');
      throw error;
    }
  }

  /**
   * Get model information
   */
  async showModel(modelName: string): Promise<any> {
    try {
      const response = await this.fetch('/api/show', {
        method: 'POST',
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`Show model request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({
        model: modelName,
        error: error.message
      }, 'Show model request failed');
      throw error;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await this.fetch('/api/delete', {
        method: 'DELETE',
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`Delete model request failed: ${response.status}`);
      }

      logger.info({ model: modelName }, 'Model deleted');
    } catch (error) {
      logger.error({
        model: modelName,
        error: error.message
      }, 'Delete model request failed');
      throw error;
    }
  }

  /**
   * Generic fetch method with retry logic
   */
  private async fetch(path: string, options: RequestInit & { timeout?: number; body?: string }): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options.timeout || this.config.timeout;

    let lastError: Error;

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
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          logger.warn({
            path,
            error: error.message
          }, `Request attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
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
    } catch (error) {
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
  close(): void {
    this.removeAllListeners();
    logger.info('Ollama service closed');
  }
}

// Singleton instance
let ollamaService: OllamaService | null = null;

export function getOllamaService(config?: Partial<OllamaConfig>): OllamaService {
  if (!ollamaService) {
    ollamaService = new OllamaService(config);
  }
  return ollamaService;
}

export function resetOllamaService(): void {
  if (ollamaService) {
    ollamaService.close();
    ollamaService = null;
  }
}
