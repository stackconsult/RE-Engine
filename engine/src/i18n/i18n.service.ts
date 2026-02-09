import { Logger } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface I18nConfig {
    defaultLocale: string;
    supportedLocales: string[];
}

export class I18nService {
    private translations: Map<string, Record<string, string>> = new Map();
    private defaultLocale: string;
    private supportedLocales: string[];
    private logger: Logger;
    private initialized = false;

    constructor(config?: Partial<I18nConfig>) {
        this.defaultLocale = config?.defaultLocale || 'en';
        this.supportedLocales = config?.supportedLocales || ['en', 'es', 'fr', 'de', 'pt'];
        this.logger = new Logger('I18nService');
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        for (const locale of this.supportedLocales) {
            try {
                const localePath = path.join(__dirname, 'locales', `${locale}.json`);

                if (fs.existsSync(localePath)) {
                    const content = fs.readFileSync(localePath, 'utf-8');
                    const translations = JSON.parse(content);
                    this.translations.set(locale, translations);
                    this.logger.info(`Loaded locale: ${locale}`, { keys: Object.keys(translations).length });
                } else {
                    this.logger.warn(`Locale file not found: ${locale}`);
                }
            } catch (error) {
                this.logger.error(`Failed to load locale: ${locale}`, error as Error);
            }
        }

        this.initialized = true;
        this.logger.info('I18n service initialized', {
            locales: this.translations.size,
            default: this.defaultLocale
        });
    }

    /**
     * Translate a key to the specified locale
     * @param key - Translation key (e.g., 'lead.created')
     * @param locale - Target locale (e.g., 'es')
     * @param params - Interpolation parameters (e.g., { name: 'John' })
     */
    t(key: string, locale: string = this.defaultLocale, params?: Record<string, string>): string {
        // Try requested locale, fall back to default
        let translations = this.translations.get(locale);
        if (!translations) {
            translations = this.translations.get(this.defaultLocale);
        }

        if (!translations || !translations[key]) {
            this.logger.warn(`Translation missing: ${key} (${locale})`);
            return key;
        }

        let text = translations[key];

        // Parameter interpolation: {{name}} -> value
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), value);
            });
        }

        return text;
    }

    /**
     * Get all supported locales
     */
    getSupportedLocales(): string[] {
        return Array.from(this.translations.keys());
    }

    /**
     * Check if a locale is supported
     */
    isSupported(locale: string): boolean {
        return this.translations.has(locale);
    }

    /**
     * Get all translations for a locale
     */
    getTranslations(locale: string): Record<string, string> | undefined {
        return this.translations.get(locale);
    }

    /**
     * Add or update translations dynamically (for tenant overrides)
     */
    addTranslations(locale: string, translations: Record<string, string>): void {
        const existing = this.translations.get(locale) || {};
        this.translations.set(locale, { ...existing, ...translations });
    }

    /**
     * Get the default locale
     */
    getDefaultLocale(): string {
        return this.defaultLocale;
    }
}

// Singleton instance
let i18nInstance: I18nService | null = null;

export function getI18n(): I18nService {
    if (!i18nInstance) {
        i18nInstance = new I18nService();
    }
    return i18nInstance;
}
