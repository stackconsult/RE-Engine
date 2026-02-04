/**
 * Approvals Repository - Data access layer for approvals
 * Follows RE Engine safety invariants and production rules
 */

import { Approval, CreateApprovalRequest, UpdateApprovalRequest, ApprovalFilter } from '../models/approval.model';
import { CSVAdapter, CSVRecord } from '../adapters/csv-adapter';

export interface ApprovalsRepositoryOptions {
  dataDir: string;
}

export interface QueryResult<T> {
  success: boolean;
  data: T[];
  total?: number;
  error?: string;
}

export interface CreateResult {
  success: boolean;
  data?: Approval;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  data?: Approval;
  error?: string;
}

export class ApprovalsRepository {
  private csv: CSVAdapter;
  private readonly filename = 'approvals.csv';

  constructor(options: ApprovalsRepositoryOptions) {
    this.csv = new CSVAdapter({
      dataDir: options.dataDir,
      encoding: 'utf8'
    });
  }

  /**
   * Initialize the approvals CSV file with proper headers
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.csv.exists(this.filename)) {
        // Validate existing structure
        const expectedHeaders = [
          'approval_id', 'ts_created', 'lead_id', 'channel', 'action_type',
          'draft_subject', 'draft_text', 'draft_to', 'status', 'approved_by',
          'approved_at', 'notes', 'metadata', 'idempotency_key', 'retry_count', 'last_retry_at'
        ];
        
        const validation = this.csv.validateStructure(this.filename, expectedHeaders);
        if (!validation.valid) {
          return { success: false, error: `Invalid CSV structure: ${validation.errors.join(', ')}` };
        }
      } else {
        // Create new file with headers
        const headers = [
          'approval_id', 'ts_created', 'lead_id', 'channel', 'action_type',
          'draft_subject', 'draft_text', 'draft_to', 'status', 'approved_by',
          'approved_at', 'notes', 'metadata', 'idempotency_key', 'retry_count', 'last_retry_at'
        ];
        
        const result = await this.csv.write(this.filename, [], headers);
        if (!result.success) {
          return { success: false, error: result.error };
        }
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create a new approval
   */
  async create(data: CreateApprovalRequest): Promise<CreateResult> {
    try {
      // Generate approval data
      const approval: Approval = {
        approval_id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ts_created: new Date().toISOString(),
        lead_id: data.lead_id,
        channel: data.channel,
        action_type: data.action_type,
        draft_subject: data.draft_subject,
        draft_text: data.draft_text,
        draft_to: data.draft_to,
        status: 'draft',
        metadata: data.metadata,
        idempotency_key: `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        retry_count: 0
      };

      // Convert to CSV record
      const csvRecord = this.approvalToCSVRecord(approval);
      
      // Append to CSV
      const result = await this.csv.append(this.filename, [csvRecord]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: approval };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Query approvals with filters
   */
  async query(filter: ApprovalFilter = {}): Promise<QueryResult<Approval>> {
    try {
      const result = await this.csv.read<CSVRecord>(this.filename);
      
      if (!result.success) {
        return { success: false, data: [], error: result.error };
      }

      let approvals = result.records.map(record => this.csvRecordToApproval(record));

      // Apply filters
      if (filter.status) {
        approvals = approvals.filter(a => a.status === filter.status);
      }
      
      if (filter.channel) {
        approvals = approvals.filter(a => a.channel === filter.channel);
      }
      
      if (filter.lead_id) {
        approvals = approvals.filter(a => a.lead_id === filter.lead_id);
      }
      
      if (filter.approved_by) {
        approvals = approvals.filter(a => a.approved_by === filter.approved_by);
      }
      
      if (filter.created_after) {
        const afterDate = new Date(filter.created_after);
        approvals = approvals.filter(a => new Date(a.ts_created) >= afterDate);
      }
      
      if (filter.created_before) {
        const beforeDate = new Date(filter.created_before);
        approvals = approvals.filter(a => new Date(a.ts_created) <= beforeDate);
      }

      // Sort by creation date (newest first)
      approvals.sort((a, b) => new Date(b.ts_created).getTime() - new Date(a.ts_created).getTime());

      // Apply pagination
      const total = approvals.length;
      const offset = filter.offset || 0;
      const limit = filter.limit || 100;
      
      const paginatedApprovals = approvals.slice(offset, offset + limit);

      return { 
        success: true, 
        data: paginatedApprovals,
        total
      };
    } catch (error) {
      return { 
        success: false, 
        data: [], 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get approval by ID
   */
  async getById(approvalId: string): Promise<{ success: boolean; data?: Approval; error?: string }> {
    try {
      const result = await this.query();
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const approval = result.data.find(a => a.approval_id === approvalId);
      
      if (!approval) {
        return { success: false, error: `Approval ${approvalId} not found` };
      }

      return { success: true, data: approval };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update approval
   */
  async update(approvalId: string, data: UpdateApprovalRequest): Promise<UpdateResult> {
    try {
      // Get existing approval
      const existing = await this.getById(approvalId);
      
      if (!existing.success) {
        return { success: false, error: existing.error };
      }

      // Update approval data
      const updatedApproval: Approval = {
        ...existing.data!,
        ...data,
        // Auto-set timestamps for status changes
        ...(data.status === 'approved' && { 
          approved_at: new Date().toISOString(),
          approved_by: data.approved_by || existing.data!.approved_by
        }),
        ...(data.status === 'approved' && !data.approved_by && !existing.data!.approved_by && {
          approved_by: 'system'
        })
      };

      // Convert to CSV record
      const csvRecord = this.approvalToCSVRecord(updatedApproval);
      
      // Update in CSV
      const result = await this.csv.update(this.filename, [csvRecord], 'approval_id');
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: updatedApproval };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Delete approval
   */
  async delete(approvalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.csv.delete(this.filename, [approvalId], 'approval_id');
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get approvals pending review
   */
  async getPending(): Promise<QueryResult<Approval>> {
    return this.query({ status: 'pending' });
  }

  /**
   * Get approvals ready to send (approved and not sent)
   */
  async getReadyToSend(): Promise<QueryResult<Approval>> {
    return this.query({ status: 'approved' });
  }

  /**
   * Get failed approvals for retry
   */
  async getFailed(): Promise<QueryResult<Approval>> {
    return this.query({ status: 'failed' });
  }

  /**
   * Get file stats
   */
  getStats(filename: string = this.filename) {
    return this.csv.getStats(filename);
  }

  /**
   * Convert Approval to CSV record
   */
  private approvalToCSVRecord(approval: Approval): CSVRecord {
    return {
      approval_id: approval.approval_id,
      ts_created: approval.ts_created,
      lead_id: approval.lead_id,
      channel: approval.channel,
      action_type: approval.action_type,
      draft_subject: approval.draft_subject || '',
      draft_text: approval.draft_text,
      draft_to: approval.draft_to,
      status: approval.status,
      approved_by: approval.approved_by || '',
      approved_at: approval.approved_at || '',
      notes: approval.notes || '',
      metadata: approval.metadata ? JSON.stringify(approval.metadata) : '',
      idempotency_key: approval.idempotency_key || '',
      retry_count: approval.retry_count || 0,
      last_retry_at: approval.last_retry_at || ''
    };
  }

  /**
   * Convert CSV record to Approval
   */
  private csvRecordToApproval(record: CSVRecord): Approval {
    return {
      approval_id: String(record.approval_id),
      ts_created: String(record.ts_created),
      lead_id: String(record.lead_id),
      channel: record.channel as Approval['channel'],
      action_type: record.action_type as Approval['action_type'],
      draft_subject: record.draft_subject ? String(record.draft_subject) : undefined,
      draft_text: String(record.draft_text),
      draft_to: String(record.draft_to),
      status: record.status as Approval['status'],
      approved_by: record.approved_by ? String(record.approved_by) : undefined,
      approved_at: record.approved_at ? String(record.approved_at) : undefined,
      notes: record.notes ? String(record.notes) : undefined,
      metadata: record.metadata ? JSON.parse(String(record.metadata)) : undefined,
      idempotency_key: record.idempotency_key ? String(record.idempotency_key) : undefined,
      retry_count: record.retry_count ? Number(record.retry_count) : 0,
      last_retry_at: record.last_retry_at ? String(record.last_retry_at) : undefined
    };
  }
}
