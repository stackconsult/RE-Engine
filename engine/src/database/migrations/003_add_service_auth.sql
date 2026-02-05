-- Add service authentication table
CREATE TABLE IF NOT EXISTS service_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id VARCHAR(255) UNIQUE NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Add audit log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_service_auth_service_id ON service_auth(service_id);
CREATE INDEX IF NOT EXISTS idx_service_auth_api_key_hash ON service_auth(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_service_id ON auth_audit_log(service_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_timestamp ON auth_audit_log(timestamp);

-- Insert default services
INSERT INTO service_auth (service_id, api_key_hash, permissions) VALUES
  ('reengine-engine', crypt('engine-key-dev', gen_salt('bf')), '["read", "write", "admin"]'),
  ('reengine-browser', crypt('browser-key-dev', gen_salt('bf')), '["read", "write"]'),
  ('reengine-tinyfish', crypt('tinyfish-key-dev', gen_salt('bf')), '["read", "write"]'),
  ('reengine-llama', crypt('llama-key-dev', gen_salt('bf')), '["read", "write"]'),
  ('reengine-core', crypt('core-key-dev', gen_salt('bf')), '["read", "write", "admin"]'),
  ('reengine-outreach', crypt('outreach-key-dev', gen_salt('bf')), '["read", "write"]')
ON CONFLICT (service_id) DO NOTHING;
