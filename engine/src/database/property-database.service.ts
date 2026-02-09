/**
 * Property Database Service
 * Handles property and property match operations for CRM integration
 */

import { Logger } from '../utils/logger.js';
import { Pool, PoolClient } from 'pg';

export interface PropertyData {
    property_id?: string;
    tenant_id: string;
    external_id: string;
    source: 'zillow' | 'realtor' | 'mls';
    address: string;
    city?: string;
    state?: string;
    zip_code?: string;
    price?: number;
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_size?: number;
    year_built?: number;
    property_type?: string;
    listing_status?: 'active' | 'pending' | 'sold' | 'off_market';
    days_on_market?: number;
    description?: string;
    images?: string[];
    features?: string[];
    agent_info?: {
        name?: string;
        email?: string;
        phone?: string;
        brokerage?: string;
    };
    raw_data?: any;
    last_synced?: Date;
    created_at?: Date;
    updated_at?: Date;
}

export interface PropertyMatch {
    match_id?: string;
    tenant_id: string;
    lead_id: string;
    property_id: string;
    score: number;
    reasons?: string[];
    recommendations?: string[];
    status?: 'pending' | 'viewed' | 'interested' | 'rejected' | 'scheduled';
    created_at?: Date;
    updated_at?: Date;
}

export interface PropertySearchCriteria {
    city?: string;
    state?: string;
    price_min?: number;
    price_max?: number;
    beds_min?: number;
    baths_min?: number;
    property_type?: string;
    listing_status?: string;
    source?: 'zillow' | 'realtor' | 'mls';
    limit?: number;
    offset?: number;
}

export class PropertyDatabaseService {
    private pool: Pool;
    private logger: Logger;

    constructor(pool: Pool) {
        this.pool = pool;
        this.logger = new Logger('PropertyDatabase', true);
    }

    /**
     * Create or update a property
     * Uses UPSERT to handle duplicates based on tenant_id, external_id, and source
     */
    async upsertProperty(property: PropertyData): Promise<string> {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO properties (
          tenant_id, external_id, source, address, city, state, zip_code,
          price, beds, baths, sqft, lot_size, year_built, property_type,
          listing_status, days_on_market, description, images, features,
          agent_info, raw_data, last_synced
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, NOW()
        )
        ON CONFLICT (tenant_id, external_id, source)
        DO UPDATE SET
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          zip_code = EXCLUDED.zip_code,
          price = EXCLUDED.price,
          beds = EXCLUDED.beds,
          baths = EXCLUDED.baths,
          sqft = EXCLUDED.sqft,
          lot_size = EXCLUDED.lot_size,
          year_built = EXCLUDED.year_built,
          property_type = EXCLUDED.property_type,
          listing_status = EXCLUDED.listing_status,
          days_on_market = EXCLUDED.days_on_market,
          description = EXCLUDED.description,
          images = EXCLUDED.images,
          features = EXCLUDED.features,
          agent_info = EXCLUDED.agent_info,
          raw_data = EXCLUDED.raw_data,
          last_synced = NOW(),
          updated_at = NOW()
        RETURNING property_id
      `;

            const values = [
                property.tenant_id,
                property.external_id,
                property.source,
                property.address,
                property.city,
                property.state,
                property.zip_code,
                property.price,
                property.beds,
                property.baths,
                property.sqft,
                property.lot_size,
                property.year_built,
                property.property_type,
                property.listing_status,
                property.days_on_market,
                property.description,
                JSON.stringify(property.images || []),
                JSON.stringify(property.features || []),
                JSON.stringify(property.agent_info || {}),
                JSON.stringify(property.raw_data || {}),
            ];

            const result = await client.query(query, values);
            const propertyId = result.rows[0].property_id;

            this.logger.info(`Upserted property ${propertyId} from ${property.source}`, {
                tenant_id: property.tenant_id,
                external_id: property.external_id,
            });

            return propertyId;
        } catch (error) {
            this.logger.error('Failed to upsert property', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Search properties with filters
     */
    async searchProperties(
        tenantId: string,
        criteria: PropertySearchCriteria
    ): Promise<{ properties: PropertyData[]; total: number }> {
        const client = await this.pool.connect();
        try {
            const conditions: string[] = ['tenant_id = $1'];
            const values: any[] = [tenantId];
            let paramIndex = 2;

            if (criteria.city) {
                conditions.push(`city ILIKE $${paramIndex}`);
                values.push(`%${criteria.city}%`);
                paramIndex++;
            }

            if (criteria.state) {
                conditions.push(`state = $${paramIndex}`);
                values.push(criteria.state);
                paramIndex++;
            }

            if (criteria.price_min !== undefined) {
                conditions.push(`price >= $${paramIndex}`);
                values.push(criteria.price_min);
                paramIndex++;
            }

            if (criteria.price_max !== undefined) {
                conditions.push(`price <= $${paramIndex}`);
                values.push(criteria.price_max);
                paramIndex++;
            }

            if (criteria.beds_min !== undefined) {
                conditions.push(`beds >= $${paramIndex}`);
                values.push(criteria.beds_min);
                paramIndex++;
            }

            if (criteria.baths_min !== undefined) {
                conditions.push(`baths >= $${paramIndex}`);
                values.push(criteria.baths_min);
                paramIndex++;
            }

            if (criteria.property_type) {
                conditions.push(`property_type ILIKE $${paramIndex}`);
                values.push(`%${criteria.property_type}%`);
                paramIndex++;
            }

            if (criteria.listing_status) {
                conditions.push(`listing_status = $${paramIndex}`);
                values.push(criteria.listing_status);
                paramIndex++;
            }

            if (criteria.source) {
                conditions.push(`source = $${paramIndex}`);
                values.push(criteria.source);
                paramIndex++;
            }

            const whereClause = conditions.join(' AND ');
            const limit = criteria.limit || 20;
            const offset = criteria.offset || 0;

            // Get total count
            const countQuery = `SELECT COUNT(*) FROM properties WHERE ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count);

