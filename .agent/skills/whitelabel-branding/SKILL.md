---
description: White-label branding system for multi-tenant customization
---

# White-Label Implementation

Enable per-tenant branding customization for B2B resellers.

## Features

- Custom logo, colors, favicon
- Custom email templates
- Custom domain mapping
- API key branding

## Database Schema

```sql
-- 009_whitelabel_config.sql
CREATE TABLE tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    
    -- Visual branding
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',
    
    -- Text branding
    company_name TEXT,
    support_email TEXT,
    
    -- Custom domain
    custom_domain TEXT,
    ssl_certificate_id TEXT,
    
    -- Email templates
    email_header_html TEXT,
    email_footer_html TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Branding Service

```typescript
export class BrandingService {
    async getBranding(tenantId: string): Promise<TenantBranding>;
    async updateBranding(tenantId: string, branding: Partial<TenantBranding>): Promise<void>;
    async uploadLogo(tenantId: string, file: Buffer): Promise<string>;
    async verifyCustomDomain(tenantId: string, domain: string): Promise<boolean>;
}
```

## Custom Domain Flow

1. Tenant adds custom domain in settings
2. System provides DNS instructions (CNAME to app.example.com)
3. Background job verifies DNS
4. System provisions SSL via Let's Encrypt
5. Nginx routes domain to tenant

## Email Template System

```typescript
const emailHtml = await brandingService.renderEmail(tenantId, 'approval_notification', {
    leadName: 'John Doe',
    approvalUrl: 'https://...'
});
```

## API Response Branding

Add branding to API responses:

```typescript
res.json({
    data: result,
    branding: await brandingService.getBranding(req.user.tenant_id)
});
```

## Theme CSS Generation

```typescript
async generateThemeCSS(tenantId: string): Promise<string> {
    const branding = await this.getBranding(tenantId);
    return `
        :root {
            --primary: ${branding.primary_color};
            --secondary: ${branding.secondary_color};
        }
    `;
}
```
