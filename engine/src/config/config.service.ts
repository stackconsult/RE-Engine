import { ConfigSchema, AppConfig } from './config.schema.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigService {
    private static instance: ConfigService;
    private readonly config: AppConfig;

    private constructor() {
        // Load .env from the root directory
        const rootPath = path.resolve(__dirname, '../../../');

        // Try loading test.config.env first (fallback for permissions issues)
        const testEnvPath = path.join(rootPath, 'test.config.env');
        if (fs.existsSync(testEnvPath)) {
            console.log('🔌 ConfigService loading fallback env from:', testEnvPath);
            dotenv.config({ path: testEnvPath });
        }

        const envPath = path.join(rootPath, '.env');
        console.log('🔌 ConfigService loading .env from:', envPath);
        const dotEnvResult = dotenv.config({ path: envPath });
        if (dotEnvResult.error) {
            console.error('❌ Error loading .env:', dotEnvResult.error);
        } else {
            console.log('✅ Loaded .env keys:', Object.keys(dotEnvResult.parsed || {}).length);
        }

        // Validate environment variables
        const result = ConfigSchema.safeParse(process.env);

        if (!result.success) {
            console.error('❌ Invalid environment configuration:');
            const formatted = result.error.format();
            Object.entries(formatted).forEach(([key, value]) => {
                if (key !== '_errors') {
                    console.error(`  - ${key}: ${(value as any)._errors.join(', ')}`);
                }
            });
            process.exit(1);
        }

        this.config = result.data;
        console.log('✅ Configuration validated successfully');
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

    public getAll(): AppConfig {
        return { ...this.config };
    }
}
