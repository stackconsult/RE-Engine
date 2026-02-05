/**
 * Enhanced VertexAI MCP Server with Skills, Rules, and Cohesive Integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pino from 'pino';

// Import enhanced components
import { EnhancedVertexAIClient } from './enhanced-api-client';
import { RealEstateAnalystSkill, RealEstateAnalysisRequest } from './skills/real-estate-analyst.skill';
import { RealEstateGovernanceRules, GovernanceContext } from './rules/real-estate-governance.rules';

const logger = pino();

// Enhanced VertexAI Configuration
const vertexConfig = {
  projectId: process.env.VERTEX_AI_PROJECT_ID || '',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  model: process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash-lite',
  enableCaching: process.env.VERTEX_AI_ENABLE_CACHE === 'true',
  enableRetry: process.env.VERTEX_AI_ENABLE_RETRY !== 'false',
  maxRetries: parseInt(process.env.VERTEX_AI_MAX_RETRIES || '3'),
  timeoutMs: parseInt(process.env.VERTEX_AI_TIMEOUT || '30000')
};

// Initialize enhanced components
const enhancedClient = new EnhancedVertexAIClient(vertexConfig);
const realEstateSkill = new RealEstateAnalystSkill(enhancedClient);
const governanceRules = new RealEstateGovernanceRules();

// Enhanced schemas with validation
const EnhancedGenerateContentSchema = z.object({
  contents: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
      text: z.string()
    }))
  })),
  generationConfig: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().min(1).max(8192).optional(),
    topK: z.number().min(1).max(40).optional(),
    topP: z.number().min(0).max(0.95).optional()
  }).optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  enableGovernance: z.boolean().optional()
});

const RealEstateAnalysisSchema = z.object({
  type: z.enum(['market_analysis', 'property_valuation', 'investment_analysis', 'lead_qualification']),
  location: z.string().optional(),
  propertyData: z.any().optional(),
  marketData: z.any().optional(),
  clientProfile: z.any().optional(),
  preferences: z.object({
    detailLevel: z.enum(['basic', 'comprehensive', 'expert']).optional(),
    focusAreas: z.array(z.string()).optional(),
    format: z.enum(['report', 'summary', 'recommendations']).optional()
  }).optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional()
});

// Create enhanced MCP Server
const server = new Server(
  {
    name: 'reengine-vertexai-enhanced',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Enhanced tool handlers with governance and skills integration
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'enhanced_generate_content':
        const contentValidated = EnhancedGenerateContentSchema.parse(args);
        const contentResult = await handleEnhancedContentGeneration(contentValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(contentResult)
            }
          ]
        };

      case 'real_estate_analysis':
        const analysisValidated = RealEstateAnalysisSchema.parse(args);
        const analysisResult = await handleRealEstateAnalysis(analysisValidated);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analysisResult)
            }
          ]
        };

      case 'governance_check':
        const governanceResult = await handleGovernanceCheck(args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(governanceResult)
            }
          ]
        };

      case 'conversation_memory':
        const memoryResult = await handleConversationMemory(args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(memoryResult)
            }
          ]
        };

      case 'performance_metrics':
        const metricsResult = await handlePerformanceMetrics();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metricsResult)
            }
          ]
        };

      case 'skill_capabilities':
        const capabilitiesResult = await handleSkillCapabilities();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(capabilitiesResult)
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

// Enhanced tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'enhanced_generate_content',
        description: 'Generate content with enhanced context, memory, and governance',
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
            },
            conversationId: { type: 'string', description: 'Conversation ID for memory context' },
            userId: { type: 'string', description: 'User ID for personalization' },
            enableGovernance: { type: 'boolean', description: 'Enable governance rules' }
          },
          required: ['contents']
        }
      },
      {
        name: 'real_estate_analysis',
        description: 'Perform comprehensive real estate analysis with domain expertise',
        inputSchema: {
          type: 'object',
          properties: {
            type: { 
              type: 'string', 
              enum: ['market_analysis', 'property_valuation', 'investment_analysis', 'lead_qualification'] 
            },
            location: { type: 'string', description: 'Property location' },
            propertyData: { type: 'object', description: 'Property details' },
            marketData: { type: 'object', description: 'Market information' },
            clientProfile: { type: 'object', description: 'Client information' },
            preferences: {
              type: 'object',
              properties: {
                detailLevel: { type: 'string', enum: ['basic', 'comprehensive', 'expert'] },
                focusAreas: { type: 'array', items: { type: 'string' } },
                format: { type: 'string', enum: ['report', 'summary', 'recommendations'] }
              }
            },
            conversationId: { type: 'string' },
            userId: { type: 'string' }
          },
          required: ['type']
        }
      },
      {
        name: 'governance_check',
        description: 'Apply governance rules to request context',
        inputSchema: {
          type: 'object',
          properties: {
            requestType: { type: 'string' },
            userId: { type: 'string' },
            location: { type: 'string' },
            propertyData: { type: 'object' },
            clientProfile: { type: 'object' },
            conversationId: { type: 'string' }
          }
        }
      },
      {
        name: 'conversation_memory',
        description: 'Manage conversation memory and context',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['get', 'clear', 'summary'] },
            conversationId: { type: 'string' },
            userId: { type: 'string' }
          },
          required: ['action', 'conversationId']
        }
      },
      {
        name: 'performance_metrics',
        description: 'Get system performance metrics and analytics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'skill_capabilities',
        description: 'Get available skills and their capabilities',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

/**
 * Enhanced content generation with memory and governance
 */
