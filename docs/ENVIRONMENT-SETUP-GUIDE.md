# GitHub Environment Setup Guide

## Overview

This guide provides step-by-step instructions to configure the GitHub environments required for the RE Engine CI/CD pipeline.

## Prerequisites

- GitHub repository admin access
- Google Cloud Platform project access
- Slack workspace (for notifications)

## Step 1: Create GitHub Environments

### 1.1 Staging Environment

1. Navigate to your GitHub repository
2. Go to **Settings** → **Environments**
3. Click **New environment**
4. Enter **Name**: `staging`
5. Enter **Environment URL**: `https://staging.reengine.com`
6. **Protection rules** (leave disabled for development)
7. **Environment secrets** (add in Step 2)

### 1.2 Production Environment

1. Click **New environment** again
2. Enter **Name**: `production`
3. Enter **Environment URL**: `https://reengine.com`
4. **Protection rules**:
   - ✅ Require reviewers
   - ✅ Prevent self-approval
   - ✅ Wait timer: 5 minutes
5. **Environment secrets** (add in Step 2)

## Step 2: Configure Environment Secrets

### 2.1 Staging Environment Secrets

Add these secrets to the **staging** environment:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_SA_KEY` | Service account key JSON | `{"type": "service_account", ...}` |
| `GCP_PROJECT_ID` | GCP project ID | `reengine-staging-12345` |
| `GCP_REGION` | Deployment region | `us-central1` |
| `DB_HOST` | Database host URL | `postgres://staging.db.host` |
| `DB_PASSWORD` | Database password | `secure-staging-password` |
| `JWT_SECRET` | JWT signing secret | `staging-jwt-secret-key-123` |

### 2.2 Production Environment Secrets

Add these secrets to the **production** environment:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_SA_KEY_PROD` | Production service account key | `{"type": "service_account", ...}` |
| `GCP_PROJECT_ID_PROD` | Production GCP project ID | `reengine-production-67890` |
| `GCP_REGION_PROD` | Production deployment region | `us-central1` |
| `DB_HOST_PROD` | Production database host | `postgres://prod.db.host` |
| `DB_PASSWORD_PROD` | Production database password | `secure-production-password` |
| `JWT_SECRET_PROD` | Production JWT secret | `production-jwt-secret-key-456` |

### 2.3 Repository-Level Secrets

Add these secrets to the repository (not environment-specific):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/services/...` |

## Step 3: Google Cloud Setup

### 3.1 Create Service Accounts

#### Staging Service Account
```bash
# Create service account
gcloud iam service-accounts create reengine-staging-deployer \
  --display-name="RE Engine Staging Deployer" \
  --project=reengine-staging-12345

# Grant necessary roles
gcloud projects add-iam-policy-binding reengine-staging-12345 \
  --member="serviceAccount:reengine-staging-deployer@reengine-staging-12345.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding reengine-staging-12345 \
  --member="serviceAccount:reengine-staging-deployer@reengine-staging-12345.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Create and download key
gcloud iam service-accounts keys create ~/staging-key.json \
  --iam-account=reengine-staging-deployer@reengine-staging-12345.iam.gserviceaccount.com
```

#### Production Service Account
```bash
# Create service account
gcloud iam service-accounts create reengine-production-deployer \
  --display-name="RE Engine Production Deployer" \
  --project=reengine-production-67890

# Grant necessary roles
gcloud projects add-iam-policy-binding reengine-production-67890 \
  --member="serviceAccount:reengine-production-deployer@reengine-production-67890.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding reengine-production-67890 \
  --member="serviceAccount:reengine-production-deployer@reengine-production-67890.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Create and download key
gcloud iam service-accounts keys create ~/production-key.json \
  --iam-account=reengine-production-deployer@reengine-production-67890.iam.gserviceaccount.com
```

### 3.2 Enable Required APIs

```bash
# For both projects
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Step 4: Add Service Account Keys to GitHub

1. Copy the contents of `~/staging-key.json`
2. Add to GitHub staging environment as `GCP_SA_KEY`
3. Copy the contents of `~/production-key.json`
4. Add to GitHub production environment as `GCP_SA_KEY_PROD`

## Step 5: Slack Integration (Optional)

1. Create a Slack app at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create a webhook URL
4. Add to repository secrets as `SLACK_WEBHOOK_URL`

## Step 6: Verify Configuration

### 6.1 Test Staging Deployment

1. Push changes to `develop` branch
2. Monitor GitHub Actions tab
3. Verify deployment succeeds
4. Check staging URL for health endpoint

### 6.2 Test Production Deployment

1. Create a new release
2. Monitor GitHub Actions tab
3. Verify deployment succeeds
4. Check production URL for health endpoint

## Troubleshooting

### Common Issues

#### "Value 'staging' is not valid"
**Solution**: Ensure the staging environment is created in repository settings

#### "Invalid action input 'service_account_key'"
**Solution**: This should be resolved with the updated workflow

#### "Context access might be invalid"
**Solution**: These are warnings that will resolve when secrets are configured

#### Health check failures
**Solution**: Ensure the deployed application has a `/health` endpoint that returns HTTP 200

### Debugging Steps

1. Check GitHub Actions logs for detailed error messages
2. Verify all secrets are correctly configured
3. Ensure service accounts have proper permissions
4. Test GCP authentication locally

## Security Best Practices

1. **Least Privilege**: Only grant necessary roles to service accounts
2. **Key Rotation**: Rotate service account keys regularly
3. **Environment Isolation**: Use different projects for staging/production
4. **Secret Management**: Never commit secrets to repository
5. **Audit Trail**: Monitor deployment logs and access

## Maintenance

### Monthly Tasks
- [ ] Review service account permissions
- [ ] Check for unused secrets
- [ ] Update deployment documentation
- [ ] Test rollback procedures

### Quarterly Tasks
- [ ] Rotate service account keys
- [ ] Review environment protection rules
- [ ] Update Slack webhook if needed
- [ ] Conduct security audit

---

## Quick Reference

### Environment URLs
- **Staging**: https://staging.reengine.com
- **Production**: https://reengine.com

### Required Secrets Summary
```
Staging Environment:
- GCP_SA_KEY
- GCP_PROJECT_ID
- GCP_REGION
- DB_HOST
- DB_PASSWORD
- JWT_SECRET

Production Environment:
- GCP_SA_KEY_PROD
- GCP_PROJECT_ID_PROD
- GCP_REGION_PROD
- DB_HOST_PROD
- DB_PASSWORD_PROD
- JWT_SECRET_PROD

Repository Secrets:
- SLACK_WEBHOOK_URL
```

### Service Account Roles
- `roles/run.admin` - Cloud Run administration
- `roles/cloudbuild.builds.builder` - Cloud Build access

After completing this setup, the CI/CD pipeline should function correctly with proper environment isolation and security controls.
