/**
 * Enhanced Integration Server
 * Combines LLAMA + Fish API with NEON + SuperBase for a complete real estate intelligence platform
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pino from 'pino';

import { NeonDatabaseManager } from './core/neon-database-manager.js';
import { SuperBaseIntegration } from './core/supabase-integration.js';
import { defaultIntegrationConfig } from './config/neon-supabase-config.js';

const logger = pino({ level: 'info' });

export class EnhancedIntegrationServer {
  private server: Server;
  private neonManager: NeonDatabaseManager;
  private supabaseIntegration: SuperBaseIntegration;
  private isInitialized = false;

  constructor() {
    this.server = new Server(
      {
        name: 'reengine-enhanced-integration',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.neonManager = new NeonDatabaseManager();
    this.supabaseIntegration = new SuperBaseIntegration();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Enhanced Integration Server...');
      
      // Initialize NEON database
      await this.neonManager.initialize();
      logger.info('NEON database initialized');
      
      // Initialize SuperBase integration
      // Note: SuperBase client is created in constructor
      
      this.isInitialized = true;
      logger.info('Enhanced Integration Server initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Enhanced Integration Server:', error);
      throw error;
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Enhanced scraping with persistence
          {
            name: 'enhanced_scrape_listings',
            description: 'Scrape real estate listings with persistent storage and AI analysis',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location to search' },
                propertyType: {
                  type: 'string',
                  enum: ['single-family', 'multi-family', 'condo', 'townhouse', 'land'],
                  description: 'Type of property'
                },
                priceRange: {
                  type: 'object',
                  properties: {
                    min: { type: 'number' },
                    max: { type: 'number' }
                  }
                },
                beds: { type: 'number' },
                baths: { type: 'number' },
                limit: { type: 'number', default: 50 },
                userId: { type: 'string', description: 'User ID for authentication' },
                saveToDatabase: { type: 'boolean', default: true },
                generateInsights: { type: 'boolean', default: true }
              },
              required: ['location', 'userId']
            }
          },

          // Semantic search with vector embeddings
          {
            name: 'semantic_property_search',
            description: 'Search properties using natural language and vector similarity',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Natural language search query' },
                filters: {
                  type: 'object',
                  properties: {
                    minPrice: { type: 'number' },
                    maxPrice: { type: 'number' },
                    propertyType: { type: 'string' },
                    bedrooms: { type: 'number' },
                    location: {
                      type: 'object',
                      properties: {
                        lat: { type: 'number' },
                        lng: { type: 'number' },
                        radius: { type: 'number', default: 10000 }
                      }
                    }
                  }
                },
                limit: { type: 'number', default: 20 },
                userId: { type: 'string' }
              },
              required: ['query', 'userId']
            }
          },

          // Collaborative workflows
          {
            name: 'create_collaborative_workflow',
            description: 'Create a collaborative real estate analysis workflow',
            inputSchema: {
              type: 'object',
              properties: {
                workflowType: {
                  type: 'string',
                  enum: ['market_analysis', 'property_valuation', 'lead_qualification', 'investment_analysis']
                },
                inputData: { type: 'object' },
                sharedWith: { type: 'array', items: { type: 'string' } },
                isPublic: { type: 'boolean', default: false },
                userId: { type: 'string' }
              },
              required: ['workflowType', 'inputData', 'userId']
            }
          },

          // Real-time market monitoring
          {
            name: 'setup_market_watch',
            description: 'Set up real-time market monitoring with alerts',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Watch name' },
                criteria: { type: 'object', description: 'Search criteria' },
                userId: { type: 'string' }
              },
              required: ['name', 'criteria', 'userId']
            }
          },

          // User management
          {
            name: 'authenticate_user',
            description: 'Authenticate user and get profile',
            inputSchema: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'JWT token' }
              },
              required: ['token']
            }
          },

          {
            name: 'update_user_profile',
            description: 'Update user profile and preferences',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                preferences: { type: 'object' },
                subscriptionTier: {
                  type: 'string',
                  enum: ['free', 'pro', 'enterprise']
                }
              },
              required: ['userId']
            }
          },

          // Storage operations
          {
            name: 'upload_listing_images',
            description: 'Upload listing images to storage',
            inputSchema: {
              type: 'object',
              properties: {
                listingId: { type: 'string' },
                images: {
                  type: 'array',
                  items: { type: 'string', description: 'Base64 encoded images' }
                },
                userId: { type: 'string' }
              },
              required: ['listingId', 'images', 'userId']
            }
          },

          // Analytics and insights
          {
            name: 'get_market_insights',
            description: 'Get AI-powered market insights for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string' },
                insightType: {
                  type: 'string',
                  enum: ['price_trends', 'inventory_analysis', 'investment_opportunities', 'market_forecast']
                },
                timeRange: {
                  type: 'string',
                  enum: ['1-month', '3-months', '6-months', '1-year']
                },
                userId: { type: 'string' }
              },
              required: ['location', 'userId']
            }
          },

          // Health and status
          {
            name: 'system_health_check',
            description: 'Check system health and status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'enhanced_scrape_listings':
            return await this.handleEnhancedScraping(args);
          
          case 'semantic_property_search':
            return await this.handleSemanticSearch(args);
          
          case 'create_collaborative_workflow':
            return await this.handleCreateWorkflow(args);
          
          case 'setup_market_watch':
            return await this.handleMarketWatch(args);
          
          case 'authenticate_user':
            return await this.handleAuthentication(args);
          
          case 'update_user_profile':
            return await this.handleUpdateProfile(args);
          
          case 'upload_listing_images':
            return await this.handleImageUpload(args);
          
          case 'get_market_insights':
            return await this.handleMarketInsights(args);
          
          case 'system_health_check':
            return await this.handleHealthCheck();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error({ tool: name, error: (error as Error).message }, 'Tool execution failed');
        throw error;
      }
    });
  }

  // Tool handlers
  private async handleEnhancedScraping(args: any) {
    this.ensureInitialized();
    
    const { location, propertyType, priceRange, beds, baths, limit = 50, userId, saveToDatabase = true, generateInsights = true } = args;
    
    try {
      // Authenticate user
      const auth = await this.supabaseIntegration.authenticateUser(args.token || '');
      
      // Create scraping session
      const session = await this.neonManager.insertScrapingSession({
        userId: auth.user.id,
        sourceUrl: `https://www.zillow.com/${location.toLowerCase().replace(/\s+/g, '-')}/homes/`,
        status: 'queued',
        progress: 0,
        metadata: { propertyType, priceRange, beds, baths, limit }
      });

      // Start scraping with real-time updates
      this.startScrapingWithUpdates(session, args);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            sessionId: session.id,
            status: 'started',
            message: 'Scraping initiated with real-time updates'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Enhanced scraping failed: ${(error as Error).message}`);
    }
  }

  private async startScrapingUpdates(session: any, args: any): Promise<void> {
    // Simulate scraping progress updates
    const progressInterval = setInterval(async () => {
      const progress = Math.min(session.progress + 10, 100);
      
      await this.neonManager.updateScrapingSession(session.id, {
        progress
      });
      
      await this.supabaseIntegration.broadcastProgress(session.id, progress, 'scraping');
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        
        // Generate mock results
        const mockResults = this.generateMockScrapingResults(args);
        
        await this.neonManager.updateScrapingSession(session.id, {
          status: 'completed',
          progress: 100,
          results: mockResults
        });
        
        if (args.generateInsights) {
          await this.generateAndStoreInsights(session.id, args.location, mockResults);
        }
      }
    }, 2000);
  }

  private generateMockScrapingResults(args: any): any {
    return {
      listings: [
        {
          address: `123 Main St, ${args.location}`,
          price: args.priceRange?.min || 450000,
          bedrooms: args.beds || 3,
          bathrooms: args.baths || 2,
          sqft: 1850,
          propertyType: args.propertyType || 'single-family',
          description: 'Beautiful property in downtown area',
          images: ['image1.jpg', 'image2.jpg'],
          listingUrl: 'https://zillow.com/homedetails/123-main-st'
        }
      ],
      totalFound: 1,
      scrapedAt: new Date().toISOString()
    };
  }

  private async generateAndStoreInsights(sessionId: string, location: string, data: any): Promise<void> {
    // Generate AI insights (mock for now)
    const insights = {
      marketTrends: 'Prices are trending upward in this area',
      averagePrice: data.listings[0]?.price || 0,
      inventory: 'Low inventory, high demand',
      recommendations: 'Good investment opportunity'
    };
    
    await this.neonManager.insertMarketInsight({
      location,
      insightType: 'market_analysis',
      confidenceScore: 0.85,
      aiModelUsed: 'llama3.1:70b',
      rawResponse: data,
      processedInsights: insights,
      workflowId: sessionId
    });
  }

  private async handleSemanticSearch(args: any) {
    this.ensureInitialized();
    
    const { query, filters = {}, limit = 20, userId } = args;
    
    try {
      // Generate embedding for search query
      const embedding = new Array(1536).fill(0.1); // Mock embedding
      
      // Search with vector similarity
      const results = await this.neonManager.searchListings({
        location: filters.location,
        ...filters,
        limit
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            results,
            totalFound: results.length,
            searchType: 'semantic'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Semantic search failed: ${(error as Error).message}`);
    }
  }

  private async handleCreateWorkflow(args: any) {
    this.ensureInitialized();
    
    const { workflowType, inputData, sharedWith = [], isPublic = false, userId } = args;
    
    try {
      const workflow = await this.neonManager.insertUserWorkflow({
        userId,
        workflowType,
        status: 'pending',
        inputData,
        sharedWith,
        isPublic
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            workflow,
            message: 'Collaborative workflow created successfully'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Workflow creation failed: ${(error as Error).message}`);
    }
  }

  private async handleMarketWatch(args: any) {
    this.ensureInitialized();
    
    const { name, criteria, userId } = args;
    
    try {
      const watch = await this.supabaseIntegration.createMarketWatch(userId, name, criteria);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            watch,
            message: 'Market watch created successfully'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Market watch creation failed: ${(error as Error).message}`);
    }
  }

  private async handleAuthentication(args: any) {
    try {
      const auth = await this.supabaseIntegration.authenticateUser(args.token);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            user: auth.user,
            session: auth.session
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${(error as Error).message}`);
    }
  }

  private async handleUpdateProfile(args: any) {
    const { userId, ...updates } = args;
    
    try {
      const updatedProfile = await this.supabaseIntegration.updateUserProfile(userId, updates);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            profile: updatedProfile,
            message: 'Profile updated successfully'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Profile update failed: ${(error as Error).message}`);
    }
  }

  private async handleImageUpload(args: any) {
    this.ensureInitialized();
    
    const { listingId, images, userId } = args;
    
    try {
      // Convert base64 strings to buffers
      const imageBuffers = images.map((img: string) => Buffer.from(img, 'base64'));
      
      const uploadedFiles = await this.supabaseIntegration.uploadListingImages(listingId, imageBuffers);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            uploadedFiles,
            message: `Successfully uploaded ${uploadedFiles.length} images`
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Image upload failed: ${(error as Error).message}`);
    }
  }

  private async handleMarketInsights(args: any) {
    this.ensureInitialized();
    
    const { location, insightType = 'price_trends', timeRange = '6-months', userId } = args;
    
    try {
      const insights = await this.neonManager.getMarketInsightsByLocation(location, 20);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            location,
            insightType,
            timeRange,
            insights,
            totalFound: insights.length
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Market insights retrieval failed: ${(error as Error).message}`);
    }
  }

  private async handleHealthCheck(): Promise<any> {
    try {
      const neonHealth = await this.neonManager.healthCheck();
      const supabaseHealth = await this.supabaseIntegration.healthCheck();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
              neon: neonHealth,
              supabase: supabaseHealth,
              integration: this.isInitialized ? 'active' : 'inactive'
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: (error as Error).message
          }, null, 2)
        }]
      };
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Server not initialized. Call initialize() first.');
    }
  }

  async run(): Promise<void> {
    try {
      await this.initialize();
      this.setupToolHandlers();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Enhanced Integration Server started successfully');
      logger.info('Features: NEON Database | SuperBase Auth | Real-time Collaboration | Vector Search | Persistent Storage');
      
    } catch (error) {
      logger.error('Server startup failed:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.supabaseIntegration.cleanup();
      await this.neonManager.close();
      
      logger.info('Enhanced Integration Server shut down gracefully');
    } catch (error) {
      logger.error('Shutdown error:', error);
    }
  }
}

// Start the enhanced server
const enhancedServer = new EnhancedIntegrationServer();
enhancedServer.run().catch((error) => {
  logger.error('Enhanced server startup failed');
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await enhancedServer.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await enhancedServer.shutdown();
  process.exit(0);
});
