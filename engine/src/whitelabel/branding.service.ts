import { Logger } from '../utils/logger.js';

export interface TenantBranding {
    id: string;
    tenant_id: string;

    // Visual branding
    logo_url: string | null;
    favicon_url: string | null;
    primary_color: string;
    secondary_color: string;

    // Text branding
    company_name: string;
    support_email: string | null;

    // Custom domain
    custom_domain: string | null;
    ssl_verified: boolean;

    // Email templates
    email_header_html: string | null;
    email_footer_html: string | null;

    created_at: Date;
    updated_at: Date;
}

export class BrandingService {
    private logger: Logger;
    private brandingCache: Map<string, TenantBranding> = new Map();

    constructor() {
        this.logger = new Logger('BrandingService');
    }

    /**
     * Get branding configuration for a tenant
     */
    async getBranding(tenantId: string): Promise<TenantBranding> {
        // Check cache first
        if (this.brandingCache.has(tenantId)) {
            return this.brandingCache.get(tenantId)!;
        }

        // Return default branding (would query database in production)
        const defaultBranding: TenantBranding = {
            id: tenantId,
            tenant_id: tenantId,
            logo_url: null,
            favicon_url: null,
            primary_color: '#3B82F6',
            secondary_color: '#1E40AF',
            company_name: 'RE-Engine',
            support_email: null,
            custom_domain: null,
            ssl_verified: false,
            email_header_html: null,
            email_footer_html: null,
            created_at: new Date(),
            updated_at: new Date()
        };

        this.brandingCache.set(tenantId, defaultBranding);
        return defaultBranding;
    }

    /**
     * Update branding configuration
     */
    async updateBranding(tenantId: string, updates: Partial<TenantBranding>): Promise<TenantBranding> {
        const current = await this.getBranding(tenantId);
        const updated: TenantBranding = {
            ...current,
            ...updates,
            updated_at: new Date()
        };

        this.brandingCache.set(tenantId, updated);
        this.logger.info('Branding updated', { tenantId, fields: Object.keys(updates) });

        return updated;
    }

    /**
     * Generate CSS variables from branding
     */
    generateThemeCSS(branding: TenantBranding): string {
        return `:root {
    --primary-color: ${branding.primary_color};
    --secondary-color: ${branding.secondary_color};
    --brand-name: "${branding.company_name}";
}`;
    }

    /**
     * Render email with branding
     */
    renderBrandedEmail(branding: TenantBranding, content: string): string {
        const header = branding.email_header_html || this.getDefaultEmailHeader(branding);
        const footer = branding.email_footer_html || this.getDefaultEmailFooter(branding);

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .header { background-color: ${branding.primary_color}; padding: 20px; }
        .content { padding: 20px; }
        .footer { background-color: #f5f5f5; padding: 15px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">${header}</div>
    <div class="content">${content}</div>
    <div class="footer">${footer}</div>
</body>
</html>`;
    }

    private getDefaultEmailHeader(branding: TenantBranding): string {
        const logoHtml = branding.logo_url
            ? `<img src="${branding.logo_url}" alt="${branding.company_name}" style="max-height: 50px;" />`
            : `<h1 style="color: white; margin: 0;">${branding.company_name}</h1>`;
        return logoHtml;
    }

    private getDefaultEmailFooter(branding: TenantBranding): string {
        const supportLine = branding.support_email
            ? `<p>Support: <a href="mailto:${branding.support_email}">${branding.support_email}</a></p>`
            : '';
        return `
            <p>&copy; ${new Date().getFullYear()} ${branding.company_name}. All rights reserved.</p>
            ${supportLine}
        `;
    }

    /**
     * Verify custom domain ownership
     */
    async verifyCustomDomain(tenantId: string, domain: string): Promise<boolean> {
        this.logger.info('Verifying custom domain', { tenantId, domain });

        // In production, would:
        // 1. Check DNS CNAME record points to our domain
        // 2. Provision SSL certificate
        // 3. Update nginx configuration

        // Placeholder - return false (not verified)
        return false;
    }

    /**
     * Set custom domain for tenant
     */
    async setCustomDomain(tenantId: string, domain: string): Promise<{ success: boolean; message: string }> {
        const isVerified = await this.verifyCustomDomain(tenantId, domain);

        if (!isVerified) {
            return {
                success: false,
                message: `Please add a CNAME record pointing ${domain} to app.reengine.io`
            };
        }

        await this.updateBranding(tenantId, {
            custom_domain: domain,
            ssl_verified: true
        });

        return { success: true, message: 'Custom domain configured successfully' };
    }
}

// Singleton
let brandingInstance: BrandingService | null = null;

export function getBrandingService(): BrandingService {
    if (!brandingInstance) {
        brandingInstance = new BrandingService();
    }
    return brandingInstance;
}
