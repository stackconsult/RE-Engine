/**
 * Supabase Integration Service
 * Complete integration with RE Engine operations and storage
 */

import { SupabaseClientManager, getSupabaseClient, getSupabaseServiceClient } from './supabase-client-enhanced.ts';
import { Database } from './supabase.types.ts';
import { logSystemEvent, logError } from '../observability/logger.ts';
import { DomainLead, DomainApproval } from '../shared/types.ts';

export interface SupabaseIntegrationConfig {
  enableRealtime: boolean;
  enableStorage: boolean;
  enableAuth: boolean;
  enableFunctions: boolean;
  realtimeChannels: string[];
  storageBuckets: string[];
  retryAttempts: number;
  retryDelay: number;
}

export interface LeadOperation {
  lead_id: string;
  operation: 'create' | 'update' | 'delete' | 'upsert';
  data?: Partial<Database['public']['Tables']['leads']['Row']>;
  filters?: Record<string, unknown>;
}

export interface ApprovalOperation {
  approval_id: string;
  operation: 'create' | 'update' | 'delete' | 'upsert';
  data?: Partial<Database['public']['Tables']['approvals']['Row']>;
  filters?: Record<string, unknown>;
}

export interface RealtimeSubscription {
  table: keyof Database['public']['Tables'];
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: unknown) => Promise<void>;
}

export class SupabaseIntegrationService {
  private manager: SupabaseClientManager;
  private config: SupabaseIntegrationConfig;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private isInitialized = false;

