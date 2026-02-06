#!/bin/bash
# File: scripts/production-setup-step1.sh

echo "🚀 STEP 1: PRODUCTION FOUNDATION LAYER"
echo "======================================"

# STEP 1.1: Environment Configuration
echo "📋 STEP 1.1: Environment Configuration"
export NODE_ENV=production
export LOG_LEVEL=info
export METRICS_ENABLED=true
export HEALTH_CHECK_ENABLED=true

# STEP 1.2: Security Configuration
echo "🔐 STEP 1.2: Security Configuration"
export JWT_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -hex 32)
export API_RATE_LIMIT=1000
export CORS_ORIGINS="https://dashboard.reengine.com"

# STEP 1.3: Database Configuration
echo "🗄️ STEP 1.3: Database Configuration"
export SUPABASE_URL=${SUPABASE_URL}
export SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
export SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
export DATABASE_POOL_SIZE=20
export DATABASE_TIMEOUT=30000

# STEP 1.4: AI Services Configuration
echo "🤖 STEP 1.4: AI Services Configuration"
export OLLAMA_HOST=localhost
export OLLAMA_PORT=11434
export OLLAMA_MODELS="llama2,mistral,codellama"
export OPENCLAW_ENDPOINT=${OPENCLAW_ENDPOINT}
export OPENCLAW_API_KEY=${OPENCLAW_API_KEY}

# STEP 1.5: MCP Configuration
echo "🔌 STEP 1.5: MCP Configuration"
export TINYFISH_API_URL=${TINYFISH_API_URL}
export TINYFISH_API_KEY=${TINYFISH_API_KEY}
export MCP_SERVER_PORTS="3001,3002,3003"
export MCP_TIMEOUT=60000

# STEP 1.6: Monitoring & Observability
echo "📊 STEP 1.6: Monitoring Configuration"
export PROMETHEUS_PORT=9090
export GRAFANA_PORT=3001
export JAEGER_ENDPOINT=${JAEGER_ENDPOINT}
export SENTRY_DSN=${SENTRY_DSN}

echo "✅ Environment Configuration Complete"
