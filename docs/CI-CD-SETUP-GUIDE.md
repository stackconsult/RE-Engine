# CI/CD Setup Guide

## Overview

This guide provides step-by-step instructions to set up the complete CI/CD pipeline for the RE Engine (Magical AI Automation System v2.0).

## Prerequisites

### Required Tools

1. **GitHub CLI (gh)** - For managing GitHub environments and secrets
2. **Google Cloud CLI (gcloud)** - For managing GCP resources
3. **Docker** - For building and deploying containers
4. **Node.js (v18+)** - For running the application
5. **jq** - For JSON processing (validation script)
6. **yq** - For YAML processing (validation script)

### Installation Commands

```bash
# macOS
brew install gh gcloud docker node jq yq

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io nodejs npm
curl -LO https://github.com/cli/cli/releases/latest/download/gh_linux_amd64.tar.gz
tar xzf gh_linux_amd64.tar.gz
sudo mv gh_linux_amd64/bin/gh /usr/local/bin/
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

## Quick Setup

### 1. Run the Automated Setup

```bash
# Clone the repository (if not already done)
git clone https://github.com/stackconsult/RE-Engine.git
cd RE-Engine

# Make scripts executable
chmod +x scripts/*.sh

# Run the complete setup
./scripts/setup-gcp-service-accounts.sh
./scripts/setup-ci-cd-environments.sh
```

### 2. Validate Your Setup

```bash
./scripts/validate-ci-cd-setup.sh
```

### 3. Test the CI/CD Pipeline

```bash
# Push to develop branch to trigger staging deployment
git checkout develop
git push origin develop
```

## Detailed Setup Instructions

### Step 1: Authentication

#### GitHub Authentication
```bash
gh auth login
```
Follow the prompts to authenticate with your GitHub account.

#### Google Cloud Authentication
```bash
gcloud auth login
gcloud auth application-default login
```

### Step 2: GCP Service Account Setup

Run the automated script or follow these manual steps:

#### Manual GCP Setup

1. **Create Staging Project**
   ```bash
   gcloud projects create reengine-staging-12345
   ```

2. **Create Production Project**
   ```bash
   gcloud projects create reengine-production-67890
   ```

3. **Create Service Accounts**
   ```bash
   # Staging service account
   gcloud iam service-accounts create reengine-staging-deployer \
     --display-name="RE Engine Staging Deployer" \
     --project=reengine-staging-12345

   # Production service account
   gcloud iam service-accounts create reengine-production-deployer \
     --display-name="RE Engine Production Deployer" \
     --project=reengine-production-67890
   ```

4. **Grant Required Roles**
   ```bash
   # For both projects
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:deployer@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:deployer@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/cloudbuild.builds.builder"

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:deployer@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"
   ```

5. **Create Service Account Keys**
   ```bash
   # Staging key
   gcloud iam service-accounts keys create staging-service-account.json \
     --iam-account=reengine-staging-deployer@reengine-staging-12345.iam.gserviceaccount.com \
     --project=reengine-staging-12345

   # Production key
   gcloud iam service-accounts keys create production-service-account.json \
     --iam-account=reengine-production-deployer@reengine-production-67890.iam.gserviceaccount.com \
     --project=reengine-production-67890
   ```

6. **Enable Required APIs**
   ```bash
   # For both projects
   gcloud services enable run.googleapis.com --project=PROJECT_ID
   gcloud services enable cloudbuild.googleapis.com --project=PROJECT_ID
   gcloud services enable artifactregistry.googleapis.com --project=PROJECT_ID
   gcloud services enable logging.googleapis.com --project=PROJECT_ID
   gcloud services enable monitoring.googleapis.com --project=PROJECT_ID
   ```

### Step 3: GitHub Environment Setup

#### Create GitHub Environments

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Environments**
3. Click **New environment**

#### Staging Environment
- **Name**: `staging`
- **Environment URL**: `https://staging.reengine.com`
- **Protection rules**: Leave disabled for development
- **Environment secrets**: Add staging secrets

#### Production Environment
- **Name**: `production`
- **Environment URL**: `https://reengine.com`
- **Protection rules**: 
  - ✅ Require reviewers
  - ✅ Prevent self-approval
  - ✅ Wait timer: 5 minutes
- **Environment secrets**: Add production secrets

### Step 4: Configure Secrets

#### Staging Environment Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID` | GCP project ID | `reengine-staging-12345` |
| `GCP_REGION` | Deployment region | `us-central1` |
| `GCP_SA_KEY` | Service account key JSON | `{"type": "service_account", ...}` |
| `DB_HOST` | Database host URL | `postgres-staging.railway.app` |
| `DB_PASSWORD` | Database password | `secure-staging-password` |
| `JWT_SECRET` | JWT signing secret | `staging-jwt-secret-key-123` |

#### Production Environment Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID_PROD` | Production GCP project ID | `reengine-production-67890` |
| `GCP_REGION_PROD` | Production region | `us-central1` |
| `GCP_SA_KEY_PROD` | Production service account key | `{"type": "service_account", ...}` |
| `DB_HOST_PROD` | Production database host | `postgres-production.railway.app` |
| `DB_PASSWORD_PROD` | Production database password | `secure-production-password` |
| `JWT_SECRET_PROD` | Production JWT secret | `production-jwt-secret-key-456` |

#### Repository Secrets (Optional)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/services/...` |

### Step 5: Database Setup

#### Option 1: Railway (Recommended)
1. Create a Railway account
2. Create two PostgreSQL services (staging and production)
3. Get connection strings and add to secrets

#### Option 2: Neon
1. Create a Neon account
2. Create two projects (staging and production)
3. Get connection strings and add to secrets

#### Option 3: Self-hosted PostgreSQL
1. Set up PostgreSQL servers
2. Configure network access
3. Create databases and users
4. Add connection details to secrets

## CI/CD Pipeline Features

### Enhanced Workflow Capabilities

#### 1. Environment Validation
- Pre-flight checks for all required secrets
- Environment health validation
- Configuration verification

#### 2. Automated Testing
- Unit tests execution
- Integration tests
- Security vulnerability scanning
- Configuration validation

#### 3. Enhanced Deployments
- **Staging**: Automatic deployment on develop branch push
- **Production**: Manual deployment on release creation
- Health checks with retry logic
- Automatic rollback on failure

#### 4. Monitoring & Notifications
- Real-time deployment status
- Slack notifications for successes/failures
- Performance testing integration
- Comprehensive logging

#### 5. Security Features
- Environment-specific secrets
- Service account authentication
- Protected production deployments
- Security audit logging

## Deployment Process

### Staging Deployment (Automatic)

```bash
# Push to develop branch
git checkout develop
git add .
git commit -m "feat: new feature"
git push origin develop
```

**What happens:**
1. Environment validation runs
2. Tests execute
3. Docker image builds and pushes
4. Deploys to Cloud Run
5. Health checks validate deployment
6. Performance tests run
7. Success/failure notifications sent

### Production Deployment (Manual)

```bash
# Create a release
git tag v1.0.0
git push origin v1.0.0

# Or create release through GitHub UI
```

**What happens:**
1. Environment validation runs
2. Tests execute
3. Production Docker image builds
4. Deploys to production Cloud Run
5. Extended health checks run
6. Production tests execute
7. Success/failure notifications sent

## Troubleshooting

### Common Issues

#### 1. "Value 'staging' is not valid"
**Solution**: Create the staging environment in GitHub repository settings

#### 2. "Context access might be invalid"
**Solution**: Add the missing secret to the appropriate environment

#### 3. "Service account key invalid"
**Solution**: Regenerate the service account key and update the secret

#### 4. "Deployment failed"
**Solution**: Check the GitHub Actions logs for detailed error messages

### Validation Commands

```bash
# Validate complete setup
./scripts/validate-ci-cd-setup.sh

# Check specific components
gh auth status
gcloud auth list
docker info
node --version
```

### Manual Deployment Test

```bash
# Test staging deployment manually
gcloud run deploy reengine-engine \
  --image=gcr.io/PROJECT_ID/reengine-engine:test \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300
```

## Advanced Configuration

### Custom Environment Variables

Add additional environment variables to your deployment:

```yaml
# In .github/workflows/ci-cd.yml
--set-env-vars=CUSTOM_VAR=value,ANOTHER_VAR=value
```

### Performance Tuning

Adjust deployment parameters:

```yaml
# Production deployment with custom settings
gcloud run deploy reengine-engine \
  --memory=2Gi \
  --cpu=4 \
  --min-instances=2 \
  --max-instances=20 \
  --concurrency=100
```

### Blue-Green Deployment

Implement blue-green deployment strategy:

```yaml
# Deploy to green environment
gcloud run deploy reengine-engine-green \
  --image=gcr.io/PROJECT_ID/reengine-engine:$VERSION

# Test green environment
# If successful, switch traffic
gcloud run services update-traffic reengine-engine \
  --to-revisions=reengine-engine-blue=50,reengine-engine-green=50
```

## Monitoring and Maintenance

### Health Check Endpoints

- `/health` - Basic health check
- `/api/health` - API health check
- `/api/version` - Version information

### Monitoring Setup

1. **Cloud Monitoring**: Enabled by default with deployments
2. **Error Reporting**: Automatic error collection
3. **Performance Monitoring**: Response time tracking
4. **Log Analysis**: Structured logging in Cloud Logging

### Maintenance Tasks

#### Monthly
- Review service account permissions
- Check for unused secrets
- Update dependencies
- Review deployment logs

#### Quarterly
- Rotate service account keys
- Update deployment scripts
- Review and update documentation
- Security audit

## Support

### Getting Help

1. **Documentation**: Check this guide and inline code comments
2. **Validation Script**: Run `./scripts/validate-ci-cd-setup.sh`
3. **GitHub Issues**: Report issues at https://github.com/stackconsult/RE-Engine/issues
4. **Community**: Join discussions at https://github.com/stackconsult/RE-Engine/discussions

### Emergency Procedures

#### Deployment Rollback
```bash
# Get previous revision
gcloud run services describe reengine-engine \
  --region=us-central1 \
  --format='value(status.latestReadyRevision.name)'

# Rollback to previous revision
gcloud run services update-traffic reengine-engine \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

#### Emergency Stop
```bash
# Stop all traffic
gcloud run services update-traffic reengine-engine \
  --region=us-central1 \
  --to-revisions=REVISION=0
```

---

## 🎉 Success Criteria

Your CI/CD setup is complete when:

- ✅ All validation checks pass
- ✅ Staging deployment works on push to develop
- ✅ Production deployment works on release creation
- ✅ Health checks pass after deployment
- ✅ Rollback functionality works
- ✅ Notifications are configured and working

Once these criteria are met, your Magical AI Automation System v2.0 is ready for production deployment!
