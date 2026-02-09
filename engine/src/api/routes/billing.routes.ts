import { Router } from 'express';
import { BillingController } from '../../billing/billing.controller.js';
import { authenticateToken } from '../../auth/auth.middleware.js';

const router = Router();

// Protected routes (require authentication)
router.get('/balance', authenticateToken, BillingController.getBalance);
router.get('/transactions', authenticateToken, BillingController.getTransactions);
router.post('/top-up', authenticateToken, BillingController.createTopUp);

// Webhook route (Public, signature verified)
// Note: This route requires RAW body. If integrated in main app, 
// middleware configuration in server.ts must exclude this path from JSON parsing.
router.post('/webhooks/stripe', BillingController.handleStripeWebhook);

export default router;
