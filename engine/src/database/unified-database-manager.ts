/**
 * Unified Database Manager for Phase 6
 * Combines Neon PostgreSQL and Supabase for complete database solution
 */

import { NeonIntegrationService } from './neon-integration.service.js';
import { SupabaseIntegrationService } from './supabase-integration.service.js';
import { Logger } from '../utils/logger.js';
import { Database } from './supabase.types.js';
import { InsertDto, UpdateDto } from './db-types.js';

export interface DatabaseConfig {
  neon: {
    connectionString: string;
    pooledConnectionString: string;
    maxConnections: number;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  features: {
    realtimeEnabled: boolean;
    storageEnabled: boolean;
    analyticsEnabled: boolean;
    migrationEnabled: boolean;
  };
}

export type LeadData = Database['public']['Tables']['leads']['Row'];
export type ApprovalData = Database['public']['Tables']['approvals']['Row'];
// Events table schema might need verification, assuming 'events' exists or using partial
// If 'events' table is missing in Database type, we might need a fallback or verify schema
// Based on neon-integration, events exists.
export type EventData = any; // Placeholder until verified in Database type
export type AgentData = any; // Placeholder until verified in Database type

export class UnifiedDatabaseManager {
  private neon: NeonIntegrationService;
  private supabase: SupabaseIntegrationService;
  private logger: Logger;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.logger = new Logger('UnifiedDatabase', true);

    this.neon = new NeonIntegrationService({
      connectionString: config.neon.connectionString,
      pooledConnectionString: config.neon.pooledConnectionString,
      maxConnections: config.neon.maxConnections,
      ssl: true,
      applicationName: 're-engine-phase6',
    });

