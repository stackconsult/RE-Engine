/**
 * NEON Database Manager
 * Handles all database operations for the enhanced LLAMA + Fish API integration
 */

import { Pool, Client } from 'pg';
import pino from 'pino';
import { defaultIntegrationConfig, databaseSchema } from '../config/neon-supabase-config.js';

const logger = pino({ level: 'info' });

export interface Listing {
  id?: string;
  address: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType?: string;
  coordinates?: { lat: number; lng: number };
  embedding?: number[];
  metadata?: Record<string, any>;
  images?: string[];
  description?: string;
  listingUrl?: string;
  source?: string;
  scrapedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketInsight {
  id?: string;
  location: string;
  insightType: string;
  confidenceScore: number;
  aiModelUsed: string;
  rawResponse: Record<string, any>;
  processedInsights: Record<string, any>;
  embedding?: number[];
  workflowId?: string;
  createdAt?: Date;
}

export interface UserWorkflow {
  id?: string;
  userId: string;
  workflowType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  inputData: Record<string, any>;
  results?: Record<string, any>;
  sharedWith: string[];
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

export interface ScrapingSession {
  id?: string;
  userId: string;
  sourceUrl: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: Record<string, any>;
  errorMessage?: string;
  metadata?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
}

export class NeonDatabaseManager {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool({
      connectionString: defaultIntegrationConfig.neon.connectionString,
      max: defaultIntegrationConfig.neon.maxConnections,
      idleTimeoutMillis: defaultIntegrationConfig.neon.idleTimeout,
      connectionTimeoutMillis: defaultIntegrationConfig.neon.connectionTimeout,
    });
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing NEON database...');
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      // Set up extensions
      await this.setupExtensions();
      
      // Set up schemas
      await this.setupSchemas();
      
      // Set up tables
      await this.setupTables();
      
      // Set up functions
      await this.setupFunctions();
      
      // Set up triggers
      await this.setupTriggers();
      
      this.isInitialized = true;
      logger.info('NEON database initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize NEON database: ' + (error as Error).message);
      throw error;
    }
  }

  private async setupExtensions(): Promise<void> {
    const client = await this.pool.connect();
    try {
      for (const extension of databaseSchema.extensions) {
        await client.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
        logger.info(`Extension ${extension} enabled`);
      }
    } finally {
      client.release();
    }
  }

  private async setupSchemas(): Promise<void> {
    const client = await this.pool.connect();
    try {
      for (const schema of databaseSchema.schemas) {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
        logger.info(`Schema ${schema} created`);
      }
    } finally {
      client.release();
    }
  }

  private async setupTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create listings table
      await client.query(databaseSchema.tables.listings);
      logger.info('Listings table created');
      
      // Create market_insights table
      await client.query(databaseSchema.tables.market_insights);
      logger.info('Market insights table created');
      
      // Create user_workflows table
      await client.query(databaseSchema.tables.user_workflows);
      logger.info('User workflows table created');
      
      // Create scraping_sessions table
      await client.query(databaseSchema.tables.scraping_sessions);
      logger.info('Scraping sessions table created');
      
      // Create market_alerts table
      await client.query(databaseSchema.tables.market_alerts);
      logger.info('Market alerts table created');
      
