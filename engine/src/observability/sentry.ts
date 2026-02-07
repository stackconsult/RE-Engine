/**
 * Sentry Observability Integration
 * Error tracking and performance monitoring for production
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { ConfigService } from "../config/config.service.js";

/**
 * Initialize Sentry for the RE Engine
 */
export function initSentry() {
    const config = ConfigService.getInstance();
    const dsn = config.get('SENTRY_DSN');
    const env = config.get('NODE_ENV');

    if (!dsn) {
        if (env === 'production') {
            console.warn('⚠️ SENTRY_DSN is not configured in production. Error tracking is disabled.');
        }
        return;
    }

    Sentry.init({
        dsn,
        environment: env,
        integrations: [
            nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: env === 'production' ? 0.1 : 1.0,
        // Set sampling rate for profiling - this is relative to tracesSampleRate
        profilesSampleRate: 1.0,
    });

    console.log(`✅ Sentry initialized in ${env} mode`);
}

/**
 * Capture a manual exception with context
 */
export function captureException(error: any, context?: Record<string, any>) {
    Sentry.withScope((scope) => {
        if (context) {
            scope.setExtras(context);
        }
        Sentry.captureException(error);
    });
}

/**
 * Add breadcrumb for manual tracing
 */
export function addBreadcrumb(message: string, category: string = 'app', level: Sentry.SeverityLevel = 'info') {
    Sentry.addBreadcrumb({
        message,
        category,
        level,
    });
}
