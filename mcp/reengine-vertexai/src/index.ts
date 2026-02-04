import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

// Vertex AI Configuration
const vertexConfig = {
  apiKey: process.env.VERTEX_AI_API_KEY || '',
  projectId: process.env.VERTEX_AI_PROJECT_ID || '',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  model: process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash-lite',
  webhookUrl: process.env.VERTEX_AI_WEBHOOK_URL,
  webhookSecret: process.env.VERTEX_AI_WEBHOOK_SECRET
};

// Google Cloud Auth
const { JWT } = require('google-auth-library');
const { google } = require('googleapis');

// Initialize Google Auth
const auth = new JWT({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const vertexai = google.vertexai('v1');

// Schemas
const GenerateContentSchema = z.object({
  contents: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
      text: z.string()
    }))
  })),
  generationConfig: z.object({
    temperature: z.number().optional(),
    maxOutputTokens: z.number().optional(),
    topK: z.number().optional(),
    topP: z.number().optional()
  }).optional()
});

const GenerateTextSchema = z.object({
  prompt: z.string(),
  temperature: z.number().optional(),
  maxOutputTokens: z.number().optional(),
  topK: z.number().optional(),
  topP: z.number().optional()
});

const GenerateEmbeddingSchema = z.object({
  content: z.string(),
  taskType: z.enum(['retrieval_document', 'semantic_similarity', 'classification', 'clustering']).optional()
});

const AnalyzeImageSchema = z.object({
  image: z.string(), // Base64 encoded image
  features: z.array(z.string()).optional(),
  language: z.string().optional()
});

const GenerateCodeSchema = z.object({
  prompt: z.string(),
  language: z.string().optional(),
  temperature: z.number().optional(),
  maxOutputTokens: z.number().optional()
});

// Create MCP Server
const server = new Server(
  {
    name: 'reengine-vertexai',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_content':
        const contentValidated = GenerateContentSchema.parse(args);
        const contentResult = await generateContent(contentValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(contentResult)
            }
          ]
        };

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

      case 'get_model_info':
        const modelInfoResult = getModelInfo();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(modelInfoResult)
            }
          ]
        };

      case 'list_available_models':
        const modelsResult = await listAvailableModels();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(modelsResult)
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
        name: 'generate_content',
        description: 'Generate content using Vertex AI Gemini models',
        inputSchema: {
          type: 'object',
          properties: {
            contents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'model'] },
                  parts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' }
                      },
                      required: ['text']
                    }
                  }
                },
                required: ['role', 'parts']
              }
            },
            generationConfig: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                maxOutputTokens: { type: 'number', minimum: 1, maximum: 8192 },
                topK: { type: 'number', minimum: 1, maximum: 40 },
                topP: { type: 'number', minimum: 0, maximum: 0.95 }
              }
            }
          },
          required: ['contents']
        }
      },
      {
        name: 'generate_text',
        description: 'Generate text using Vertex AI Gemini models',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxOutputTokens: { type: 'number', minimum: 1, maximum: 8192 },
            topK: { type: 'number', minimum: 1, maximum: 40 },
            topP: { type: 'number', minimum: 0, maximum: 0.95 }
          },
          required: ['prompt']
        }
      },
      {
        name: 'generate_embedding',
        description: 'Generate embeddings using Vertex AI',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            taskType: { 
              type: 'string', 
              enum: ['retrieval_document', 'semantic_similarity', 'classification', 'clustering'] 
            }
          },
          required: ['content']
        }
      },
      {
        name: 'analyze_image',
        description: 'Analyze images using Vertex AI Vision models',
        inputSchema: {
          type: 'object',
          properties: {
            image: { type: 'string', description: 'Base64 encoded image' },
            features: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Features to extract (e.g., "labels", "text", "objects")'
            },
            language: { type: 'string', description: 'Language for text extraction' }
          },
          required: ['image']
        }
      },
      {
        name: 'generate_code',
        description: 'Generate code using Vertex AI Gemini models',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            language: { type: 'string', description: 'Programming language' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxOutputTokens: { type: 'number', minimum: 1, maximum: 8192 }
          },
          required: ['prompt']
        }
      },
      {
        name: 'get_model_info',
        description: 'Get information about the current Vertex AI model',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'list_available_models',
        description: 'List available Vertex AI models',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'test_connection',
        description: 'Test connection to Vertex AI',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Vertex AI Functions

async function generateContent(params: any) {
  try {
    const authClient = await auth.getClient();
    
    const request = {
      contents: params.contents,
      generationConfig: params.generationConfig || {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topK: 40,
        topP: 0.95
      }
    };

    const response = await vertexai.projects.locations.publishers.models.generateContent({
      parent: `projects/${vertexConfig.projectId}/locations/${vertexConfig.location}/publishers/google/models/${vertexConfig.model}`,
      requestBody: request,
      auth: authClient
    });

    logger.info(`Content generated successfully - Model: ${vertexConfig.model}, Length: ${JSON.stringify(response.data).length}`);

    return response.data;
  } catch (error) {
    logger.error('Error generating content: Failed to generate content');
    throw error;
  }
}

async function generateText(params: any) {
  try {
    const authClient = await auth.getClient();
    
    const request = {
      contents: [
        {
          role: 'user',
          parts: [{ text: params.prompt }]
        }
      ],
      generationConfig: {
        temperature: params.temperature || 0.7,
        maxOutputTokens: params.maxOutputTokens || 2048,
        topK: params.topK || 40,
        topP: params.topP || 0.95
      }
    };

    const response = await vertexai.projects.locations.publishers.models.generateContent({
      parent: `projects/${vertexConfig.projectId}/locations/${vertexConfig.location}/publishers/google/models/${vertexConfig.model}`,
      requestBody: request,
      auth: authClient
    });

    const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    logger.info(`Text generated successfully - Model: ${vertexConfig.model}, Length: ${generatedText.length}`);

    return {
      text: generatedText,
      model: vertexConfig.model,
      usage: response.data.usageMetadata
    };
  } catch (error) {
    logger.error('Error generating text: Failed to generate text');
    throw error;
  }
}

async function generateEmbedding(params: any) {
  try {
    const authClient = await auth.getClient();
    
    const request = {
      model: `text-embedding-004`,
      content: {
        parts: [{ text: params.content }]
      },
      taskType: params.taskType || 'retrieval_document'
    };

    const response = await vertexai.projects.locations.publishers.models.embedContent({
      parent: `projects/${vertexConfig.projectId}/locations/${vertexConfig.location}/publishers/google/models/text-embedding-004`,
      requestBody: request,
      auth: authClient
    });

    logger.info(`Embedding generated successfully - Task: ${params.taskType}, Length: ${params.content.length}`);

    return {
      embedding: response.data.embedding.values,
      model: 'text-embedding-004',
      usage: response.data.usageMetadata
    };
  } catch (error) {
    logger.error('Error generating embedding: Failed to generate embedding');
    throw error;
  }
}

async function analyzeImage(params: any) {
  try {
    const authClient = await auth.getClient();
    
    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: params.image,
                mimeType: 'image/jpeg'
              }
            },
            ...(params.features ? [{ text: `Analyze this image: ${params.features.join(', ')}` }] : [])
          ]
        }
      ]
    };

    const response = await vertexai.projects.locations.publishers.models.generateContent({
      parent: `projects/${vertexConfig.projectId}/locations/${vertexConfig.location}/publishers/google/models/gemini-2.5-flash-lite`,
      requestBody: request,
      auth: authClient
    });

    const analysis = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    logger.info(`Image analyzed successfully - Features: ${params.features}, Length: ${analysis.length}`);

    return {
      analysis,
      model: vertexConfig.model,
      usage: response.data.usageMetadata
    };
  } catch (error) {
    logger.error('Error analyzing image: Failed to analyze image');
    throw error;
  }
}

