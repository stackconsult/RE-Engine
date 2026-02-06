#!/bin/bash

# CI/CD Setup Validation Script
# This script validates that all CI/CD components are properly configured

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

echo -e "${BLUE}🔍 RE Engine CI/CD Setup Validation${NC}"
echo "====================================="
echo ""

# Validation results
VALIDATION_PASSED=true
VALIDATION_RESULTS=()

# Function to add validation result
add_result() {
    local status="$1"
    local message="$2"
    VALIDATION_RESULTS+=("$status: $message")
    
    if [ "$status" = "❌" ]; then
        VALIDATION_PASSED=false
    fi
}

# Function to check GitHub CLI
check_github_cli() {
    echo -e "${BLUE}🔧 Checking GitHub CLI...${NC}"
    
    if command -v gh &> /dev/null; then
        if gh auth status &> /dev/null; then
            add_result "✅" "GitHub CLI authenticated"
        else
            add_result "❌" "GitHub CLI not authenticated (run 'gh auth login')"
        fi
    else
        add_result "❌" "GitHub CLI not installed"
    fi
}

# Function to check Google Cloud CLI
check_gcloud_cli() {
    echo -e "${BLUE}🔧 Checking Google Cloud CLI...${NC}"
    
    if command -v gcloud &> /dev/null; then
        if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
            add_result "✅" "Google Cloud CLI authenticated"
        else
            add_result "❌" "Google Cloud CLI not authenticated (run 'gcloud auth login')"
        fi
    else
        add_result "❌" "Google Cloud CLI not installed"
    fi
}

# Function to check GitHub environments
check_github_environments() {
    echo -e "${BLUE}🏗️ Checking GitHub environments...${NC}"
    
    # Check staging environment
    if gh api repos/$REPO_OWNER/$REPO_NAME/environments/staging &> /dev/null; then
        add_result "✅" "Staging environment exists"
    else
        add_result "❌" "Staging environment not found"
    fi
    
    # Check production environment
    if gh api repos/$REPO_OWNER/$REPO_NAME/environments/production &> /dev/null; then
        add_result "✅" "Production environment exists"
    else
        add_result "❌" "Production environment not found"
    fi
}

