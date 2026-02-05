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

-- Insert default services with bcrypt hashed API keys
INSERT INTO service_auth (service_id, service_name, api_key_hash, permissions, is_active, created_at, updated_at) VALUES
('reengine-engine', 'RE-Engine API', '$2b$12$zd8mtppdnsI1lV4BbHykIu0p0CsVRL/E8a5WtubPorFnlJbcBqR8a', '{"read": true, "write": true, "admin": true}', true, NOW(), NOW()),
('reengine-browser', 'Browser MCP Server', '$2b$12$RCwjASdWz5DYD.qu7rkzs.z8bhcS2YYDulSnhTj1Vj.aQHdxDvK3a', '{"read": true, "write": true, "execute": true}', true, NOW(), NOW()),
('reengine-tinyfish', 'Tinyfish MCP Server', '$2b$12$Cp3BjImExPvTMDH9ihXBhOaCJzSYOy5/J9Fg9tYbIIYpk7XornB0K', '{"read": true, "write": true, "scrape": true}', true, NOW(), NOW()),
('reengine-llama', 'Llama MCP Server', '$2b$12$8ipoI4E8yYWGFSQd1VFtXO9lta/KRKfphYfiId1jqXRhOc1tHxkqq', '{"read": true, "write": true, "model": true}', true, NOW(), NOW()),
('reengine-core', 'Core MCP Server', '$2b$12$A9GSQIvHOlW9y3hmqLe8nOQANKcpb/g9scun3/JNWi/vyFjsfFKNq', '{"read": true, "write": true, "orchestrate": true}', true, NOW(), NOW()),
('reengine-outreach', 'Outreach MCP Server', '$2b$12$4iBNPZociwm.TDGGSAUiGu9DdbTi.KnI1RFvhnKioYKEQR6DtNari', '{"read": true, "write": true, "outreach": true}', true, NOW(), NOW());
