-- Migration: 008_tenant_billing_config.sql
-- Multi-tenant billing configuration for per-tenant Stripe keys

CREATE TABLE IF NOT EXISTS tenant_billing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Stripe configuration (encrypted values for secret data)
    stripe_secret_key_encrypted TEXT,
    stripe_publishable_key TEXT,
    stripe_webhook_secret_encrypted TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    
    -- Ensure one config per tenant
    UNIQUE(tenant_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenant_billing_config_tenant_id 
    ON tenant_billing_config(tenant_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tenant_billing_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenant_billing_config_updated_at ON tenant_billing_config;
CREATE TRIGGER trigger_tenant_billing_config_updated_at
    BEFORE UPDATE ON tenant_billing_config
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_billing_config_updated_at();

-- Audit table for billing config changes
CREATE TABLE IF NOT EXISTS tenant_billing_config_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT now(),
    old_values JSONB,
    new_values JSONB
);

-- RLS policies (enable row-level security)
ALTER TABLE tenant_billing_config ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only see their own config
CREATE POLICY tenant_billing_config_tenant_isolation ON tenant_billing_config
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
