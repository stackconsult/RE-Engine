/**
 * RE Engine Client SDK - Main client interface
 * Follows RE Engine safety invariants and production rules
 */

import { Approval, CreateApprovalRequest, UpdateApprovalRequest, ApprovalFilter } from '../../a2d/models/approval.model';
import { Lead, CreateLeadRequest, UpdateLeadRequest, LeadFilter } from '../../a2d/models/lead.model';
import { ApprovalsRepository } from '../../a2d/repositories/approvals.repository';
import { LeadsRepository } from '../../a2d/repositories/leads.repository';

export interface REEngineClientOptions {
  dataDir: string;
  environment?: 'development' | 'staging' | 'production';
  apiKey?: string;
  timeout?: number;
}

export interface ClientResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    duration: number;
  };
}

export interface PaginatedResponse<T> extends ClientResponse<T[]> {
  pagination?: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Main RE Engine Client
 * Provides a high-level interface for interacting with the RE Engine
 */
export class REEngineClient {
  private approvals: ApprovalsRepository;
  private leads: LeadsRepository;
  private options: Required<REEngineClientOptions>;

  constructor(options: REEngineClientOptions) {
    this.options = {
      environment: 'development',
      timeout: 30000,
      apiKey: '',
      ...options
    } as Required<REEngineClientOptions>;

    this.approvals = new ApprovalsRepository({ dataDir: options.dataDir });
    this.leads = new LeadsRepository({ dataDir: options.dataDir });
  }

  /**
   * Initialize the client and data stores
   */
  async initialize(): Promise<ClientResponse<boolean>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Initialize repositories
      const approvalsInit = await this.approvals.initialize();
      const leadsInit = await this.leads.initialize();

      if (!approvalsInit.success) {
        return this.createResponse<boolean>(requestId, startTime, false, undefined, approvalsInit.error);
      }

      if (!leadsInit.success) {
        return this.createResponse<boolean>(requestId, startTime, false, undefined, leadsInit.error);
      }

      return this.createResponse(requestId, startTime, true, true);
    } catch (error) {
      return this.createResponse<boolean>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  // ===== APPROVALS =====

  /**
   * Create a new approval
   */
  async createApproval(data: CreateApprovalRequest): Promise<ClientResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.create(data);
      
      if (!result.success) {
        return this.createResponse<Approval>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Approval>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Query approvals
   */
  async queryApprovals(filter: ApprovalFilter = {}): Promise<PaginatedResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.query(filter);
      
      if (!result.success) {
        return this.createResponse<Approval[]>(requestId, startTime, false, undefined, result.error) as PaginatedResponse<Approval>;
      }

      const response: PaginatedResponse<Approval> = this.createResponse(requestId, startTime, true, result.data);
      
      if (result.total !== undefined) {
        response.pagination = {
          total: result.total,
          offset: filter.offset || 0,
          limit: filter.limit || 100,
          hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
        };
      }

      return response;
    } catch (error) {
      return this.createResponse<Approval[]>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error)) as PaginatedResponse<Approval>;
    }
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: string): Promise<ClientResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.getById(approvalId);
      
      if (!result.success) {
        return this.createResponse<Approval>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Approval>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update approval
   */
  async updateApproval(approvalId: string, data: UpdateApprovalRequest): Promise<ClientResponse<Approval>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.approvals.update(approvalId, data);
      
      if (!result.success) {
        return this.createResponse<Approval>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Approval>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Approve an approval
   */
  async approveApproval(approvalId: string, approvedBy?: string): Promise<ClientResponse<Approval>> {
    return this.updateApproval(approvalId, { 
      status: 'approved', 
      approved_by: approvedBy 
    });
  }

  /**
   * Reject an approval
   */
  async rejectApproval(approvalId: string, reason?: string, rejectedBy?: string): Promise<ClientResponse<Approval>> {
    return this.updateApproval(approvalId, { 
      status: 'rejected', 
      notes: reason,
      approved_by: rejectedBy 
    });
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<PaginatedResponse<Approval>> {
    return this.queryApprovals({ status: 'pending' });
  }

  /**
   * Get approvals ready to send
   */
  async getReadyToSendApprovals(): Promise<PaginatedResponse<Approval>> {
    return this.queryApprovals({ status: 'approved' });
  }

  // ===== LEADS =====

  /**
   * Create a new lead
   */
  async createLead(data: CreateLeadRequest): Promise<ClientResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.create(data);
      
      if (!result.success) {
        return this.createResponse<Lead>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Lead>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Query leads
   */
  async queryLeads(filter: LeadFilter = {}): Promise<PaginatedResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.query(filter);
      
      if (!result.success) {
        return this.createResponse<Lead[]>(requestId, startTime, false, undefined, result.error) as PaginatedResponse<Lead>;
      }

      const response: PaginatedResponse<Lead> = this.createResponse(requestId, startTime, true, result.data);
      
      if (result.total !== undefined) {
        response.pagination = {
          total: result.total,
          offset: filter.offset || 0,
          limit: filter.limit || 100,
          hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
        };
      }

      return response;
    } catch (error) {
      return this.createResponse<Lead[]>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error)) as PaginatedResponse<Lead>;
    }
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId: string): Promise<ClientResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.getById(leadId);
      
      if (!result.success) {
        return this.createResponse<Lead>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Lead>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update lead
   */
  async updateLead(leadId: string, data: UpdateLeadRequest): Promise<ClientResponse<Lead>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await this.leads.update(leadId, data);
      
      if (!result.success) {
        return this.createResponse<Lead>(requestId, startTime, false, undefined, result.error);
      }

      return this.createResponse(requestId, startTime, true, result.data);
    } catch (error) {
      return this.createResponse<Lead>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Get client status and health
   */
  async getStatus(): Promise<ClientResponse<{
    environment: string;
    dataDir: string;
    repositories: {
      approvals: boolean;
      leads: boolean;
    };
  }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const approvalsStats = this.approvals.getStats('approvals.csv');
      const leadsStats = this.leads.getStats('leads.csv');

      return this.createResponse(requestId, startTime, true, {
        environment: this.options.environment,
        dataDir: this.options.dataDir,
        repositories: {
          approvals: approvalsStats?.exists || false,
          leads: leadsStats?.exists || false
        }
      });
    } catch (error) {
      return this.createResponse<{environment: string; dataDir: string; repositories: {approvals: boolean; leads: boolean;}}>(requestId, startTime, false, undefined, 
        error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a standardized response
   */
  private createResponse<T>(
    requestId: string,
    startTime: number,
    success: boolean,
    data?: T,
    error?: string
  ): ClientResponse<T> {
    const duration = Date.now() - startTime;

    const response: ClientResponse<T> = {
      success,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        duration
      }
    };

    if (data !== undefined) {
      response.data = data;
    }

    if (error) {
      response.error = error;
    }

    return response as ClientResponse<T>;
  }
}

/**
 * Factory function to create RE Engine client
 */
export function createREEngineClient(options: REEngineClientOptions): REEngineClient {
  return new REEngineClient(options);
}
