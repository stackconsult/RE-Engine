import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const logger = pino();

// LLAMA/Ollama Configuration
const ollamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
  apiKey: process.env.OLLAMA_API_KEY || '',
  defaultModel: process.env.OLLAMA_MODEL || 'qwen:7b',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.OLLAMA_RETRY_DELAY || '1000'),
  cacheEnabled: process.env.OLLAMA_CACHE_ENABLED === 'true',
  cacheTtl: parseInt(process.env.OLLAMA_CACHE_TTL || '3600000'),
};

// Available LLAMA Models with use case mapping
const LLAMA_MODELS = {
  // General Purpose Models
  'llama3.1:8b': {
    category: 'general',
    description: 'Llama 3.1 8B - General purpose model',
    useCases: ['text_generation', 'conversation', 'analysis'],
    capabilities: ['text', 'reasoning', 'analysis'],
    contextWindow: 128000,
    recommended: true
  },
  'llama3.1:70b': {
    category: 'general',
    description: 'Llama 3.1 70B - High performance general model',
    useCases: ['text_generation', 'conversation', 'analysis', 'reasoning'],
    capabilities: ['text', 'reasoning', 'analysis', 'complex_reasoning'],
    contextWindow: 128000,
    recommended: false
  },
  'llama3:8b': {
    category: 'general',
    description: 'Llama 3 8B - Efficient general model',
    useCases: ['text_generation', 'conversation'],
    capabilities: ['text', 'reasoning'],
    contextWindow: 8192,
    recommended: true
  },
  'llama3:70b': {
    category: 'general',
    description: 'Llama 3 70B - Powerful general model',
    useCases: ['text_generation', 'conversation', 'analysis'],
    capabilities: ['text', 'reasoning', 'analysis'],
    contextWindow: 4096,
    recommended: false
  },
  
  // Specialized Models
  'codellama:7b': {
    category: 'code',
    description: 'Code Llama 7B - Code generation and understanding',
    useCases: ['code_generation', 'code_analysis', 'debugging'],
    capabilities: ['code', 'text', 'analysis'],
    contextWindow: 16384,
    recommended: true
  },
  'codellama:13b': {
    category: 'code',
    description: 'Code Llama 13B - Enhanced code capabilities',
    useCases: ['code_generation', 'code_analysis', 'debugging', 'documentation'],
    capabilities: ['code', 'text', 'analysis', 'documentation'],
    contextWindow: 16384,
    recommended: false
  },
  'codellama:34b': {
    category: 'code',
    description: 'Code Llama 34B - Professional code generation',
    useCases: ['code_generation', 'code_analysis', 'debugging', 'documentation', 'architecture'],
    capabilities: ['code', 'text', 'analysis', 'documentation', 'architecture'],
    contextWindow: 16384,
    recommended: false
  },
  
  // Chinese Models
  'qwen:7b': {
    category: 'chinese',
    description: 'Qwen 7B - Chinese language model',
    useCases: ['text_generation', 'conversation', 'chinese_content'],
    capabilities: ['text', 'chinese', 'reasoning'],
    contextWindow: 32768,
    recommended: true
  },
  'qwen:14b': {
    category: 'chinese',
    description: 'Qwen 14B - Enhanced Chinese capabilities',
    useCases: ['text_generation', 'conversation', 'chinese_content', 'analysis'],
    capabilities: ['text', 'chinese', 'reasoning', 'analysis'],
    contextWindow: 32768,
    recommended: false
  },
  'qwen:72b': {
    category: 'chinese',
    description: 'Qwen 72B - Professional Chinese model',
    useCases: ['text_generation', 'conversation', 'chinese_content', 'analysis', 'reasoning'],
    capabilities: ['text', 'chinese', 'reasoning', 'analysis', 'complex_reasoning'],
    contextWindow: 32768,
    recommended: false
  },
  
  // Multimodal Models
  'llava:7b': {
    category: 'multimodal',
    description: 'LLaVA 7B - Vision and language model',
    useCases: ['image_analysis', 'visual_reasoning', 'multimodal'],
    capabilities: ['text', 'image', 'vision', 'analysis'],
    contextWindow: 4096,
    recommended: true
  },
  'llava:13b': {
    category: 'multimodal',
    description: 'LLaVA 13B - Enhanced vision capabilities',
    useCases: ['image_analysis', 'visual_reasoning', 'multimodal', 'detailed_analysis'],
    capabilities: ['text', 'image', 'vision', 'analysis', 'detailed_analysis'],
    contextWindow: 4096,
    recommended: false
  },
  
  // Specialized Models
  'mistral:7b': {
    category: 'general',
    description: 'Mistral 7B - Efficient general model',
    useCases: ['text_generation', 'conversation', 'analysis'],
    capabilities: ['text', 'reasoning', 'analysis'],
    contextWindow: 8192,
    recommended: true
  },
  'mixtral:8x7b': {
    category: 'general',
    description: 'Mixtral 8x7B - Mixture of experts model',
    useCases: ['text_generation', 'conversation', 'analysis', 'reasoning'],
    capabilities: ['text', 'reasoning', 'analysis', 'complex_reasoning'],
    contextWindow: 32768,
    recommended: false
  },
  'nous-hermes:13b': {
    category: 'general',
    description: 'Nous Hermes 13B - Instruction following model',
    useCases: ['text_generation', 'conversation', 'instruction_following'],
    capabilities: ['text', 'reasoning', 'instruction_following'],
    contextWindow: 4096,
    recommended: true
  },
  'solar:10.7b': {
    category: 'general',
    description: 'Solar 10.7B - Advanced reasoning model',
    useCases: ['text_generation', 'conversation', 'reasoning', 'analysis'],
    capabilities: ['text', 'reasoning', 'analysis', 'advanced_reasoning'],
    contextWindow: 2048,
    recommended: false
  }
};

