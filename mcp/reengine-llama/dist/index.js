import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pino from 'pino';
import fetch from 'node-fetch';
const logger = pino();
// LLAMA/Ollama Configuration
const ollamaConfig = {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
    apiKey: process.env.OLLAMA_API_KEY || '',
    defaultModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.OLLAMA_RETRY_DELAY || '1000'),
    cacheEnabled: process.env.OLLAMA_CACHE_ENABLED === 'true',
    cacheTtl: parseInt(process.env.OLLAMA_CACHE_TTL || '3600000'),
};
// Available LLAMA Models with use case mapping (Optimized for Real Estate)
const LLAMA_MODELS = {
    // General Purpose Models (Latest & Most Capable)
    'llama3.1:8b': {
        category: 'general',
        description: 'Llama 3.1 8B - Latest general purpose model with 128K context',
        useCases: ['text_generation', 'conversation', 'analysis', 'lead_analysis'],
        capabilities: ['text', 'reasoning', 'analysis', 'long_context'],
        contextWindow: 128000,
        recommended: true,
        priority: 1
    },
    'llama3.1:70b': {
        category: 'general',
        description: 'Llama 3.1 70B - Advanced reasoning and analysis',
        useCases: ['text_generation', 'conversation', 'analysis', 'complex_reasoning'],
        capabilities: ['text', 'reasoning', 'analysis', 'complex_reasoning'],
        contextWindow: 128000,
        recommended: false,
        priority: 2
    },
    'mistral-small3.2': {
        category: 'general',
        description: 'Mistral Small 3.2 - Fast, efficient general tasks',
        useCases: ['text_generation', 'conversation', 'analysis'],
        capabilities: ['text', 'reasoning', 'analysis', 'vision'],
        contextWindow: 32000,
        recommended: true,
        priority: 3
    },
    'qwen2.5:32b': {
        category: 'general',
        description: 'Qwen 2.5 32B - Multilingual with 128K context',
        useCases: ['text_generation', 'conversation', 'multilingual_content'],
        capabilities: ['text', 'reasoning', 'multilingual', 'long_context'],
        contextWindow: 128000,
        recommended: false,
        priority: 4
    },
    // Code Generation Models (Latest & Most Capable)
    'qwen3-coder:30b': {
        category: 'code',
        description: 'Qwen3-Coder 30B - Latest coding model for agentic workflows',
        useCases: ['code_generation', 'code_analysis', 'debugging', 'automation'],
        capabilities: ['code', 'text', 'analysis', 'tools'],
        contextWindow: 32768,
        recommended: true,
        priority: 1
    },
    'deepseek-coder-v2:236b': {
        category: 'code',
        description: 'DeepSeek-Coder V2 236B - GPT4-Turbo level performance',
        useCases: ['code_generation', 'code_analysis', 'debugging', 'architecture'],
        capabilities: ['code', 'text', 'analysis', 'advanced_reasoning'],
        contextWindow: 16384,
        recommended: false,
        priority: 2
    },
    'devstral:24b': {
        category: 'code',
        description: 'Devstral 24B - Best for software engineering agents',
        useCases: ['code_generation', 'code_analysis', 'multi_file_editing'],
        capabilities: ['code', 'text', 'analysis', 'tools', 'exploration'],
        contextWindow: 16384,
        recommended: true,
        priority: 3
    },
    'codellama:34b': {
        category: 'code',
        description: 'Code Llama 34B - Professional code generation',
        useCases: ['code_generation', 'code_analysis', 'documentation'],
        capabilities: ['code', 'text', 'analysis', 'documentation'],
        contextWindow: 16384,
        recommended: false,
        priority: 4
    },
    // Multimodal Models (Latest & Most Capable)
    'llama4:16x17b': {
        category: 'multimodal',
        description: 'Llama 4 16x17B - Latest Meta multimodal model',
        useCases: ['image_analysis', 'visual_reasoning', 'multimodal'],
        capabilities: ['text', 'image', 'vision', 'analysis', 'tools'],
        contextWindow: 128000,
        recommended: true,
        priority: 1
    },
    'qwen3-vl:32b': {
        category: 'multimodal',
        description: 'Qwen3-VL 32B - Most powerful vision-language model',
        useCases: ['image_analysis', 'visual_reasoning', 'multimodal'],
        capabilities: ['text', 'image', 'vision', 'analysis', 'thinking'],
        contextWindow: 32768,
        recommended: false,
        priority: 2
    },
    'glm-4.7-flash': {
        category: 'multimodal',
        description: 'GLM-4.7-Flash - Lightweight multimodal for quick analysis',
        useCases: ['image_analysis', 'visual_reasoning'],
        capabilities: ['text', 'image', 'vision', 'analysis'],
        contextWindow: 128000,
        recommended: false,
        priority: 3
    },
    'llava:13b': {
        category: 'multimodal',
        description: 'LLaVA 13B - Proven multimodal capabilities',
        useCases: ['image_analysis', 'visual_reasoning'],
        capabilities: ['text', 'image', 'vision', 'analysis'],
        contextWindow: 4096,
        recommended: false,
        priority: 4
    },
    // Reasoning Models (Advanced Analysis)
    'deepseek-r1:32b': {
        category: 'reasoning',
        description: 'DeepSeek-R1 32B - Open reasoning model',
        useCases: ['analysis', 'reasoning', 'lead_scoring', 'complex_analysis'],
        capabilities: ['text', 'reasoning', 'analysis', 'thinking'],
        contextWindow: 65536,
        recommended: false,
        priority: 1
    },
    'phi4-reasoning:14b': {
        category: 'reasoning',
        description: 'Phi-4 Reasoning 14B - Complex reasoning capabilities',
        useCases: ['analysis', 'reasoning', 'math', 'logic'],
        capabilities: ['text', 'reasoning', 'analysis', 'math'],
        contextWindow: 4096,
        recommended: true,
        priority: 2
    },
    'qwq:32b': {
        category: 'reasoning',
        description: 'QwQ 32B - Mathematical reasoning model',
        useCases: ['analysis', 'reasoning', 'math', 'data_analysis'],
        capabilities: ['text', 'reasoning', 'analysis', 'math'],
        contextWindow: 32768,
        recommended: false,
        priority: 3
    },
    // Function Calling & Tools (Automation)
    'firefunction-v2:70b': {
        category: 'tools',
        description: 'FireFunction V2 70B - GPT-4o level function calling',
        useCases: ['function_calling', 'tool_use', 'automation'],
        capabilities: ['text', 'tools', 'function_calling', 'analysis'],
        contextWindow: 32768,
        recommended: true,
        priority: 1
    },
    'granite4:3b': {
        category: 'tools',
        description: 'Granite 4 3B - Enterprise tool calling',
        useCases: ['function_calling', 'tool_use', 'enterprise_tasks'],
        capabilities: ['text', 'tools', 'function_calling'],
        contextWindow: 4096,
        recommended: false,
        priority: 2
    },
    'functiongemma:270m': {
        category: 'tools',
        description: 'FunctionGemma 270M - Lightweight function calling',
        useCases: ['function_calling', 'tool_use', 'basic_automation'],
        capabilities: ['text', 'tools', 'function_calling'],
        contextWindow: 8192,
        recommended: false,
        priority: 3
    },
    // Specialized Real Estate Models
    'granite3.2-vision:2b': {
        category: 'specialized',
        description: 'Granite 3.2 Vision 2B - Document analysis for contracts',
        useCases: ['document_analysis', 'ocr', 'contract_processing'],
        capabilities: ['text', 'image', 'vision', 'document_understanding'],
        contextWindow: 4096,
        recommended: false,
        priority: 1
    },
    'glm-ocr': {
        category: 'specialized',
        description: 'GLM-OCR - Multimodal OCR for documents',
        useCases: ['document_analysis', 'ocr', 'property_documents'],
        capabilities: ['text', 'image', 'vision', 'ocr'],
        contextWindow: 8192,
        recommended: false,
        priority: 2
    },
    'deepseek-ocr:3b': {
        category: 'specialized',
        description: 'DeepSeek-OCR 3B - Token-efficient OCR',
        useCases: ['document_analysis', 'ocr', 'property_papers'],
        capabilities: ['text', 'image', 'vision', 'ocr'],
        contextWindow: 4096,
        recommended: false,
        priority: 3
    },
    // Embedding Models (Semantic Search)
    'qwen3-embedding:8b': {
        category: 'embedding',
        description: 'Qwen3 Embedding 8B - Latest multilingual embeddings',
        useCases: ['semantic_search', 'embedding_generation', 'retrieval'],
        capabilities: ['embedding', 'multilingual', 'search'],
        contextWindow: 32768,
        recommended: true,
        priority: 1
    },
    'bge-m3:567m': {
        category: 'embedding',
        description: 'BGE-M3 567M - Versatile multilingual embedding',
        useCases: ['semantic_search', 'embedding_generation', 'retrieval'],
        capabilities: ['embedding', 'multilingual', 'search'],
        contextWindow: 8192,
        recommended: false,
        priority: 2
    },
    'granite-embedding:278m': {
        category: 'embedding',
        description: 'Granite Embedding 278M - IBM multilingual embeddings',
        useCases: ['semantic_search', 'embedding_generation'],
        capabilities: ['embedding', 'multilingual'],
        contextWindow: 4096,
        recommended: false,
        priority: 3
    }
};
// Real Estate Specific Use Case Mapping
const REAL_ESTATE_USE_CASES = {
    'lead_analysis': {
        primary: ['deepseek-r1:32b', 'qwen2.5:32b', 'phi4-reasoning:14b'],
        fallback: ['llama3.1:8b', 'mistral-small3.2']
    },
    'property_description': {
        primary: ['llama3.1:8b', 'mistral-small3.2', 'qwen2.5:32b'],
        fallback: ['llama3.1:70b']
    },
    'code_generation': {
        primary: ['qwen3-coder:30b', 'devstral:24b', 'deepseek-coder-v2:236b'],
        fallback: ['codellama:34b', 'firefunction-v2:70b']
    },
    'image_analysis': {
        primary: ['llama4:16x17b', 'qwen3-vl:32b', 'llava:13b'],
        fallback: ['glm-4.7-flash']
    },
    'document_processing': {
        primary: ['granite3.2-vision:2b', 'glm-ocr'],
        fallback: ['deepseek-ocr:3b']
    },
    'multilingual_content': {
        primary: ['qwen2.5:32b', 'llama3.1:8b'],
        fallback: ['mistral-small3.2']
    },
    'function_calling': {
        primary: ['firefunction-v2:70b', 'granite4:3b'],
        fallback: ['functiongemma:270m']
    },
    'semantic_search': {
        primary: ['qwen3-embedding:8b', 'bge-m3:567m'],
        fallback: ['granite-embedding:278m']
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
const AnalyzeDocumentSchema = z.object({
    document: z.string(), // Base64 encoded document
    prompt: z.string().optional(),
    model: z.string().optional()
});
const GenerateEmbeddingSchema = z.object({
    content: z.string(),
    model: z.string().optional()
});
// Create MCP Server
const server = new Server({
    name: 'reengine-llama',
    version: '0.1.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Model Selection Logic (Enhanced for Real Estate)
const selectOptimalModel = (useCase, requirements) => {
    // Check for real estate specific use cases first
    const useCaseMapping = REAL_ESTATE_USE_CASES[useCase];
    if (useCaseMapping) {
        const availablePrimary = useCaseMapping.primary.filter(model => Object.keys(LLAMA_MODELS).includes(model));
        if (availablePrimary.length > 0) {
            // Select best primary model based on requirements
            return availablePrimary[0];
        }
        const availableFallback = useCaseMapping.fallback.filter(model => Object.keys(LLAMA_MODELS).includes(model));
        if (availableFallback.length > 0) {
            return availableFallback[0];
        }
    }
    // If specific model is requested and available, use it
    if (requirements?.model && Object.keys(LLAMA_MODELS).includes(requirements.model)) {
        return requirements.model;
    }
    // Filter models by use case
    const availableModels = Object.keys(LLAMA_MODELS).filter(modelId => LLAMA_MODELS[modelId].useCases.includes(useCase));
    if (availableModels.length === 0) {
        return ollamaConfig.defaultModel;
    }
    // Sort by recommendations and requirements
    availableModels.sort((a, b) => {
        const modelA = LLAMA_MODELS[a];
        const modelB = LLAMA_MODELS[b];
        // Prioritize recommended models
        if (modelA.recommended && !modelB.recommended)
            return -1;
        if (!modelA.recommended && modelB.recommended)
            return 1;
        // Consider priority
        if (modelA.priority !== undefined && modelB.priority !== undefined) {
            return modelA.priority - modelB.priority;
        }
        // Consider speed requirements
        if (requirements?.speed === 'fast') {
            // Prefer smaller models for speed
            const sizeA = parseInt(a.split(':')[1].replace('b', '').replace('m', '')) || 7;
            const sizeB = parseInt(b.split(':')[1].replace('b', '').replace('m', '')) || 7;
            return sizeA - sizeB;
        }
        // Consider quality requirements
        if (requirements?.quality === 'excellent') {
            // Prefer larger models for quality
            const sizeA = parseInt(a.split(':')[1].replace('b', '').replace('m', '')) || 7;
            const sizeB = parseInt(b.split(':')[1].replace('b', '').replace('m', '')) || 7;
            return sizeB - sizeA;
        }
        return 0;
    });
    return availableModels[0];
};
// API Call Helper
const callOllamaAPI = async (endpoint, body, retries = 0) => {
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
    }
    catch (error) {
        logger.error(`Ollama API error: ${endpoint} - ${error.message}`);
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
            case 'analyze_document':
                const documentValidated = AnalyzeDocumentSchema.parse(args);
                const documentResult = await analyzeDocument(documentValidated);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(documentResult)
                        }
                    ]
                };
            case 'generate_embedding':
                const embeddingValidated = GenerateEmbeddingSchema.parse(args);
                const embeddingResult = await generateEmbedding(embeddingValidated);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(embeddingResult)
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
                const modelInfoResult = getModelInfo(args.model);
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
    }
    catch (error) {
        logger.error({ tool: name, error: error.message }, 'Tool execution failed');
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
            },
            {
                name: 'analyze_document',
                description: 'Analyze property documents using OCR models',
                inputSchema: {
                    type: 'object',
                    properties: {
                        document: { type: 'string', description: 'Base64 encoded document' },
                        prompt: { type: 'string', description: 'Analysis prompt (optional)' },
                        model: { type: 'string', description: 'Specific model to use (optional)' }
                    },
                    required: ['document']
                }
            },
            {
                name: 'generate_embedding',
                description: 'Generate embeddings for semantic search',
                inputSchema: {
                    type: 'object',
                    properties: {
                        content: { type: 'string', description: 'Text to embed' },
                        model: { type: 'string', description: 'Specific model to use (optional)' }
                    },
                    required: ['content']
                }
            }
        ]
    };
});
// Implementation Functions
async function generateText(params) {
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
            modelInfo: LLAMA_MODELS[selectedModel]
        };
        if (ollamaConfig.cacheEnabled) {
            responseCache.set(cacheKey, {
                response: { ...result, cached: true },
                timestamp: Date.now()
            });
        }
        logger.info(`Text generated successfully - Model: ${selectedModel}, Length: ${result.text.length}`);
        return result;
    }
    catch (error) {
        logger.error('Error generating text: Failed to generate text');
        throw error;
    }
}
async function generateCode(params) {
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
            modelInfo: LLAMA_MODELS[selectedModel]
        };
        if (ollamaConfig.cacheEnabled) {
            responseCache.set(cacheKey, {
                response: { ...result, cached: true },
                timestamp: Date.now()
            });
        }
        logger.info(`Code generated successfully - Model: ${selectedModel}, Language: ${params.language}`);
        return result;
    }
    catch (error) {
        logger.error('Error generating code: Failed to generate code');
        throw error;
    }
}
async function analyzeImage(params) {
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
            modelInfo: LLAMA_MODELS[selectedModel]
        };
        if (ollamaConfig.cacheEnabled) {
            responseCache.set(cacheKey, {
                response: { ...result, cached: true },
                timestamp: Date.now()
            });
        }
        logger.info(`Image analyzed successfully - Model: ${selectedModel}`);
        return result;
    }
    catch (error) {
        logger.error('Error analyzing image: Failed to analyze image');
        throw error;
    }
}
async function listModels(params) {
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
            if (a.category !== b.category)
                return a.category.localeCompare(b.category);
            if (b.recommended && !a.recommended)
                return 1;
            if (a.recommended && !b.recommended)
                return -1;
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
    }
    catch (error) {
        logger.error('Error listing models: Failed to list models');
        throw error;
    }
}
async function optimizeModel(params) {
    try {
        const optimalModel = selectOptimalModel(params.useCase, params.requirements);
        const modelInfo = LLAMA_MODELS[optimalModel];
        const alternatives = Object.entries(LLAMA_MODELS)
            .filter(([id, info]) => info.useCases.includes(params.useCase) && id !== optimalModel)
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
    }
    catch (error) {
        logger.error('Error optimizing model: Failed to optimize model selection');
        throw error;
    }
}
function getModelInfo(modelId) {
    try {
        const modelInfo = LLAMA_MODELS[modelId];
        if (!modelInfo) {
            throw new Error(`Model not found: ${modelId}`);
        }
        return {
            id: modelId,
            ...modelInfo,
            available: true
        };
    }
    catch (error) {
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
    }
    catch (error) {
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
async function analyzeDocument(params) {
    try {
        const selectedModel = params.model || selectOptimalModel('document_processing', params);
        const cacheKey = `document_${selectedModel}_${params.document.substring(0, 100)}`;
        if (ollamaConfig.cacheEnabled && responseCache.has(cacheKey)) {
            const cached = responseCache.get(cacheKey);
            if (Date.now() - cached.timestamp < ollamaConfig.cacheTtl) {
                logger.info(`Cache hit for document analysis: ${selectedModel}`);
                return cached.response;
            }
        }
        const prompt = params.prompt || 'Analyze this document in detail. Extract key information, identify important clauses, and provide a comprehensive summary.';
        const requestBody = {
            model: selectedModel,
            prompt: prompt,
            images: [params.document],
            stream: false,
            options: {
                temperature: 0.3,
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
            modelInfo: LLAMA_MODELS[selectedModel]
        };
        if (ollamaConfig.cacheEnabled) {
            responseCache.set(cacheKey, {
                response: { ...result, cached: true },
                timestamp: Date.now()
            });
        }
        logger.info(`Document analyzed successfully - Model: ${selectedModel}`);
        return result;
    }
    catch (error) {
        logger.error('Error analyzing document: Failed to analyze document');
        throw error;
    }
}
async function generateEmbedding(params) {
    try {
        const selectedModel = params.model || selectOptimalModel('semantic_search', params);
        const cacheKey = `embedding_${selectedModel}_${params.content}`;
        if (ollamaConfig.cacheEnabled && responseCache.has(cacheKey)) {
            const cached = responseCache.get(cacheKey);
            if (Date.now() - cached.timestamp < ollamaConfig.cacheTtl) {
                logger.info(`Cache hit for embedding generation: ${selectedModel}`);
                return cached.response;
            }
        }
        const requestBody = {
            model: selectedModel,
            prompt: params.content,
            stream: false,
            options: {
                temperature: 0.0,
                num_predict: 512
            }
        };
        const response = await callOllamaAPI('/embeddings', requestBody);
        const result = {
            embedding: response.embedding || [],
            model: selectedModel,
            content: params.content,
            usage: response.usage,
            cached: false,
            selectedModel,
            modelInfo: LLAMA_MODELS[selectedModel]
        };
        if (ollamaConfig.cacheEnabled) {
            responseCache.set(cacheKey, {
                response: { ...result, cached: true },
                timestamp: Date.now()
            });
        }
        logger.info(`Embedding generated successfully - Model: ${selectedModel}`);
        return result;
    }
    catch (error) {
        logger.error('Error generating embedding: Failed to generate embedding');
        throw error;
    }
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
//# sourceMappingURL=index.js.map