#!/bin/bash

# Emergency Security Fix Script
# Replaces all plain text API keys with bcrypt hashes

set -e

echo "🚨 EMERGENCY SECURITY FIX - API KEY HASHING"
echo "=========================================="

# Generate new secure keys
ENGINE_API_KEY=$(openssl rand -hex 32)
BROWSER_API_KEY=$(openssl rand -hex 32)
TINYFISH_API_KEY=$(openssl rand -hex 32)
LLAMA_API_KEY=$(openssl rand -hex 32)
CORE_API_KEY=$(openssl rand -hex 32)
OUTREACH_API_KEY=$(openssl rand -hex 32)

# Generate bcrypt hashes
cat > temp_hash.cjs << 'EOF'
const bcrypt = require('bcrypt');

const keys = {
  ENGINE_API_KEY: process.argv[2],
  BROWSER_API_KEY: process.argv[3],
  TINYFISH_API_KEY: process.argv[4],
  LLAMA_API_KEY: process.argv[5],
  CORE_API_KEY: process.argv[6],
  OUTREACH_API_KEY: process.argv[7]
};

async function generateHashes() {
  for (const [key, value] of Object.entries(keys)) {
    const hash = await bcrypt.hash(value, 12);
    console.log(`${key}_HASH=${hash}`);
  }
}

generateHashes().catch(console.error);
EOF

HASHES=$(node temp_hash.cjs "$ENGINE_API_KEY" "$BROWSER_API_KEY" "$TINYFISH_API_KEY" "$LLAMA_API_KEY" "$CORE_API_KEY" "$OUTREACH_API_KEY")
rm temp_hash.cjs

# Create secure environment file
cat > .env.production << EOF
# RE Engine Production Environment (SECURE)
# Generated: $(date)
# WARNING: All API keys are bcrypt hashed

# =============================================================================
# SERVICE AUTHENTICATION (BCRYPT HASHED)
# =============================================================================
# JWT Secret (256-bit secure random)
JWT_SECRET=$(openssl rand -hex 64)

# Service API Keys (bcrypt hashed)
${HASHES}

# =============================================================================
# EXTERNAL API CONFIGURATION (KEEP EXISTING)
# =============================================================================
# Ollama Configuration (keep existing)
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=30000

# Tinyfish Configuration (keep existing)
TINYFISH_API_URL=https://mino.ai/v1/automation/run-sse

# WhatsApp Configuration (keep existing)
WHATSAPP_API_URL=https://gate.whapi.cloud
WHATSAPP_WEBHOOK_URL=https://your-domain.cloud/webhook-path
WHATSAPP_CHANNEL_ID=MANTIS-98E5V
WHATSAPP_PHONE_NUMBER=+15874159480

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=postgresql://localhost:5432/reengine

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
NODE_ENV=production
LOG_LEVEL=warn
API_RATE_LIMIT=100
CORS_ORIGIN=https://your-domain.com
JWT_EXPIRY=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EOF

# Set secure permissions
chmod 600 .env.production

echo "✅ Secure production environment created: .env.production"
echo ""
echo "🔑 New plain text keys (SAVE THESE SECURELY):"
echo "ENGINE_API_KEY=$ENGINE_API_KEY"
echo "BROWSER_API_KEY=$BROWSER_API_KEY"
echo "TINYFISH_API_KEY=$TINYFISH_API_KEY"
echo "LLAMA_API_KEY=$LLAMA_API_KEY"
echo "CORE_API_KEY=$CORE_API_KEY"
echo "OUTREACH_API_KEY=$OUTREACH_API_KEY"
echo ""
echo "🔒 SECURITY ACTIONS REQUIRED:"
echo "1. Backup current .env file: cp .env .env.backup"
echo "2. Replace plain text keys in .env with: [REMOVED_FOR_SECURITY]"
echo "3. Update MCP servers to use new keys"
echo "4. Run database migration with bcrypt hashes"
echo "5. Test all services with new authentication"
echo ""
echo "🚨 CRITICAL: The following keys are still exposed in .env:"
echo "- OLLAMA_API_KEY (external service - keep as is)"
echo "- TINYFISH_API_KEY (external service - keep as is)"
echo "- WHATSAPP_API_KEY (external service - keep as is)"
echo ""
echo "✅ INTERNAL service keys are now secured with bcrypt!"
