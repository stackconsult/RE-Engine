/**
 * Neon PostgreSQL Integration Service
 * Advanced database integration for Phase 6 - upgrading from CSV to PostgreSQL
 */

import { Pool } from 'pg';
import { Logger } from '../utils/logger';

export interface NeonConfig {
  connectionString: string;
  pooledConnectionString: string;
  maxConnections: number;
  ssl: boolean;
  applicationName: string;
}

export interface DatabaseSchema {
  leads: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    property_address: string;
    city: string;
    province: string;
    postal_code: string;
    property_type: string;
    price_range: string;
    timeline: string;
    source: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed';
    assigned_agent: string;
    created_at: Date;
    updated_at: Date;
    metadata: Record<string, any>;
  };
  approvals: {
    id: string;
    lead_id: string;
    type: 'message' | 'email' | 'call' | 'meeting';
    content: string;
    channel: 'whatsapp' | 'email' | 'sms' | 'phone' | 'voice' | 'video';
    status: 'pending' | 'approved' | 'rejected' | 'sent';
    ai_score: number;
    reviewed_by: string;
    reviewed_at: Date;
    created_at: Date;
    metadata: Record<string, any>;
  };
  events: {
    id: string;
    lead_id: string;
    type: 'inbound' | 'outbound' | 'internal';
    channel: string;
    content: string;
    direction: 'in' | 'out';
    timestamp: Date;
    agent_id: string;
    metadata: Record<string, any>;
  };
  agents: {
    id: string;
    name: string;
    email: string;
    phone: string;
    license_number: string;
    brokerage: string;
    specialties: string[];
    active_leads: number;
    conversion_rate: number;
    status: 'active' | 'inactive';
    created_at: Date;
    updated_at: Date;
  };
}

export class NeonIntegrationService {
  private pool: Pool;
  private pooledPool: Pool;
  private logger: Logger;
  private config: NeonConfig;

