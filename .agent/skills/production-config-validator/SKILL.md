---
name: production-config-validator
description: Implement type-safe environment configuration validation using Zod and a centralized ConfigService.
---

# Production Config Validator Skill

This skill provides the blueprint and instructions for implementing a robust, type-safe configuration system for the RE-Engine production environment.

## Objective
Transition the application from using `process.env` directly to a centralized, validated `ConfigService` that ensure all required environment variables are present and correctly typed before the application starts.

## 🛠️ Implementation Guide

### 1. Define the Schema (`config.schema.ts`)
Create a Zod schema that defines all required and optional environment variables.

```typescript
import { z } from 'zod';

export const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  // AI Services
  VERTEX_AI_PROJECT_ID: z.string(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  // Messaging
  WHATSAPP_API_KEY: z.string(),
  // ... more
});

export type AppConfig = z.infer<typeof ConfigSchema>;
```

### 2. Create the ConfigService (`config.service.ts`)
Implement a singleton service that parses and exposes the validated configuration.

```typescript
import { ConfigSchema, AppConfig } from './config.schema.js';
import dotenv from 'dotenv';

export class ConfigService {
  private static instance: ConfigService;
  private readonly config: AppConfig;

  private constructor() {
    dotenv.config(); // Load .env
    
    const result = ConfigSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Invalid environment configuration:', result.error.format());
      process.exit(1); // Fail fast in production
    }
    
    this.config = result.data;
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
}
```

### 3. Integration workflow
1.  **Audit call sites**: Find all instances of `process.env` in the codebase.
2.  **Migrate to Service**: Replace direct access with `ConfigService.getInstance().get('KEY')`.
3.  **Bootstrap**: Ensure `ConfigService.getInstance()` is called early in the `ProductionBootstrapService` to trigger validation.

## ⚠️ Safety Warnings
- **Never Log Secrets**: Ensure the `ConfigService` does not log the actual values of sensitive keys if validation fails.
- **Fail Fast**: In production, the application MUST exit if configuration is invalid to avoid unpredictable behavior.