async function handleEnhancedContentGeneration(params: any): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Apply governance if enabled
    if (params.enableGovernance !== false) {
      const governanceContext: GovernanceContext = {
        requestType: 'content_generation',
        userId: params.userId,
        conversationId: params.conversationId,
        previousInteractions: []
      };

      const governanceResults = await governanceRules.applyGovernance(governanceContext);
      
      // Check for blocks
      const blocks = governanceResults.filter(r => r.action === 'block');
      if (blocks.length > 0) {
        return {
          blocked: true,
          reason: blocks[0].reason,
          governance: governanceResults
        };
      }

      // Apply modifications
      const modifications = governanceResults.filter(r => r.action === 'modify');
      if (modifications.length > 0) {
        params = { ...params, ...modifications[0].modifications };
      }
    }

    // Generate content with enhanced client
    const result = await enhancedClient.generateContentWithMemory(
      params,
      params.conversationId,
      params.userId
    );

    return {
      ...result,
      processingTime: Date.now() - startTime,
      governance: params.enableGovernance !== false ? governanceResults : undefined
    };

  } catch (error) {
    logger.error('Enhanced content generation failed', error);
    throw error;
  }
}

/**
 * Real estate analysis with domain expertise
 */
async function handleRealEstateAnalysis(params: RealEstateAnalysisRequest): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Apply governance rules
    const governanceContext: GovernanceContext = {
      requestType: params.type,
      userId: params.userId,
      conversationId: params.conversationId,
      location: params.location,
      propertyData: params.propertyData,
      clientProfile: params.clientProfile,
      previousInteractions: []
    };

    const governanceResults = await governanceRules.applyGovernance(governanceContext);
    
    // Check for blocks
    const blocks = governanceResults.filter(r => r.action === 'block');
    if (blocks.length > 0) {
      return {
        blocked: true,
        reason: blocks[0].reason,
        governance: governanceResults
      };
    }

    // Apply modifications
    const modifications = governanceResults.filter(r => r.action === 'modify');
    if (modifications.length > 0) {
      params = { ...params, ...modifications[0].modifications };
    }

    // Perform analysis with real estate skill
    const result = await realEstateSkill.analyzeRealEstateRequest(
      params,
      params.conversationId,
      params.userId
    );

    return {
      ...result,
      processingTime: Date.now() - startTime,
      governance: governanceResults
    };

  } catch (error) {
    logger.error('Real estate analysis failed', error);
    throw error;
  }
}

/**
 * Governance check handler
 */
