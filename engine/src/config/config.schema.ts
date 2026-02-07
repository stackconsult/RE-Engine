import { z } from 'zod';

export const ConfigSchema = z.object({
    // Server Configuration
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('localhost'),
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

    // Database Configuration
    DB_TYPE: z.enum(['csv', 'postgresql', 'supabase']).default('csv'),
    DATABASE_URL: z.string().optional(),
    DATABASE_POOLED_URL: z.string().optional(),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_KEY: z.string().optional(),
    DATABASE_POOL_SIZE: z.coerce.number().default(20),
    DATABASE_TIMEOUT: z.coerce.number().default(30000),

    // Security Configuration
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be 32 characters').optional(),
    SESSION_SECRET: z.string().optional(),

    // Infrastructure Services
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.coerce.number().default(0),
    RABBITMQ_URL: z.string().url().default('amqp://localhost:5672'),

    // AI Services
    VERTEX_AI_PROJECT_ID: z.string().optional(),
    VERTEX_AI_REGION: z.string().default('us-central1'),
    VERTEX_AI_API_KEY: z.string().optional(),
    OLLAMA_BASE_URL: z.string().url().default('http://127.0.0.1:11434/v1'),
    OLLAMA_MODEL: z.string().default('qwen:7b'),

    // Messaging Services
    WHATSAPP_API_KEY: z.string().optional(),
    WHATSAPP_API_URL: z.string().url().default('https://gate.whapi.cloud'),
    WHATSAPP_WEBHOOK_SECRET: z.string().optional(),

    // Monitoring & Observability
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    PROMETHEUS_PORT: z.coerce.number().default(9090),
    ALERT_WEBHOOK_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().url().optional(),

    // Service API Keys
    TINYFISH_API_KEY: z.string().optional(),
    ENGINE_API_KEY: z.string().default('dev-key'),
    BROWSER_API_KEY: z.string().default('dev-key'),
    LLAMA_API_KEY: z.string().default('dev-key'),
    CORE_API_KEY: z.string().default('dev-key'),
    OUTREACH_API_KEY: z.string().default('dev-key'),

    // Network Security Configuration
    API_IP_WHITELIST: z.string().optional(),
    ALLOWED_IPS: z.string().optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
