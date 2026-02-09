import Stripe from 'stripe';
import { Logger } from '../utils/logger.js';
import { ConfigService } from '../config/config.service.js';

export class StripeService {
    private stripe: Stripe | null = null;
    private logger: Logger;
    private webhookSecret: string | undefined;

    constructor() {
        this.logger = new Logger('StripeService');
        try {
            const config = ConfigService.getInstance().getConfig();

            if (config.STRIPE_SECRET_KEY) {
                this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
                    // Using a recent API version compatible with v17+
                    apiVersion: '2024-12-18.acacia',
                    typescript: true,
                });
                this.webhookSecret = config.STRIPE_WEBHOOK_SECRET;
                this.logger.info('Stripe initialized successfully');
            } else {
                this.logger.warn('Stripe not initialized: STRIPE_SECRET_KEY missing in configuration');
            }
        } catch (error) {
            this.logger.error('Failed to initialize Stripe service', error instanceof Error ? error : new Error(String(error)));
        }
    }

    get isConfigured(): boolean {
        return !!this.stripe;
    }

    async createPaymentIntent(amount: number, currency: string, tenantId: string, metadata: Record<string, string> = {}): Promise<Stripe.PaymentIntent> {
        if (!this.stripe) {
            throw new Error('Stripe service is not configured');
        }

        try {
            // Amount expected in smallest currency unit (e.g., cents)
            const amountInSmallestUnit = Math.round(amount * 100);

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountInSmallestUnit,
                currency: currency.toLowerCase(),
                metadata: {
                    tenantId,
                    ...metadata
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            this.logger.info('Created payment intent', { id: paymentIntent.id, amount, currency, tenantId });
            return paymentIntent;
        } catch (error) {
            this.logger.error('Failed to create payment intent', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
        if (!this.stripe) {
            throw new Error('Stripe service is not configured');
        }

        if (!this.webhookSecret) {
            throw new Error('Stripe webhook secret is not configured');
        }

        try {
            return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
        } catch (error) {
            this.logger.error('Webhook signature verification failed', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
}
