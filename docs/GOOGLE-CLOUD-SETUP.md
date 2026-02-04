# Google Cloud Platform Setup Guide

This guide provides comprehensive instructions for setting up the RE Engine on Google Cloud Platform using the Google Cloud SDK.

## 📋 Prerequisites

### Required Tools
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (gcloud CLI)
- Docker
- Git
- Node.js 22+

### Google Cloud Account
- Google Cloud Project with billing enabled
- Appropriate IAM permissions:
  - Cloud Run Admin
  - Cloud SQL Admin
  - Container Registry Admin
  - Service Account Admin

## 🚀 Quick Start

### 1. Install Google Cloud SDK

#### Linux (Debian/Ubuntu)
```bash
# Add the Google Cloud SDK distribution URI as a package source
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud public key
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Update and install
sudo apt-get update && sudo apt-get install google-cloud-cli
```

#### macOS
```bash
# Using Homebrew
brew install google-cloud-sdk

# Or download and install
curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-darwin-x86_64.tar.gz | tar xz
./google-cloud-sdk/install.sh
```

#### Windows
Download and run the [installer](https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe).

### 2. Initialize Google Cloud SDK

```bash
# Initialize gcloud
gcloud init

# Follow the prompts to:
# 1. Sign in to your Google Account
# 2. Select or create a project
# 3. Choose a default region and zone
```

### 3. Set Up Authentication

#### Option A: User Account (Development)
```bash
# Login with your Google account
gcloud auth login

# Set application default credentials
gcloud auth application-default login
```

#### Option B: Service Account (Production)
```bash
# Create service account
gcloud iam service-accounts create reengine-deployer \
    --display-name="RE Engine Deployer" \
    --description="Service account for RE Engine deployment"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:reengine-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:reengine-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:reengine-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create and download service account key
gcloud iam service-accounts keys create ~/reengine-key.json \
    --iam-account=reengine-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Activate service account
gcloud auth activate-service-account --key-file=~/reengine-key.json
```

## 🏗️ Deployment Options

### Option 1: Automated Deployment Script

Use the provided deployment script for quick deployment:

```bash
# Deploy to staging
./scripts/deploy-gcp.sh deploy v1.0.0 staging

# Deploy to production
./scripts/deploy-gcp.sh deploy v1.0.0 production

# Build images only
./scripts/deploy-gcp.sh build latest

# Run health checks
./scripts/deploy-gcp.sh health

# Get service URLs
./scripts/deploy-gcp.sh urls
```

### Option 2: Manual Deployment

#### Step 1: Configure Environment Variables
```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export GCP_ZONE="us-central1-a"
export DB_HOST="your-db-host"
export DB_PASSWORD="your-db-password"
export JWT_SECRET="your-jwt-secret"
```

#### Step 2: Build and Push Docker Images
```bash
# Configure Docker to use gcloud
gcloud auth configure-docker

# Build and push engine image
docker build -t gcr.io/$GCP_PROJECT_ID/reengine-engine:latest ./engine
docker push gcr.io/$GCP_PROJECT_ID/reengine-engine:latest

# Build and push dashboard image
docker build -t gcr.io/$GCP_PROJECT_ID/reengine-dashboard:latest ./web-dashboard
docker push gcr.io/$GCP_PROJECT_ID/reengine-dashboard:latest
```

#### Step 3: Deploy to Cloud Run
```bash
# Deploy engine service
gcloud run deploy reengine-engine \
    --image=gcr.io/$GCP_PROJECT_ID/reengine-engine:latest \
    --region=$GCP_REGION \
    --platform=managed \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --set-env-vars="NODE_ENV=production,DB_HOST=$DB_HOST,DB_PASSWORD=$DB_PASSWORD,JWT_SECRET=$JWT_SECRET"

# Deploy dashboard service
ENGINE_URL=$(gcloud run services describe reengine-engine --region=$GCP_REGION --format='value(status.url)')

gcloud run deploy reengine-dashboard \
    --image=gcr.io/$GCP_PROJECT_ID/reengine-dashboard:latest \
    --region=$GCP_REGION \
    --platform=managed \
    --allow-unauthenticated \
    --memory=256Mi \
    --cpu=1 \
    --timeout=300 \
    --set-env-vars="NODE_ENV=production,ENGINE_URL=$ENGINE_URL"
```

## 🗄️ Database Setup

### Option 1: Cloud SQL (Recommended)

#### Create Cloud SQL Instance
```bash
# Using deployment script
./scripts/deploy-gcp.sh sql reengine-db POSTGRES_15

# Or manually
gcloud sql instances create reengine-db \
    --database-version=POSTGRES_15 \
    --region=$GCP_REGION \
    --tier=db-f1-micro \
    --storage-size=10GB \
    --storage-type=SSD \
    --backup-start-time=02:00 \
    --deletion-protection
```

