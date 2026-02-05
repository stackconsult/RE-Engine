# Production Deployment Guide

## Overview
This guide covers deploying the RE-Engine with JWT authentication enabled in production.

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Production environment variables configured
- [ ] Database migration completed
- [ ] SSL certificates installed
- [ ] Firewall rules configured

### 2. Security Configuration
- [ ] JWT secrets generated and secured
- [ ] API keys bcrypt hashed in database
- [ ] External API keys secured
- [ ] Audit logging enabled

### 3. Service Dependencies
- [ ] PostgreSQL database running
- [ ] Redis cache server running
- [ ] Load balancer configured
- [ ] Monitoring systems active

## Deployment Steps

### Phase 1: Database Setup
```bash
# Run database migration
./scripts/run-production-migration.sh

# Verify service records
psql $DATABASE_URL -c "SELECT * FROM service_auth;"
```

### Phase 2: Environment Configuration
```bash
# Load production environment
export NODE_ENV=production
source .env.production
```

### Phase 3: Service Startup
```bash
# Start Engine API Server
npm run start:engine

# Start MCP Servers (in order)
npm run start:browser
npm run start:tinyfish
npm run start:llama
npm run start:core
npm run start:outreach
```

### Phase 4: Validation
```bash
# Test authentication
./scripts/test-integration.sh

# Verify health endpoints
curl https://your-domain.com/health
```

## Troubleshooting

### JWT Authentication Issues
- Check auth endpoint: `POST /auth/token`
- Verify API keys in database
- Review audit logs

### MCP Server Issues
- Check environment variables
- Verify network connectivity
- Review service logs

### Database Issues
- Check connection string
- Verify migration status
- Review table schemas

## Security Considerations

### Production Security
- JWT secrets must be cryptographically secure
- API keys should be bcrypt hashed
- All traffic must use HTTPS
- Audit logs must be monitored

### Monitoring
- Authentication success/failure rates
- Token refresh patterns
- Service health metrics
- Performance benchmarks

## Rollback Plan

If deployment fails:
1. Switch to development mode: `NODE_ENV=development`
2. Restart services without JWT
3. Investigate issues
4. Retry deployment when fixed
