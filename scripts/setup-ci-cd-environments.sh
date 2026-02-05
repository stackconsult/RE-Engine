#!/bin/bash

# CI/CD Environment Setup Script
# This script automates the setup of GitHub environments and secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="${REPO_OWNER:-stackconsult}"
REPO_NAME="${REPO_NAME:-RE-Engine}"

echo -e "${BLUE}🚀 RE Engine CI/CD Environment Setup${NC}"
echo "=================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo "Visit: https://cli.github.com/manual/installation"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub. Run 'gh auth login' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
echo ""

# Function to create environment
create_environment() {
    local env_name="$1"
    local env_url="$2"
    local wait_timer="$3"
    local protection_rules="$4"
    
    echo -e "${BLUE}📋 Creating environment: $env_name${NC}"
    
    # Check if environment already exists
    if gh api repos/$REPO_OWNER/$REPO_NAME/environments/$env_name &> /dev/null; then
        echo -e "${YELLOW}⚠️ Environment '$env_name' already exists${NC}"
        return 0
    fi
    
    # Create environment
    local payload="{\"name\":\"$env_name\""
    
    if [ -n "$env_url" ]; then
        payload="$payload,\"url\":\"$env_url\""
    fi
    
    if [ -n "$wait_timer" ]; then
        payload="$payload,\"wait_timer\":$wait_timer"
    fi
    
    if [ -n "$protection_rules" ]; then
        payload="$payload,\"protection_rules\":$protection_rules"
    fi
    
    payload="$payload}"
    
    if gh api repos/$REPO_OWNER/$REPO_NAME/environments \
        --method POST \
        --field name="$env_name" \
        --field url="$env_url" \
        --field wait_timer="$wait_timer" \
        --field protection_rules="$protection_rules" &> /dev/null; then
        echo -e "${GREEN}✅ Environment '$env_name' created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create environment '$env_name'${NC}"
        return 1
    fi
}

# Function to add secret to environment
add_environment_secret() {
    local env_name="$1"
    local secret_name="$2"
    local secret_value="$3"
    
    echo -e "${BLUE}🔐 Adding secret to $env_name: $secret_name${NC}"
    
    if gh secret set "$secret_name" --body "$secret_value" --env "$env_name" &> /dev/null; then
        echo -e "${GREEN}✅ Secret '$secret_name' added to '$env_name'${NC}"
    else
        echo -e "${RED}❌ Failed to add secret '$secret_name' to '$env_name'${NC}"
        return 1
    fi
}

# Function to add repository secret
add_repository_secret() {
    local secret_name="$1"
    local secret_value="$2"
    
    echo -e "${BLUE}🔐 Adding repository secret: $secret_name${NC}"
    
    if gh secret set "$secret_name" --body "$secret_value" &> /dev/null; then
        echo -e "${GREEN}✅ Repository secret '$secret_name' added${NC}"
    else
        echo -e "${RED}❌ Failed to add repository secret '$secret_name'${NC}"
        return 1
    fi
}

# Function to generate random string
generate_random_string() {
    local length="$1"
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to prompt for value
prompt_for_value() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    echo -e "${YELLOW}📝 $prompt${NC}"
    if [ -n "$default" ]; then
        echo -e "${YELLOW}   Default: $default${NC}"
    fi
    read -p "Value: " value
    
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    
    eval "$var_name=\"$value\""
}

# Create environments
echo -e "${BLUE}🏗️ Creating GitHub environments...${NC}"
echo ""

# Staging environment
create_environment "staging" "https://staging.reengine.com" "0" "[]"

# Production environment with protection
create_environment "production" "https://reengine.com" "300" "[{\"type\":\"required_reviewers\",\"prevent_self_review\":true}]"

echo ""
echo -e "${BLUE}🔐 Setting up secrets...${NC}"
echo ""

# Staging environment secrets
echo -e "${YELLOW}📋 Staging Environment Configuration${NC}"
echo "=================================="

