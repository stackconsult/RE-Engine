#!/bin/bash

# RE Engine Google Cloud Deployment Script
# This script automates deployment to Google Cloud Platform using gcloud CLI

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-reengine-production}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
SERVICE_ACCOUNT_KEY="${GCP_SA_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed
check_gcloud() {
    log_info "Checking Google Cloud SDK installation..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "Google Cloud SDK (gcloud) is not installed"
        log_info "Please install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    local gcloud_version=$(gcloud version --format='value(bundled_python_version)')
    log_success "Google Cloud SDK found (Python version: $gcloud_version)"
}

# Initialize gcloud configuration
init_gcloud() {
    log_info "Initializing Google Cloud configuration..."
    
    # Set project
    gcloud config set project "$PROJECT_ID"
    log_success "Project set to: $PROJECT_ID"
    
    # Set region and zone
    gcloud config set compute/region "$REGION"
    gcloud config set compute/zone "$ZONE"
    log_success "Region set to: $REGION, Zone set to: $ZONE"
    
    # Authenticate if service account key provided
    if [[ -n "$SERVICE_ACCOUNT_KEY" && -f "$SERVICE_ACCOUNT_KEY" ]]; then
        log_info "Authenticating with service account..."
        gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT_KEY"
        log_success "Service account authentication completed"
    else
        log_warning "No service account key provided, using existing authentication"
    fi
}

# Build and push Docker images
build_and_push_images() {
    local version="${1:-latest}"
    log_info "Building and pushing Docker images (version: $version)..."
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker
    
    # Build and push engine image
    log_info "Building engine image..."
    docker build -t "gcr.io/$PROJECT_ID/reengine-engine:$version" ./engine
    log_info "Pushing engine image..."
    docker push "gcr.io/$PROJECT_ID/reengine-engine:$version"
    
    # Build and push dashboard image
    log_info "Building dashboard image..."
    docker build -t "gcr.io/$PROJECT_ID/reengine-dashboard:$version" ./web-dashboard
    log_info "Pushing dashboard image..."
    docker push "gcr.io/$PROJECT_ID/reengine-dashboard:$version"
    
    log_success "All images built and pushed successfully"
}

# Deploy to Cloud Run
deploy_to_cloudrun() {
    local version="${1:-latest}"
    local environment="${2:-staging}"
    
    log_info "Deploying to Cloud Run (environment: $environment)..."
    
    # Deploy engine service
    log_info "Deploying engine service..."
    gcloud run deploy reengine-engine \
        --image="gcr.io/$PROJECT_ID/reengine-engine:$version" \
        --region="$REGION" \
        --platform=managed \
        --allow-unauthenticated \
        --memory=512Mi \
        --cpu=1 \
        --timeout=300 \
        --concurrency=80 \
        --max-instances=100 \
        --set-env-vars="NODE_ENV=$environment,DB_HOST=${DB_HOST:-},DB_PASSWORD=${DB_PASSWORD:-},JWT_SECRET=${JWT_SECRET:-}"
    
    # Deploy dashboard service
    log_info "Deploying dashboard service..."
    local engine_url=$(gcloud run services describe reengine-engine --region="$REGION" --format='value(status.url)')
    
    gcloud run deploy reengine-dashboard \
        --image="gcr.io/$PROJECT_ID/reengine-dashboard:$version" \
        --region="$REGION" \
        --platform=managed \
        --allow-unauthenticated \
        --memory=256Mi \
        --cpu=1 \
        --timeout=300 \
        --concurrency=80 \
        --max-instances=50 \
        --set-env-vars="NODE_ENV=$environment,ENGINE_URL=$engine_url"
    
    log_success "Cloud Run deployment completed"
}