    this.supabase = new SupabaseIntegrationService({
      enableRealtime: config.features.realtimeEnabled,
      enableStorage: config.features.storageEnabled,
      enableAuth: true,
      enableFunctions: false,
      realtimeChannels: ['leads', 'approvals'],
      storageBuckets: [],
      retryAttempts: 3,
      retryDelay: 1000,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.logger.info('Initializing unified database manager...');

    try {
      // Initialize both database systems
      await Promise.all([
        this.neon.initialize(),
        this.supabase.initialize(),
      ]);

      // Set up real-time subscriptions if enabled
      if (this.config.features.realtimeEnabled) {
        this.setupRealtimeSubscriptions();
      }

      this.isInitialized = true;
      this.logger.info('Unified database manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize unified database manager', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private setupRealtimeSubscriptions(): void {
    // Subscribe to lead updates for real-time dashboard
    this.supabase.subscribeToTable({
      table: 'leads',
      event: 'INSERT',
      callback: async (payload) => {
        this.logger.info('New lead created', payload as Record<string, unknown>);
        this.emit('lead:created', (payload as any).new);
      },
    });

    this.supabase.subscribeToTable({
      table: 'leads',
      event: 'UPDATE',
      callback: async (payload) => {
        this.logger.info('Lead updated', payload as Record<string, unknown>);
        this.emit('lead:updated', (payload as any).new);
      },
    });

    // Subscribe to approval updates
    this.supabase.subscribeToTable({
      table: 'approvals',
      event: 'INSERT',
      callback: async (payload) => {
        this.logger.info('New approval created', payload as Record<string, unknown>);
        this.emit('approval:created', (payload as any).new);
      },
    });

    this.supabase.subscribeToTable({
      table: 'approvals',
      event: 'UPDATE',
      callback: async (payload) => {
        this.logger.info('Approval updated', payload as Record<string, unknown>);
        this.emit('approval:updated', (payload as any).new);
      },
    });
  }

  // Lead operations - unified interface
  async createLead(lead: Omit<LeadData, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    this.ensureInitialized();

    try {
      // Create in Neon (primary storage)
      const neonId = await this.neon.createLead(lead as any);

      // Create in Supabase (for real-time and auth)
      const supabaseResult = await this.supabase.createLead({
        ...lead,
        id: neonId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      this.logger.info('Lead created successfully', { neonId, email: lead.email });
      return neonId;
    } catch (error) {
      this.logger.error('Failed to create lead', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getLead(id: string): Promise<LeadData | null> {
    this.ensureInitialized();

    try {
      // Try Neon first (primary source)
      const neonLead = await this.neon.getLead(id);
      if (neonLead) {
        return this.mapNeonLeadToSupabase(neonLead);
      }

      // Fallback to Supabase
      const supabaseResult = await this.supabase.listLeads({ limit: 1 });
      const supabaseLead = supabaseResult.find(lead => lead.lead_id === id);

      return supabaseLead || null;
    } catch (error) {
      this.logger.error('Failed to get lead', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateLead(id: string, updates: Partial<LeadData>): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Update in Neon
      const neonSuccess = await this.neon.updateLead(id, updates as any);

      // Update in Supabase
      const supabaseResult = await this.supabase.updateLead(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      } as any);

      this.logger.info('Lead updated successfully', { id, updates });
      return neonSuccess;
    } catch (error) {
      this.logger.error('Failed to update lead', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async searchLeads(criteria: {
    status?: string;
    assigned_agent?: string;
    city?: string;
    property_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: LeadData[]; total: number }> {
    this.ensureInitialized();

    try {
      // Use Supabase for advanced search (mapping to listLeads for now)
      // Note: Full text search support requires updating SupabaseIntegrationService.listLeads
      const result = await this.supabase.listLeads({
        status: criteria.status,
        limit: criteria.limit || 20,
        offset: criteria.offset || 0,
      });

      return {
        leads: result,
        total: result.length, // Valid approximation as listLeads returns Row[]
      };
    } catch (error) {
      this.logger.error('Failed to search leads', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Approval operations
  async createApproval(approval: Omit<ApprovalData, 'id' | 'created_at'>): Promise<string> {
    this.ensureInitialized();

    try {
      // Create in Neon
      const neonId = await this.neon.createApproval(approval as any);

      // Create in Supabase for real-time
      const supabaseResult = await this.supabase.createApproval({
        ...approval,
        approval_id: neonId, // Use neonId as approval_id
        created_at: new Date().toISOString(),
      } as any);



      this.logger.info('Approval created successfully', { neonId, lead_id: approval.lead_id });
      return neonId;
    } catch (error) {
      this.logger.error('Failed to create approval', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getPendingApprovals(): Promise<ApprovalData[]> {
    this.ensureInitialized();

    try {
      const approvals = await this.supabase.listApprovals({ status: 'pending' });
      return approvals as any[]; // Type align
    } catch (error) {
      this.logger.error('Failed to get pending approvals', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateApprovalStatus(id: string, status: 'approved' | 'rejected', reviewedBy: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Update in Neon
      const neonSuccess = await this.neon.updateApprovalStatus(id, status, reviewedBy);

      // Update in Supabase for real-time
      try {
        if (status === 'approved') {
          // Implement approval logic
        }

        const supabaseResult = await this.supabase.updateApproval(id, { status, reviewed_by: reviewedBy } as any);

        this.logger.info('Approval status updated', { id, status, reviewedBy });
        return neonSuccess;
      } catch (error) {
        this.logger.error('Failed to update approval status in Supabase', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to update approval status', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Event operations (Deferred)
  async createEvent(event: Omit<EventData, 'id' | 'timestamp'>): Promise<string> {
    this.ensureInitialized();
    return 'event-deferred';
  }

  async getLeadEvents(leadId: string, limit: number = 50): Promise<EventData[]> {
    this.ensureInitialized();
    return [];
  }

  // Agent operations (Deferred)
  async createAgent(agent: Omit<AgentData, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    this.ensureInitialized();
    return 'agent-deferred';
  }

  async getAgentByEmail(email: string): Promise<AgentData | null> {
    this.ensureInitialized();
    return null;
  }

  // Analytics and metrics
  async getDashboardMetrics(agentId?: string): Promise<{
    totalLeads: number;
    pendingApprovals: number;
    conversionRate: number;
    activeLeads: number;
    recentActivity: EventData[];
    leadsByStatus: Record<string, number>;
    leadsBySource: Record<string, number>;
  }> {
    this.ensureInitialized();

    try {
      // Get metrics from Supabase (real-time dashboard)
      const stats = await this.supabase.getDatabaseStats();

      return {
        totalLeads: stats.leadsCount,
        pendingApprovals: stats.approvalsCount,
        conversionRate: 0, // Placeholder
        activeLeads: 0, // Placeholder
        recentActivity: [], // Placeholder
        leadsByStatus: {}, // Placeholder
        leadsBySource: {}, // Placeholder
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Migration utilities
  async migrateFromCSV(csvData: {
    leads: any[];
    approvals: any[];
    events: any[];
  }): Promise<{ migrated: number; errors: string[] }> {
    this.ensureInitialized();

    try {
      // Migrate to Neon (primary storage)
      const neonResult = await this.neon.migrateFromCSV(csvData);

      // After successful migration to Neon, sync to Supabase
      if (neonResult.migrated > 0 && neonResult.errors.length === 0) {
        this.logger.info('CSV migration successful, syncing to Supabase...');

        // Sync leads to Supabase in batches
        for (const lead of csvData.leads) {
          try {
            await this.supabase.createLead({
              ...lead,
              created_at: lead.created_at || new Date().toISOString(),
              updated_at: lead.updated_at || new Date().toISOString(),
            });
          } catch (error) {
            this.logger.warn('Failed to sync lead to Supabase', error);
          }
        }
      }

      return neonResult;
    } catch (error) {
      this.logger.error('Failed to migrate from CSV', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Storage operations (Supabase only)
  async uploadPropertyImage(propertyId: string, file: File): Promise<{ url: string; error: any }> {
    this.ensureInitialized();

    try {
      const fileName = `property-${propertyId}-${Date.now()}`;
      const { data, error } = await this.supabase.uploadFile('property-images', fileName, file);

      if (error) {
        throw error;
      }

      const publicUrl = this.supabase.getPublicUrl('property-images', fileName);

      return { url: publicUrl, error: null };
    } catch (error) {
      this.logger.error('Failed to upload property image', error instanceof Error ? error : new Error(String(error)));
      return { url: '', error };
    }
  }

  async uploadDocument(documentType: string, file: File): Promise<{ url: string; error: any }> {
    this.ensureInitialized();

    try {
      const fileName = `${documentType}-${Date.now()}`;
      const { data, error } = await this.supabase.uploadFile('documents', fileName, file);

      if (error) {
        throw error;
      }

      const publicUrl = this.supabase.getPublicUrl('documents', fileName);

      return { url: publicUrl, error: null };
    } catch (error) {
      this.logger.error('Failed to upload document', error instanceof Error ? error : new Error(String(error)));
      return { url: '', error };
    }
  }

  // System health and monitoring
  async getSystemHealth(): Promise<{
    neon: 'healthy' | 'unhealthy';
    supabase: 'healthy' | 'unhealthy';
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    try {
      // Test Neon connection
      const neonHealthy = await this.testNeonConnection();

      // Test Supabase connection
      const supabaseHealthy = await this.testSupabaseConnection();

      const overall = neonHealthy && supabaseHealthy ? 'healthy' :
        neonHealthy || supabaseHealthy ? 'degraded' : 'unhealthy';

      return {
        neon: neonHealthy ? 'healthy' : 'unhealthy',
        supabase: supabaseHealthy ? 'healthy' : 'unhealthy',
        overall,
      };
    } catch (error) {
      this.logger.error('Failed to get system health', error);
      return {
        neon: 'unhealthy',
        supabase: 'unhealthy',
        overall: 'unhealthy',
      };
    }
  }

  private mapNeonLeadToSupabase(neonLead: any): LeadData {
    return {
      ...neonLead,
      lead_id: neonLead.id, // Map Neon 'id' to Supabase 'lead_id'
      // Ensure metadata is compatible (Supabase uses Json, Neon uses Record/any)
      metadata: neonLead.metadata as any
    } as LeadData;
  }

  private async testNeonConnection(): Promise<boolean> {
    try {
      await this.neon.getLead('test-connection-check'); // Simple check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testSupabaseConnection(): Promise<boolean> {
    try {
      return await this.supabase.health();
    } catch (error) {
      return false;
    }
  }

  // Event emitter for real-time updates
  private emit(event: string, data: any): void {
    // This would integrate with your event system
    this.logger.info('Database event emitted', { event, data });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database manager not initialized. Call initialize() first.');
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up unified database manager...');

    try {
      if (this.supabase) {
        await this.supabase.disconnect();
      }
      await this.neon.close(); // Keep neon close as it's a separate service
      this.isInitialized = false;

      this.logger.info('Unified database manager cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to cleanup database manager', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
