
import { Request, Response, NextFunction } from 'express';
import { logError } from '../observability/logger.js';

/**
 * Multi-Tenancy Middleware
 * Extracts tenant context from authenticated user and sets it on the request
 */
export const multiTenancyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        // tenant_id should be populated by AuthMiddleware in req.user
        if (req.user && req.user.tenant_id) {
            req.tenantId = req.user.tenant_id;
            return next();
        }

        // Optional: Support tenant resolution from custom headers for API keys
        const tenantHeader = req.headers['x-tenant-id'];
        if (tenantHeader && typeof tenantHeader === 'string') {
            req.tenantId = tenantHeader;
            return next();
        }

        // Default to a fallback or block if tenant is required
        // For now, we'll allow it but log a warning if not present for authenticated requests
        if (req.user) {
            console.warn(`Authenticated request missing tenant_id for user: ${req.user.user.user_id}`);
        }

        next();
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Multi-tenancy middleware failure');
        res.status(500).json({ error: 'Failed to resolve tenant context' });
    }
};

/**
 * Ensures a tenant ID is present on the request
 * Use this for routes that MUST be scoped
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantId) {
        return res.status(403).json({ error: 'Tenant context required' });
    }
    next();
};