async function generateCode(params: any) {
  try {
    const authClient = await auth.getClient();
    
    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: params.prompt },
            ...(params.language ? [{ text: `\n\nLanguage: ${params.language}` }] : [])
          ]
        }
      ],
      generationConfig: {
        temperature: params.temperature || 0.1,
        maxOutputTokens: params.maxOutputTokens || 4096
      }
    };

    const response = await vertexai.projects.locations.publishers.models.generateContent({
      parent: `projects/${vertexConfig.projectId}/locations/${vertexConfig.location}/publishers/google/models/${vertexConfig.model}`,
      requestBody: request,
      auth: authClient
    });

    const generatedCode = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    logger.info(`Code generated successfully - Language: ${params.language}, Length: ${generatedCode.length}`);

    return {
      code: generatedCode,
      model: vertexConfig.model,
      usage: response.data.usageMetadata
    };
  } catch (error) {
    logger.error('Error generating code: Failed to generate code');
    throw error;
  }
}

function getModelInfo() {
  return {
    model: vertexConfig.model,
    projectId: vertexConfig.projectId,
    location: vertexConfig.location,
    apiKey: vertexConfig.apiKey ? '***' : 'Not configured',
    webhookUrl: vertexConfig.webhookUrl || 'Not configured',
    features: [
      'text_generation',
      'content_generation',
      'embedding_generation',
      'image_analysis',
      'code_generation',
      'multi_modal'
    ]
  };
}

async function listAvailableModels() {
  try {
    const authClient = await auth.getClient();
    
    const response = await vertexai.projects.locations.publishers.models.list({
      parent: `projects/${vertexConfig.projectId}/locations/${vertexConfig.location}/publishers/google/models`,
      auth: authClient
    });

    const models = response.data.models.map((model: any) => ({
      name: model.displayName || model.name,
      id: model.name,
      description: model.description || '',
      supportedGenerationMethods: model.supportedGenerationMethods || [],
      baseModelId: model.baseModelId || model.name,
      version: model.version || '1.0'
    }));

    logger.info(`Available models listed: ${models.length} models found`);

    return {
      models,
      total: models.length,
      projectId: vertexConfig.projectId,
      location: vertexConfig.location
    };
  } catch (error) {
    logger.error('Error listing models: Failed to list models');
    throw error;
  }
}

async function testConnection() {
  try {
    // Test authentication
    const authClient = await auth.getClient();
    
    // Test API access by listing models
    await listAvailableModels();
    
    logger.info('Vertex AI connection test successful');
    
    return {
      status: 'connected',
      projectId: vertexConfig.projectId,
      location: vertexConfig.location,
      model: vertexConfig.model,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Vertex AI connection test failed: Connection test failed');
    throw error;
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('RE Engine Vertex AI MCP server started');
  
  logger.info(`Vertex AI Configuration - Project: ${vertexConfig.projectId}, Location: ${vertexConfig.location}, Model: ${vertexConfig.model}`);
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Server startup failed: Server failed to start');
    process.exit(1);
  });
}