prompt_for_value "GCP Project ID for staging" "" "GCP_PROJECT_ID"
prompt_for_value "GCP Region for staging" "us-central1" "GCP_REGION"
prompt_for_value "Database Host for staging" "" "DB_HOST"
prompt_for_value "Database Password for staging" "$(generate_random_string 32)" "DB_PASSWORD"
prompt_for_value "JWT Secret for staging" "$(generate_random_string 64)" "JWT_SECRET"
prompt_for_value "GCP Service Account Key file path" "" "GCP_SA_KEY_FILE"

# Read GCP SA key from file
if [ -n "$GCP_SA_KEY_FILE" ] && [ -f "$GCP_SA_KEY_FILE" ]; then
    GCP_SA_KEY=$(cat "$GCP_SA_KEY_FILE")
else
    echo -e "${RED}❌ GCP Service Account Key file not found${NC}"
    echo "Please create a service account key and provide the file path"
    exit 1
fi

# Add staging secrets
add_environment_secret "staging" "GCP_PROJECT_ID" "$GCP_PROJECT_ID"
add_environment_secret "staging" "GCP_REGION" "$GCP_REGION"
add_environment_secret "staging" "GCP_SA_KEY" "$GCP_SA_KEY"
add_environment_secret "staging" "DB_HOST" "$DB_HOST"
add_environment_secret "staging" "DB_PASSWORD" "$DB_PASSWORD"
add_environment_secret "staging" "JWT_SECRET" "$JWT_SECRET"

echo ""
echo -e "${YELLOW}📋 Production Environment Configuration${NC}"
echo "====================================="

prompt_for_value "GCP Project ID for production" "" "GCP_PROJECT_ID_PROD"
prompt_for_value "GCP Region for production" "us-central1" "GCP_REGION_PROD"
prompt_for_value "Database Host for production" "" "DB_HOST_PROD"
prompt_for_value "Database Password for production" "$(generate_random_string 32)" "DB_PASSWORD_PROD"
prompt_for_value "JWT Secret for production" "$(generate_random_string 64)" "JWT_SECRET_PROD"
prompt_for_value "GCP Service Account Key file path for production" "" "GCP_SA_KEY_FILE_PROD"

# Read production GCP SA key from file
if [ -n "$GCP_SA_KEY_FILE_PROD" ] && [ -f "$GCP_SA_KEY_FILE_PROD" ]; then
    GCP_SA_KEY_PROD=$(cat "$GCP_SA_KEY_FILE_PROD")
else
    echo -e "${RED}❌ Production GCP Service Account Key file not found${NC}"
    echo "Please create a production service account key and provide the file path"
    exit 1
fi

# Add production secrets
add_environment_secret "production" "GCP_PROJECT_ID_PROD" "$GCP_PROJECT_ID_PROD"
add_environment_secret "production" "GCP_REGION_PROD" "$GCP_REGION_PROD"
add_environment_secret "production" "GCP_SA_KEY_PROD" "$GCP_SA_KEY_PROD"
add_environment_secret "production" "DB_HOST_PROD" "$DB_HOST_PROD"
add_environment_secret "production" "DB_PASSWORD_PROD" "$DB_PASSWORD_PROD"
add_environment_secret "production" "JWT_SECRET_PROD" "$JWT_SECRET_PROD"

echo ""
echo -e "${YELLOW}📋 Repository Configuration${NC}"
echo "=========================="

prompt_for_value "Slack Webhook URL (optional)" "" "SLACK_WEBHOOK_URL"

# Add repository secrets
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    add_repository_secret "SLACK_WEBHOOK_URL" "$SLACK_WEBHOOK_URL"
fi

echo ""
echo -e "${GREEN}🎉 Environment setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Verify environments in GitHub repository settings"
echo "2. Test the CI/CD pipeline by pushing to develop branch"
echo "3. Monitor the deployment process"
echo ""
echo -e "${GREEN}✅ Your CI/CD pipeline is now ready to use!${NC}"
