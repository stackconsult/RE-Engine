---
description: Implementation guide for multi-language support (i18n) with locale files and translation service
---

# i18n (Internationalization) Implementation

Add multi-language support to RE-Engine for global deployment.

## Architecture

```
engine/src/i18n/
├── i18n.service.ts      # Translation service
├── i18n.middleware.ts   # Request locale detection
└── locales/
    ├── en.json          # English (default)
    ├── es.json          # Spanish
    ├── fr.json          # French
    ├── de.json          # German
    └── pt.json          # Portuguese
```

## Core Service

```typescript
// engine/src/i18n/i18n.service.ts
export class I18nService {
    private translations: Map<string, Record<string, string>> = new Map();
    private defaultLocale = 'en';
    
    async initialize(): Promise<void> {
        // Load all locale files
        const locales = ['en', 'es', 'fr', 'de', 'pt'];
        for (const locale of locales) {
            const data = await import(`./locales/${locale}.json`);
            this.translations.set(locale, data.default);
        }
    }
    
    t(key: string, locale: string = 'en', params?: Record<string, string>): string {
        const translations = this.translations.get(locale) || this.translations.get(this.defaultLocale);
        let text = translations?.[key] || key;
        
        // Parameter interpolation: {{name}} -> value
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
            });
        }
        return text;
    }
    
    getSupportedLocales(): string[] {
        return Array.from(this.translations.keys());
    }
}
```

## Middleware

```typescript
// engine/src/i18n/i18n.middleware.ts
export const i18nMiddleware = (i18n: I18nService) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Priority: query param > header > cookie > default
        const locale = req.query.lang as string
            || req.headers['accept-language']?.split(',')[0]?.split('-')[0]
            || req.cookies?.locale
            || 'en';
        
        (req as any).locale = locale;
        (req as any).t = (key: string, params?: Record<string, string>) => 
            i18n.t(key, locale, params);
        
        next();
    };
};
```

## Locale File Format

```json
// locales/en.json
{
    "lead.created": "Lead created successfully",
    "lead.updated": "Lead updated",
    "approval.pending": "{{count}} approvals pending",
    "balance.insufficient": "Insufficient credits. Required: {{required}}, Available: {{available}}",
    "auth.login_success": "Welcome back, {{name}}!",
    "auth.login_failed": "Invalid credentials"
}
```

## Usage in Services

```typescript
// In any service or route
const message = req.t('lead.created');
const balanceMsg = req.t('balance.insufficient', { required: '10', available: '5' });
```

## Tenant-Specific Locales

Tenants can set a default locale in their settings:

```sql
ALTER TABLE tenant_settings ADD COLUMN default_locale VARCHAR(5) DEFAULT 'en';
```
