#!/bin/bash

# GCP Service Account Setup Script
# This script creates and configures service accounts for CI/CD

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 GCP Service Account Setup${NC}"
echo "==============================="
echo ""

# Function to check if gcloud is installed
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ Google Cloud CLI (gcloud) is not installed.${NC}"
        echo "Visit: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Google Cloud CLI found${NC}"
}

# Function to check if user is authenticated
check_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo -e "${RED}❌ Not authenticated with Google Cloud.${NC}"
        echo "Run: gcloud auth login"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Google Cloud authentication verified${NC}"
}

# Function to create service account
create_service_account() {
    local project_id="$1"
    local account_name="$2"
    local display_name="$3"
    local description="$4"
    
    echo -e "${BLUE}📋 Creating service account: $account_name${NC}"
    
    # Check if service account already exists
    if gcloud iam service-accounts describe "$account_name@$project_id.iam.gserviceaccount.com" --project="$project_id" &> /dev/null; then
        echo -e "${YELLOW}⚠️ Service account '$account_name' already exists${NC}"
        return 0
    fi
    
    # Create service account
    if gcloud iam service-accounts create "$account_name" \
        --display-name="$display_name" \
        --description="$description" \
        --project="$project_id" &> /dev/null; then
        echo -e "${GREEN}✅ Service account '$account_name' created${NC}"
    else
        echo -e "${RED}❌ Failed to create service account '$account_name'${NC}"
        return 1
    fi
}

# Function to grant roles to service account
grant_roles() {
    local project_id="$1"
    local account_name="$2"
    shift 2
    local roles=("$@")
    
    echo -e "${BLUE}🔐 Granting roles to $account_name${NC}"
    
    for role in "${roles[@]}"; do
        echo "  - Granting role: $role"
        if gcloud projects add-iam-policy-binding "$project_id" \
            --member="serviceAccount:$account_name@$project_id.iam.gserviceaccount.com" \
            --role="$role" &> /dev/null; then
            echo -e "${GREEN}    ✅ Role '$role' granted${NC}"
        else
            echo -e "${RED}    ❌ Failed to grant role '$role'${NC}"
            return 1
        fi
    done
}

# Function to create and download service account key
create_service_account_key() {
    local project_id="$1"
    local account_name="$2"
    local key_file="$3"
    
    echo -e "${BLUE}🔑 Creating service account key for $account_name${NC}"
    
    # Create key file directory if it doesn't exist
    mkdir -p "$(dirname "$key_file")"
    
    # Create and download key
    if gcloud iam service-accounts keys create "$key_file" \
        --iam-account="$account_name@$project_id.iam.gserviceaccount.com" \
        --project="$project_id" &> /dev/null; then
        echo -e "${GREEN}✅ Service account key created: $key_file${NC}"
    else
        echo -e "${RED}❌ Failed to create service account key${NC}"
        return 1
    fi
}

# Function to enable required APIs
enable_apis() {
    local project_id="$1"
    local apis=("$@")
    
    echo -e "${BLUE}🔧 Enabling required APIs${NC}"
    
    for api in "${apis[@]}"; do
        echo "  - Enabling API: $api"
        if gcloud services enable "$api" --project="$project_id" &> /dev/null; then
            echo -e "${GREEN}    ✅ API '$api' enabled${NC}"
        else
            echo -e "${YELLOW}    ⚠️ API '$api' may already be enabled${NC}"
        fi
    done
}

# Function to prompt for project ID
prompt_project_id() {
    local var_name="$1"
    local prompt="$2"
    
    echo -e "${YELLOW}📝 $prompt${NC}"
    echo "Available projects:"
    gcloud projects list --format="value(projectId)" | sed 's/^/  - /'
    echo ""
    read -p "Project ID: " project_id
    
    if [ -z "$project_id" ]; then
        echo -e "${RED}❌ Project ID is required${NC}"
        exit 1
    fi
    
    eval "$var_name=\"$project_id\""
}