            // Get properties
            const query = `
        SELECT * FROM properties
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            values.push(limit, offset);

            const result = await client.query(query, values);

            const properties = result.rows.map(row => this.mapRowToProperty(row));

            return { properties, total };
        } catch (error) {
            this.logger.error('Failed to search properties', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get a single property by ID
     */
    async getProperty(propertyId: string, tenantId: string): Promise<PropertyData | null> {
        const client = await this.pool.connect();
        try {
            const query = 'SELECT * FROM properties WHERE property_id = $1 AND tenant_id = $2';
            const result = await client.query(query, [propertyId, tenantId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToProperty(result.rows[0]);
        } catch (error) {
            this.logger.error('Failed to get property', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create a property match
     */
    async createPropertyMatch(match: PropertyMatch): Promise<string> {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO property_matches (
          tenant_id, lead_id, property_id, score, reasons, recommendations, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING match_id
      `;

            const values = [
                match.tenant_id,
                match.lead_id,
                match.property_id,
                match.score,
                JSON.stringify(match.reasons || []),
                JSON.stringify(match.recommendations || []),
                match.status || 'pending',
            ];

            const result = await client.query(query, values);
            const matchId = result.rows[0].match_id;

            this.logger.info(`Created property match ${matchId}`, {
                tenant_id: match.tenant_id,
                lead_id: match.lead_id,
                score: match.score,
            });

