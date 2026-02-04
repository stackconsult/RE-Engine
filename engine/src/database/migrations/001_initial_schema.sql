-- RE Engine Database Schema
-- PostgreSQL migration script

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
    approval_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    lead_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    draft_to VARCHAR(255) NOT NULL,
    draft_subject TEXT NOT NULL,
    draft_content TEXT NOT NULL,
    draft_from VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rejection_reason TEXT,
    
    CONSTRAINT approvals_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    lead_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_e164 VARCHAR(20),
    city VARCHAR(255),
    province VARCHAR(100),
    source VARCHAR(100) NOT NULL,
    tags TEXT,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT leads_email_unique UNIQUE (email),
    CONSTRAINT leads_phone_unique UNIQUE (phone_e164)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(50) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT contacts_channel_identifier_unique UNIQUE (channel, identifier)
);

-- Identities table
CREATE TABLE IF NOT EXISTS identities (
    identity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    profile_url TEXT,
    auth_status VARCHAR(20) DEFAULT 'unauthenticated',
    cookies TEXT,
    credentials TEXT,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT identities_platform_unique UNIQUE (platform)
);

-- ICP Profiles table
CREATE TABLE IF NOT EXISTS icp_profiles (
    icp_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria_locations JSONB NOT NULL DEFAULT '{}',
    criteria_investment JSONB NOT NULL DEFAULT '{}',
    criteria_professional JSONB NOT NULL DEFAULT '{}',
    criteria_behavior JSONB NOT NULL DEFAULT '{}',
    criteria_platforms JSONB NOT NULL DEFAULT '{}',
    settings_maxLeadsPerDay INTEGER DEFAULT 50,
    settings_discoveryFrequency VARCHAR(20) DEFAULT 'daily',
    settings_confidenceThreshold DECIMAL(3,2) DEFAULT 0.7,
    settings_excludeDuplicates BOOLEAN DEFAULT TRUE,
    settings_enrichmentEnabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_lead_id ON approvals(lead_id);
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

CREATE INDEX IF NOT EXISTS idx_contacts_channel ON contacts(channel);
CREATE INDEX IF NOT EXISTS idx_contacts_verified ON contacts(verified);

CREATE INDEX IF NOT EXISTS idx_identities_platform ON identities(platform);
CREATE INDEX IF NOT EXISTS idx_identities_auth_status ON identities(auth_status);

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_icp_profiles_updated_at BEFORE UPDATE ON icp_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
