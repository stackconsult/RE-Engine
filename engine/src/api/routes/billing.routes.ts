import { Router } from 'express';
import { BillingController } from '../../billing/billing.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js'; // Assuming auth middleware exists

const router = Router();

// Protected routes (require authentication)
router.get('/balance', authenticate, BillingController.getBalance);
router.get('/transactions', authenticate, BillingController.getTransactions);
router.post('/top-up', authenticate, BillingController.createTopUp);

// Webhook route (Public, signature verified)
// Note: This route requires RAW body. If integrated in main app, 
// middleware configuration in server.ts must exclude this path from JSON parsing.
// OR we mount this router separately.
// For now, we define it here, but server.ts must handle the body parsing quirk.
router.post('/webhooks/stripe', BillingController.handleStripeWebhook);

export default router;
