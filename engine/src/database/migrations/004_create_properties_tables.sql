-- Property Database Schema for CRM Integration
-- Phase 6.4: CRM Sync Adapters

-- Properties table: stores property listings from Zillow, Realtor.com, and MLS
CREATE TABLE IF NOT EXISTS properties (
  property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('zillow', 'realtor', 'mls')),
  
  -- Address information
  address TEXT NOT NULL,
  city VARCHAR(255),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  
  -- Property details
  price DECIMAL(12, 2),
  beds INTEGER,
  baths DECIMAL(3, 1),
  sqft INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  property_type VARCHAR(100),
  listing_status VARCHAR(50) CHECK (listing_status IN ('active', 'pending', 'sold', 'off_market')),
  days_on_market INTEGER,
  
  -- Content
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  agent_info JSONB,
  
  -- Metadata
  raw_data JSONB,
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique properties per tenant and source
  UNIQUE(tenant_id, external_id, source)
);

-- Property matches table: stores lead-to-property matches
CREATE TABLE IF NOT EXISTS property_matches (
  match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  lead_id VARCHAR(255) NOT NULL,
  property_id UUID NOT NULL,
  
  -- Match scoring
  score DECIMAL(3, 2) CHECK (score >= 0 AND score <= 1),
  reasons JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Match status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'interested', 'rejected', 'scheduled')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key to properties
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
);

-- Indexes for performance

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_tenant ON properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(source);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_status ON properties(tenant_id, listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_last_synced ON properties(last_synced);

-- Property matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_tenant_lead ON property_matches(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_matches_property ON property_matches(property_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON property_matches(score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON property_matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_tenant_status ON property_matches(tenant_id, status);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_matches_updated_at ON property_matches;
CREATE TRIGGER update_property_matches_updated_at
    BEFORE UPDATE ON property_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE properties IS 'Property listings from CRM sources (Zillow, Realtor.com, MLS)';
COMMENT ON TABLE property_matches IS 'Lead-to-property matches with scoring and recommendations';
COMMENT ON COLUMN properties.tenant_id IS 'Multi-tenant isolation - each tenant has separate property data';
COMMENT ON COLUMN properties.external_id IS 'External ID from the source system (Zillow ID, MLS number, etc.)';
COMMENT ON COLUMN properties.raw_data IS 'Complete raw response from API for debugging and future enhancements';
COMMENT ON COLUMN property_matches.score IS 'Match score between 0 and 1, higher is better match';
