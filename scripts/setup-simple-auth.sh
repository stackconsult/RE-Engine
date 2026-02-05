#!/bin/bash

# Simple Service Authentication Setup
# Replaces complex SPIFFE/SPIRE with JWT + API keys

set -e

echo "🔧 Setting up Simple Service Authentication"
echo "=========================================="

# Step 1: Add required dependencies to engine/package.json
echo "📦 Adding authentication dependencies..."
cd engine

# Check if dependencies exist, add if needed
if ! npm list jsonwebtoken &>/dev/null; then
    npm install jsonwebtoken @types/jsonwebtoken
fi

if ! npm list express-rate-limit &>/dev/null; then
    npm install express-rate-limit
fi

# Step 2: Run database migration
echo "🗄️ Running database migration..."
if [ -f "src/database/migrations/003_add_service_auth.sql" ]; then
    # Run migration (you'll need to implement this based on your DB setup)
    echo "⚠️  Please run the migration manually:"
    echo "   psql -d reengine -f src/database/migrations/003_add_service_auth.sql"
else
    echo "❌ Migration file not found"
fi

# Step 3: Generate API keys
echo "🔑 Generating API keys..."
cat > .env.auth << EOF
# Service Authentication Keys (Production - Change these!)
ENGINE_API_KEY=$(openssl rand -hex 32)
BROWSER_API_KEY=$(openssl rand -hex 32)
TINYFISH_API_KEY=$(openssl rand -hex 32)
LLAMA_API_KEY=$(openssl rand -hex 32)
CORE_API_KEY=$(openssl rand -hex 32)
OUTREACH_API_KEY=$(openssl rand -hex 32)

# JWT Secret (Production - Change this!)
JWT_SECRET=$(openssl rand -hex 64)
EOF

echo "✅ API keys generated in .env.auth"
echo "⚠️  Review and merge into your main .env file"

# Step 4: Test the setup
echo "🧪 Testing authentication setup..."
cat > test-auth.cjs << 'EOF'
const jwt = require('jsonwebtoken');

// Test JWT generation
const testToken = jwt.sign(
  { serviceId: 'test', permissions: ['read'] },
  process.env.JWT_SECRET || 'test-secret',
  { expiresIn: '1h' }
);

console.log('✅ JWT Test:', testToken);

// Test validation
try {
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'test-secret');
  console.log('✅ JWT Validation:', decoded);
} catch (error) {
  console.log('❌ JWT Validation failed:', error.message);
}
EOF

node test-auth.cjs
rm test-auth.cjs

cd ..

echo ""
echo "🎉 Simple Authentication Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review and merge .env.auth into your main .env"
echo "2. Run the database migration manually"
echo "3. Update your MCP servers to use API keys"
echo "4. Test service-to-service communication"
echo ""
echo "🔐 Usage Examples:"
echo "  curl -H 'X-API-Key: your-api-key' http://localhost:3001/api/protected"
echo "  curl -H 'Authorization: Bearer your-jwt-token' http://localhost:3001/api/protected"
