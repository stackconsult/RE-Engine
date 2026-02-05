/**
 * Enhanced Supabase Client Configuration
 * Production-ready Supabase integration with provided credentials
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase.types.ts';
import { logSystemEvent, logError } from '../observability/logger.ts';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  schema?: string;
  realtime?: {
    enabled: boolean;
    reconnectInterval: number;
    maxRetries: number;
  };
  auth?: {
    autoRefreshTokens: boolean;
    persistSession: boolean;
    detectSessionInUrl: boolean;
  };
  storage?: {
    buckets: string[];
    defaultBucket: string;
  };
}

export interface SupabaseConnectionConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  poolSize: number;
  timeout: number;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export class SupabaseClientManager {
  private static instance: SupabaseClientManager;
  private anonClient: SupabaseClient<Database> | null = null;
  private serviceClient: SupabaseClient<Database> | null = null;
  private config: SupabaseConfig | null = null;
  private connectionConfig: SupabaseConnectionConfig | null = null;

  private constructor() {}

  static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager();
    }
    return SupabaseClientManager.instance;
  }

  async initialize(config: SupabaseConfig, connectionConfig: SupabaseConnectionConfig): Promise<void> {
    this.config = config;
    this.connectionConfig = connectionConfig;

    try {
      // Initialize anonymous client
      this.anonClient = createClient<Database>(config.url, config.anonKey, {
        db: { 
          schema: config.schema || 'public' 
        },
        auth: config.auth || {
          autoRefreshTokens: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: config.realtime || {
          enabled: true,
          reconnectInterval: 5000,
          maxRetries: 10
        },
        global: {
          headers: {
            'X-Client-Info': 're-engine/1.0.0'
          }
        }
      });

      // Initialize service role client if service key is provided
      if (config.serviceKey) {
        this.serviceClient = createClient<Database>(config.url, config.serviceKey, {
          db: { 
            schema: config.schema || 'public' 
          },
          auth: { 
            persistSession: false 
          },
          global: {
            headers: {
              'X-Client-Info': 're-engine/1.0.0',
              'Authorization': `Bearer ${config.serviceKey}`
            }
          }
        });
      }

      // Test connection
      await this.testConnection();

      logSystemEvent('supabase_client_initialized', {
        url: config.url,
        schema: config.schema || 'public',
        realtimeEnabled: config.realtime?.enabled || false
      });

    } catch (error) {
      logError('Failed to initialize Supabase client', error as Error);
      throw error;
    }
  }

  getAnonClient(): SupabaseClient<Database> {
    if (!this.anonClient) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.anonClient;
  }

  getServiceClient(): SupabaseClient<Database> {
    if (!this.serviceClient) {
      throw new Error('Supabase service client not initialized. Service key may be missing.');
    }
    return this.serviceClient;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.anonClient!.from('leads').select('lead_id').limit(1);
      
      if (error) {
        throw new Error(`Supabase connection test failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      logError('Supabase connection test failed', error as Error);
      return false;
    }
  }

  async healthCheck(): Promise<{
    database: boolean;
    auth: boolean;
    realtime: boolean;
    storage: boolean;
    latency: number;
  }> {
    const startTime = Date.now();
    const results = {
      database: false,
      auth: false,
      realtime: false,
      storage: false,
      latency: 0
    };

    try {
      // Test database connection
      const { error: dbError } = await this.anonClient!.from('leads').select('lead_id').limit(1);
      results.database = !dbError;

      // Test auth service
      const { error: authError } = await this.anonClient!.auth.getSession();
      results.auth = !authError;

      // Test storage access
      const { error: storageError } = await this.anonClient!.storage
        .from('attachments')
        .list();
      results.storage = !storageError;

      // Test realtime (basic connection test)
      if (this.config?.realtime?.enabled) {
        const channel = this.anonClient!.channel('health-check');
        await channel.subscribe();
        await channel.unsubscribe();
        results.realtime = true;
      } else {
        results.realtime = true; // Not enabled, so considered healthy
      }

    } catch (error) {
      logError('Supabase health check failed', error as Error);
    }

    results.latency = Date.now() - startTime;
    return results;
  }

  async disconnect(): Promise<void> {
    try {
      // Unsubscribe all realtime channels
      if (this.anonClient) {
        const channels = this.anonClient.getChannels();
        await Promise.all(channels.map(channel => channel.unsubscribe()));
      }

      this.anonClient = null;
      this.serviceClient = null;
      this.config = null;
      this.connectionConfig = null;

      logSystemEvent('supabase_client_disconnected');
    } catch (error) {
      logError('Error disconnecting Supabase client', error as Error);
    }
  }

  getConfig(): SupabaseConfig | null {
    return this.config;
  }

  getConnectionConfig(): SupabaseConnectionConfig | null {
    return this.connectionConfig;
  }
}

// Default configuration with provided credentials
export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: 'https://dkauwmgoipdqhtyjiwti.supabase.co',
  anonKey: 'sb_publishable_7x5dyTji3lWb5YrVvVvqUg_yX38ssY1',
  schema: 'public',
  realtime: {
    enabled: true,
    reconnectInterval: 5000,
    maxRetries: 10
  },
  auth: {
    autoRefreshTokens: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  storage: {
    buckets: ['attachments', 'profiles', 'exports'],
    defaultBucket: 'attachments'
  }
};

export const DEFAULT_CONNECTION_CONFIG: SupabaseConnectionConfig = {
  url: 'https://dkauwmgoipdqhtyjiwti.supabase.co',
  anonKey: 'sb_publishable_7x5dyTji3lWb5YrVvVvqUg_yX38ssY1',
  poolSize: 20,
  timeout: 30000,
  ssl: true,
  maxConnections: 50,
  connectionTimeout: 10000,
  idleTimeout: 300000
};

// Convenience functions
export async function initializeSupabase(
  config?: Partial<SupabaseConfig>,
  connectionConfig?: Partial<SupabaseConnectionConfig>
): Promise<SupabaseClientManager> {
  const finalConfig = { ...DEFAULT_SUPABASE_CONFIG, ...config };
  const finalConnectionConfig = { ...DEFAULT_CONNECTION_CONFIG, ...connectionConfig };

  const manager = SupabaseClientManager.getInstance();
  await manager.initialize(finalConfig, finalConnectionConfig);
  
  return manager;
}

export function getSupabaseClient(): SupabaseClient<Database> {
  return SupabaseClientManager.getInstance().getAnonClient();
}

export function getSupabaseServiceClient(): SupabaseClient<Database> {
  return SupabaseClientManager.getInstance().getServiceClient();
}

export function getSupabaseManager(): SupabaseClientManager {
  return SupabaseClientManager.getInstance();
}
