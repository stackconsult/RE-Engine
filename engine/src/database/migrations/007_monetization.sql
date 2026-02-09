-- Monetization and Balance System
-- Phase 7: Credit-based usage tracking

-- Balances table: Stores current credit balance for each tenant
CREATE TABLE IF NOT EXISTS balances (
    tenant_id VARCHAR(255) PRIMARY KEY, -- Matches properties.tenant_id type
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'credits', -- Default to internal credits
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table: Ledger of all credit movements
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL, -- Transaction amount (absolute value usually, type determines sign)
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
    reference_id VARCHAR(255), -- External ID (Stripe PaymentIntent) or Internal ID (Usage Event)
    description TEXT,
    balance_after DECIMAL(12, 2), -- Snapshot of balance after transaction for audit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Trigger for updating timestamps
DROP TRIGGER IF EXISTS update_balances_updated_at ON balances;
CREATE TRIGGER update_balances_updated_at
    BEFORE UPDATE ON balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE balances IS 'Current credit balance for tenants';
COMMENT ON TABLE transactions IS 'Immutable ledger of credit history';
COMMENT ON COLUMN transactions.balance_after IS 'Audit snapshot of balance immediately after transaction';