// Cache for model responses
const responseCache = new Map();

// Schemas
const GenerateTextSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(1).max(100).optional(),
  useCase: z.enum(['text_generation', 'conversation', 'analysis', 'code_generation', 'chinese_content', 'image_analysis', 'instruction_following']).optional()
});

const GenerateCodeSchema = z.object({
  prompt: z.string(),
  language: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional()
});

const AnalyzeImageSchema = z.object({
  image: z.string(), // Base64 encoded image
  prompt: z.string().optional(),
  model: z.string().optional()
});

const ListModelsSchema = z.object({
  category: z.enum(['general', 'code', 'chinese', 'multimodal', 'all']).optional(),
  recommended: z.boolean().optional()
});

const OptimizeModelSchema = z.object({
  useCase: z.string(),
  requirements: z.object({
    speed: z.enum(['fast', 'medium', 'slow']).optional(),
    quality: z.enum(['basic', 'good', 'excellent']).optional(),
    context: z.enum(['short', 'medium', 'long']).optional(),
    capabilities: z.array(z.string()).optional()
  }).optional()
});

// Create MCP Server
const server = new Server(
  {
    name: 'reengine-llama',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Model Selection Logic
const selectOptimalModel = (useCase: string, requirements?: any): string => {
  const availableModels = Object.keys(LLAMA_MODELS);
  
  // If specific model is requested and available, use it
  if (requirements?.model && availableModels.includes(requirements.model)) {
    return requirements.model;
  }
  
  // Filter models by use case
  const suitableModels = availableModels.filter(modelId => 
    LLAMA_MODELS[modelId as keyof typeof LLAMA_MODELS].useCases.includes(useCase as any)
  );
  
  if (suitableModels.length === 0) {
    return ollamaConfig.defaultModel;
  }
  
  // Sort by recommendations and requirements
  suitableModels.sort((a, b) => {
    const modelA = LLAMA_MODELS[a as keyof typeof LLAMA_MODELS];
    const modelB = LLAMA_MODELS[b as keyof typeof LLAMA_MODELS];
    
    // Prioritize recommended models
    if (modelA.recommended && !modelB.recommended) return -1;
    if (!modelA.recommended && modelB.recommended) return 1;
    
    // Consider speed requirements
    if (requirements?.speed === 'fast') {
      // Prefer smaller models for speed
      const sizeA = parseInt(a.split(':')[1]) || 7;
      const sizeB = parseInt(b.split(':')[1]) || 7;
      return sizeA - sizeB;
    }
    
    // Consider quality requirements
    if (requirements?.quality === 'excellent') {
      // Prefer larger models for quality
      const sizeA = parseInt(a.split(':')[1]) || 7;
      const sizeB = parseInt(b.split(':')[1]) || 7;
      return sizeB - sizeA;
    }
    
    return 0;
  });
  
  return suitableModels[0];
};

// API Call Helper
const callOllamaAPI = async (endpoint: string, body: any, retries = 0): Promise<any> => {
  const url = `${ollamaConfig.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(ollamaConfig.apiKey && { 'Authorization': `Bearer ${ollamaConfig.apiKey}` })
  };

  try {
    logger.info(`Calling Ollama API: ${endpoint}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ollamaConfig.timeout)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logger.info(`Ollama API success: ${endpoint}`);
    return data;
  } catch (error) {
    logger.error(`Ollama API error: ${endpoint} - ${(error as Error).message}`);
    
    if (retries < ollamaConfig.maxRetries) {
      logger.info(`Retrying Ollama API call: ${endpoint} (attempt ${retries + 1})`);
      await new Promise(resolve => setTimeout(resolve, ollamaConfig.retryDelay));
      return callOllamaAPI(endpoint, body, retries + 1);
    }
    
    throw error;
  }
};

// Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_text':
        const textValidated = GenerateTextSchema.parse(args);
        const textResult = await generateText(textValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(textResult)
            }
          ]
        };

      case 'generate_code':
        const codeValidated = GenerateCodeSchema.parse(args);
        const codeResult = await generateCode(codeValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(codeResult)
            }
          ]
        };

      case 'analyze_image':
        const imageValidated = AnalyzeImageSchema.parse(args);
        const imageResult = await analyzeImage(imageValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(imageResult)
            }
          ]
        };

      case 'list_models':
        const modelsValidated = ListModelsSchema.parse(args);
        const modelsResult = await listModels(modelsValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(modelsResult)
            }
          ]
        };

      case 'optimize_model':
        const optimizeValidated = OptimizeModelSchema.parse(args);
        const optimizeResult = await optimizeModel(optimizeValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(optimizeResult)
            }
          ]
        };

      case 'get_model_info':
        const modelInfoResult = getModelInfo(args.model as string);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(modelInfoResult)
            }
          ]
        };

      case 'test_connection':
        const connectionResult = await testConnection();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(connectionResult)
            }
          ]
        };

      case 'get_cache_status':
        const cacheResult = getCacheStatus();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(cacheResult)
            }
          ]
        };

      case 'clear_cache':
        const clearResult = clearCache();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(clearResult)
            }
          ]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error({ tool: name, error: (error as Error).message }, 'Tool execution failed');
    throw error;
  }
});

// Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_text',
        description: 'Generate text using optimal LLAMA model based on use case',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            model: { type: 'string', description: 'Specific model to use (optional)' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'number', minimum: 1, maximum: 8192 },
            topP: { type: 'number', minimum: 0, maximum: 1 },
            topK: { type: 'number', minimum: 1, maximum: 100 },
            useCase: { 
              type: 'string', 
              enum: ['text_generation', 'conversation', 'analysis', 'code_generation', 'chinese_content', 'image_analysis', 'instruction_following'],
              description: 'Use case for optimal model selection'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'generate_code',
        description: 'Generate code using specialized Code Llama models',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            language: { type: 'string', description: 'Programming language' },
            model: { type: 'string', description: 'Specific model to use (optional)' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'number', minimum: 1, maximum: 8192 }
          },
          required: ['prompt']
        }
      },
      {
        name: 'analyze_image',
        description: 'Analyze images using multimodal LLAVA models',
        inputSchema: {
          type: 'object',
          properties: {
            image: { type: 'string', description: 'Base64 encoded image' },
            prompt: { type: 'string', description: 'Analysis prompt (optional)' },
            model: { type: 'string', description: 'Specific model to use (optional)' }
          },
          required: ['image']
        }
      },
      {
        name: 'list_models',
        description: 'List available LLAMA models with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            category: { 
              type: 'string', 
              enum: ['general', 'code', 'chinese', 'multimodal', 'all'],
              description: 'Filter by model category'
            },
            recommended: { type: 'boolean', description: 'Show only recommended models' }
          }
        }
      },
      {
        name: 'optimize_model',
        description: 'Get optimal model recommendation based on requirements',
        inputSchema: {
          type: 'object',
          properties: {
            useCase: { type: 'string', description: 'Intended use case' },
            requirements: {
              type: 'object',
              properties: {
                speed: { type: 'string', enum: ['fast', 'medium', 'slow'] },
                quality: { type: 'string', enum: ['basic', 'good', 'excellent'] },
                context: { type: 'string', enum: ['short', 'medium', 'long'] },
                capabilities: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['useCase']
        }
      },
      {
        name: 'get_model_info',
        description: 'Get detailed information about a specific model',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model name' }
          },
          required: ['model']
        }
      },
      {
        name: 'test_connection',
        description: 'Test connection to Ollama server',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_cache_status',
        description: 'Get current cache status and statistics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'clear_cache',
        description: 'Clear the response cache',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Implementation Functions

async function generateText(params: any) {
  try {
    const selectedModel = params.model || selectOptimalModel(params.useCase || 'text_generation', params);
    
    const cacheKey = `text_${selectedModel}_${params.prompt}_${JSON.stringify({
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      topP: params.topP,
      topK: params.topK
    })}`;
    
    if (ollamaConfig.cacheEnabled && responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < ollamaConfig.cacheTtl) {
        logger.info(`Cache hit for text generation: ${selectedModel}`);
        return cached.response;
      }
    }
    
    const requestBody = {
      model: selectedModel,
      prompt: params.prompt,
      stream: false,
      options: {
        temperature: params.temperature || 0.7,
        num_predict: params.maxTokens || 2048,
        top_p: params.topP || 0.9,
        top_k: params.topK || 40
      }
    };

    const response = await callOllamaAPI('/chat/completions', requestBody);
    
    const result = {
      text: response.choices?.[0]?.message?.content || '',
      model: selectedModel,
      usage: response.usage,
      cached: false,
      selectedModel,
      modelInfo: LLAMA_MODELS[selectedModel as keyof typeof LLAMA_MODELS]
    };
    
    if (ollamaConfig.cacheEnabled) {
      responseCache.set(cacheKey, {
        response: { ...result, cached: true },
        timestamp: Date.now()
      });
    }
    
    logger.info(`Text generated successfully - Model: ${selectedModel}, Length: ${result.text.length}`);
    
    return result;
  } catch (error) {
    logger.error('Error generating text: Failed to generate text');
    throw error;
  }
}

async function generateCode(params: any) {
  try {
    const selectedModel = params.model || selectOptimalModel('code_generation', params);
    
    const cacheKey = `code_${selectedModel}_${params.prompt}_${params.language || ''}`;
    
    if (ollamaConfig.cacheEnabled && responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < ollamaConfig.cacheTtl) {
        logger.info(`Cache hit for code generation: ${selectedModel}`);
        return cached.response;
      }
    }
    
    const codePrompt = params.language 
      ? `Generate ${params.language} code for: ${params.prompt}`
      : `Generate code for: ${params.prompt}`;
    
    const requestBody = {
      model: selectedModel,
      prompt: codePrompt,
      stream: false,
      options: {
        temperature: params.temperature || 0.1,
        num_predict: params.maxTokens || 4096
      }
    };

    const response = await callOllamaAPI('/chat/completions', requestBody);
    
    const result = {
      code: response.choices?.[0]?.message?.content || '',
      model: selectedModel,
      language: params.language,
      usage: response.usage,
      cached: false,
      selectedModel,
      modelInfo: LLAMA_MODELS[selectedModel as keyof typeof LLAMA_MODELS]
    };
    
    if (ollamaConfig.cacheEnabled) {
      responseCache.set(cacheKey, {
        response: { ...result, cached: true },
        timestamp: Date.now()
      });
    }
    
    logger.info(`Code generated successfully - Model: ${selectedModel}, Language: ${params.language}`);
    
    return result;
  } catch (error) {
    logger.error('Error generating code: Failed to generate code');
    throw error;
  }
}

async function analyzeImage(params: any) {
  try {
    const selectedModel = params.model || selectOptimalModel('image_analysis', params);
    
    const cacheKey = `image_${selectedModel}_${params.image.substring(0, 100)}`;
    
    if (ollamaConfig.cacheEnabled && responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < ollamaConfig.cacheTtl) {
        logger.info(`Cache hit for image analysis: ${selectedModel}`);
        return cached.response;
      }
    }
    
    const prompt = params.prompt || 'Analyze this image in detail. What do you see?';
    
    const requestBody = {
      model: selectedModel,
      prompt: prompt,
      images: [params.image],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2048
      }
    };

    const response = await callOllamaAPI('/chat/completions', requestBody);
    
    const result = {
      analysis: response.choices?.[0]?.message?.content || '',
      model: selectedModel,
      prompt,
      usage: response.usage,
      cached: false,
      selectedModel,
      modelInfo: LLAMA_MODELS[selectedModel as keyof typeof LLAMA_MODELS]
    };
    
    if (ollamaConfig.cacheEnabled) {
      responseCache.set(cacheKey, {
        response: { ...result, cached: true },
        timestamp: Date.now()
      });
    }
    
    logger.info(`Image analyzed successfully - Model: ${selectedModel}`);
    
    return result;
  } catch (error) {
    logger.error('Error analyzing image: Failed to analyze image');
    throw error;
  }
}

