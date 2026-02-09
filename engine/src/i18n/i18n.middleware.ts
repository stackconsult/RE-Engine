import { Request, Response, NextFunction } from 'express';
import { I18nService, getI18n } from './i18n.service.js';

declare global {
    namespace Express {
        interface Request {
            locale?: string;
            t?: (key: string, params?: Record<string, string>) => string;
        }
    }
}

/**
 * i18n middleware for Express
 * Detects locale from query param, header, cookie, or uses default
 */
export const i18nMiddleware = (i18nService?: I18nService) => {
    const i18n = i18nService || getI18n();

    return async (req: Request, res: Response, next: NextFunction) => {
        // Ensure i18n is initialized
        await i18n.initialize();

        // Locale detection priority:
        // 1. Query parameter (?lang=es)
        // 2. Accept-Language header
        // 3. Cookie (locale)
        // 4. Default locale

        let locale = req.query.lang as string;

        if (!locale) {
            const acceptLanguage = req.headers['accept-language'];
            if (acceptLanguage) {
                // Parse "es-MX,es;q=0.9,en;q=0.8" -> "es"
                const preferredLocale = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
                if (preferredLocale && i18n.isSupported(preferredLocale)) {
                    locale = preferredLocale;
                }
            }
        }

        if (!locale && req.cookies?.locale) {
            locale = req.cookies.locale;
        }

        if (!locale || !i18n.isSupported(locale)) {
            locale = i18n.getDefaultLocale();
        }

        // Attach to request
        req.locale = locale;
        req.t = (key: string, params?: Record<string, string>) => i18n.t(key, locale, params);

        // Set Content-Language header
        res.setHeader('Content-Language', locale);

        next();
    };
};

/**
 * Helper to translate with tenant context
 * Allows tenant-specific translation overrides
 */
export const getTenantTranslator = (tenantId: string, locale: string, i18n: I18nService) => {
    return (key: string, params?: Record<string, string>) => {
        // Could add tenant-specific overrides here
        return i18n.t(key, locale, params);
    };
};