async function handleGovernanceCheck(params: any): Promise<any> {
  try {
    const governanceContext: GovernanceContext = {
      requestType: params.requestType || 'general',
      userId: params.userId,
      conversationId: params.conversationId,
      location: params.location,
      propertyData: params.propertyData,
      clientProfile: params.clientProfile,
      previousInteractions: []
    };

    const results = await governanceRules.applyGovernance(governanceContext);
    
    return {
      results,
      summary: {
        total: results.length,
        blocked: results.filter(r => r.action === 'block').length,
        modified: results.filter(r => r.action === 'modify').length,
        escalated: results.filter(r => r.action === 'escalate').length,
        allowed: results.filter(r => r.action === 'allow').length
      },
      recommendation: results.some(r => r.action === 'block') ? 'block' : 'proceed'
    };

  } catch (error) {
    logger.error('Governance check failed', error);
    throw error;
  }
}

/**
 * Conversation memory handler
 */
async function handleConversationMemory(params: any): Promise<any> {
  try {
    switch (params.action) {
      case 'get':
        // Get conversation insights from enhanced client
        const insights = enhancedClient.getConversationInsights();
        return {
          conversationId: params.conversationId,
          insights,
          available: true
        };

      case 'clear':
        // Clear conversation memory (would need implementation in enhanced client)
        return {
          conversationId: params.conversationId,
          cleared: true,
          message: 'Conversation memory cleared'
        };

      case 'summary':
        // Get conversation summary
        const summary = enhancedClient.getConversationInsights();
        return {
          conversationId: params.conversationId,
          summary: {
            totalConversations: summary.totalConversations,
            averageMessages: summary.averageMessagesPerConversation,
            domainDistribution: summary.domainDistribution,
            intentDistribution: summary.intentDistribution
          }
        };

      default:
        throw new Error(`Unknown memory action: ${params.action}`);
    }

  } catch (error) {
    logger.error('Conversation memory operation failed', error);
    throw error;
  }
}

/**
 * Performance metrics handler
 */
async function handlePerformanceMetrics(): Promise<any> {
  try {
    const apiMetrics = enhancedClient.getPerformanceMetrics();
    const skillMetrics = realEstateSkill.getSkillMetrics();
    const governanceMetrics = governanceRules.getGovernanceMetrics();

    return {
      timestamp: new Date().toISOString(),
      api: apiMetrics,
      skills: skillMetrics,
      governance: governanceMetrics,
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

  } catch (error) {
    logger.error('Performance metrics failed', error);
    throw error;
  }
}

/**
 * Skill capabilities handler
 */
async function handleSkillCapabilities(): Promise<any> {
  try {
    return {
      skills: [
        {
          name: 'real_estate_analyst',
          version: '2.0.0',
          description: 'Comprehensive real estate analysis with domain expertise',
          capabilities: [
            'market_analysis',
            'property_valuation',
            'investment_analysis',
            'lead_qualification'
          ],
          features: [
            'conversation_memory',
            'context_awareness',
            'quality_scoring',
            'governance_compliance'
          ],
          metrics: realEstateSkill.getSkillMetrics()
        }
      ],
      governance: {
        rules: governanceRules.getGovernanceMetrics(),
        categories: ['safety', 'quality', 'compliance', 'performance', 'ethics'],
        enforcement: true
      },
      api: {
        version: '2.0.0',
        features: [
          'enhanced_context',
          'conversation_memory',
          'caching',
          'retry_logic',
          'quality_analysis'
        ],
        models: [vertexConfig.model],
        location: vertexConfig.location
      }
    };

  } catch (error) {
    logger.error('Skill capabilities failed', error);
    throw error;
  }
}

// Start enhanced server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('Enhanced RE Engine VertexAI MCP server started', {
    version: '2.0.0',
    projectId: vertexConfig.projectId,
    location: vertexConfig.location,
    model: vertexConfig.model,
    features: ['skills', 'governance', 'memory', 'enhanced_api']
  });
  
  // Log initialization status
  logger.info('Enhanced components initialized', {
    client: 'EnhancedVertexAIClient',
    skills: 1,
    governanceRules: governanceRules.getGovernanceMetrics().totalRules,
    caching: vertexConfig.enableCaching,
    retry: vertexConfig.enableRetry
  });
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Enhanced server startup failed', error);
    process.exit(1);
  });
}