async function listModels(params: any) {
  try {
    let models = Object.entries(LLAMA_MODELS).map(([id, info]) => ({
      id,
      ...info
    }));
    
    // Filter by category
    if (params.category && params.category !== 'all') {
      models = models.filter(model => model.category === params.category);
    }
    
    // Filter by recommendation
    if (params.recommended !== undefined) {
      models = models.filter(model => model.recommended === params.recommended);
    }
    
    // Sort by category and recommendation
    models.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (b.recommended && !a.recommended) return 1;
      if (a.recommended && !b.recommended) return -1;
      return 0;
    });
    
    logger.info(`Listed ${models.length} models with filters: ${JSON.stringify(params)}`);
    
    return {
      models,
      total: models.length,
      filters: params,
      categories: ['general', 'code', 'chinese', 'multimodal'],
      totalAvailable: Object.keys(LLAMA_MODELS).length
    };
  } catch (error) {
    logger.error('Error listing models: Failed to list models');
    throw error;
  }
}

async function optimizeModel(params: any) {
  try {
    const optimalModel = selectOptimalModel(params.useCase, params.requirements);
    const modelInfo = LLAMA_MODELS[optimalModel as keyof typeof LLAMA_MODELS];
    
    const alternatives = Object.entries(LLAMA_MODELS)
      .filter(([id, info]) => 
        info.useCases.includes(params.useCase as any) && id !== optimalModel
      )
      .slice(0, 3)
      .map(([id, info]) => ({ id, ...info }));
    
    logger.info(`Model optimization for ${params.useCase}: ${optimalModel}`);
    
    return {
      recommended: optimalModel,
      modelInfo,
      alternatives,
      reasoning: `Selected ${optimalModel} based on use case: ${params.useCase} and requirements: ${JSON.stringify(params.requirements)}`,
      requirements: params.requirements
    };
  } catch (error) {
    logger.error('Error optimizing model: Failed to optimize model selection');
    throw error;
  }
}

function getModelInfo(modelId: string) {
  try {
    const modelInfo = LLAMA_MODELS[modelId as keyof typeof LLAMA_MODELS];
    
    if (!modelInfo) {
      throw new Error(`Model not found: ${modelId}`);
    }
    
    return {
      id: modelId,
      ...modelInfo,
      available: true
    };
  } catch (error) {
    logger.error(`Error getting model info for ${modelId}: Model not found`);
    throw error;
  }
}

async function testConnection() {
  try {
    const response = await callOllamaAPI('/chat/completions', {
      model: ollamaConfig.defaultModel,
      prompt: 'Hello, this is a connection test.',
      stream: false,
      options: {
        num_predict: 10
      }
    });
    
    logger.info('LLAMA connection test successful');
    
    return {
      status: 'connected',
      baseUrl: ollamaConfig.baseUrl,
      defaultModel: ollamaConfig.defaultModel,
      availableModels: Object.keys(LLAMA_MODELS).length,
      cacheEnabled: ollamaConfig.cacheEnabled,
      timestamp: new Date().toISOString(),
      testResponse: response.choices?.[0]?.message?.content || ''
    };
  } catch (error) {
    logger.error('LLAMA connection test failed: Connection test failed');
    throw error;
  }
}

function getCacheStatus() {
  const cacheSize = responseCache.size;
  const expiredEntries = Array.from(responseCache.entries())
    .filter(([_, cached]) => Date.now() - cached.timestamp > ollamaConfig.cacheTtl)
    .length;
  
  return {
    size: cacheSize,
    expired: expiredEntries,
    enabled: ollamaConfig.cacheEnabled,
    ttl: ollamaConfig.cacheTtl,
    oldestEntry: cacheSize > 0 ? Math.min(...Array.from(responseCache.values()).map(c => c.timestamp)) : null,
    newestEntry: cacheSize > 0 ? Math.max(...Array.from(responseCache.values()).map(c => c.timestamp)) : null
  };
}

function clearCache() {
  const size = responseCache.size;
  responseCache.clear();
  
  logger.info(`Cache cleared: ${size} entries removed`);
  
  return {
    cleared: size,
    timestamp: new Date().toISOString()
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('RE Engine LLAMA MCP server started');
  
  logger.info(`LLAMA Configuration - Base URL: ${ollamaConfig.baseUrl}, Default Model: ${ollamaConfig.defaultModel}`);
  logger.info(`Available Models: ${Object.keys(LLAMA_MODELS).length} models configured`);
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Server startup failed: Server failed to start');
    process.exit(1);
  });
}
