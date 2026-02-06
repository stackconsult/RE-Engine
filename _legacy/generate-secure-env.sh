#!/bin/bash

# Secure Environment Configuration Generator
# Converts plain text secrets to bcrypt hashes

set -e

echo "🔒 Generating Secure Environment Configuration"
echo "============================================"

# Generate secure random values
JWT_SECRET=$(openssl rand -hex 64)
ENGINE_API_KEY_PLAIN=$(openssl rand -hex 32)
BROWSER_API_KEY_PLAIN=$(openssl rand -hex 32)
TINYFISH_API_KEY_PLAIN=$(openssl rand -hex 32)
LLAMA_API_KEY_PLAIN=$(openssl rand -hex 32)
CORE_API_KEY_PLAIN=$(openssl rand -hex 32)
OUTREACH_API_KEY_PLAIN=$(openssl rand -hex 32)

# Generate bcrypt hashes (requires Node.js)
echo "🔑 Generating bcrypt hashes..."
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
    console.log(`${key}_HASH=\${hash}`);
  }
}

generateHashes().catch(console.error);
EOF

# Generate hashes
HASHES=$(node temp_hash.cjs "$ENGINE_API_KEY_PLAIN" "$BROWSER_API_KEY_PLAIN" "$TINYFISH_API_KEY_PLAIN" "$LLAMA_API_KEY_PLAIN" "$CORE_API_KEY_PLAIN" "$OUTREACH_API_KEY_PLAIN")
rm temp_hash.cjs

# Create secure environment file
cat > .env.secure << EOF
# RE Engine Secure Environment Configuration
# Generated: $(date)
# WARNING: This file contains bcrypt hashes, not plain text keys

# =============================================================================
# SERVICE AUTHENTICATION (BCRYPT HASHED)
# =============================================================================
# JWT Secret (256-bit secure random)
JWT_SECRET=${JWT_SECRET}

# Service API Keys (bcrypt hashed - use bcrypt.compare() to validate)
${HASHES}

# Plain text keys for development (REMOVE IN PRODUCTION)
# ENGINE_API_KEY=${ENGINE_API_KEY_PLAIN}
# BROWSER_API_KEY=${BROWSER_API_KEY_PLAIN}
# TINYFISH_API_KEY=${TINYFISH_API_KEY_PLAIN}
# LLAMA_API_KEY=${LLAMA_API_KEY_PLAIN}
# CORE_API_KEY=${CORE_API_KEY_PLAIN}
# OUTREACH_API_KEY=${OUTREACH_API_KEY_PLAIN}

# =============================================================================
# AUTHENTICATION SETTINGS
# =============================================================================
JWT_EXPIRY=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
# Use environment-specific database URL
DATABASE_URL=\${DATABASE_URL:-postgresql://localhost:5432/reengine}

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
NODE_ENV=\${NODE_ENV:-development}
LOG_LEVEL=\${LOG_LEVEL:-info}
API_RATE_LIMIT=\${API_RATE_LIMIT:-100}
CORS_ORIGIN=\${CORS_ORIGIN:-http://localhost:3000}

# =============================================================================
# EXTERNAL API CONFIGURATION (ADD YOUR SECURE VALUES)
# =============================================================================
# Supabase (replace with your actual credentials)
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_KEY=your_supabase_service_key

# Ollama (replace with your actual key)
# OLLAMA_API_KEY=your_ollama_api_key

# Vertex AI (replace with your actual credentials)
# VERTEX_AI_PROJECT_ID=your_project_id
# VERTEX_AI_API_KEY=your_vertex_ai_api_key

# WhatsApp (replace with your actual key)
# WHATSAPP_API_KEY=your_whatsapp_api_key

# Tinyfish (replace with your actual key)
# TINYFISH_API_KEY=your_tinyfish_api_key
EOF

# Set secure permissions
chmod 600 .env.secure

echo "✅ Secure environment file created: .env.secure"
echo ""
echo "🔑 Plain text keys for development:"
echo "ENGINE_API_KEY=${ENGINE_API_KEY_PLAIN}"
echo "BROWSER_API_KEY=${BROWSER_API_KEY_PLAIN}"
echo "TINYFISH_API_KEY=${TINYFISH_API_KEY_PLAIN}"
echo "LLAMA_API_KEY=${LLAMA_API_KEY_PLAIN}"
echo "CORE_API_KEY=${CORE_API_KEY_PLAIN}"
echo "OUTREACH_API_KEY=${OUTREACH_API_KEY_PLAIN}"
echo ""
echo "🔒 Bcrypt hashes generated for production"
echo ""
echo "📋 Next steps:"
echo "1. Review .env.secure and add your actual API keys"
echo "2. Remove plain text keys from .env file"
echo "3. Update application to use bcrypt.compare() for validation"
echo "4. Run: npm install bcrypt @types/bcrypt"
echo "5. Test authentication with both plain text and hashed keys"
