/**
 * Unified Database Manager for Phase 6
 * Combines Neon PostgreSQL and Supabase for complete database solution
 */

import { NeonIntegrationService } from './neon-integration.service';
import { SupabaseIntegrationService } from './supabase-integration.service';
import { Logger } from '../utils/logger';

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

export interface LeadData {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  property_address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  property_type?: string;
  price_range?: string;
  timeline?: string;
  source?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed';
  assigned_agent?: string;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface ApprovalData {
  id?: string;
  lead_id: string;
  type: 'message' | 'email' | 'call' | 'meeting';
  content: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'phone';
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  ai_score?: number;
  reviewed_by?: string;
  reviewed_at?: Date;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export interface EventData {
  id?: string;
  lead_id: string;
  type: 'inbound' | 'outbound' | 'internal';
  channel: string;
  content: string;
  direction: 'in' | 'out';
  timestamp?: Date;
  agent_id?: string;
  metadata?: Record<string, any>;
}

export interface AgentData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  license_number?: string;
  brokerage?: string;
  specialties?: string[];
  active_leads?: number;
  conversion_rate?: number;
  status?: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
}

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
      url: config.supabase.url,
      anonKey: config.supabase.anonKey,
      serviceRoleKey: config.supabase.serviceRoleKey,
      realtimeEnabled: config.features.realtimeEnabled,
      storageEnabled: config.features.storageEnabled,
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
      this.logger.error('Failed to initialize unified database manager', error);
      throw error;
    }
  }

  private setupRealtimeSubscriptions(): void {
    // Subscribe to lead updates for real-time dashboard
    this.supabase.subscribeToTable({
      table: 'leads',
      event: 'INSERT',
      callback: (payload) => {
        this.logger.info('New lead created', payload);
        this.emit('lead:created', payload.new);
      },
    });

    this.supabase.subscribeToTable({
      table: 'leads',
      event: 'UPDATE',
      callback: (payload) => {
        this.logger.info('Lead updated', payload);
        this.emit('lead:updated', payload.new);
      },
    });

    // Subscribe to approval updates
    this.supabase.subscribeToTable({
      table: 'approvals',
      event: 'INSERT',
      callback: (payload) => {
        this.logger.info('New approval created', payload);
        this.emit('approval:created', payload.new);
      },
    });

    this.supabase.subscribeToTable({
      table: 'approvals',
      event: 'UPDATE',
      callback: (payload) => {
        this.logger.info('Approval updated', payload);
        this.emit('approval:updated', payload.new);
      },
    });
  }

  // Lead operations - unified interface
  async createLead(lead: Omit<LeadData, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Create in Neon (primary storage)
      const neonId = await this.neon.createLead(lead);
      
      // Create in Supabase (for real-time and auth)
      const supabaseResult = await this.supabase.createLead({
        ...lead,
        id: neonId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (supabaseResult.error) {
        this.logger.warn('Supabase lead creation failed', supabaseResult.error);
      }

      this.logger.info('Lead created successfully', { neonId, email: lead.email });
      return neonId;
    } catch (error) {
      this.logger.error('Failed to create lead', error);
      throw error;
    }
  }

  async getLead(id: string): Promise<LeadData | null> {
    this.ensureInitialized();
    
    try {
      // Try Neon first (primary source)
      const neonLead = await this.neon.getLead(id);
      if (neonLead) {
        return neonLead;
      }

      // Fallback to Supabase
      const supabaseResult = await this.supabase.getLeads({ limit: 1 });
      const supabaseLead = supabaseResult.data.find(lead => lead.id === id);
      
      return supabaseLead || null;
    } catch (error) {
      this.logger.error('Failed to get lead', error);
      throw error;
    }
  }

  async updateLead(id: string, updates: Partial<LeadData>): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      // Update in Neon
      const neonSuccess = await this.neon.updateLead(id, updates);
      
      // Update in Supabase
      const supabaseResult = await this.supabase.updateLead(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (supabaseResult.error) {
        this.logger.warn('Supabase lead update failed', supabaseResult.error);
      }

      this.logger.info('Lead updated successfully', { id, updates });
      return neonSuccess;
    } catch (error) {
      this.logger.error('Failed to update lead', error);
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
      // Use Supabase for advanced search (better text search)
      const supabaseResult = await this.supabase.searchLeads({
        search: criteria.search,
        status: criteria.status ? [criteria.status] : undefined,
        city: criteria.city ? [criteria.city] : undefined,
        property_type: criteria.property_type ? [criteria.property_type] : undefined,
        limit: criteria.limit || 20,
        offset: criteria.offset || 0,
      });

      return {
        leads: supabaseResult.data,
        total: supabaseResult.count,
      };
    } catch (error) {
      this.logger.error('Failed to search leads', error);
      throw error;
    }
  }

  // Approval operations
  async createApproval(approval: Omit<ApprovalData, 'id' | 'created_at'>): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Create in Neon
      const neonId = await this.neon.createApproval(approval);
      
      // Create in Supabase for real-time
      const supabaseResult = await this.supabase.createApproval({
        ...approval,
        id: neonId,
        created_at: new Date().toISOString(),
      });

      if (supabaseResult.error) {
        this.logger.warn('Supabase approval creation failed', supabaseResult.error);
      }

      this.logger.info('Approval created successfully', { neonId, lead_id: approval.lead_id });
      return neonId;
    } catch (error) {
      this.logger.error('Failed to create approval', error);
      throw error;
    }
  }

  async getPendingApprovals(): Promise<ApprovalData[]> {
    this.ensureInitialized();
    
    try {
      const result = await this.supabase.getPendingApprovals();
      return result.data;
    } catch (error) {
      this.logger.error('Failed to get pending approvals', error);
      throw error;
    }
  }

  async updateApprovalStatus(id: string, status: 'approved' | 'rejected', reviewedBy: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      // Update in Neon
      const neonSuccess = await this.neon.updateApprovalStatus(id, status, reviewedBy);
      
      // Update in Supabase for real-time
      const supabaseResult = await this.supabase.updateApprovalStatus(id, status, reviewedBy);

      if (supabaseResult.error) {
        this.logger.warn('Supabase approval update failed', supabaseResult.error);
      }

      this.logger.info('Approval status updated', { id, status, reviewedBy });
      return neonSuccess;
    } catch (error) {
      this.logger.error('Failed to update approval status', error);
      throw error;
    }
  }

  // Event operations
  async createEvent(event: Omit<EventData, 'id' | 'timestamp'>): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Create in Neon
      const neonId = await this.neon.createEvent(event);
      
      // Create in Supabase for real-time
      const supabaseResult = await this.supabase.createEvent({
        ...event,
        id: neonId,
        timestamp: new Date().toISOString(),
      });

      if (supabaseResult.error) {
        this.logger.warn('Supabase event creation failed', supabaseResult.error);
      }

      return neonId;
    } catch (error) {
      this.logger.error('Failed to create event', error);
      throw error;
    }
  }

  async getLeadEvents(leadId: string, limit: number = 50): Promise<EventData[]> {
    this.ensureInitialized();
    
    try {
      const result = await this.supabase.getLeadEvents(leadId, limit);
      return result.data;
    } catch (error) {
      this.logger.error('Failed to get lead events', error);
      throw error;
    }
  }

  // Agent operations
  async createAgent(agent: Omit<AgentData, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Create in Neon
      const neonId = await this.neon.createAgent(agent);
      
      // Create in Supabase
      await this.supabase.signUpAgent(agent.email, 'temp-password', {
        name: agent.name,
        phone: agent.phone || '',
        license_number: agent.license_number || '',
        brokerage: agent.brokerage || '',
      });

      this.logger.info('Agent created successfully', { neonId, email: agent.email });
      return neonId;
    } catch (error) {
      this.logger.error('Failed to create agent', error);
      throw error;
    }
  }

  async getAgentByEmail(email: string): Promise<AgentData | null> {
    this.ensureInitialized();
    
    try {
      const neonAgent = await this.neon.getAgentByEmail(email);
      return neonAgent;
    } catch (error) {
      this.logger.error('Failed to get agent by email', error);
      throw error;
    }
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
      const supabaseMetrics = await this.supabase.getDashboardMetrics(agentId);
      
      // Get additional analytics from Neon
      const neonMetrics = await this.neon.getLeadMetrics('week');

      return {
        totalLeads: supabaseMetrics.totalLeads,
        pendingApprovals: supabaseMetrics.pendingApprovals,
        conversionRate: supabaseMetrics.conversionRate,
        activeLeads: supabaseMetrics.activeLeads,
        recentActivity: supabaseMetrics.recentActivity,
        leadsByStatus: neonMetrics.leadsByStatus,
        leadsBySource: neonMetrics.leadsBySource,
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics', error);
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
      this.logger.error('Failed to migrate from CSV', error);
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
      this.logger.error('Failed to upload property image', error);
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
      this.logger.error('Failed to upload document', error);
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

  private async testNeonConnection(): Promise<boolean> {
    try {
      await this.neon.pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testSupabaseConnection(): Promise<boolean> {
    try {
      await this.supabase.client.from('leads').select('count').limit(1);
      return true;
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
      await this.supabase.cleanup();
      await this.neon.close();
      this.isInitialized = false;
      
      this.logger.info('Unified database manager cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to cleanup database manager', error);
      throw error;
    }
  }
}
