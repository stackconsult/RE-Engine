-- Migration: 009_phase8_advanced_features.sql
-- Phase 8: Advanced Features Database Schema

-- i18n: Tenant locale preferences
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS default_locale VARCHAR(5) DEFAULT 'en';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS supported_locales TEXT[] DEFAULT ARRAY['en'];

-- Webhook subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_triggered_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_subscriptions_tenant ON webhook_subscriptions(tenant_id);
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(tenant_id, is_active) WHERE is_active = true;

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    success BOOLEAN NOT NULL,
    delivered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_subscription ON webhook_deliveries(subscription_id);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event);

-- White-label branding
CREATE TABLE IF NOT EXISTS tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Visual branding
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',
    
    -- Text branding
    company_name TEXT NOT NULL,
    support_email TEXT,
    
    -- Custom domain
    custom_domain TEXT,
    ssl_certificate_id TEXT,
    ssl_verified BOOLEAN DEFAULT false,
    
    -- Email templates
    email_header_html TEXT,
    email_footer_html TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_tenant_branding_domain ON tenant_branding(custom_domain) WHERE custom_domain IS NOT NULL;

-- SSO Configuration
CREATE TABLE IF NOT EXISTS tenant_sso_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Provider type
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
    
    -- SAML Config
    saml_idp_entity_id TEXT,
    saml_sso_url TEXT,
    saml_certificate TEXT,
    
    -- OIDC Config
    oidc_issuer TEXT,
    oidc_client_id TEXT,
    oidc_client_secret_encrypted TEXT,
    oidc_scopes TEXT DEFAULT 'openid profile email',
    
    -- Behavior
    enforce_sso BOOLEAN DEFAULT false,
    auto_provision_users BOOLEAN DEFAULT true,
    default_role VARCHAR(50) DEFAULT 'user',
    
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SSO user mappings
CREATE TABLE IF NOT EXISTS sso_user_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id, provider, subject_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    filters JSONB,
    schedule TEXT, -- cron expression for scheduled reports
    last_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sso_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
CREATE POLICY webhook_subscriptions_tenant_isolation ON webhook_subscriptions
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_branding_tenant_isolation ON tenant_branding
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_sso_config_tenant_isolation ON tenant_sso_config
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY sso_user_mappings_tenant_isolation ON sso_user_mappings
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY saved_reports_tenant_isolation ON saved_reports
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