# Function to check environment secrets
check_environment_secrets() {
    echo -e "${BLUE}🔐 Checking environment secrets...${NC}"
    
    # Staging secrets
    local staging_secrets=("GCP_PROJECT_ID" "GCP_REGION" "GCP_SA_KEY" "DB_HOST" "DB_PASSWORD" "JWT_SECRET")
    local missing_staging=()
    
    for secret in "${staging_secrets[@]}"; do
        if gh secret list --env staging | grep -q "$secret"; then
            echo "  ✅ $secret (staging)"
        else
            echo "  ❌ $secret (staging) - MISSING"
            missing_staging+=("$secret")
        fi
    done
    
    if [ ${#missing_staging[@]} -eq 0 ]; then
        add_result "✅" "All staging secrets configured"
    else
        add_result "❌" "Missing staging secrets: ${missing_staging[*]}"
    fi
    
    # Production secrets
    local production_secrets=("GCP_PROJECT_ID_PROD" "GCP_REGION_PROD" "GCP_SA_KEY_PROD" "DB_HOST_PROD" "DB_PASSWORD_PROD" "JWT_SECRET_PROD")
    local missing_production=()
    
    for secret in "${production_secrets[@]}"; do
        if gh secret list --env production | grep -q "$secret"; then
            echo "  ✅ $secret (production)"
        else
            echo "  ❌ $secret (production) - MISSING"
            missing_production+=("$secret")
        fi
    done
    
    if [ ${#missing_production[@]} -eq 0 ]; then
        add_result "✅" "All production secrets configured"
    else
        add_result "❌" "Missing production secrets: ${missing_production[*]}"
    fi
}

# Function to check repository secrets
check_repository_secrets() {
    echo -e "${BLUE}🔐 Checking repository secrets...${NC}"
    
    local repo_secrets=("SLACK_WEBHOOK_URL")
    local missing_repo=()
    
    for secret in "${repo_secrets[@]}"; do
        if gh secret list | grep -q "$secret"; then
            echo "  ✅ $secret (repository)"
        else
            echo "  ⚠️ $secret (repository) - OPTIONAL"
        fi
    done
    
    add_result "✅" "Repository secrets checked (SLACK_WEBHOOK_URL is optional)"
}

# Function to check service account files
check_service_account_files() {
    echo -e "${BLUE}🔑 Checking service account files...${NC}"
    
    local staging_key="./staging-service-account.json"
    local production_key="./production-service-account.json"
    
    if [ -f "$staging_key" ]; then
        if jq -e . "$staging_key" &> /dev/null; then
            add_result "✅" "Staging service account key file exists and is valid JSON"
        else
            add_result "❌" "Staging service account key file is invalid JSON"
        fi
    else
        add_result "❌" "Staging service account key file not found"
    fi
    
    if [ -f "$production_key" ]; then
        if jq -e . "$production_key" &> /dev/null; then
            add_result "✅" "Production service account key file exists and is valid JSON"
        else
            add_result "❌" "Production service account key file is invalid JSON"
        fi
    else
        add_result "❌" "Production service account key file not found"
    fi
}

# Function to check GCP projects
check_gcp_projects() {
    echo -e "${BLUE}☁️ Checking GCP projects...${NC}"
    
    # Check if we can access any projects
    local projects=$(gcloud projects list --format="value(projectId)" 2>/dev/null || echo "")
    
    if [ -n "$projects" ]; then
        local project_count=$(echo "$projects" | wc -l)
        add_result "✅" "Can access $project_count GCP project(s)"
        
        echo "  Available projects:"
        echo "$projects" | head -5 | sed 's/^/    - /'
        
        if [ "$project_count" -gt 5 ]; then
            echo "    ... and $((project_count - 5)) more"
        fi
    else
        add_result "❌" "Cannot access any GCP projects"
    fi
}

# Function to check required APIs
check_required_apis() {
    echo -e "${BLUE}🔧 Checking required APIs...${NC}"
    
    local projects=$(gcloud projects list --format="value(projectId)" 2>/dev/null || echo "")
    local required_apis=("run.googleapis.com" "cloudbuild.googleapis.com" "artifactregistry.googleapis.com")
    
    if [ -n "$projects" ]; then
        local first_project=$(echo "$projects" | head -1)
        echo "  Checking APIs for project: $first_project"
        
        local missing_apis=()
        for api in "${required_apis[@]}"; do
            if gcloud services list --project="$first_project" --enabled --filter="config.name=$api" --format="value(config.name)" | grep -q "$api"; then
                echo "    ✅ $api"
            else
                echo "    ❌ $api - NOT ENABLED"
                missing_apis+=("$api")
            fi
        done
        
        if [ ${#missing_apis[@]} -eq 0 ]; then
            add_result "✅" "All required APIs enabled"
        else
            add_result "❌" "Missing APIs: ${missing_apis[*]}"
        fi
    else
        add_result "❌" "Cannot check APIs (no project access)"
    fi
}

# Function to check workflow file
check_workflow_file() {
    echo -e "${BLUE}📋 Checking workflow file...${NC}"
    
    local workflow_file=".github/workflows/ci-cd.yml"
    
    if [ -f "$workflow_file" ]; then
        if yq eval . "$workflow_file" &> /dev/null; then
            add_result "✅" "CI/CD workflow file exists and is valid YAML"
            
            # Check for key workflow components
            if grep -q "validate-environment" "$workflow_file"; then
                echo "  ✅ Environment validation step found"
            else
                echo "  ⚠️ Environment validation step not found"
            fi
            
            if grep -q "deploy-staging" "$workflow_file"; then
                echo "  ✅ Staging deployment step found"
            else
                echo "  ⚠️ Staging deployment step not found"
            fi
            
            if grep -q "deploy-production" "$workflow_file"; then
                echo "  ✅ Production deployment step found"
            else
                echo "  ⚠️ Production deployment step not found"
            fi
        else
            add_result "❌" "CI/CD workflow file is invalid YAML"
        fi
    else
        add_result "❌" "CI/CD workflow file not found"
    fi
}

# Function to check Docker setup
check_docker_setup() {
    echo -e "${BLUE}🐳 Checking Docker setup...${NC}"
    
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            add_result "✅" "Docker is installed and running"
        else
            add_result "❌" "Docker is installed but not running"
        fi
    else
        add_result "❌" "Docker is not installed"
    fi
    
    if [ -f "Dockerfile" ]; then
        echo "  ✅ Dockerfile exists"
    else
        echo "  ⚠️ Dockerfile not found"
    fi
}

# Function to check Node.js setup
check_nodejs_setup() {
    echo -e "${BLUE}📦 Checking Node.js setup...${NC}"
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        echo "  ✅ Node.js installed: $node_version"
        
        # Check if version is 18 or higher
        local major_version=$(echo "$node_version" | cut -d'.' -f1 | sed 's/v//')
        if [ "$major_version" -ge 18 ]; then
            add_result "✅" "Node.js version is compatible (>=18)"
        else
            add_result "❌" "Node.js version is too old (<18)"
        fi
    else
        add_result "❌" "Node.js is not installed"
    fi
    
    if [ -f "package.json" ]; then
        echo "  ✅ package.json exists"
    else
        echo "  ⚠️ package.json not found"
    fi
}

# Function to generate setup commands
generate_setup_commands() {
    echo ""
    echo -e "${BLUE}📋 Setup Commands (if validation failed):${NC}"
    echo "=========================================="
    echo ""
    
    echo -e "${YELLOW}1. Install required tools:${NC}"
    echo "   # GitHub CLI"
    echo "   brew install gh  # macOS"
    echo "   # or visit: https://cli.github.com/manual/installation"
    echo ""
    echo "   # Google Cloud CLI"
    echo "   brew install gcloud  # macOS"
    echo "   # or visit: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "   # Docker"
    echo "   brew install docker  # macOS"
    echo "   # or visit: https://docs.docker.com/get-docker/"
    echo ""
    echo "   # Node.js"
    echo "   brew install node  # macOS"
    echo "   # or visit: https://nodejs.org/"
    echo ""
    
    echo -e "${YELLOW}2. Authenticate with services:${NC}"
    echo "   gh auth login"
    echo "   gcloud auth login"
    echo "   gcloud auth application-default login"
    echo ""
    
    echo -e "${YELLOW}3. Run setup scripts:${NC}"
    echo "   ./scripts/setup-gcp-service-accounts.sh"
    echo "   ./scripts/setup-ci-cd-environments.sh"
    echo ""
    
    echo -e "${YELLOW}4. Enable required APIs (if not done by script):${NC}"
    echo "   gcloud services enable run.googleapis.com --project=YOUR_PROJECT_ID"
    echo "   gcloud services enable cloudbuild.googleapis.com --project=YOUR_PROJECT_ID"
    echo "   gcloud services enable artifactregistry.googleapis.com --project=YOUR_PROJECT_ID"
    echo ""
}

# Main validation function
main() {
    echo -e "${BLUE}🔍 RE Engine CI/CD Setup Validation${NC}"
    echo "====================================="
    echo ""
    
    # Run all checks
    check_github_cli
    check_gcloud_cli
    check_github_environments
    check_environment_secrets
    check_repository_secrets
    check_service_account_files
    check_gcp_projects
    check_required_apis
    check_workflow_file
    check_docker_setup
    check_nodejs_setup
    
    echo ""
    echo -e "${BLUE}📊 Validation Results${NC}"
    echo "===================="
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        echo "$result"
    done
    
    echo ""
    
    if [ "$VALIDATION_PASSED" = true ]; then
        echo -e "${GREEN}🎉 All validations passed! Your CI/CD setup is ready.${NC}"
        echo ""
        echo -e "${BLUE}📋 Next Steps:${NC}"
        echo "1. Test the CI/CD pipeline by pushing to develop branch"
        echo "2. Monitor the deployment process"
        echo "3. Verify staging deployment at https://staging.reengine.com"
        echo "4. Create a release to test production deployment"
    else
        echo -e "${RED}❌ Some validations failed. Please fix the issues above.${NC}"
        generate_setup_commands
    fi
    
    echo ""
    echo -e "${BLUE}🔧 For additional help, run:${NC}"
    echo "  ./scripts/setup-gcp-service-accounts.sh"
    echo "  ./scripts/setup-ci-cd-environments.sh"
    echo ""
}

# Check for required tools
for tool in jq yq; do
    if ! command -v "$tool" &> /dev/null; then
        echo -e "${YELLOW}⚠️ $tool is not installed. Some validations may be skipped.${NC}"
    fi
done

# Run main function
main "$@"
