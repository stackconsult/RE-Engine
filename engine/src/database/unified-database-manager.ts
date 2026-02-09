/**
 * Unified Database Manager for Phase 6
 * Combines Neon PostgreSQL and Supabase for complete database solution
 */

import { NeonIntegrationService } from './neon-integration.service.js';
import { SupabaseIntegrationService } from './supabase-integration.service.js';
import { CSVConnection } from './csv.js';
import { Logger } from '../utils/logger.js';
import { Database } from './supabase.types.js';
import { InsertDto, UpdateDto } from './db-types.js';

export interface DatabaseConfig {
  dbType: 'postgresql' | 'csv' | 'supabase';
  neon: {
    connectionString: string;
    pooledConnectionString: string;
    maxConnections: number;
  };
  csv?: {
    dataDir: string;
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
export type EventData = any;
export type AgentData = any;

export class UnifiedDatabaseManager {
  private neon: NeonIntegrationService;
  private supabase: SupabaseIntegrationService;
  private csv: CSVConnection | null = null;
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

    if (config.dbType === 'csv' && config.csv) {
      this.csv = new CSVConnection(config.csv);
    }

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
      // Initialize systems based on mode
      const initializationTasks: Promise<void>[] = [this.supabase.initialize()];

      if (this.config.dbType === 'postgresql') {
        initializationTasks.push(this.neon.initialize());
      } else if (this.config.dbType === 'csv' && this.csv) {
        initializationTasks.push(this.csv.connect());
      }

      await Promise.all(initializationTasks);

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
  async createLead(lead: Omit<LeadData, 'id' | 'created_at' | 'updated_at'>, tenantId: string): Promise<string> {
    this.ensureInitialized();

    try {
      let leadId: string;

      if (this.config.dbType === 'postgresql') {
        // Create in Neon (primary storage)
        leadId = await this.neon.createLead(lead as any, tenantId);
      } else {
        // Create in CSV
        const result = await this.csv?.query('INSERT INTO leads (first_name, last_name, email, phone_e164, source, status) VALUES (?, ?, ?, ?, ?, ?)', [
          lead.first_name, lead.last_name, lead.email, lead.phone_e164, lead.source, lead.status
        ]);
        leadId = result?.id || `lead-${Date.now()}`;
      }

      // Create in Supabase (for real-time and auth) - always sync for now
      try {
        await this.supabase.createLead({
          ...lead,
          id: leadId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any, tenantId);
      } catch (syncError) {
        this.logger.warn('Failed to sync lead to Supabase', syncError);
      }

      this.logger.info('Lead created successfully', { leadId, email: lead.email });
      return leadId;
    } catch (error) {
      this.logger.error('Failed to create lead', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getLead(id: string, tenantId: string): Promise<LeadData | null> {
    this.ensureInitialized();

    try {
      if (this.config.dbType === 'postgresql') {
        // Try Neon first (primary source)
        const neonLead = await this.neon.getLead(id, tenantId);
        if (neonLead) {
          return this.mapNeonLeadToSupabase(neonLead);
        }
      } else {
        // Try CSV
        const results = await this.csv?.query('SELECT * FROM leads WHERE id = ?', [id]);
        if (results && results.length > 0) {
          return results[0];
        }
      }

      // Fallback to Supabase
      const supabaseResult = await this.supabase.listLeads(tenantId, { limit: 1 });
      const supabaseLead = supabaseResult.find(lead => lead.lead_id === id);

      return supabaseLead || null;
    } catch (error) {
      this.logger.error('Failed to get lead', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateLead(id: string, updates: Partial<LeadData>, tenantId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      let success = false;

      if (this.config.dbType === 'postgresql') {
        // Update in Neon
        success = await this.neon.updateLead(id, updates as any, tenantId);
      } else {
        // Update in CSV
        const setClauses = Object.entries(updates)
          .map(([key, _]) => `${key} = ?`)
          .join(', ');
        const values = [...Object.values(updates), id];
        await this.csv?.query(`UPDATE leads SET ${setClauses} WHERE id = ?`, values);
        success = true;
      }

      // Update in Supabase - always sync
      try {
        await this.supabase.updateLead(id, {
          ...updates,
          updated_at: new Date().toISOString(),
        } as any, tenantId);
      } catch (syncError) {
        this.logger.warn('Failed to sync lead update to Supabase', syncError);
      }

      this.logger.info('Lead updated successfully', { id, updates });
      return success;
    } catch (error) {
      this.logger.error('Failed to update lead', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async searchLeads(tenantId: string, criteria: {
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
      if (this.config.dbType === 'postgresql') {
        // Query Neon for leads
        const neonLeads = await this.neon.searchLeads(tenantId, criteria as any);
        return {
          leads: neonLeads.map(l => this.mapNeonLeadToSupabase(l)),
          total: neonLeads.length // Simplified for now
        };
      }

      // Fallback to Supabase for advanced search
      const result = await this.supabase.listLeads(tenantId, {
        status: criteria.status as any,
        limit: criteria.limit || 20,
        offset: criteria.offset || 0,
      });

      return {
        leads: result,
        total: result.length,
      };
    } catch (error) {
      this.logger.error('Failed to search leads', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async listTenants(): Promise<any[]> {
    this.ensureInitialized();
    if (this.config.dbType === 'postgresql') {
      return await this.neon.listTenants();
    }
    // Fallback for CSV or testing
    return [{ id: 'default', slug: 'default', name: 'Default Tenant' }];
  }

  // Approval operations
  async createApproval(approval: any, tenantId: string): Promise<string> {
    this.ensureInitialized();

    try {
      let approvalId: string;

      if (this.config.dbType === 'postgresql') {
        // Create in Neon
        approvalId = await this.neon.createApproval({
          lead_id: approval.lead_id,
          type: approval.type || approval.action_type || 'message',
          content: approval.content || approval.draft_text || '',
          channel: approval.channel || 'whatsapp',
          status: approval.status || 'pending',
          ai_score: approval.ai_score || 0,
          metadata: approval.metadata || {}
        } as any, tenantId);
      } else {
        // Create in CSV
        const result = await this.csv?.query('INSERT INTO approvals (lead_id, type, content, channel, status) VALUES (?, ?, ?, ?, ?)', [
          approval.lead_id,
          approval.type || approval.action_type || 'message',
          approval.content || approval.draft_text || '',
          approval.channel || 'whatsapp',
          approval.status || 'pending'
        ]);
        approvalId = result?.id || `appr-${Date.now()}`;
      }

      // Create in Supabase for real-time
      try {
        await this.supabase.createApproval({
          lead_id: approval.lead_id,
          channel: approval.channel || 'whatsapp',
          action_type: approval.type || approval.action_type || 'send',
          draft_text: approval.content || approval.draft_text || '',
          draft_to: approval.draft_to || '',
          status: approval.status || 'pending',
          approval_id: approvalId,
          created_at: new Date().toISOString(),
        } as any, tenantId);
      } catch (syncError) {
        this.logger.warn('Failed to sync approval to Supabase', syncError);
      }

      this.logger.info('Approval created successfully', { approvalId, lead_id: approval.lead_id });
      return approvalId;
    } catch (error) {
      this.logger.error('Failed to create approval', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getPendingApprovals(tenantId: string): Promise<ApprovalData[]> {
    this.ensureInitialized();

    try {
      if (this.config.dbType === 'postgresql') {
        const neonApprovals = await this.neon.getPendingApprovals(tenantId);
        return neonApprovals.map(a => this.mapNeonApprovalToSupabase(a)) as any[];
      }
      const approvals = await this.supabase.listApprovals(tenantId, { status: 'pending' });
      return approvals as any[];
    } catch (error) {
      this.logger.error('Failed to get pending approvals', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateApprovalStatus(id: string, status: 'approved' | 'rejected', reviewedBy: string, tenantId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      let success = false;

      if (this.config.dbType === 'postgresql') {
        // Update in Neon
        success = await this.neon.updateApprovalStatus(id, status, reviewedBy, tenantId);
      } else {
        // Update in CSV
        await this.csv?.query('UPDATE approvals SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?', [
          status, reviewedBy, new Date().toISOString(), id
        ]);
        success = true;
      }

      // Update in Supabase for real-time
      try {
        await this.supabase.updateApproval(id, { status, reviewed_by: reviewedBy, updated_at: new Date().toISOString() } as any, tenantId);
      } catch (syncError) {
        this.logger.warn('Failed to sync approval status to Supabase', syncError);
      }

      this.logger.info('Approval status updated', { id, status, reviewedBy });
      return success;
    } catch (error) {
      this.logger.error('Failed to update approval status', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Event operations (Deferred)
  async createEvent(event: Omit<EventData, 'id' | 'timestamp' | 'tenant_id'>, tenantId: string): Promise<string> {
    this.ensureInitialized();
    if (this.config.dbType === 'postgresql') {
      return await this.neon.createEvent(event as any, tenantId);
    }
    return 'event-deferred';
  }

  async getLeadEvents(leadId: string, tenantId: string, limit: number = 50): Promise<EventData[]> {
    this.ensureInitialized();
    if (this.config.dbType === 'postgresql') {
      return await this.neon.getLeadEvents(leadId, tenantId, limit);
    }
    return [];
  }

  // Agent operations
  async createAgent(agent: Omit<AgentData, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>, tenantId: string): Promise<string> {
    this.ensureInitialized();
    if (this.config.dbType === 'postgresql') {
      return await this.neon.createAgent(agent as any, tenantId);
    }
    return 'agent-deferred';
  }

  async getAgentByEmail(email: string, tenantId: string): Promise<AgentData | null> {
    this.ensureInitialized();
    if (this.config.dbType === 'postgresql') {
      return await this.neon.getAgentByEmail(email, tenantId);
    }
    return null;
  }

  // Analytics and metrics
  async getDashboardMetrics(tenantId: string): Promise<{
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
      if (this.config.dbType === 'postgresql') {
        const metrics = await this.neon.getLeadMetrics(tenantId, 'week');
        return {
          totalLeads: metrics.totalLeads,
          pendingApprovals: 0, // Need to implement in neon or get from sup
          conversionRate: metrics.conversionRate,
          activeLeads: metrics.newLeads,
          recentActivity: [],
          leadsByStatus: metrics.leadsByStatus,
          leadsBySource: metrics.leadsBySource,
        };
      }

      // Fallback to Supabase (real-time dashboard)
      const stats = await this.supabase.getDatabaseStats(tenantId);

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
    contacts?: any[];
    icp_profiles?: any[];
    identities?: any[];
  }, tenantId: string): Promise<{ migrated: number; errors: string[] }> {
    this.ensureInitialized();

    try {
      // Migrate to Neon (primary storage)
      const neonResult = await this.neon.migrateFromCSV(csvData, tenantId);

      // After successful migration to Neon, sync to Supabase
      if (neonResult.migrated > 0) {
        this.logger.info('Neon migration completed, syncing to Supabase for real-time/auth...');

        // Sync leads
        for (const lead of csvData.leads) {
          try {
            await this.supabase.createLead({
              ...lead,
              created_at: lead.created_at || new Date().toISOString(),
              updated_at: lead.updated_at || new Date().toISOString(),
            }, tenantId);
          } catch (error) {
            this.logger.warn('Failed to sync lead to Supabase', { email: lead.email, error });
          }
        }

        // Sync other entities if needed (approvals are synced automatically via createApproval in migrateFromCSV if we called it through unifiedDb, 
        // but neon.migrateFromCSV calls neon.create* directly. So we might need to sync others too if they are used in Supabase.)
        // For now, leads and approvals are the priority for Supabase real-time.
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
      lead_id: neonLead.id,
      phone_e164: neonLead.phone, // Map 'phone' from Neon to 'phone_e164' for Supabase
      metadata: neonLead.metadata || {}
    } as any;
  }

  private mapNeonApprovalToSupabase(neonApproval: any): ApprovalData {
    return {
      ...neonApproval,
      approval_id: neonApproval.id,
      action_type: neonApproval.type,
      draft_text: neonApproval.content,
      metadata: neonApproval.metadata || {}
    } as any;
  }

  private async testNeonConnection(): Promise<boolean> {
    try {
      // Use a known default or system tenant for health checks if needed, 
      // or just a basic query that doesn't strictly depend on a valid tenant ID
      await this.neon.getLead('test-connection-check', '00000000-0000-0000-0000-000000000000');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testSupabaseConnection(): Promise<boolean> {
    try {
      return await this.supabase.health('00000000-0000-0000-0000-000000000000');
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
