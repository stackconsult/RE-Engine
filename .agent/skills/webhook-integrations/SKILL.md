---
description: Outbound webhook system for third-party integrations (Zapier, Make, custom)
---

# Webhook Integration Skill

Enable event-driven integrations with external automation platforms.

## Architecture

```
engine/src/integrations/
├── webhook.service.ts       # Core webhook dispatcher
├── webhook.types.ts         # Event definitions
├── adapters/
│   ├── zapier.adapter.ts    # Zapier-specific formatting
│   └── make.adapter.ts      # Make (Integromat) formatting
└── database/
    └── 010_webhooks.sql     # Webhook subscriptions table
```

## Database Schema

```sql
CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,  -- ['lead.created', 'approval.completed']
    secret TEXT,             -- For signature verification
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Event Types

```typescript
export type WebhookEvent = 
    | 'lead.created' 
    | 'lead.updated' 
    | 'lead.converted'
    | 'approval.pending'
    | 'approval.completed'
    | 'message.sent'
    | 'payment.received'
    | 'credits.low'
    | 'agent.assigned';
```

## Core Service

```typescript
export class WebhookService {
    async subscribe(tenantId: string, url: string, events: WebhookEvent[]): Promise<Subscription>;
    async unsubscribe(tenantId: string, subscriptionId: string): Promise<void>;
    async dispatch(event: WebhookEvent, payload: any, tenantId: string): Promise<void>;
    async listSubscriptions(tenantId: string): Promise<Subscription[]>;
}
```

## Dispatch Flow

1. Event occurs in system (e.g., lead created)
2. WebhookService finds all subscriptions for that event + tenant
3. For each subscription:
   - Sign payload with HMAC-SHA256
   - POST to webhook URL
   - Log result
   - Retry on failure (exponential backoff)

## Zapier Integration

Create Zapier "Triggers" by exposing polling endpoints:

```typescript
// GET /api/webhooks/zapier/leads/poll?since=timestamp
router.get('/zapier/leads/poll', authenticate, async (req, res) => {
    const leads = await leadService.getNewSince(req.user.tenant_id, req.query.since);
    res.json(leads);
});
```

## Security

- HMAC-SHA256 signature in `X-Webhook-Signature` header
- Secret stored per subscription
- IP allowlisting (optional)
- Rate limiting per tenant
