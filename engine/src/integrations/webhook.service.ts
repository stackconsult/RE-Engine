import { Logger } from '../utils/logger.js';
import * as crypto from 'crypto';

export type WebhookEvent =
    | 'lead.created'
    | 'lead.updated'
    | 'lead.converted'
    | 'lead.deleted'
    | 'approval.pending'
    | 'approval.completed'
    | 'approval.rejected'
    | 'message.sent'
    | 'message.failed'
    | 'payment.received'
    | 'credits.low'
    | 'credits.depleted'
    | 'agent.assigned'
    | 'agent.activity';

export interface WebhookSubscription {
    id: string;
    tenant_id: string;
    url: string;
    events: WebhookEvent[];
    secret: string;
    is_active: boolean;
    retry_count: number;
    last_triggered_at: Date | null;
    created_at: Date;
}

export interface WebhookPayload {
    event: WebhookEvent;
    timestamp: string;
    tenant_id: string;
    data: any;
}

export interface WebhookDelivery {
    subscription_id: string;
    event: WebhookEvent;
    payload: WebhookPayload;
    response_status: number | null;
    response_body: string | null;
    success: boolean;
    delivered_at: Date;
}

export class WebhookService {
    private logger: Logger;
    private subscriptions: Map<string, WebhookSubscription[]> = new Map(); // In-memory cache

    constructor() {
        this.logger = new Logger('WebhookService');
    }

    /**
     * Subscribe to webhook events
     */
    async subscribe(
        tenantId: string,
        url: string,
        events: WebhookEvent[],
        secret?: string
    ): Promise<WebhookSubscription> {
        const subscription: WebhookSubscription = {
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            url,
            events,
            secret: secret || crypto.randomBytes(32).toString('hex'),
            is_active: true,
            retry_count: 0,
            last_triggered_at: null,
            created_at: new Date()
        };

        // Add to in-memory cache
        const tenantSubs = this.subscriptions.get(tenantId) || [];
        tenantSubs.push(subscription);
        this.subscriptions.set(tenantId, tenantSubs);

        this.logger.info('Webhook subscription created', {
            subscriptionId: subscription.id,
            tenantId,
            events
        });

        return subscription;
    }

    /**
     * Unsubscribe from webhook events
     */
    async unsubscribe(tenantId: string, subscriptionId: string): Promise<boolean> {
        const tenantSubs = this.subscriptions.get(tenantId);
        if (!tenantSubs) return false;

        const index = tenantSubs.findIndex(s => s.id === subscriptionId);
        if (index === -1) return false;

        tenantSubs.splice(index, 1);
        this.subscriptions.set(tenantId, tenantSubs);

        this.logger.info('Webhook subscription removed', { subscriptionId, tenantId });
        return true;
    }

    /**
     * Dispatch an event to all subscribers
     */
    async dispatch(event: WebhookEvent, data: any, tenantId: string): Promise<void> {
        const tenantSubs = this.subscriptions.get(tenantId) || [];
        const matchingSubs = tenantSubs.filter(s =>
            s.is_active && s.events.includes(event)
        );

        if (matchingSubs.length === 0) {
            return;
        }

        const payload: WebhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            tenant_id: tenantId,
            data
        };

        this.logger.info('Dispatching webhook', {
            event,
            tenantId,
            subscriberCount: matchingSubs.length
        });

        // Dispatch to all matching subscribers in parallel
        await Promise.allSettled(
            matchingSubs.map(sub => this.deliverWebhook(sub, payload))
        );
    }

    /**
     * Deliver webhook to a single subscriber
     */
    private async deliverWebhook(
        subscription: WebhookSubscription,
        payload: WebhookPayload
    ): Promise<WebhookDelivery> {
        const payloadString = JSON.stringify(payload);
        const signature = this.generateSignature(payloadString, subscription.secret);

        try {
            const response = await fetch(subscription.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': payload.event,
                    'X-Webhook-Timestamp': payload.timestamp
                },
                body: payloadString,
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            const responseBody = await response.text().catch(() => '');

            const delivery: WebhookDelivery = {
                subscription_id: subscription.id,
                event: payload.event,
                payload,
                response_status: response.status,
                response_body: responseBody.substring(0, 1000), // Limit body size
                success: response.ok,
                delivered_at: new Date()
            };

            if (response.ok) {
                this.logger.info('Webhook delivered', {
                    subscriptionId: subscription.id,
                    status: response.status
                });
            } else {
                this.logger.warn('Webhook delivery failed', {
                    subscriptionId: subscription.id,
                    status: response.status
                });
            }

            return delivery;
        } catch (error) {
            this.logger.error('Webhook delivery error', {
                subscriptionId: subscription.id,
                error: (error as Error).message
            });

            return {
                subscription_id: subscription.id,
                event: payload.event,
                payload,
                response_status: null,
                response_body: (error as Error).message,
                success: false,
                delivered_at: new Date()
            };
        }
    }

    /**
     * Generate HMAC signature for webhook payload
     */
    private generateSignature(payload: string, secret: string): string {
        return `sha256=${crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex')}`;
    }

    /**
     * Verify incoming webhook signature (for consumers)
     */
    verifySignature(payload: string, signature: string, secret: string): boolean {
        const expected = this.generateSignature(payload, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        );
    }

    /**
     * List all subscriptions for a tenant
     */
    async listSubscriptions(tenantId: string): Promise<WebhookSubscription[]> {
        return this.subscriptions.get(tenantId) || [];
    }

    /**
     * Get a specific subscription
     */
    async getSubscription(tenantId: string, subscriptionId: string): Promise<WebhookSubscription | null> {
        const subs = this.subscriptions.get(tenantId) || [];
        return subs.find(s => s.id === subscriptionId) || null;
    }

    /**
     * Update subscription
     */
    async updateSubscription(
        tenantId: string,
        subscriptionId: string,
        updates: Partial<Pick<WebhookSubscription, 'url' | 'events' | 'is_active'>>
    ): Promise<WebhookSubscription | null> {
        const subs = this.subscriptions.get(tenantId) || [];
        const sub = subs.find(s => s.id === subscriptionId);

        if (!sub) return null;

        Object.assign(sub, updates);
        this.logger.info('Webhook subscription updated', { subscriptionId, updates });

        return sub;
    }
}

// Export singleton
let webhookInstance: WebhookService | null = null;

export function getWebhookService(): WebhookService {
    if (!webhookInstance) {
        webhookInstance = new WebhookService();
    }
    return webhookInstance;
}