  constructor(config: SupabaseIntegrationConfig) {
    this.config = config;
    this.manager = SupabaseClientManager.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test connection
      const health = await this.manager.healthCheck();
      
      if (!health.database) {
        throw new Error('Supabase database connection failed');
      }

      // Initialize storage buckets if enabled
      if (this.config.enableStorage) {
        await this.initializeStorageBuckets();
      }

      // Setup realtime subscriptions if enabled
      if (this.config.enableRealtime) {
        await this.setupRealtimeSubscriptions();
      }

      this.isInitialized = true;

      logSystemEvent('supabase_integration_initialized', {
        realtimeEnabled: this.config.enableRealtime,
        storageEnabled: this.config.enableStorage,
        authEnabled: this.config.enableAuth,
        functionsEnabled: this.config.enableFunctions
      });

    } catch (error) {
      logError('Failed to initialize Supabase integration', error as Error);
      throw error;
    }
  }

  // Lead Management Operations
  async createLead(lead: Omit<Database['public']['Tables']['leads']['Insert'], 'lead_id'>): Promise<Database['public']['Tables']['leads']['Row']> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client
        .from('leads')
        .insert({
          ...lead,
          lead_id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create lead');

      logSystemEvent('lead_created', { lead_id: data.lead_id });
      return data;

    } catch (error) {
      logError('Failed to create lead', error as Error);
      throw error;
    }
  }

  async updateLead(leadId: string, updates: Partial<Database['public']['Tables']['leads']['Update']>): Promise<Database['public']['Tables']['leads']['Row']> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('lead_id', leadId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Lead not found');

      logSystemEvent('lead_updated', { lead_id: leadId });
      return data;

    } catch (error) {
      logError('Failed to update lead', error as Error);
      throw error;
    }
  }

  async getLead(leadId: string): Promise<Database['public']['Tables']['leads']['Row'] | null> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client
        .from('leads')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return data;

    } catch (error) {
      logError('Failed to get lead', error as Error);
      throw error;
    }
  }

  async listLeads(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
  }): Promise<Database['public']['Tables']['leads']['Row'][]> {
    const client = getSupabaseClient();
    
    try {
      let query = client.from('leads').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.orderBy) {
        const [column, direction] = filters.orderBy.split(':');
        query = query.order(column, { ascending: direction === 'asc' });
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];

    } catch (error) {
      logError('Failed to list leads', error as Error);
      throw error;
    }
  }

  // Approval Management Operations
  async createApproval(approval: Omit<Database['public']['Tables']['approvals']['Insert'], 'approval_id'>): Promise<Database['public']['Tables']['approvals']['Row']> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client
        .from('approvals')
        .insert({
          ...approval,
          approval_id: crypto.randomUUID(),
          ts_created: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create approval');

      logSystemEvent('approval_created', { approval_id: data.approval_id });
      return data;

    } catch (error) {
      logError('Failed to create approval', error as Error);
      throw error;
    }
  }

  async updateApproval(approvalId: string, updates: Partial<Database['public']['Tables']['approvals']['Update']>): Promise<Database['public']['Tables']['approvals']['Row']> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client
        .from('approvals')
        .update(updates)
        .eq('approval_id', approvalId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Approval not found');

      logSystemEvent('approval_updated', { approval_id: approvalId });
      return data;

    } catch (error) {
      logError('Failed to update approval', error as Error);
      throw error;
    }
  }

  async getApproval(approvalId: string): Promise<Database['public']['Tables']['approvals']['Row'] | null> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client
        .from('approvals')
        .select('*')
        .eq('approval_id', approvalId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;

    } catch (error) {
      logError('Failed to get approval', error as Error);
      throw error;
    }
  }

  async listApprovals(filters?: {
    status?: string;
    leadId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Database['public']['Tables']['approvals']['Row'][]> {
    const client = getSupabaseClient();
    
    try {
      let query = client.from('approvals').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];

    } catch (error) {
      logError('Failed to list approvals', error as Error);
      throw error;
    }
  }

  // Real-time Operations
  async subscribeToTable(subscription: RealtimeSubscription): Promise<string> {
    if (!this.config.enableRealtime) {
      throw new Error('Realtime is not enabled');
    }

    const client = getSupabaseClient();
    const subscriptionId = `${subscription.table}-${subscription.event}-${Date.now()}`;

    try {
      const channel = client
        .channel(subscriptionId)
        .on(
          subscription.event as 'postgres_changes',
          {
            event: subscription.event,
            schema: 'public',
            table: subscription.table,
            filter: subscription.filter
          },
          subscription.callback
        )
        .subscribe();

      this.subscriptions.set(subscriptionId, subscription);

      logSystemEvent('realtime_subscription_created', {
        subscriptionId,
        table: subscription.table,
        event: subscription.event
      });

      return subscriptionId;

    } catch (error) {
      logError('Failed to create realtime subscription', error as Error);
      throw error;
    }
  }

  async unsubscribeFromTable(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      const client = getSupabaseClient();
      await client.removeChannel(subscriptionId);

      this.subscriptions.delete(subscriptionId);

      logSystemEvent('realtime_subscription_removed', { subscriptionId });

    } catch (error) {
      logError('Failed to remove realtime subscription', error as Error);
      throw error;
    }
  }

  // Storage Operations
  async uploadFile(
    bucket: string,
    path: string,
    file: File | ArrayBuffer,
    options?: {
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<{ data: { path: string } | null; error: unknown }> {
    if (!this.config.enableStorage) {
      throw new Error('Storage is not enabled');
    }

    const client = getSupabaseClient();

    try {
      const result = await client.storage
        .from(bucket)
        .upload(path, file, {
          contentType: options?.contentType,
          upsert: options?.upsert || false
        });

      logSystemEvent('file_uploaded', { bucket, path });
      return result;

    } catch (error) {
      logError('Failed to upload file', error as Error);
      throw error;
    }
  }

  async downloadFile(bucket: string, path: string): Promise<{ data: ArrayBuffer | null; error: unknown }> {
    if (!this.config.enableStorage) {
      throw new Error('Storage is not enabled');
    }

    const client = getSupabaseClient();

    try {
      const result = await client.storage
        .from(bucket)
        .download(path);

      return result;

    } catch (error) {
      logError('Failed to download file', error as Error);
      throw error;
    }
  }

  // Analytics and Metrics
  async getDatabaseStats(): Promise<{
    leadsCount: number;
    approvalsCount: number;
    recentActivity: number;
  }> {
    const client = getSupabaseServiceClient();

    try {
      const [leadsResult, approvalsResult] = await Promise.all([
        client.from('leads').select('lead_id', { count: 'exact', head: true }),
        client.from('approvals').select('approval_id', { count: 'exact', head: true })
      ]);

      const leadsCount = leadsResult.count || 0;
      const approvalsCount = approvalsResult.count || 0;

      // Get recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentActivity } = await client
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      return {
        leadsCount,
        approvalsCount,
        recentActivity: recentActivity || 0
      };

    } catch (error) {
      logError('Failed to get database stats', error as Error);
      throw error;
    }
  }

  // Private Helper Methods
  private async initializeStorageBuckets(): Promise<void> {
    const client = getSupabaseServiceClient();

    for (const bucket of this.config.storageBuckets) {
      try {
        const { error } = await client.storage.createBucket(bucket, {
          public: false,
          allowedMimeTypes: ['image/*', 'application/pdf', 'text/*'],
          fileSizeLimit: 52428800 // 50MB
        });

        if (error && !error.message.includes('already exists')) {
          throw error;
        }

      } catch (error) {
        logError(`Failed to create storage bucket: ${bucket}`, error as Error);
      }
    }
  }

  private async setupRealtimeSubscriptions(): Promise<void> {
    // Setup default subscriptions for leads and approvals
    const defaultSubscriptions: RealtimeSubscription[] = [
      {
        table: 'leads',
        event: '*',
        callback: async (payload) => {
          logSystemEvent('lead_realtime_event', payload);
        }
      },
      {
        table: 'approvals',
        event: '*',
        callback: async (payload) => {
          logSystemEvent('approval_realtime_event', payload);
        }
      }
    ];

    for (const subscription of defaultSubscriptions) {
      try {
        await this.subscribeToTable(subscription);
      } catch (error) {
        logError('Failed to setup default realtime subscription', error as Error);
      }
    }
  }

  async disconnect(): Promise<void> {
    // Unsubscribe all realtime subscriptions
    const unsubscribePromises = Array.from(this.subscriptions.keys())
      .map(id => this.unsubscribeFromTable(id));

    await Promise.allSettled(unsubscribePromises);

    // Disconnect client manager
    await this.manager.disconnect();

    this.isInitialized = false;
    logSystemEvent('supabase_integration_disconnected');
  }
}

// Default configuration
export const DEFAULT_INTEGRATION_CONFIG: SupabaseIntegrationConfig = {
  enableRealtime: true,
  enableStorage: true,
  enableAuth: true,
  enableFunctions: true,
  realtimeChannels: ['leads', 'approvals', 'events'],
  storageBuckets: ['attachments', 'profiles', 'exports'],
  retryAttempts: 3,
  retryDelay: 1000
};

// Convenience function to create and initialize the service
export async function createSupabaseIntegration(
  config?: Partial<SupabaseIntegrationConfig>
): Promise<SupabaseIntegrationService> {
  const finalConfig = { ...DEFAULT_INTEGRATION_CONFIG, ...config };
  const service = new SupabaseIntegrationService(finalConfig);
  
  await service.initialize();
  return service;
}
