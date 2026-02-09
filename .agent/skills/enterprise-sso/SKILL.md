---
description: Enterprise SSO implementation with SAML 2.0 and OpenID Connect
---

# Enterprise SSO Implementation

Add single sign-on support for enterprise customers.

## Supported Providers

- **SAML 2.0**: Azure AD, Okta, OneLogin, Generic
- **OIDC**: Google Workspace, Azure AD, Auth0, Keycloak

## Architecture

```
engine/src/auth/sso/
├── sso.service.ts        # Core SSO orchestration
├── saml.service.ts       # SAML 2.0 implementation
├── oidc.service.ts       # OpenID Connect implementation
└── sso.types.ts          # Shared types
```

## Database Schema

```sql
CREATE TABLE tenant_sso_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    
    -- Provider type
    provider_type VARCHAR(20) NOT NULL, -- 'saml' or 'oidc'
    
    -- SAML Config
    saml_idp_entity_id TEXT,
    saml_sso_url TEXT,
    saml_certificate TEXT,
    
    -- OIDC Config
    oidc_issuer TEXT,
    oidc_client_id TEXT,
    oidc_client_secret_encrypted TEXT,
    oidc_scopes TEXT DEFAULT 'openid profile email',
    
    -- Behavior
    enforce_sso BOOLEAN DEFAULT false,
    auto_provision_users BOOLEAN DEFAULT true,
    default_role VARCHAR(50) DEFAULT 'user',
    
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## SAML Flow

```typescript
// 1. Initiate SSO (SP-initiated)
router.get('/sso/saml/login/:tenantId', samlService.initiateLogin);

// 2. Handle callback (ACS endpoint)
router.post('/sso/saml/callback', samlService.handleCallback);

// 3. Parse assertion, create session
```

## OIDC Flow

```typescript
// 1. Redirect to IdP
router.get('/sso/oidc/login/:tenantId', oidcService.initiateLogin);

// 2. Handle callback with code
router.get('/sso/oidc/callback', oidcService.handleCallback);

// 3. Exchange code for tokens, verify, create session
```

## User Provisioning

When SSO user logs in:

1. Check if user exists by email
2. If not, create user with SSO attributes
3. Map IdP groups to RE-Engine roles
4. Create session token

```typescript
async provisionUser(tenantId: string, ssoUser: SSOUser): Promise<User> {
    const existing = await this.userService.findByEmail(tenantId, ssoUser.email);
    if (existing) return existing;
    
    return this.userService.create({
        tenant_id: tenantId,
        email: ssoUser.email,
        name: ssoUser.name,
        role: this.mapRole(ssoUser.groups),
        sso_provider: ssoUser.provider,
        sso_subject_id: ssoUser.subjectId
    });
}
```

## Dependencies

```bash
npm install passport-saml openid-client
```

## Security Considerations

- Store IdP certificates securely
- Validate SAML signatures
- Validate JWT tokens (OIDC)
- Session token rotation
- CSP headers for callback pages