      // Create market_watches table
      await client.query(databaseSchema.tables.market_watches);
      logger.info('Market watches table created');
      
    } finally {
      client.release();
    }
  }

  private async setupFunctions(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create update_timestamp function
      await client.query(databaseSchema.functions.update_timestamp);
      logger.info('Update timestamp function created');
      
      // Create generate_embedding function
      await client.query(databaseSchema.functions.generate_embedding);
      logger.info('Generate embedding function created');
      
      // Create calculate_similarity function
      await client.query(databaseSchema.functions.calculate_similarity);
      logger.info('Calculate similarity function created');
      
    } finally {
      client.release();
    }
  }

  private async setupTriggers(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create triggers
      await client.query(databaseSchema.triggers.update_listings_timestamp);
      await client.query(databaseSchema.triggers.update_workflows_timestamp);
      await client.query(databaseSchema.triggers.generate_listing_embedding);
      
      logger.info('Database triggers created');
      
    } finally {
      client.release();
    }
  }

  // Listing operations
  async insertListing(listing: Listing): Promise<Listing> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO listings (
          address, price, bedrooms, bathrooms, sqft, year_built, 
          property_type, coordinates, embedding, metadata, images, 
          description, listing_url, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        listing.address,
        listing.price,
        listing.bedrooms,
        listing.bathrooms,
        listing.sqft,
        listing.yearBuilt,
        listing.propertyType,
        listing.coordinates ? `POINT(${listing.coordinates.lng}, ${listing.coordinates.lat})` : null,
        listing.embedding,
        JSON.stringify(listing.metadata || {}),
        listing.images,
        listing.description,
        listing.listingUrl,
        listing.source
      ];
      
      const result = await client.query(query, values);
      return this.mapRowToListing(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  async findSimilarListings(embedding: number[], limit: number = 10): Promise<Listing[]> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT *, 
               embedding <=> $1 as distance
        FROM listings 
        WHERE embedding <=> $1 < 0.3
        ORDER BY embedding <=> $1 
        LIMIT $2
      `;
      
      const result = await client.query(query, [embedding, limit]);
      return result.rows.map(row => this.mapRowToListing(row));
      
    } finally {
      client.release();
    }
  }

  async searchListings(criteria: {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    bedrooms?: number;
    coordinates?: { lat: number; lng: number; radius?: number };
    limit?: number;
  }): Promise<Listing[]> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM listings WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;
      
      if (criteria.location) {
        query += ` AND address ILIKE $${paramIndex}`;
        values.push(`%${criteria.location}%`);
        paramIndex++;
      }
      
      if (criteria.minPrice) {
        query += ` AND price >= $${paramIndex}`;
        values.push(criteria.minPrice);
        paramIndex++;
      }
      
      if (criteria.maxPrice) {
        query += ` AND price <= $${paramIndex}`;
        values.push(criteria.maxPrice);
        paramIndex++;
      }
      
      if (criteria.propertyType) {
        query += ` AND property_type = $${paramIndex}`;
        values.push(criteria.propertyType);
        paramIndex++;
      }
      
      if (criteria.bedrooms) {
        query += ` AND bedrooms >= $${paramIndex}`;
        values.push(criteria.bedrooms);
        paramIndex++;
      }
      
      if (criteria.coordinates) {
        query += ` AND ST_DWithin(coordinates, ST_MakePoint($${paramIndex}, $${paramIndex + 1}), $${paramIndex + 2})`;
        values.push(criteria.coordinates.lng, criteria.coordinates.lat, criteria.coordinates.radius || 10000);
        paramIndex += 3;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      values.push(criteria.limit || 50);
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToListing(row));
      
    } finally {
      client.release();
    }
  }

  // Market insights operations
  async insertMarketInsight(insight: MarketInsight): Promise<MarketInsight> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO market_insights (
          location, insight_type, confidence_score, ai_model_used,
          raw_response, processed_insights, embedding, workflow_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        insight.location,
        insight.insightType,
        insight.confidenceScore,
        insight.aiModelUsed,
        JSON.stringify(insight.rawResponse),
        JSON.stringify(insight.processedInsights),
        insight.embedding,
        insight.workflowId
      ];
      
      const result = await client.query(query, values);
      return this.mapRowToMarketInsight(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  async getMarketInsightsByLocation(location: string, limit: number = 20): Promise<MarketInsight[]> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM market_insights 
        WHERE location ILIKE $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await client.query(query, [`%${location}%`, limit]);
      return result.rows.map(row => this.mapRowToMarketInsight(row));
      
    } finally {
      client.release();
    }
  }

  // User workflow operations
  async insertUserWorkflow(workflow: UserWorkflow): Promise<UserWorkflow> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO user_workflows (
          user_id, workflow_type, status, input_data, 
          shared_with, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        workflow.userId,
        workflow.workflowType,
        workflow.status,
        JSON.stringify(workflow.inputData),
        workflow.sharedWith,
        workflow.isPublic
      ];
      
      const result = await client.query(query, values);
      return this.mapRowToUserWorkflow(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  async updateUserWorkflow(id: string, updates: Partial<UserWorkflow>): Promise<UserWorkflow> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (updates.status) {
        setClause.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }
      
      if (updates.results) {
        setClause.push(`results = $${paramIndex}`);
        values.push(JSON.stringify(updates.results));
        paramIndex++;
      }
      
      if (updates.sharedWith) {
        setClause.push(`shared_with = $${paramIndex}`);
        values.push(updates.sharedWith);
        paramIndex++;
      }
      
      if (updates.isPublic !== undefined) {
        setClause.push(`is_public = $${paramIndex}`);
        values.push(updates.isPublic);
        paramIndex++;
      }
      
      if (updates.status === 'completed') {
        setClause.push(`completed_at = NOW()`);
      }
      
      const query = `
        UPDATE user_workflows 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      values.push(id);
      
      const result = await client.query(query, values);
      return this.mapRowToUserWorkflow(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  async getUserWorkflows(userId: string, includeShared: boolean = true): Promise<UserWorkflow[]> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM user_workflows 
        WHERE user_id = $1
      `;
      const values = [userId];
      
      if (includeShared) {
        query += ` OR $1 = ANY(shared_with)`;
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToUserWorkflow(row));
      
    } finally {
      client.release();
    }
  }

  // Scraping session operations
  async insertScrapingSession(session: ScrapingSession): Promise<ScrapingSession> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO scraping_sessions (
          user_id, source_url, status, progress, 
          results, error_message, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        session.userId,
        session.sourceUrl,
        session.status,
        session.progress,
        JSON.stringify(session.results || {}),
        session.errorMessage,
        JSON.stringify(session.metadata || {})
      ];
      
      const result = await client.query(query, values);
      return this.mapRowToScrapingSession(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  async updateScrapingSession(id: string, updates: Partial<ScrapingSession>): Promise<ScrapingSession> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (updates.status) {
        setClause.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }
      
      if (updates.progress !== undefined) {
        setClause.push(`progress = $${paramIndex}`);
        values.push(updates.progress);
        paramIndex++;
      }
      
      if (updates.results) {
        setClause.push(`results = $${paramIndex}`);
        values.push(JSON.stringify(updates.results));
        paramIndex++;
      }
      
      if (updates.errorMessage) {
        setClause.push(`error_message = $${paramIndex}`);
        values.push(updates.errorMessage);
        paramIndex++;
      }
      
      if (updates.status === 'completed' || updates.status === 'failed') {
        setClause.push(`completed_at = NOW()`);
      }
      
      const query = `
        UPDATE scraping_sessions 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      values.push(id);
      
      const result = await client.query(query, values);
      return this.mapRowToScrapingSession(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  async getScrapingSessions(userId: string, status?: string): Promise<ScrapingSession[]> {
    this.ensureInitialized();
    
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM scraping_sessions WHERE user_id = $1';
      const values = [userId];
      
      if (status) {
        query += ' AND status = $2';
        values.push(status);
      }
      
      query += ' ORDER BY started_at DESC';
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToScrapingSession(row));
      
    } finally {
      client.release();
    }
  }

  // Utility methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database manager not initialized. Call initialize() first.');
    }
  }

  private mapRowToListing(row: any): Listing {
    return {
      id: row.id,
      address: row.address,
      price: row.price ? parseFloat(row.price) : undefined,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      sqft: row.sqft,
      yearBuilt: row.year_built,
      propertyType: row.property_type,
      coordinates: row.coordinates ? this.parsePoint(row.coordinates) : undefined,
      embedding: row.embedding,
      metadata: row.metadata,
      images: row.images,
      description: row.description,
      listingUrl: row.listing_url,
      source: row.source,
      scrapedAt: row.scraped_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToMarketInsight(row: any): MarketInsight {
    return {
      id: row.id,
      location: row.location,
      insightType: row.insight_type,
      confidenceScore: row.confidence_score,
      aiModelUsed: row.ai_model_used,
      rawResponse: row.raw_response,
      processedInsights: row.processed_insights,
      embedding: row.embedding,
      workflowId: row.workflow_id,
      createdAt: row.created_at
    };
  }

  private mapRowToUserWorkflow(row: any): UserWorkflow {
    return {
      id: row.id,
      userId: row.user_id,
      workflowType: row.workflow_type,
      status: row.status,
      inputData: row.input_data,
      results: row.results,
      sharedWith: row.shared_with,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }

  private mapRowToScrapingSession(row: any): ScrapingSession {
    return {
      id: row.id,
      userId: row.user_id,
      sourceUrl: row.source_url,
      status: row.status,
      progress: row.progress,
      results: row.results,
      errorMessage: row.error_message,
      metadata: row.metadata,
      startedAt: row.started_at,
      completedAt: row.completed_at
    };
  }

  private parsePoint(point: string): { lat: number; lng: number } {
    const match = point.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2])
      };
    }
    throw new Error('Invalid point format');
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('NEON database connection pool closed');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed: ' + (error as Error).message);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }
}
