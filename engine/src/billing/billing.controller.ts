import { Request, Response } from 'express';
import { BalanceService } from './balance.service.js';
import { StripeService } from './stripe.service.js';
import { Logger } from '../utils/logger.js';
// Using global Express.Request which is augmented in types/express.d.ts
// req.user is AuthToken

const balanceService = new BalanceService();
const stripeService = new StripeService();
const logger = new Logger('BillingController');

export class BillingController {
    static async getBalance(req: Request, res: Response) {
        try {
            // req.user is populated by auth middleware
            if (!req.user || !req.user.tenant_id) {
                return res.status(401).json({ error: 'Unauthorized: No tenant context' });
            }

            const balance = await balanceService.getBalance(req.user.tenant_id);
            res.json(balance);
        } catch (error) {
            logger.error('Error fetching balance', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ error: 'Failed to fetch balance' });
        }
    }

    static async getTransactions(req: Request, res: Response) {
        try {
            if (!req.user || !req.user.tenant_id) {
                return res.status(401).json({ error: 'Unauthorized: No tenant context' });
            }

            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const transactions = await balanceService.getTransactions(req.user.tenant_id, limit, offset);
            res.json(transactions);
        } catch (error) {
            logger.error('Error fetching transactions', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    }

    static async createTopUp(req: Request, res: Response) {
        try {
            if (!req.user || !req.user.tenant_id) {
                return res.status(401).json({ error: 'Unauthorized: No tenant context' });
            }

            const { amount, currency = 'usd' } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }

            // Create Payment Intent
            // Amount is in dollars (frontend input), converted to cents by StripeService
            const paymentIntent = await stripeService.createPaymentIntent(
                amount,
                currency,
                req.user.tenant_id,
                { userId: req.user.user.user_id }
            );

            res.json({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                publicKey: process.env.STRIPE_PUBLIC_KEY // Optional if frontend needs it
            });
        } catch (error) {
            logger.error('Error creating top-up', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ error: 'Failed to initiate top-up' });
        }
    }

    static async handleStripeWebhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature'];

        if (!sig) {
            return res.status(400).send('Webhook Error: Missing signature');
        }

        let event;

        try {
            // req.body must be raw buffer here. 
            // Application configuration must ensure this route receives raw body.
            event = stripeService.constructEvent(req.body, sig as string);
        } catch (err: any) {
            logger.error(`Webhook Error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    const tenantId = paymentIntent.metadata.tenantId;
                    const amountReceived = paymentIntent.amount_received; // In cents
                    const currency = paymentIntent.currency;

                    if (tenantId) {
                        // Convert back to major units if BalanceService expects it?
                        // BalanceService stores "credits".
                        // Assumption: 1 cent = 1 credit.
                        const credits = amountReceived;

                        await balanceService.addCredits(
                            tenantId,
                            credits,
                            paymentIntent.id,
                            `Stripe Top-up (${currency.toUpperCase()} ${amountReceived / 100})`
                        );
                        logger.info(`Added ${credits} credits to tenant ${tenantId}`);
                    } else {
                        logger.warn('PaymentIntent succeeded but no tenantId in metadata', paymentIntent.id);
                    }
                    break;
                default:
                // console.log(`Unhandled event type ${event.type}`);
            }
        } catch (error) {
            logger.error('Error processing webhook event', error instanceof Error ? error : new Error(String(error)));
            // Return 200 anyway to prevent Stripe retry loops for logic errors?
            // Usually return 500 to retry transient errors, but 200 if logic fail.
        }

        // Return a 200 response to acknowledge receipt of the event
        res.send();
    }
}
