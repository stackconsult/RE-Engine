/**
 * Supabase Client Manager
 * Production-ready Supabase client with authentication and connection management
 * Follows RE Engine safety invariants and production rules
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase.types.js';
import { logSystemEvent, logError } from '../observability/logger.js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  options?: {
    db?: {
      schema?: 'public';
    };
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
    realtime?: {
      params?: Record<string, string>;
    };
  };
}

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<boolean>;
  query(sql: string): Promise<unknown>;
  transaction<T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T>;
}

export class SupabaseManager implements DatabaseConnection {
  private client: SupabaseClient<Database, "public">;
  private serviceRoleClient: SupabaseClient<Database, "public"> | null = null;
  private config: SupabaseConfig;
  private isConnected: boolean = false;

  constructor(config: SupabaseConfig) {
    this.config = config;
    
    // Initialize main client with anon key
    this.client = createClient<Database>(
      config.url,
      config.anonKey,
      {
        ...config.options,
        global: {
          headers: {
            'X-Client-Info': 're-engine/1.0.0'
          }
        }
      }
    );

    logSystemEvent('supabase-client-initialized', 'info', {
      url: config.url.substring(0, config.url.indexOf('.supabase')) + '.supabase.co'
    });
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple query
      const { error } = await this.client
        .from('leads')
        .select('lead_id')
        .limit(1);

      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      this.isConnected = true;
      logSystemEvent('supabase-connected', 'info', {
        url: this.config.url.substring(0, this.config.url.indexOf('.supabase')) + '.supabase.co'
      });

    } catch (error) {
      logError(error as Error, 'supabase-connection-failed');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Supabase client doesn't have explicit disconnect method
      // Clean up any subscriptions - note: getSubscriptions may not be available in all versions
      // We'll track subscriptions manually if needed
      logSystemEvent('supabase-disconnected', 'info');

      this.isConnected = false;
      logSystemEvent('supabase-disconnected', 'info');
    } catch (error) {
      logError(error as Error, 'supabase-disconnect-failed');
      throw error;
    }
  }

  async health(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const { error } = await this.client
        .from('leads')
        .select('lead_id')
        .limit(1);

      return !error;
    } catch (error) {
      logError(error as Error, 'supabase-health-check-failed');
      return false;
    }
  }

  async query(sql: string): Promise<unknown> {
    try {
      // For complex queries, we'll use RPC (Remote Procedure Call)
      // This requires creating a PostgreSQL function in Supabase
      const { data, error } = await this.client.rpc('execute_sql');

      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      logError(error as Error, 'supabase-query-failed', { sql: sql.substring(0, 100) });
      throw error;
    }
  }

  async transaction<T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T> {
    try {
      // Supabase handles transactions automatically for single operations
      // For complex transactions, we'll use the client directly
      return await callback(this);
    } catch (error) {
      logError(error as Error, 'supabase-transaction-failed');
      throw error;
    }
  }

  getClient(): SupabaseClient<Database, "public"> {
    if (!this.isConnected) {
      throw new Error('Supabase client not connected. Call connect() first.');
    }
    return this.client;
  }

  async getServiceRoleClient(): Promise<SupabaseClient<Database, "public">> {
    if (!this.config.serviceRoleKey) {
      throw new Error('Service role key not configured');
    }

    if (!this.serviceRoleClient) {
      this.serviceRoleClient = createClient<Database, "public">(
        this.config.url,
        this.config.serviceRoleKey,
        {
          ...this.config.options,
          global: {
            headers: {
              'Authorization': `Bearer ${this.config.serviceRoleKey}`,
              'X-Client-Info': 're-engine/1.0.0-service-role'
            }
          }
        }
      );

      logSystemEvent('supabase-service-role-client-created', 'info');
    }

    return this.serviceRoleClient;
  }

  // Real-time subscription management
  subscribeToTable(
    table: keyof Database['public']['Tables'],
    callback: (payload: unknown) => void
  ) {
    const subscription = this.client
      .channel(`table-changes-${table}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: table as string 
        },
        callback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logSystemEvent('supabase-subscription-active', 'info', { table });
        } else if (status === 'CHANNEL_ERROR') {
          logError(new Error(`Subscription error for table ${table}`), 'supabase-subscription-error');
        }
      });

    return subscription;
  }

  // Row Level Security helpers
  async setAuthSession(accessToken: string): Promise<void> {
    try {
      const { error } = await this.client.auth.setSession({
        access_token: accessToken,
        refresh_token: ''
      });

      if (error) {
        throw new Error(`Auth session failed: ${error.message}`);
      }

      logSystemEvent('supabase-auth-session-set', 'info');
    } catch (error) {
      logError(error as Error, 'supabase-auth-session-failed');
      throw error;
    }
  }

  async getCurrentUser(): Promise<unknown> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();

      if (error) {
        throw new Error(`Get user failed: ${error.message}`);
      }

      return user;
    } catch (error) {
      logError(error as Error, 'supabase-get-user-failed');
      throw error;
    }
  }

  // File storage helpers
  async uploadFile(
    bucket: string,
    path: string,
    file: File | ArrayBuffer,
    options?: {
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<unknown> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file, options);

      if (error) {
        throw new Error(`File upload failed: ${error.message}`);
      }

      logSystemEvent('supabase-file-uploaded', 'info', { bucket, path });
      return data;
    } catch (error) {
      logError(error as Error, 'supabase-file-upload-failed', { bucket, path });
      throw error;
    }
  }

  async getPublicUrl(bucket: string, path: string): Promise<string> {
    try {
      const { data } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      logError(error as Error, 'supabase-get-public-url-failed', { bucket, path });
      throw error;
    }
  }

  // Analytics and monitoring
  async getTableStats(table: keyof Database['public']['Tables']): Promise<{
    count: number;
    lastUpdated: string | null;
  }> {
    try {
      const { data, error } = await this.client
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new Error(`Stats query failed: ${error.message}`);
      }

      return {
        count: data?.length || 0,
        lastUpdated: null // We'll need a separate query for last updated timestamp
      };
    } catch (error) {
      logError(error as Error, 'supabase-stats-failed', { table });
      throw error;
    }
  }
}
