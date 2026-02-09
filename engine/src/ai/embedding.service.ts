/**
 * Embedding Service for Phase 6.6
 * Generates text embeddings using OpenAI for semantic property matching with pgvector
 */

import OpenAI from 'openai';
import { Logger } from '../utils/logger.js';
import { PropertyData } from '../database/property-database.service.js';

export interface EmbeddingConfig {
    enabled: boolean;
    provider: 'openai' | 'local';
    apiKey?: string;
    model: string;
    dimensions: number;
}

export interface LeadPreferencesForEmbedding {
    propertyType?: string;
    priceMin?: number;
    priceMax?: number;
    bedsMin?: number;
    bathsMin?: number;
    features?: string[];
    mustHaves?: string[];
    niceToHaves?: string[];
    dealBreakers?: string[];
    city?: string;
    neighborhood?: string;
    lifestyle?: string;
    additionalNotes?: string;
}

export class EmbeddingService {
    private logger: Logger;
    private config: EmbeddingConfig;
    private openai: OpenAI | null = null;

    constructor(config: Partial<EmbeddingConfig> = {}) {
        this.config = {
            enabled: true,
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY,
            model: 'text-embedding-3-small',
            dimensions: 1536,
            ...config,
        };
        this.logger = new Logger('EmbeddingService', true);
    }

    async initialize(): Promise<void> {
        if (!this.config.enabled) {
            this.logger.warn('Embedding service disabled');
            return;
        }

        if (this.config.provider === 'openai') {
            if (!this.config.apiKey) {
                this.logger.warn('No OpenAI API key provided, embeddings will be disabled');
                this.config.enabled = false;
                return;
            }

            this.openai = new OpenAI({
                apiKey: this.config.apiKey,
            });

            this.logger.info('OpenAI embedding client initialized', {
                model: this.config.model,
                dimensions: this.config.dimensions,
            });
        }
    }

    /**
     * Generate embedding for a property listing
     */
    async generatePropertyEmbedding(property: PropertyData): Promise<number[] | null> {
        if (!this.config.enabled || !this.openai) {
            return null;
        }

        try {
            const text = this.buildPropertyText(property);
            return await this.generateEmbedding(text);
        } catch (error) {
            this.logger.error('Failed to generate property embedding', error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }

    /**
     * Generate embedding for lead preferences
     */
    async generateLeadPreferenceEmbedding(preferences: LeadPreferencesForEmbedding): Promise<number[] | null> {
        if (!this.config.enabled || !this.openai) {
            return null;
        }

        try {
            const text = this.buildPreferenceText(preferences);
            return await this.generateEmbedding(text);
        } catch (error) {
            this.logger.error('Failed to generate lead preference embedding', error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }

    /**
     * Generate embedding for arbitrary text
     */
    async generateEmbedding(text: string): Promise<number[] | null> {
        if (!this.config.enabled || !this.openai) {
            return null;
        }

        try {
            const response = await this.openai.embeddings.create({
                model: this.config.model,
                input: text,
                dimensions: this.config.dimensions,
            });

            const embedding = response.data[0].embedding;
            this.logger.debug(`Generated embedding of ${embedding.length} dimensions for text of ${text.length} chars`);

            return embedding;
        } catch (error) {
            this.logger.error('OpenAI embedding API error', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Build searchable text from property data
     */
    private buildPropertyText(property: PropertyData): string {
        const parts: string[] = [];

        // Basic info
        if (property.property_type) parts.push(`Property type: ${property.property_type}`);
        if (property.beds) parts.push(`${property.beds} bedrooms`);
        if (property.baths) parts.push(`${property.baths} bathrooms`);
        if (property.sqft) parts.push(`${property.sqft} square feet`);
        if (property.lot_size) parts.push(`Lot size: ${property.lot_size} sqft`);
        if (property.year_built) parts.push(`Built in ${property.year_built}`);
        if (property.price) parts.push(`Listed at $${property.price.toLocaleString()}`);

        // Location
        if (property.city) parts.push(`Located in ${property.city}`);
        if (property.state) parts.push(property.state);
        if (property.address) parts.push(`Address: ${property.address}`);

        // Description
        if (property.description) {
            parts.push(`Description: ${property.description}`);
        }

        // Features
        if (property.features && property.features.length > 0) {
            parts.push(`Features: ${property.features.join(', ')}`);
        }

        // Listing info
        if (property.listing_status) parts.push(`Status: ${property.listing_status}`);
        if (property.days_on_market) parts.push(`Days on market: ${property.days_on_market}`);

        return parts.join('. ');
    }

    /**
     * Build searchable text from lead preferences
     */
    private buildPreferenceText(preferences: LeadPreferencesForEmbedding): string {
        const parts: string[] = [];

        // Property requirements
        if (preferences.propertyType) parts.push(`Looking for: ${preferences.propertyType}`);
        if (preferences.bedsMin) parts.push(`At least ${preferences.bedsMin} bedrooms`);
        if (preferences.bathsMin) parts.push(`At least ${preferences.bathsMin} bathrooms`);

        // Budget
        if (preferences.priceMin && preferences.priceMax) {
            parts.push(`Budget: $${preferences.priceMin.toLocaleString()} to $${preferences.priceMax.toLocaleString()}`);
        } else if (preferences.priceMax) {
            parts.push(`Max budget: $${preferences.priceMax.toLocaleString()}`);
        }

        // Location
        if (preferences.city) parts.push(`Preferred city: ${preferences.city}`);
        if (preferences.neighborhood) parts.push(`Preferred neighborhood: ${preferences.neighborhood}`);

        // Features
        if (preferences.mustHaves && preferences.mustHaves.length > 0) {
            parts.push(`Must have: ${preferences.mustHaves.join(', ')}`);
        }
        if (preferences.niceToHaves && preferences.niceToHaves.length > 0) {
            parts.push(`Nice to have: ${preferences.niceToHaves.join(', ')}`);
        }
        if (preferences.dealBreakers && preferences.dealBreakers.length > 0) {
            parts.push(`Deal breakers: ${preferences.dealBreakers.join(', ')}`);
        }
        if (preferences.features && preferences.features.length > 0) {
            parts.push(`Desired features: ${preferences.features.join(', ')}`);
        }

        // Lifestyle
        if (preferences.lifestyle) parts.push(`Lifestyle: ${preferences.lifestyle}`);
        if (preferences.additionalNotes) parts.push(`Notes: ${preferences.additionalNotes}`);

        return parts.join('. ');
    }

    /**
     * Calculate cosine similarity between two embeddings (for local comparison)
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have the same dimensions');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Format embedding for PostgreSQL vector type
     */
    formatForPostgres(embedding: number[]): string {
        return `[${embedding.join(',')}]`;
    }

    /**
     * Get embedding dimensions
     */
    getDimensions(): number {
        return this.config.dimensions;
    }

    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return this.config.enabled && this.openai !== null;
    }
}
