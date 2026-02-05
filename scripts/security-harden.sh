#!/bin/bash

# Security Hardening Script
# Run this after initial setup

set -e

echo "🔒 Security Hardening for JWT Authentication"
echo "============================================="

# 1. Generate production-grade secrets
echo "🔑 Generating production secrets..."
JWT_SECRET=$(openssl rand -hex 64)
ENGINE_API_KEY=$(openssl rand -hex 32)
BROWSER_API_KEY=$(openssl rand -hex 32)
TINYFISH_API_KEY=$(openssl rand -hex 32)
LLAMA_API_KEY=$(openssl rand -hex 32)
CORE_API_KEY=$(openssl rand -hex 32)
OUTREACH_API_KEY=$(openssl rand -hex 32)

# 2. Create production environment file
cat > .env.production << EOF
# Production Authentication Configuration
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# JWT Secret (256-bit secure random)
JWT_SECRET=${JWT_SECRET}

# Service API Keys (256-bit secure random)
ENGINE_API_KEY=${ENGINE_API_KEY}
BROWSER_API_KEY=${BROWSER_API_KEY}
TINYFISH_API_KEY=${TINYFISH_API_KEY}
LLAMA_API_KEY=${LLAMA_API_KEY}
CORE_API_KEY=${CORE_API_KEY}
OUTREACH_API_KEY=${OUTREACH_API_KEY}

# Security Settings
JWT_EXPIRY=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
NODE_ENV=production

# Database (use secure connection string)
DATABASE_URL=postgresql://username:password@localhost:5432/reengine?sslmode=require
EOF

echo "✅ Production environment created: .env.production"

# 3. Set file permissions
chmod 600 .env.production
echo "✅ Set secure file permissions"

# 4. Security checklist
echo ""
echo "🔍 Security Checklist:"
echo "===================="
echo "✅ Secrets are 256-bit cryptographically secure"
echo "✅ Environment file has restricted permissions (600)"
echo "✅ Database connection requires SSL"
echo "⚠️  Add .env.production to .gitignore"
echo "⚠️  Run database migration with bcrypt hashing"
echo "⚠️  Enable audit logging in production"
echo "⚠️  Set up log rotation for auth logs"

# 5. Git security
echo ""
echo "🔒 Git Security Setup:"
echo "===================="
if ! grep -q ".env.production" .gitignore; then
    echo ".env.production" >> .gitignore
    echo "✅ Added .env.production to .gitignore"
fi

echo ""
echo "🎉 Security hardening complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review .env.production settings"
echo "2. Run: psql -d reengine -f engine/src/database/migrations/003_add_service_auth.sql"
echo "3. Start application with: NODE_ENV=production npm start"
echo "4. Test authentication with production keys"