            return matchId;
        } catch (error) {
            this.logger.error('Failed to create property match', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get property matches for a lead
     */
    async getPropertyMatches(
        leadId: string,
        tenantId: string,
        status?: string
    ): Promise<PropertyMatch[]> {
        const client = await this.pool.connect();
        try {
            let query = `
        SELECT pm.*, p.address, p.city, p.price, p.beds, p.baths, p.images
        FROM property_matches pm
        JOIN properties p ON pm.property_id = p.property_id
        WHERE pm.lead_id = $1 AND pm.tenant_id = $2
      `;
            const values: any[] = [leadId, tenantId];

            if (status) {
                query += ' AND pm.status = $3';
                values.push(status);
            }

            query += ' ORDER BY pm.score DESC, pm.created_at DESC';

            const result = await client.query(query, values);

            return result.rows.map(row => ({
                match_id: row.match_id,
                tenant_id: row.tenant_id,
                lead_id: row.lead_id,
                property_id: row.property_id,
                score: parseFloat(row.score),
                reasons: row.reasons,
                recommendations: row.recommendations,
                status: row.status,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
        } catch (error) {
            this.logger.error('Failed to get property matches', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update match status
     */
    async updateMatchStatus(
        matchId: string,
        status: 'pending' | 'viewed' | 'interested' | 'rejected' | 'scheduled',
        tenantId: string
    ): Promise<void> {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE property_matches
        SET status = $1, updated_at = NOW()
        WHERE match_id = $2 AND tenant_id = $3
      `;

            await client.query(query, [status, matchId, tenantId]);

            this.logger.info(`Updated match ${matchId} status to ${status}`);
        } catch (error) {
            this.logger.error('Failed to update match status', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Delete old properties (cleanup)
     */
    async deleteOldProperties(tenantId: string, daysOld: number): Promise<number> {
        const client = await this.pool.connect();
        try {
            const query = `
        DELETE FROM properties
        WHERE tenant_id = $1
        AND last_synced < NOW() - INTERVAL '${daysOld} days'
        AND listing_status IN ('sold', 'off_market')
      `;

            const result = await client.query(query, [tenantId]);
            const deletedCount = result.rowCount || 0;

            this.logger.info(`Deleted ${deletedCount} old properties for tenant ${tenantId}`);

            return deletedCount;
        } catch (error) {
            this.logger.error('Failed to delete old properties', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Map database row to PropertyData
     */
    private mapRowToProperty(row: any): PropertyData {
        return {
            property_id: row.property_id,
            tenant_id: row.tenant_id,
            external_id: row.external_id,
            source: row.source,
            address: row.address,
            city: row.city,
            state: row.state,
            zip_code: row.zip_code,
            price: row.price ? parseFloat(row.price) : undefined,
            beds: row.beds,
            baths: row.baths ? parseFloat(row.baths) : undefined,
            sqft: row.sqft,
            lot_size: row.lot_size,
            year_built: row.year_built,
            property_type: row.property_type,
            listing_status: row.listing_status,
            days_on_market: row.days_on_market,
            description: row.description,
            images: row.images,
            features: row.features,
            agent_info: row.agent_info,
            raw_data: row.raw_data,
            last_synced: row.last_synced,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    // ========================================
    // PGVECTOR SEMANTIC SEARCH METHODS
    // ========================================

    /**
     * Update property embedding for semantic search
     */
    async updatePropertyEmbedding(
        propertyId: string,
        embedding: number[],
        tenantId: string
    ): Promise<void> {
        const client = await this.pool.connect();
        try {
            const embeddingStr = `[${embedding.join(',')}]`;
            const query = `
                UPDATE properties
                SET embedding = $1::vector
                WHERE property_id = $2 AND tenant_id = $3
            `;

            await client.query(query, [embeddingStr, propertyId, tenantId]);

            this.logger.info(`Updated embedding for property ${propertyId}`, {
                tenant_id: tenantId,
                dimensions: embedding.length,
            });
        } catch (error) {
            this.logger.error('Failed to update property embedding', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Search properties by vector similarity (cosine distance)
     * Returns properties ordered by similarity to the input embedding
     */
    async searchByVectorSimilarity(
        embedding: number[],
        tenantId: string,
        options: {
            limit?: number;
            minSimilarity?: number;
            listingStatus?: string;
        } = {}
    ): Promise<Array<PropertyData & { similarity: number }>> {
        const client = await this.pool.connect();
        try {
            const { limit = 10, minSimilarity = 0.5, listingStatus } = options;
            const embeddingStr = `[${embedding.join(',')}]`;

            let query = `
                SELECT *,
                    1 - (embedding <=> $1::vector) AS similarity
                FROM properties
                WHERE tenant_id = $2
                    AND embedding IS NOT NULL
            `;
            const values: any[] = [embeddingStr, tenantId];
            let paramIndex = 3;

            if (listingStatus) {
                query += ` AND listing_status = $${paramIndex}`;
                values.push(listingStatus);
                paramIndex++;
            }

            query += `
                    AND 1 - (embedding <=> $1::vector) >= ${minSimilarity}
                ORDER BY similarity DESC
                LIMIT $${paramIndex}
            `;
            values.push(limit);

            const result = await client.query(query, values);

            return result.rows.map(row => ({
                ...this.mapRowToProperty(row),
                similarity: parseFloat(row.similarity),
            }));
        } catch (error) {
            this.logger.error('Failed to search by vector similarity', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Find similar properties to a given property
     */
    async findSimilarProperties(
        propertyId: string,
        tenantId: string,
        limit: number = 5
    ): Promise<Array<PropertyData & { similarity: number }>> {
        const client = await this.pool.connect();
        try {
            // First get the source property's embedding
            const source = await client.query(
                'SELECT embedding FROM properties WHERE property_id = $1 AND tenant_id = $2',
                [propertyId, tenantId]
            );

            if (source.rows.length === 0 || !source.rows[0].embedding) {
                return [];
            }

            // Find similar properties (excluding the source)
            const query = `
                SELECT *,
                    1 - (embedding <=> $1::vector) AS similarity
                FROM properties
                WHERE tenant_id = $2
                    AND property_id != $3
                    AND embedding IS NOT NULL
                ORDER BY embedding <=> $1::vector
                LIMIT $4
            `;

            const result = await client.query(query, [
                source.rows[0].embedding,
                tenantId,
                propertyId,
                limit,
            ]);

            return result.rows.map(row => ({
                ...this.mapRowToProperty(row),
                similarity: parseFloat(row.similarity),
            }));
        } catch (error) {
            this.logger.error('Failed to find similar properties', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get properties without embeddings (for batch processing)
     */
    async getPropertiesWithoutEmbeddings(
        tenantId: string,
        limit: number = 100
    ): Promise<PropertyData[]> {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT * FROM properties
                WHERE tenant_id = $1
                    AND embedding IS NULL
                    AND description IS NOT NULL
                ORDER BY created_at DESC
                LIMIT $2
            `;

            const result = await client.query(query, [tenantId, limit]);
            return result.rows.map(row => this.mapRowToProperty(row));
        } catch (error) {
            this.logger.error('Failed to get properties without embeddings', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check if pgvector extension is enabled
     */
    async isPgvectorEnabled(): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
            );
            return result.rows.length > 0;
        } catch (error) {
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Enable pgvector extension (requires superuser)
     */
    async enablePgvector(): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query('CREATE EXTENSION IF NOT EXISTS vector');
            this.logger.info('pgvector extension enabled');
            return true;
        } catch (error) {
            this.logger.error('Failed to enable pgvector extension', error instanceof Error ? error : new Error(String(error)));
            return false;
        } finally {
            client.release();
        }
    }
}
