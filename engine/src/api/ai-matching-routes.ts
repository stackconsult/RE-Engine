/**
 * AI Matching Routes for Phase 6.6
 * API endpoints for pgvector-powered semantic property matching
 */

import { Router, Request, Response } from 'express';
import { EmbeddingService, LeadPreferencesForEmbedding } from '../ai/embedding.service.js';
import { PropertyDatabaseService } from '../database/property-database.service.js';
import { Logger } from '../utils/logger.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { checkBalance, deductCost } from '../middleware/usage-tracker.js';

const logger = new Logger('AIMatchingRoutes', true);

export function createAIMatchingRouter(
    embeddingService: EmbeddingService,
    propertyDb: PropertyDatabaseService
): Router {
    const router = Router();

    /**
     * POST /api/ai/match-properties
     * Find semantically similar properties based on lead preferences
     */
    router.post('/match-properties',
        authenticateToken,
        checkBalance(5),
        deductCost(5, 'AI Property Matching'),
        async (req: Request, res: Response) => {
            try {
                const { preferences, limit = 10, minSimilarity = 0.5 } = req.body;
                // Use authenticated tenant ID
                const tenantId = (req as any).user?.tenant_id;

                if (!tenantId) {
                    return res.status(401).json({ error: 'Unauthorized: No tenant context' });
                }

                if (!preferences) {
                    return res.status(400).json({ error: 'preferences object is required' });
                }

                // Generate embedding from lead preferences
                const preferenceEmbedding = await embeddingService.generateLeadPreferenceEmbedding(
                    preferences as LeadPreferencesForEmbedding
                );

                if (!preferenceEmbedding) {
                    return res.status(503).json({
                        error: 'Embedding service unavailable',
                        message: 'OpenAI API key may be missing or invalid'
                    });
                }

                // Search properties by vector similarity
                const matches = await propertyDb.searchByVectorSimilarity(
                    preferenceEmbedding,
                    tenantId,
                    { limit, minSimilarity, listingStatus: 'active' }
                );

                logger.info(`Found ${matches.length} property matches for tenant ${tenantId}`);

                res.json({
                    success: true,
                    matches,
                    total: matches.length,
                    embeddingDimensions: preferenceEmbedding.length,
                });
            } catch (error) {
                logger.error('Failed to match properties', error);
                res.status(500).json({ error: 'Failed to match properties' });
            }
        });

    /**
     * POST /api/ai/generate-embedding
     * Generate embedding for arbitrary text (utility endpoint)
     */
    router.post('/generate-embedding',
        authenticateToken,
        checkBalance(1),
        deductCost(1, 'Generate Embedding'),
        async (req: Request, res: Response) => {
            try {
                const { text } = req.body;

                if (!text || typeof text !== 'string') {
                    return res.status(400).json({ error: 'text is required' });
                }

                const embedding = await embeddingService.generateEmbedding(text);

                if (!embedding) {
                    return res.status(503).json({ error: 'Embedding service unavailable' });
                }

                res.json({
                    success: true,
                    embedding,
                    dimensions: embedding.length,
                    textLength: text.length,
                });
            } catch (error) {
                logger.error('Failed to generate embedding', error);
                res.status(500).json({ error: 'Failed to generate embedding' });
            }
        });

    /**
     * GET /api/ai/property/:propertyId/similar
     * Find properties similar to a given property
     */
    router.get('/property/:propertyId/similar', async (req: Request, res: Response) => {
        try {
            const { propertyId } = req.params;
            const { tenantId, limit = 5 } = req.query;

            if (!tenantId || typeof tenantId !== 'string') {
                return res.status(400).json({ error: 'tenantId query parameter is required' });
            }

            const similar = await propertyDb.findSimilarProperties(
                propertyId as string,
                tenantId as string,
                parseInt(String(limit))
            );

            res.json({
                success: true,
                propertyId,
                similar,
                total: similar.length,
            });
        } catch (error) {
            logger.error('Failed to find similar properties', error);
            res.status(500).json({ error: 'Failed to find similar properties' });
        }
    });

    /**
     * POST /api/ai/embed-property/:propertyId
     * Generate and store embedding for a property
     */
    router.post('/embed-property/:propertyId', async (req: Request, res: Response) => {
        try {
            const { propertyId } = req.params;
            const { tenantId } = req.body;

            if (!tenantId) {
                return res.status(400).json({ error: 'tenantId is required' });
            }

            // Get property
            const property = await propertyDb.getProperty(propertyId as string, tenantId as string);
            if (!property) {
                return res.status(404).json({ error: 'Property not found' });
            }

            // Generate embedding
            const embedding = await embeddingService.generatePropertyEmbedding(property);
            if (!embedding) {
                return res.status(503).json({ error: 'Embedding service unavailable' });
            }

            // Store embedding
            await propertyDb.updatePropertyEmbedding(propertyId as string, embedding, tenantId as string);

            res.json({
                success: true,
                propertyId,
                embeddingDimensions: embedding.length,
            });
        } catch (error) {
            logger.error('Failed to embed property', error);
            res.status(500).json({ error: 'Failed to embed property' });
        }
    });

    /**
     * POST /api/ai/embed-batch
     * Generate embeddings for properties missing them
     */
    router.post('/embed-batch', async (req: Request, res: Response) => {
        try {
            const { tenantId, limit = 50 } = req.body;

            if (!tenantId) {
                return res.status(400).json({ error: 'tenantId is required' });
            }

            // Get properties without embeddings
            const properties = await propertyDb.getPropertiesWithoutEmbeddings(tenantId, limit);

            if (properties.length === 0) {
                return res.json({
                    success: true,
                    processed: 0,
                    message: 'All properties already have embeddings',
                });
            }

            // Generate and store embeddings
            let processed = 0;
            let failed = 0;

            for (const property of properties) {
                try {
                    const embedding = await embeddingService.generatePropertyEmbedding(property);
                    if (embedding && property.property_id) {
                        await propertyDb.updatePropertyEmbedding(property.property_id, embedding, tenantId);
                        processed++;
                    }
                } catch (err) {
                    failed++;
                    logger.warn(`Failed to embed property ${property.property_id}`, err);
                }
            }

            res.json({
                success: true,
                processed,
                failed,
                total: properties.length,
            });
        } catch (error) {
            logger.error('Failed to process batch embeddings', error);
            res.status(500).json({ error: 'Failed to process batch embeddings' });
        }
    });

    /**
     * GET /api/ai/status
     * Check AI matching service status
     */
    router.get('/status', async (req: Request, res: Response) => {
        try {
            const pgvectorEnabled = await propertyDb.isPgvectorEnabled();
            const embeddingReady = embeddingService.isReady();

            res.json({
                success: true,
                status: {
                    pgvector: pgvectorEnabled ? 'enabled' : 'disabled',
                    embedding: embeddingReady ? 'ready' : 'unavailable',
                    model: 'text-embedding-3-small',
                    dimensions: embeddingService.getDimensions(),
                },
            });
        } catch (error) {
            logger.error('Failed to get AI status', error);
            res.status(500).json({ error: 'Failed to get AI status' });
        }
    });

    return router;
}
