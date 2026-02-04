/**
 * Leads Repository - Data access layer for leads
 * Follows RE Engine safety invariants and production rules
 */

import { Lead, CreateLeadRequest, UpdateLeadRequest, LeadFilter } from '../models/lead.model';
import { CSVAdapter, CSVRecord } from '../adapters/csv-adapter';

export interface LeadsRepositoryOptions {
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
  data?: Lead;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  data?: Lead;
  error?: string;
}

export class LeadsRepository {
  private csv: CSVAdapter;
  private readonly filename = 'leads.csv';

  constructor(options: LeadsRepositoryOptions) {
    this.csv = new CSVAdapter({
      dataDir: options.dataDir,
      encoding: 'utf8'
    });
  }

  /**
   * Initialize the leads CSV file with proper headers
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.csv.exists(this.filename)) {
        // Validate existing structure
        const expectedHeaders = [
          'lead_id', 'first_name', 'last_name', 'email', 'phone_e164',
          'city', 'province', 'source', 'tags', 'status', 'created_at',
          'updated_at', 'metadata', 'last_contacted_at', 'contact_count'
        ];
        
        const validation = this.csv.validateStructure(this.filename, expectedHeaders);
        if (!validation.valid) {
          return { success: false, error: `Invalid CSV structure: ${validation.errors.join(', ')}` };
        }
      } else {
        // Create new file with headers
        const headers = [
          'lead_id', 'first_name', 'last_name', 'email', 'phone_e164',
          'city', 'province', 'source', 'tags', 'status', 'created_at',
          'updated_at', 'metadata', 'last_contacted_at', 'contact_count'
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
   * Create a new lead
   */
  async create(data: CreateLeadRequest): Promise<CreateResult> {
    try {
      // Generate lead data
      const lead: Lead = {
        lead_id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_e164: data.phone_e164,
        city: data.city,
        province: data.province,
        source: data.source,
        tags: data.tags || [],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: data.metadata,
        contact_count: 0
      };

      // Convert to CSV record
      const csvRecord = this.leadToCSVRecord(lead);
      
      // Append to CSV
      const result = await this.csv.append(this.filename, [csvRecord]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: lead };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Query leads with filters
   */
  async query(filter: LeadFilter = {}): Promise<QueryResult<Lead>> {
    try {
      const result = await this.csv.read<CSVRecord>(this.filename);
      
      if (!result.success) {
        return { success: false, data: [], error: result.error };
      }

      let leads = result.records.map(record => this.csvRecordToLead(record));

      // Apply filters
      if (filter.status) {
        leads = leads.filter(l => l.status === filter.status);
      }
      
      if (filter.source) {
        leads = leads.filter(l => l.source === filter.source);
      }
      
      if (filter.tags && filter.tags.length > 0) {
        leads = leads.filter(l => filter.tags!.some(tag => l.tags.includes(tag)));
      }
      
      if (filter.city) {
        leads = leads.filter(l => l.city === filter.city);
      }
      
      if (filter.province) {
        leads = leads.filter(l => l.province === filter.province);
      }
      
      if (filter.created_after) {
        const afterDate = new Date(filter.created_after);
        leads = leads.filter(l => new Date(l.created_at) >= afterDate);
      }
      
      if (filter.created_before) {
        const beforeDate = new Date(filter.created_before);
        leads = leads.filter(l => new Date(l.created_at) <= beforeDate);
      }
      
      if (filter.has_email !== undefined) {
        leads = leads.filter(l => !!l.email === filter.has_email);
      }
      
      if (filter.has_phone !== undefined) {
        leads = leads.filter(l => !!l.phone_e164 === filter.has_phone);
      }

      // Sort by creation date (newest first)
      leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply pagination
      const total = leads.length;
      const offset = filter.offset || 0;
      const limit = filter.limit || 100;
      
      const paginatedLeads = leads.slice(offset, offset + limit);

      return { 
        success: true, 
        data: paginatedLeads,
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
   * Get lead by ID
   */
  async getById(leadId: string): Promise<{ success: boolean; data?: Lead; error?: string }> {
    try {
      const result = await this.query();
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const lead = result.data.find(l => l.lead_id === leadId);
      
      if (!lead) {
        return { success: false, error: `Lead ${leadId} not found` };
      }

      return { success: true, data: lead };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update lead
   */
  async update(leadId: string, data: UpdateLeadRequest): Promise<UpdateResult> {
    try {
      // Get existing lead
      const existing = await this.getById(leadId);
      
      if (!existing.success) {
        return { success: false, error: existing.error };
      }

      // Update lead data
      const updatedLead: Lead = {
        ...existing.data!,
        ...data,
        updated_at: new Date().toISOString()
      };

      // Convert to CSV record
      const csvRecord = this.leadToCSVRecord(updatedLead);
      
      // Update in CSV
      const result = await this.csv.update(this.filename, [csvRecord], 'lead_id');
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: updatedLead };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Delete lead
   */
  async delete(leadId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.csv.delete(this.filename, [leadId], 'lead_id');
      
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
   * Get active leads
   */
  async getActive(): Promise<QueryResult<Lead>> {
    return this.query({ status: 'active' });
  }

  /**
   * Get leads by source
   */
  async getBySource(source: string): Promise<QueryResult<Lead>> {
    return this.query({ source });
  }

  /**
   * Get file stats
   */
  getStats(filename: string = this.filename) {
    return this.csv.getStats(filename);
  }

  /**
   * Convert Lead to CSV record
   */
  private leadToCSVRecord(lead: Lead): CSVRecord {
    return {
      lead_id: lead.lead_id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email || '',
      phone_e164: lead.phone_e164 || '',
      city: lead.city || '',
      province: lead.province || '',
      source: lead.source,
      tags: lead.tags ? JSON.stringify(lead.tags) : '[]',
      status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      metadata: lead.metadata ? JSON.stringify(lead.metadata) : '',
      last_contacted_at: lead.last_contacted_at || '',
      contact_count: lead.contact_count || 0
    };
  }

  /**
   * Convert CSV record to Lead
   */
  private csvRecordToLead(record: CSVRecord): Lead {
    return {
      lead_id: String(record.lead_id),
      first_name: String(record.first_name),
      last_name: String(record.last_name),
      email: record.email ? String(record.email) : undefined,
      phone_e164: record.phone_e164 ? String(record.phone_e164) : undefined,
      city: record.city ? String(record.city) : undefined,
      province: record.province ? String(record.province) : undefined,
      source: String(record.source),
      tags: record.tags ? JSON.parse(String(record.tags)) : [],
      status: record.status as Lead['status'],
      created_at: String(record.created_at),
      updated_at: String(record.updated_at),
      metadata: record.metadata ? JSON.parse(String(record.metadata)) : undefined,
      last_contacted_at: record.last_contacted_at ? String(record.last_contacted_at) : undefined,
      contact_count: record.contact_count ? Number(record.contact_count) : 0
    };
  }
}
