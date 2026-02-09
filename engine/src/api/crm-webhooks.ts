import express from 'express';
import { Logger } from '../utils/logger.js';
import { CRMIntegrationService } from '../integrations/crm-integration.service.js';
import crypto from 'crypto';

export function createCRMWebhookRouter(crmService: CRMIntegrationService): express.Router {
    const router = express.Router();
    const logger = new Logger('CRMWebhookRouter', true);

    // Middleware for signature verification
    const verifySignature = (provider: 'zillow' | 'realtor' | 'mls') => {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const signature = req.headers['x-crm-signature'] as string;
            const tenantId = req.headers['x-tenant-id'] as string;

            if (!tenantId) {
                res.status(400).json({ error: 'Missing x-tenant-id header' });
                return;
            }

            // TODO: Fetch secret from DB for this tenant/provider
            // For now, use env or mock verification
            const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];

            if (!secret || secret === 'mock-secret') {
                logger.warn(`Signature verification skipped for ${provider} (no secret configured)`);
                next();
                return;
            }

            const hmac = crypto.createHmac('sha256', secret);
            const digest = Buffer.from(hmac.update(JSON.stringify(req.body)).digest('hex'), 'utf8');
            const signatureBuffer = Buffer.from(signature || '', 'utf8');

            if (signatureBuffer.length !== digest.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
                res.status(401).json({ error: 'Invalid signature' });
                return;
            }

            next();
        };
    };

    /**
     * Zillow Webhook Endpoint
     */
    router.post('/zillow', verifySignature('zillow'), async (req, res) => {
        const tenantId = req.headers['x-tenant-id'] as string;
        try {
            logger.info(`Received Zillow webhook for tenant ${tenantId}`);
            await crmService.handleWebhook('zillow', tenantId, req.body);
            res.status(200).json({ status: 'success' });
        } catch (error) {
            logger.error('Zillow webhook processing failed', error);
            res.status(500).json({ error: 'Processing failed' });
        }
    });

    /**
     * Realtor.com Webhook Endpoint
     */
    router.post('/realtor', verifySignature('realtor'), async (req, res) => {
        const tenantId = req.headers['x-tenant-id'] as string;
        try {
            logger.info(`Received Realtor webhook for tenant ${tenantId}`);
            await crmService.handleWebhook('realtor', tenantId, req.body);
            res.status(200).json({ status: 'success' });
        } catch (error) {
            logger.error('Realtor webhook processing failed', error);
            res.status(500).json({ error: 'Processing failed' });
        }
    });

    /**
     * MLS Webhook Endpoint
     */
    router.post('/mls', verifySignature('mls'), async (req, res) => {
        const tenantId = req.headers['x-tenant-id'] as string;
        try {
            logger.info(`Received MLS webhook for tenant ${tenantId}`);
            await crmService.handleWebhook('mls', tenantId, req.body);
            res.status(200).json({ status: 'success' });
        } catch (error) {
            logger.error('MLS webhook processing failed', error);
            res.status(500).json({ error: 'Processing failed' });
        }
    });

    return router;
}
