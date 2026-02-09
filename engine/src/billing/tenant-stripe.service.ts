import { Logger } from '../utils/logger.js';

/**
 * TenantStripeService - Multi-tenant Stripe client manager
 * Each tenant can configure their own Stripe API keys
 */

// Stripe types - dynamically loaded
type Stripe = any;

interface TenantBillingConfig {
    tenant_id: string;
    stripe_secret_key_encrypted: string | null;
    stripe_publishable_key: string | null;
    stripe_webhook_secret_encrypted: string | null;
    is_active: boolean;
}

export class TenantStripeService {
    private stripeClients: Map<string, Stripe> = new Map();
    private logger: Logger;
    private StripeClass: any = null;
    private initialized = false;

    constructor() {
        this.logger = new Logger('TenantStripeService');
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // @ts-ignore - stripe may not be installed
            const StripeModule = await import('stripe').catch(() => null);

            if (!StripeModule) {
                this.logger.warn('Stripe package not installed. Payment features disabled.');
            } else {
                this.StripeClass = StripeModule.default;
                this.logger.info('TenantStripeService initialized');
            }
        } catch (error) {
            this.logger.error('Failed to initialize TenantStripeService', error instanceof Error ? error : new Error(String(error)));
        }

        this.initialized = true;
    }

    /**
     * Get or create a Stripe client for a specific tenant
     */
    async getClientForTenant(tenantId: string, config: TenantBillingConfig): Promise<Stripe> {
        if (!this.StripeClass) {
            throw new Error('Stripe is not available');
        }

        // Return cached client if exists
        if (this.stripeClients.has(tenantId)) {
            return this.stripeClients.get(tenantId)!;
        }

        if (!config.stripe_secret_key_encrypted) {
            throw new Error(`Tenant ${tenantId} has not configured Stripe`);
        }

        if (!config.is_active) {
            throw new Error(`Tenant ${tenantId} billing is not active`);
        }

        // Decrypt the key (implement your decryption here)
        const secretKey = this.decryptKey(config.stripe_secret_key_encrypted);

        const stripe = new this.StripeClass(secretKey, {
            apiVersion: '2024-12-18.acacia' as any,
            typescript: true,
        });

        this.stripeClients.set(tenantId, stripe);
        this.logger.info('Created Stripe client for tenant', { tenantId });

        return stripe;
    }

    /**
     * Invalidate cached client (e.g., after key rotation)
     */
    invalidateClient(tenantId: string): void {
        this.stripeClients.delete(tenantId);
        this.logger.info('Invalidated Stripe client for tenant', { tenantId });
    }

    /**
     * Validate Stripe keys by making a test API call
     */
    async validateKeys(secretKey: string): Promise<boolean> {
        if (!this.StripeClass) {
            throw new Error('Stripe is not available');
        }

        try {
            const testStripe = new this.StripeClass(secretKey, {
                apiVersion: '2024-12-18.acacia' as any,
            });

            // Make a simple API call to verify the key works
            await testStripe.balance.retrieve();
            return true;
        } catch (error) {
            this.logger.warn('Stripe key validation failed', { error: (error as Error).message });
            return false;
        }
    }

    /**
     * Create payment intent for a tenant
     */
    async createPaymentIntent(
        tenantId: string,
        config: TenantBillingConfig,
        amount: number,
        currency: string,
        metadata: Record<string, string> = {}
    ): Promise<any> {
        const stripe = await this.getClientForTenant(tenantId, config);

        // Amount in smallest currency unit (cents)
        const amountInSmallestUnit = Math.round(amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
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

        this.logger.info('Created payment intent', {
            id: paymentIntent.id,
            tenantId,
            amount,
            currency
        });

        return paymentIntent;
    }

    /**
     * Construct webhook event (verify signature)
     */
    constructEvent(
        tenantId: string,
        config: TenantBillingConfig,
        payload: string | Buffer,
        signature: string
    ): any {
        if (!this.stripeClients.has(tenantId)) {
            throw new Error('No Stripe client for tenant');
        }

        if (!config.stripe_webhook_secret_encrypted) {
            throw new Error('Webhook secret not configured');
        }

        const stripe = this.stripeClients.get(tenantId)!;
        const webhookSecret = this.decryptKey(config.stripe_webhook_secret_encrypted);

        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    /**
     * Decrypt an encrypted key
     * TODO: Implement proper encryption (AES-256-GCM recommended)
     */
    private decryptKey(encryptedKey: string): string {
        // For now, assume keys are stored in plain text during development
        // In production, implement proper encryption/decryption
        // Example: return decrypt(encryptedKey, process.env.ENCRYPTION_KEY);

        // Check if it looks like it might be encrypted (base64 with specific format)
        if (encryptedKey.includes(':')) {
            this.logger.warn('Key appears encrypted but decryption not implemented');
        }

        return encryptedKey;
    }

    get isAvailable(): boolean {
        return !!this.StripeClass;
    }
}
