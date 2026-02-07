
/**
 * Supabase Integration Service
 * Complete integration with RE Engine operations and storage
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseClientManager, getSupabaseClient, getSupabaseServiceClient } from './supabase-client-enhanced.js';
import { Database } from './supabase.types.js';
import { InsertDto, UpdateDto } from './db-types.js';
import { logSystemEvent, logError } from '../observability/logger.js';
import { DomainLead, DomainApproval } from '../shared/types.js';

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
  private subscriptions: Map<string, { subscription: RealtimeSubscription; channel: RealtimeChannel }> = new Map();
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

      logSystemEvent('supabase_integration_initialized', 'info', {
        realtimeEnabled: this.config.enableRealtime,
        storageEnabled: this.config.enableStorage,
        authEnabled: this.config.enableAuth,
        functionsEnabled: this.config.enableFunctions
      });

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Supabase integration');
      throw error;
    }
  }

  // Lead Management Operations
  async createLead(lead: Omit<Database['public']['Tables']['leads']['Insert'], 'lead_id'>, tenantId: string): Promise<Database['public']['Tables']['leads']['Row']> {
    const client = getSupabaseClient();

    try {
      const { data, error } = await client
        .from('leads')
        .insert({ ...lead, tenant_id: tenantId } as any)

        .select()
        .single() as unknown as { data: Database['public']['Tables']['leads']['Row'] | null; error: any };

      if (error) throw error;
      if (!data) throw new Error('Failed to create lead');

      logSystemEvent('lead_created', 'info', { lead_id: data.lead_id });
      return data;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to create lead');
      throw error;
    }
  }

  async updateLead(leadId: string, updates: Partial<Database['public']['Tables']['leads']['Update']>, tenantId: string): Promise<Database['public']['Tables']['leads']['Row']> {
    const client = getSupabaseClient();

    try {
      const { data, error } = await (client
        .from('leads') as any)
        .update(updates)
        .eq('lead_id', leadId)
        .eq('tenant_id', tenantId)
        .select()
        .single() as unknown as { data: Database['public']['Tables']['leads']['Row'] | null; error: any };

      if (error) throw error;
      if (!data) throw new Error('Lead not found');

      logSystemEvent('lead_updated', 'info', { lead_id: leadId });
      return data;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to update lead');
      throw error;
    }
  }

  async getLead(leadId: string, tenantId: string): Promise<Database['public']['Tables']['leads']['Row'] | null> {
    const client = getSupabaseClient();

    try {
      const { data, error } = await client
        .from('leads')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return data;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to get lead');
      throw error;
    }
  }

  async listLeads(tenantId: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
  }): Promise<Database['public']['Tables']['leads']['Row'][]> {
    const client = getSupabaseClient();

    try {
      let query = client.from('leads').select('*').eq('tenant_id', tenantId);

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
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to list leads');
      throw error;
    }
  }

  // Approval Management Operations
  async createApproval(approval: Omit<Database['public']['Tables']['approvals']['Insert'], 'approval_id'>, tenantId: string): Promise<Database['public']['Tables']['approvals']['Row']> {
    const client = getSupabaseClient();

    try {
      const { data, error } = await client
        .from('approvals')
        .insert({ ...approval, tenant_id: tenantId } as any)
        .select()
        .single() as unknown as { data: Database['public']['Tables']['approvals']['Row'] | null; error: any };

      if (error) throw error;
      if (!data) throw new Error('Failed to create approval');

      logSystemEvent('approval_created', 'info', {
        approval_id: data.approval_id
      });
      return data;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to create approval');
      throw error;
    }
  }

  async updateApproval(approvalId: string, updates: Partial<Database['public']['Tables']['approvals']['Update']>, tenantId: string): Promise<Database['public']['Tables']['approvals']['Row']> {
    const client = getSupabaseClient();

    try {
      const { data, error } = await (client
        .from('approvals') as any)
        .update(updates)
        .eq('approval_id', approvalId)
        .eq('tenant_id', tenantId)
        .select()
        .single() as unknown as { data: Database['public']['Tables']['approvals']['Row'] | null; error: any };

      if (error) throw error;
      if (!data) throw new Error('Approval not found');

      logSystemEvent('approval_updated', 'info', { approval_id: approvalId });
      return data;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to update approval');
      throw error;
    }
  }

  async getApproval(approvalId: string, tenantId: string): Promise<Database['public']['Tables']['approvals']['Row'] | null> {
    const client = getSupabaseClient();

    try {
      const { data, error } = await client
        .from('approvals')
        .select('*')
        .eq('approval_id', approvalId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to get approval');
      throw error;
    }
  }

  async listApprovals(tenantId: string, filters?: {
    status?: string;
    leadId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Database['public']['Tables']['approvals']['Row'][]> {
    const client = getSupabaseClient();

    try {
      let query = client.from('approvals').select('*').eq('tenant_id', tenantId);

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
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to list approvals');
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

      this.subscriptions.set(subscriptionId, { subscription, channel });

      logSystemEvent('realtime_subscription_created', 'info', {
        subscriptionId,
        table: subscription.table,
        event: subscription.event
      });

      return subscriptionId;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to create realtime subscription');
      throw error;
    }
  }

  async unsubscribeFromTable(subscriptionId: string): Promise<void> {
    const entry = this.subscriptions.get(subscriptionId);
    if (!entry) return;

    try {
      await entry.channel.unsubscribe();
      this.subscriptions.delete(subscriptionId);

      logSystemEvent('realtime_subscription_removed', 'info', { subscriptionId });

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to remove realtime subscription');
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

      logSystemEvent('file_uploaded', 'info', { bucket, path });
      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to upload file');
      throw error;
    }
  }

  async downloadFile(bucket: string, path: string): Promise<{ data: Blob | null; error: unknown }> {
    if (!this.config.enableStorage) {
      throw new Error('Storage is not enabled');
    }
    try {
      const result = await (this.manager as any).getClient().storage
        .from(bucket)
        .download(path);
      return result;
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'SupabaseIntegration.downloadFile');
      return { data: null, error };
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = (this.manager as any).getClient().storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  async health(tenantId: string): Promise<boolean> {
    const { leadsCount } = await this.getDatabaseStats(tenantId);
    return leadsCount >= 0;
  }

  // Analytics and Metrics
  async getDatabaseStats(tenantId: string): Promise<{
    leadsCount: number;
    approvalsCount: number;
    recentActivity: number;
  }> {
    const client = getSupabaseServiceClient();

    try {
      const [leadsResult, approvalsResult] = await Promise.all([
        client.from('leads').select('lead_id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        client.from('approvals').select('approval_id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
      ]);

      const leadsCount = leadsResult.count || 0;
      const approvalsCount = approvalsResult.count || 0;

      // Get recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentActivity } = await client
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', oneDayAgo);

      return {
        leadsCount,
        approvalsCount,
        recentActivity: recentActivity || 0
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), 'Failed to get database stats');
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
        logError(error instanceof Error ? error : new Error(String(error)), `Failed to create storage bucket: ${bucket}`);
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
          logSystemEvent('lead_realtime_event', 'info', payload as Record<string, unknown>);
        }
      },
      {
        table: 'approvals',
        event: '*',
        callback: async (payload) => {
          logSystemEvent('approval_realtime_event', 'info', payload as Record<string, unknown>);
        }
      }
    ];

    for (const subscription of defaultSubscriptions) {
      try {
        await this.subscribeToTable(subscription);
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Failed to setup default realtime subscription');
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
