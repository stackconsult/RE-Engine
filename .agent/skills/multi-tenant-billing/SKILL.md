---
description: Multi-tenant billing integration with per-tenant Stripe keys and credit management
---

# Multi-Tenant Billing (SaaS)

This skill guides implementation of tenant-isolated billing where **each client provides their own Stripe API keys**.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Tenant A                         │
│  Stripe Keys → StripeService → Balance → Services   │
├─────────────────────────────────────────────────────┤
│                    Tenant B                         │
│  Stripe Keys → StripeService → Balance → Services   │
└─────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- Add to tenant_settings or create new table
CREATE TABLE tenant_billing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    stripe_secret_key_encrypted TEXT,
    stripe_publishable_key TEXT,
    stripe_webhook_secret_encrypted TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id)
);
```

## Implementation Steps

### 1. Refactor StripeService

```typescript
// engine/src/billing/stripe.service.ts
export class TenantStripeService {
    private stripeClients: Map<string, Stripe> = new Map();
    
    async getClientForTenant(tenantId: string): Promise<Stripe> {
        if (this.stripeClients.has(tenantId)) {
            return this.stripeClients.get(tenantId)!;
        }
        
        const config = await this.getTenantConfig(tenantId);
        if (!config?.stripe_secret_key) {
            throw new Error('Tenant has not configured Stripe');
        }
        
        const stripe = new Stripe(decrypt(config.stripe_secret_key), {
            apiVersion: '2024-12-18.acacia'
        });
        
        this.stripeClients.set(tenantId, stripe);
        return stripe;
    }
}
```

### 2. Update BalanceService

```typescript
// Inject tenantId from auth context, not config
async createPaymentIntent(tenantId: string, amount: number) {
    const stripe = await this.stripeService.getClientForTenant(tenantId);
    return stripe.paymentIntents.create({ ... });
}
```

### 3. Tenant Onboarding Flow

Add API endpoint for tenants to configure their Stripe keys:

```typescript
// POST /api/billing/config
router.post('/config', authenticate, async (req, res) => {
    const { stripeSecretKey, stripePublishableKey, webhookSecret } = req.body;
    
    // Validate keys by making test API call
    const isValid = await validateStripeKeys(stripeSecretKey);
    if (!isValid) {
        return res.status(400).json({ error: 'Invalid Stripe keys' });
    }
    
    await saveTenantBillingConfig(req.user.tenant_id, {
        stripe_secret_key_encrypted: encrypt(stripeSecretKey),
        stripe_publishable_key: stripePublishableKey,
        stripe_webhook_secret_encrypted: encrypt(webhookSecret)
    });
});
```

## Security Considerations

- **Encryption**: Store Stripe secret keys encrypted (AES-256-GCM)
- **Key Rotation**: Support key rotation without downtime
- **Audit Logging**: Log all billing configuration changes
- **Validation**: Verify keys work before saving

## Verification

```bash
# Test tenant isolation
curl -X GET /api/billing/balance -H "Authorization: Bearer $TENANT_A_TOKEN"
curl -X GET /api/billing/balance -H "Authorization: Bearer $TENANT_B_TOKEN"
# Should return different balances
```