# Main setup function
setup_staging_environment() {
    echo -e "${BLUE}🏗️ Setting up Staging Environment${NC}"
    echo "================================"
    
    prompt_project_id "STAGING_PROJECT_ID" "Enter staging GCP project ID:"
    
    local account_name="reengine-staging-deployer"
    local display_name="RE Engine Staging Deployer"
    local description="Service account for deploying RE Engine to staging environment"
    local key_file="./staging-service-account.json"
    
    # Create service account
    create_service_account "$STAGING_PROJECT_ID" "$account_name" "$display_name" "$description"
    
    # Grant required roles
    local roles=(
        "roles/run.admin"
        "roles/cloudbuild.builds.builder"
        "roles/artifactregistry.writer"
        "roles/logging.logWriter"
        "roles/monitoring.metricWriter"
    )
    
    grant_roles "$STAGING_PROJECT_ID" "$account_name" "${roles[@]}"
    
    # Create service account key
    create_service_account_key "$STAGING_PROJECT_ID" "$account_name" "$key_file"
    
    # Enable required APIs
    local apis=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "artifactregistry.googleapis.com"
        "logging.googleapis.com"
        "monitoring.googleapis.com"
    )
    
    enable_apis "$STAGING_PROJECT_ID" "${apis[@]}"
    
    echo ""
    echo -e "${GREEN}✅ Staging environment setup completed${NC}"
    echo -e "${BLUE}📋 Staging Configuration:${NC}"
    echo "  Project ID: $STAGING_PROJECT_ID"
    echo "  Service Account: $account_name@$STAGING_PROJECT_ID.iam.gserviceaccount.com"
    echo "  Key File: $key_file"
    echo ""
}

setup_production_environment() {
    echo -e "${BLUE}🏗️ Setting up Production Environment${NC}"
    echo "=================================="
    
    prompt_project_id "PRODUCTION_PROJECT_ID" "Enter production GCP project ID:"
    
    local account_name="reengine-production-deployer"
    local display_name="RE Engine Production Deployer"
    local description="Service account for deploying RE Engine to production environment"
    local key_file="./production-service-account.json"
    
    # Create service account
    create_service_account "$PRODUCTION_PROJECT_ID" "$account_name" "$display_name" "$description"
    
    # Grant required roles
    local roles=(
        "roles/run.admin"
        "roles/cloudbuild.builds.builder"
        "roles/artifactregistry.writer"
        "roles/logging.logWriter"
        "roles/monitoring.metricWriter"
    )
    
    grant_roles "$PRODUCTION_PROJECT_ID" "$account_name" "${roles[@]}"
    
    # Create service account key
    create_service_account_key "$PRODUCTION_PROJECT_ID" "$account_name" "$key_file"
    
    # Enable required APIs
    local apis=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "artifactregistry.googleapis.com"
        "logging.googleapis.com"
        "monitoring.googleapis.com"
    )
    
    enable_apis "$PRODUCTION_PROJECT_ID" "${apis[@]}"
    
    echo ""
    echo -e "${GREEN}✅ Production environment setup completed${NC}"
    echo -e "${BLUE}📋 Production Configuration:${NC}"
    echo "  Project ID: $PRODUCTION_PROJECT_ID"
    echo "  Service Account: $account_name@$PRODUCTION_PROJECT_ID.iam.gserviceaccount.com"
    echo "  Key File: $key_file"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🔧 RE Engine GCP Service Account Setup${NC}"
    echo "======================================"
    echo ""
    
    # Check prerequisites
    check_gcloud
    check_auth
    
    echo ""
    
    # Setup staging environment
    setup_staging_environment
    
    echo ""
    
    # Setup production environment
    setup_production_environment
    
    echo ""
    echo -e "${GREEN}🎉 GCP setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Run the CI/CD environment setup script:"
    echo "   ./scripts/setup-ci-cd-environments.sh"
    echo ""
    echo "2. Use the generated service account key files when prompted"
    echo ""
    echo "3. Test the CI/CD pipeline by pushing to develop branch"
    echo ""
    echo -e "${GREEN}✅ Your GCP environment is now ready for CI/CD!${NC}"
}

# Run main function
main "$@"