# Get service URLs
get_service_urls() {
    log_info "Getting service URLs..."
    
    local engine_url=$(gcloud run services describe reengine-engine --region="$REGION" --format='value(status.url)')
    local dashboard_url=$(gcloud run services describe reengine-dashboard --region="$REGION" --format='value(status.url)')
    
    log_success "Service URLs:"
    echo "  Engine:   $engine_url"
    echo "  Dashboard: $dashboard_url"
    
    # Export URLs for other scripts
    export ENGINE_URL="$engine_url"
    export DASHBOARD_URL="$dashboard_url"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local engine_url=$(gcloud run services describe reengine-engine --region="$REGION" --format='value(status.url)')
    local dashboard_url=$(gcloud run services describe reengine-dashboard --region="$REGION" --format='value(status.url)')
    
    # Check engine health
    log_info "Checking engine health..."
    if curl -f "$engine_url/health" > /dev/null 2>&1; then
        log_success "Engine health check passed"
    else
        log_error "Engine health check failed"
        return 1
    fi
    
    # Check dashboard health
    log_info "Checking dashboard health..."
    if curl -f "$dashboard_url/api/status" > /dev/null 2>&1; then
        log_success "Dashboard health check passed"
    else
        log_error "Dashboard health check failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Create Cloud SQL instance
create_cloudsql() {
    local instance_name="${1:-reengine-db}"
    local database_version="${2:-POSTGRES_15}"
    
    log_info "Creating Cloud SQL instance: $instance_name"
    
    gcloud sql instances create "$instance_name" \
        --database-version="$database_version" \
        --region="$REGION" \
        --tier=db-f1-micro \
        --storage-size=10GB \
        --storage-type=SSD \
        --backup-start-time=02:00 \
        --retained-backups-count=7 \
        --deletion-protection
    
    log_success "Cloud SQL instance created: $instance_name"
    
    # Get connection info
    local connection_info=$(gcloud sql instances describe "$instance_name" --format="value(databaseVersion,region,ipAddresses.ipAddress)")
    log_info "Connection info: $connection_info"
}

# Setup Cloud Run with Cloud SQL
setup_cloudrun_sql() {
    local instance_name="${1:-reengine-db}"
    local service_account="${2:-cloud-sql-client}"
    
    log_info "Setting up Cloud Run with Cloud SQL..."
    
    # Create service account for Cloud SQL
    gcloud iam service-accounts create "$service_account" \
        --display-name="Cloud SQL Client Service Account"
    
    # Grant permissions
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/cloudsql.client"
    
    # Get instance connection name
    local instance_connection_name=$(gcloud sql instances describe "$instance_name" --format='value(connectionName)')
    
    log_info "Instance connection name: $instance_connection_name"
    log_success "Cloud Run with Cloud SQL setup completed"
}

# Cleanup resources
cleanup() {
    log_info "Cleaning up resources..."
    
    # Delete Cloud Run services
    gcloud run services delete reengine-engine --region="$REGION" --quiet || true
    gcloud run services delete reengine-dashboard --region="$REGION" --quiet || true
    
    # Delete Docker images
    docker rmi "gcr.io/$PROJECT_ID/reengine-engine:latest" || true
    docker rmi "gcr.io/$PROJECT_ID/reengine-dashboard:latest" || true
    
    log_success "Cleanup completed"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy [version] [environment]  - Deploy to Cloud Run"
    echo "  build [version]                 - Build and push Docker images"
    echo "  health                          - Run health checks"
    echo "  sql [instance-name]             - Create Cloud SQL instance"
    echo "  cleanup                         - Clean up resources"
    echo "  urls                            - Get service URLs"
    echo ""
    echo "Environment variables:"
    echo "  GCP_PROJECT_ID                  - Google Cloud project ID"
    echo "  GCP_REGION                      - Google Cloud region"
    echo "  GCP_ZONE                        - Google Cloud zone"
    echo "  GCP_SA_KEY                      - Service account key file path"
    echo "  DB_HOST                         - Database host"
    echo "  DB_PASSWORD                     - Database password"
    echo "  JWT_SECRET                      - JWT secret"
    echo ""
    echo "Examples:"
    echo "  $0 deploy v1.0.0 staging"
    echo "  $0 build latest"
    echo "  $0 health"
}

# Main execution
main() {
    local command="${1:-}"
    
    case "$command" in
        "deploy")
            check_gcloud
            init_gcloud
            build_and_push_images "${2:-latest}"
            deploy_to_cloudrun "${2:-latest}" "${3:-staging}"
            get_service_urls
            run_health_checks
            ;;
        "build")
            check_gcloud
            init_gcloud
            build_and_push_images "${2:-latest}"
            ;;
        "health")
            check_gcloud
            init_gcloud
            run_health_checks
            ;;
        "sql")
            check_gcloud
            init_gcloud
            create_cloudsql "${2:-reengine-db}" "${3:-POSTGRES_15}"
            ;;
        "cleanup")
            check_gcloud
            init_gcloud
            cleanup
            ;;
        "urls")
            check_gcloud
            init_gcloud
            get_service_urls
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