#### Configure Database
```bash
# Set password
gcloud sql users set-password postgres \
    --instance=reengine-db \
    --password=your-secure-password

# Get connection info
gcloud sql instances describe reengine-db \
    --format='value(connectionName,ipAddresses.ipAddress)'

# Connect and run migrations
gcloud sql connect reengine-db --user=postgres < engine/migrate.sql
```

### Option 2: Cloud Run with PostgreSQL
Use the provided Docker Compose setup with PostgreSQL container.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GCP_PROJECT_ID` | Google Cloud Project ID | Yes |
| `GCP_REGION` | Deployment region | Yes |
| `GCP_ZONE` | Deployment zone | Yes |
| `DB_HOST` | Database host | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `NODE_ENV` | Environment (production/staging) | Yes |
| `ENGINE_URL` | Engine service URL | Yes (for dashboard) |

### GitHub Secrets for CI/CD

Add these secrets to your GitHub repository:

```yaml
# Staging
GCP_PROJECT_ID: your-staging-project-id
GCP_REGION: us-central1
GCP_SA_KEY: <base64-encoded-service-account-key>
DB_HOST: your-staging-db-host
DB_PASSWORD: your-staging-db-password
JWT_SECRET: your-staging-jwt-secret

# Production
GCP_PROJECT_ID_PROD: your-production-project-id
GCP_REGION_PROD: us-central1
GCP_SA_KEY_PROD: <base64-encoded-production-service-account-key>
DB_HOST_PROD: your-production-db-host
DB_PASSWORD_PROD: your-production-db-password
JWT_SECRET_PROD: your-production-jwt-secret
```

## 📊 Monitoring and Logging

### Cloud Logging
```bash
# View logs
gcloud logs read "resource.type=cloud_run_revision" \
    --limit=50 \
    --format="table(timestamp,textPayload)"

# Follow logs in real-time
gcloud logs tail "resource.type=cloud_run_revision"
```

### Cloud Monitoring
```bash
# List metrics
gcloud monitoring metrics list

# Create alerting policies
gcloud alpha monitoring policies create \
    --condition-display-name="High Error Rate" \
    --condition-filter='metric.type="run.googleapis.com/request_count" resource.type="cloud_run_revision"'
```

## 🔒 Security Best Practices

### 1. Use Service Accounts
- Create dedicated service accounts for different environments
- Grant minimum required permissions
- Regularly rotate service account keys

### 2. Network Security
```bash
# Enable VPC Connector for private services
gcloud run services update reengine-engine \
    --region=$GCP_REGION \
    --vpc-connector=reengine-connector \
    --vpc-egress=private-ranges-only
```

### 3. Secrets Management
```bash
# Use Secret Manager
gcloud secrets create reengine-jwt-secret --replication-policy="automatic"
echo "your-jwt-secret" | gcloud secrets versions add reengine-jwt-secret --data-file=-

# Access in Cloud Run
gcloud run services update reengine-engine \
    --region=$GCP_REGION \
    --set-secrets="JWT_SECRET=reengine-jwt-secret"
```

## 🚀 Advanced Features

### 1. Custom Domains
```bash
# Map custom domain
gcloud run domain mappings create reengine.yourdomain.com \
    --service=reengine-engine \
    --region=$GCP_REGION
```

### 2. Traffic Splitting
```bash
# Split traffic between versions
gcloud run services update-traffic reengine-engine \
    --region=$GCP_REGION \
    --to-revisions=reengine-engine-v1=50,reengine-engine-v2=50
```

### 3. Autoscaling
```bash
# Configure autoscaling
gcloud run services update reengine-engine \
    --region=$GCP_REGION \
    --min-instances=1 \
    --max-instances=100 \
    --cpu-throttling
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Authentication Errors
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Or use service account
gcloud auth activate-service-account --key-file=path/to/key.json
```

#### 2. Permission Denied
```bash
# Check current account
gcloud auth list

# Grant necessary permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="user:your-email@example.com" \
    --role="roles/run.admin"
```

#### 3. Build Failures
```bash
# Check Docker build
docker build -t test ./engine
docker run test

# Check gcloud version
gcloud version
```

#### 4. Deployment Failures
```bash
# Check service logs
gcloud logs read "resource.type=cloud_run_revision" \
    --filter="resource.labels.service_name=reengine-engine"

# Get service details
gcloud run services describe reengine-engine --region=$GCP_REGION
```

### Debug Commands
```bash
# Check all deployments
gcloud run services list

# Check service configuration
gcloud run services describe reengine-engine --region=$GCP_REGION

# Check recent deployments
gcloud run services get-iam-policy reengine-engine --region=$GCP_REGION

# Test service locally
curl -X GET "https://reengine-engine-<hash>-<region>.a.run.app/health"
```

## 📚 Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Google Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)

## 🆘 Support

For issues related to:
- **Google Cloud Platform**: Contact Google Cloud Support
- **RE Engine**: Create an issue in the GitHub repository
- **Deployment Script**: Check the script logs and output

---

**Next Steps:**
1. Install Google Cloud SDK
2. Set up authentication
3. Configure environment variables
4. Run the deployment script
5. Verify deployment with health checks

Happy deploying! 🚀
