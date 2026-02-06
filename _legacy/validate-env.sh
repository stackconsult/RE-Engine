#!/bin/bash

# RE Engine Environment Validation Script
# Validates that required environment variables are set

set -e

echo "🔍 RE Engine Environment Validation"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please run: ./scripts/setup-env.sh"
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Load environment variables
set -a
source .env
set +a

# Required variables with descriptions
declare -A REQUIRED_VARS=(
    ["OLLAMA_API_KEY"]="Ollama API key for cloud model access"
    ["JWT_SECRET"]="Secret key for JWT token signing"
    ["SESSION_SECRET"]="Secret key for session management"
)

# Optional variables with descriptions
declare -A OPTIONAL_VARS=(
    ["OLLAMA_DEVICE_KEY"]="SSH device key for Ollama authentication"
    ["OLLAMA_BASE_URL"]="Ollama server URL"
    ["OLLAMA_MODEL"]="Default Ollama model"
    ["DB_TYPE"]="Database type (csv/postgresql)"
    ["NODE_ENV"]="Environment (development/production)"
    ["LOG_LEVEL"]="Logging level"
)

# Check required variables
echo ""
echo "🔧 Required Variables:"
echo "---------------------"

all_required_set=true

for var in "${!REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ $var${NC} - ${REQUIRED_VARS[$var]}"
        all_required_set=false
    elif [[ "$var" == *"KEY"* || "$var" == *"SECRET"* ]] && [[ "${!var}" == *"your_"* || "${!var}" == *"placeholder"* ]]; then
        echo -e "${YELLOW}⚠️  $var${NC} - ${REQUIRED_VARS[$var]} (placeholder value)"
        all_required_set=false
    else
        echo -e "${GREEN}✅ $var${NC} - ${REQUIRED_VARS[$var]}"
    fi
done

# Check optional variables
echo ""
echo "🔧 Optional Variables:"
echo "---------------------"

for var in "${!OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚪ $var${NC} - ${OPTIONAL_VARS[$var]} (not set)"
    elif [[ "$var" == *"KEY"* || "$var" == *"SECRET"* ]] && [[ "${!var}" == *"your_"* || "${!var}" == *"placeholder"* ]]; then
        echo -e "${YELLOW}⚠️  $var${NC} - ${OPTIONAL_VARS[$var]} (placeholder value)"
    else
        echo -e "${GREEN}✅ $var${NC} - ${OPTIONAL_VARS[$var]}"
    fi
done

# Security checks
echo ""
echo "🔒 Security Checks:"
echo "------------------"

# Check if .env is in .gitignore
if grep -q "^\.env$" .gitignore; then
    echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
    echo -e "${RED}❌ .env is not in .gitignore${NC}"
fi

# Check file permissions
env_perms=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null)
if [ "$env_perms" = "600" ] || [ "$env_perms" = "640" ]; then
    echo -e "${GREEN}✅ .env has secure permissions ($env_perms)${NC}"
else
    echo -e "${YELLOW}⚠️  .env permissions: $env_perms (recommend 600)${NC}"
fi

# Final result
echo ""
if [ "$all_required_set" = true ]; then
    echo -e "${GREEN}🎉 All required environment variables are set!${NC}"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start your application: npm start"
    echo "2. Or run in development: npm run dev"
    exit 0
else
    echo -e "${RED}❌ Some required environment variables are missing or using placeholders${NC}"
    echo ""
    echo "📋 To fix:"
    echo "1. Edit .env file: nano .env"
    echo "2. Replace placeholder values with actual secrets"
    echo "3. Run this script again: ./scripts/validate-env.sh"
    exit 1
fi