  constructor(config: NeonConfig) {
    this.config = config;
    this.logger = new Logger('NeonIntegration', true);

    // Primary connection pool
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.maxConnections,
      ssl: config.ssl,
      application_name: config.applicationName,
    });

    // Pooled connection pool for high-frequency operations
    this.pooledPool = new Pool({
      connectionString: config.pooledConnectionString,
      max: config.maxConnections * 2,
      ssl: config.ssl,
      application_name: `${config.applicationName}-pooled`,
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Neon PostgreSQL integration...');

    try {
      // Test connections
      await this.pool.query('SELECT 1');
      await this.pooledPool.query('SELECT 1');

      // Create schema if not exists
      await this.createSchema();

      this.logger.info('Neon PostgreSQL integration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Neon integration', error);
      throw error;
    }
  }

  private async createSchema(): Promise<void> {
    this.logger.info('Creating database schema...');

    const schema = `
      -- Leads table
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        property_address TEXT,
        city VARCHAR(100),
        province VARCHAR(50),
        postal_code VARCHAR(10),
        property_type VARCHAR(50),
        price_range VARCHAR(50),
        timeline VARCHAR(50),
        source VARCHAR(100),
        status VARCHAR(20) DEFAULT 'new',
        assigned_agent UUID REFERENCES agents(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );

      -- Approvals table
      CREATE TABLE IF NOT EXISTS approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        ai_score DECIMAL(3,2) DEFAULT 0.00,
        reviewed_by VARCHAR(100),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );

      -- Events table
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        direction VARCHAR(3) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        agent_id UUID REFERENCES agents(id),
        metadata JSONB DEFAULT '{}'
      );

      -- Agents table
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        license_number VARCHAR(50),
        brokerage VARCHAR(200),
        specialties TEXT[],
        active_leads INTEGER DEFAULT 0,
        conversion_rate DECIMAL(5,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON leads(assigned_agent);
      CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
      CREATE INDEX IF NOT EXISTS idx_approvals_lead_id ON approvals(lead_id);
      CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
      CREATE INDEX IF NOT EXISTS idx_events_lead_id ON events(lead_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);

      -- Triggers for updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await this.pool.query(schema);
    this.logger.info('Database schema created successfully');
  }

  // Lead operations
  async createLead(lead: Omit<DatabaseSchema['leads'], 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const query = `
      INSERT INTO leads (first_name, last_name, email, phone, property_address, city, province, 
                       postal_code, property_type, price_range, timeline, source, status, 
                       assigned_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `;

    const values = [
      lead.first_name, lead.last_name, lead.email, lead.phone, lead.property_address,
      lead.city, lead.province, lead.postal_code, lead.property_type, lead.price_range,
      lead.timeline, lead.source, lead.status, lead.assigned_agent, JSON.stringify(lead.metadata)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async getLead(id: string): Promise<DatabaseSchema['leads'] | null> {
    const query = 'SELECT * FROM leads WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateLead(id: string, updates: Partial<DatabaseSchema['leads']>): Promise<boolean> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    if (fields.length === 0) return false;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...fields.map(field => {
      const value = updates[field as keyof DatabaseSchema['leads']];
      return field === 'metadata' ? JSON.stringify(value) : value;
    })];

    const query = `UPDATE leads SET ${setClause} WHERE id = $1`;
    const result = await this.pool.query(query, values);
    return result.rowCount > 0;
  }

  async searchLeads(criteria: {
    status?: string;
    assigned_agent?: string;
    city?: string;
    property_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<DatabaseSchema['leads'][]> {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (criteria.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(criteria.status);
    }
    if (criteria.assigned_agent) {
      query += ` AND assigned_agent = $${paramIndex++}`;
      values.push(criteria.assigned_agent);
    }
    if (criteria.city) {
      query += ` AND city ILIKE $${paramIndex++}`;
      values.push(`%${criteria.city}%`);
    }
    if (criteria.property_type) {
      query += ` AND property_type = $${paramIndex++}`;
      values.push(criteria.property_type);
    }

    query += ' ORDER BY created_at DESC';

    if (criteria.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(criteria.limit);
    }

    if (criteria.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(criteria.offset);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  // Approval operations
  async createApproval(approval: Omit<DatabaseSchema['approvals'], 'id' | 'created_at'>): Promise<string> {
    const query = `
      INSERT INTO approvals (lead_id, type, content, channel, status, ai_score, 
                           reviewed_by, reviewed_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      approval.lead_id, approval.type, approval.content, approval.channel,
      approval.status, approval.ai_score, approval.reviewed_by,
      approval.reviewed_at, JSON.stringify(approval.metadata)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async getPendingApprovals(): Promise<DatabaseSchema['approvals'][]> {
    const query = `
      SELECT a.*, l.first_name, l.last_name, l.email 
      FROM approvals a 
      JOIN leads l ON a.lead_id = l.id 
      WHERE a.status = 'pending' 
      ORDER BY a.created_at ASC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async updateApprovalStatus(id: string, status: 'approved' | 'rejected', reviewedBy: string): Promise<boolean> {
    const query = `
      UPDATE approvals 
      SET status = $2, reviewed_by = $3, reviewed_at = NOW() 
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id, status, reviewedBy]);
    return result.rowCount > 0;
  }

  // Event operations
  async createEvent(event: Omit<DatabaseSchema['events'], 'id' | 'timestamp'>): Promise<string> {
    const query = `
      INSERT INTO events (lead_id, type, channel, content, direction, agent_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [
      event.lead_id, event.type, event.channel, event.content,
      event.direction, event.agent_id, JSON.stringify(event.metadata)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async getLeadEvents(leadId: string, limit: number = 50): Promise<DatabaseSchema['events'][]> {
    const query = `
      SELECT * FROM events 
      WHERE lead_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;

    const result = await this.pool.query(query, [leadId, limit]);
    return result.rows;
  }

  // Agent operations
  async createAgent(agent: Omit<DatabaseSchema['agents'], 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const query = `
      INSERT INTO agents (name, email, phone, license_number, brokerage, specialties, 
                         active_leads, conversion_rate, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      agent.name, agent.email, agent.phone, agent.license_number,
      agent.brokerage, agent.specialties, agent.active_leads,
      agent.conversion_rate, agent.status
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async getAgentByEmail(email: string): Promise<DatabaseSchema['agents'] | null> {
    const query = 'SELECT * FROM agents WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async updateAgentMetrics(id: string, activeLeads: number, conversionRate: number): Promise<boolean> {
    const query = `
      UPDATE agents 
      SET active_leads = $2, conversion_rate = $3, updated_at = NOW() 
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id, activeLeads, conversionRate]);
    return result.rowCount > 0;
  }

  // Analytics operations
  async getLeadMetrics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalLeads: number;
    newLeads: number;
    conversionRate: number;
    averageResponseTime: number;
    leadsByStatus: Record<string, number>;
    leadsBySource: Record<string, number>;
  }> {
    let timeFilter = '';
    switch (timeframe) {
      case 'day':
        timeFilter = "created_at >= NOW() - INTERVAL '1 day'";
        break;
      case 'week':
        timeFilter = "created_at >= NOW() - INTERVAL '1 week'";
        break;
      case 'month':
        timeFilter = "created_at >= NOW() - INTERVAL '1 month'";
        break;
    }

    const queries = {
      totalLeads: `SELECT COUNT(*) as count FROM leads WHERE ${timeFilter}`,
      newLeads: `SELECT COUNT(*) as count FROM leads WHERE status = 'new' AND ${timeFilter}`,
      conversionRate: `
        SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 0 
            ELSE (COUNT(CASE WHEN status = 'converted' THEN 1 END) * 100.0 / COUNT(*)) 
          END as rate 
        FROM leads WHERE ${timeFilter}
      `,
      averageResponseTime: `
        SELECT AVG(EXTRACT(EPOCH FROM (e.timestamp - l.created_at))/3600) as avg_hours
        FROM leads l
        JOIN events e ON l.id = e.lead_id
        WHERE l.${timeFilter} AND e.type = 'outbound'
      `,
      leadsByStatus: `
        SELECT status, COUNT(*) as count 
        FROM leads 
        WHERE ${timeFilter}
        GROUP BY status
      `,
      leadsBySource: `
        SELECT source, COUNT(*) as count 
        FROM leads 
        WHERE ${timeFilter}
        GROUP BY source
      `
    };

    const results = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const result = await this.pool.query(query);
        return [key, result.rows];
      })
    );

    const data = Object.fromEntries(results);

    return {
      totalLeads: parseInt(data.totalLeads[0]?.count || '0'),
      newLeads: parseInt(data.newLeads[0]?.count || '0'),
      conversionRate: parseFloat(data.conversionRate[0]?.rate || '0'),
      averageResponseTime: parseFloat(data.averageResponseTime[0]?.avg_hours || '0'),
      leadsByStatus: Object.fromEntries(data.leadsByStatus.map(row => [row.status, parseInt(row.count)])),
      leadsBySource: Object.fromEntries(data.leadsBySource.map(row => [row.source, parseInt(row.count)]))
    };
  }

  // Migration utilities
  async migrateFromCSV(csvData: {
    leads: any[];
    approvals: any[];
    events: any[];
  }): Promise<{ migrated: number; errors: string[] }> {
    const errors: string[] = [];
    let migrated = 0;

    try {
      // Migrate leads
      for (const lead of csvData.leads) {
        try {
          await this.createLead({
            first_name: lead.first_name || '',
            last_name: lead.last_name || '',
            email: lead.email || null,
            phone: lead.phone || null,
            property_address: lead.property_address || null,
            city: lead.city || null,
            province: lead.province || null,
            postal_code: lead.postal_code || null,
            property_type: lead.property_type || null,
            price_range: lead.price_range || null,
            timeline: lead.timeline || null,
            source: lead.source || 'csv_import',
            status: lead.status || 'new',
            assigned_agent: lead.assigned_agent || null,
            metadata: lead.metadata || {}
          });
          migrated++;
        } catch (error) {
          errors.push(`Failed to migrate lead ${lead.email}: ${error}`);
        }
      }

      // Migrate approvals
      for (const approval of csvData.approvals) {
        try {
          await this.createApproval({
            lead_id: approval.lead_id,
            type: approval.type || 'message',
            content: approval.content || '',
            channel: approval.channel || 'whatsapp',
            status: approval.status || 'pending',
            ai_score: parseFloat(approval.ai_score) || 0,
            reviewed_by: approval.reviewed_by || null,
            reviewed_at: approval.reviewed_at ? new Date(approval.reviewed_at) : null,
            metadata: approval.metadata || {}
          });
          migrated++;
        } catch (error) {
          errors.push(`Failed to migrate approval ${approval.id}: ${error}`);
        }
      }

      // Migrate events
      for (const event of csvData.events) {
        try {
          await this.createEvent({
            lead_id: event.lead_id,
            type: event.type || 'inbound',
            channel: event.channel || 'whatsapp',
            content: event.content || '',
            direction: event.direction || 'in',
            agent_id: event.agent_id || null,
            metadata: event.metadata || {}
          });
          migrated++;
        } catch (error) {
          errors.push(`Failed to migrate event ${event.id}: ${error}`);
        }
      }

    } catch (error) {
      errors.push(`Migration failed: ${error}`);
    }

    this.logger.info(`Migration completed: ${migrated} records migrated, ${errors.length} errors`);

    return { migrated, errors };
  }

  async close(): Promise<void> {
    await this.pool.end();
    await this.pooledPool.end();
    this.logger.info('Neon PostgreSQL connections closed');
  }
}
