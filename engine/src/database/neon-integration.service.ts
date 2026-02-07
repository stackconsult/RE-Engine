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
  contacts: {
    id: string;
    channel: string;
    identifier: string;
    display_name: string;
    verified: boolean;
    created_at: Date;
    updated_at: Date;
    metadata: Record<string, any>;
  };
  icp_profiles: {
    id: string;
    name: string;
    description: string;
    criteria_locations: string[];
    criteria_investment: Record<string, any>;
    criteria_professional: Record<string, any>;
    criteria_behavior: Record<string, any>;
    criteria_platforms: string[];
    settings_maxLeadsPerDay: number;
    settings_discoveryFrequency: string;
    settings_confidenceThreshold: number;
    settings_excludeDuplicates: boolean;
    settings_enrichmentEnabled: boolean;
    created_at: Date;
    updated_at: Date;
  };
  identities: {
    id: string;
    platform: string;
    profile_url: string;
    auth_status: string;
    cookies: any;
    credentials: any;
    last_used: Date;
    created_at: Date;
    updated_at: Date;
    metadata: Record<string, any>;
  };
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
    rejection_reason?: string;
    metadata: Record<string, any>;
  };
  events: {
    id: string;
    lead_id?: string;
    type: string;
    source: string;
    content: string;
    data: any;
    direction?: 'in' | 'out';
    timestamp: Date;
    agent_id?: string;
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
      -- Contacts table
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel VARCHAR(50) NOT NULL,
        identifier VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );

      -- ICP Profiles table
      CREATE TABLE IF NOT EXISTS icp_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        criteria_locations TEXT[],
        criteria_investment JSONB DEFAULT '{}',
        criteria_professional JSONB DEFAULT '{}',
        criteria_behavior JSONB DEFAULT '{}',
        criteria_platforms TEXT[],
        settings_maxLeadsPerDay INTEGER DEFAULT 10,
        settings_discoveryFrequency VARCHAR(50) DEFAULT 'daily',
        settings_confidenceThreshold DECIMAL(3,2) DEFAULT 0.70,
        settings_excludeDuplicates BOOLEAN DEFAULT TRUE,
        settings_enrichmentEnabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Identities table
      CREATE TABLE IF NOT EXISTS identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL,
        profile_url TEXT,
        auth_status VARCHAR(50) DEFAULT 'unauthenticated',
        cookies JSONB DEFAULT '{}',
        credentials JSONB DEFAULT '{}',
        last_used TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );

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
        rejection_reason TEXT,
        metadata JSONB DEFAULT '{}'
      );

      -- Events table
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        source VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        direction VARCHAR(3),
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
      CREATE INDEX IF NOT EXISTS idx_contacts_identifier ON contacts(identifier);
      CREATE INDEX IF NOT EXISTS idx_identities_platform ON identities(platform);

      -- Triggers for updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leads_updated_at') THEN
              CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_agents_updated_at') THEN
              CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
              CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_icp_profiles_updated_at') THEN
              CREATE TRIGGER update_icp_profiles_updated_at BEFORE UPDATE ON icp_profiles
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_identities_updated_at') THEN
              CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END $$;
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
  async createApproval(approval: Omit<DatabaseSchema['approvals'], 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const query = `
      INSERT INTO approvals (lead_id, type, content, channel, status, ai_score, 
                           reviewed_by, reviewed_at, rejection_reason, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const values = [
      approval.lead_id, approval.type, approval.content, approval.channel,
      approval.status, approval.ai_score, approval.reviewed_by,
      approval.reviewed_at, approval.rejection_reason, JSON.stringify(approval.metadata)
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
  async createEvent(event: Omit<DatabaseSchema['events'], 'id'>): Promise<string> {
    const query = `
      INSERT INTO events (lead_id, type, source, content, data, direction, timestamp, agent_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      event.lead_id, event.type, event.source, event.content,
      JSON.stringify(event.data), event.direction, event.timestamp,
      event.agent_id, JSON.stringify(event.metadata)
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
  // Contact operations
  async createContact(contact: Omit<DatabaseSchema['contacts'], 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const query = `
      INSERT INTO contacts (channel, identifier, display_name, verified, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const values = [
      contact.channel, contact.identifier, contact.display_name,
      contact.verified, JSON.stringify(contact.metadata)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  // ICP Profile operations
  async createICPProfile(profile: Omit<DatabaseSchema['icp_profiles'], 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const query = `
      INSERT INTO icp_profiles (name, description, criteria_locations, criteria_investment, 
                              criteria_professional, criteria_behavior, criteria_platforms,
                              settings_maxLeadsPerDay, settings_discoveryFrequency, 
                              settings_confidenceThreshold, settings_excludeDuplicates, 
                              settings_enrichmentEnabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;

    const values = [
      profile.name, profile.description, profile.criteria_locations,
      JSON.stringify(profile.criteria_investment), JSON.stringify(profile.criteria_professional),
      JSON.stringify(profile.criteria_behavior), profile.criteria_platforms,
      profile.settings_maxLeadsPerDay, profile.settings_discoveryFrequency,
      profile.settings_confidenceThreshold, profile.settings_excludeDuplicates,
      profile.settings_enrichmentEnabled
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  // Identity operations
  async createIdentity(identity: Omit<DatabaseSchema['identities'], 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const query = `
      INSERT INTO identities (platform, profile_url, auth_status, cookies, credentials, last_used, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [
      identity.platform, identity.profile_url, identity.auth_status,
      JSON.stringify(identity.cookies), JSON.stringify(identity.credentials),
      identity.last_used, JSON.stringify(identity.metadata)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
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
    contacts?: any[];
    icp_profiles?: any[];
    identities?: any[];
  }): Promise<{ migrated: number; errors: string[] }> {
    const errors: string[] = [];
    let migrated = 0;

    try {
      // Migrate contacts
      if (csvData.contacts) {
        for (const contact of csvData.contacts) {
          try {
            await this.createContact({
              channel: contact.channel || 'whatsapp',
              identifier: contact.identifier || '',
              display_name: contact.display_name || '',
              verified: String(contact.verified).toLowerCase() === 'true',
              metadata: contact.metadata || {}
            });
            migrated++;
          } catch (error) {
            errors.push(`Failed to migrate contact ${contact.identifier}: ${error}`);
          }
        }
      }

      // Migrate ICP profiles
      if (csvData.icp_profiles) {
        for (const profile of csvData.icp_profiles) {
          try {
            await this.createICPProfile({
              name: profile.name || '',
              description: profile.description || '',
              criteria_locations: profile.criteria_locations || [],
              criteria_investment: profile.criteria_investment || {},
              criteria_professional: profile.criteria_professional || {},
              criteria_behavior: profile.criteria_behavior || {},
              criteria_platforms: profile.criteria_platforms || [],
              settings_maxLeadsPerDay: parseInt(profile.settings_maxLeadsPerDay) || 10,
              settings_discoveryFrequency: profile.settings_discoveryFrequency || 'daily',
              settings_confidenceThreshold: parseFloat(profile.settings_confidenceThreshold) || 0.70,
              settings_excludeDuplicates: String(profile.settings_excludeDuplicates).toLowerCase() !== 'false',
              settings_enrichmentEnabled: String(profile.settings_enrichmentEnabled).toLowerCase() !== 'false'
            });
            migrated++;
          } catch (error) {
            errors.push(`Failed to migrate ICP profile ${profile.name}: ${error}`);
          }
        }
      }

      // Migrate identities
      if (csvData.identities) {
        for (const identity of csvData.identities) {
          try {
            await this.createIdentity({
              platform: identity.platform || '',
              profile_url: identity.profile_url || '',
              auth_status: identity.auth_status || 'unauthenticated',
              cookies: identity.cookies || {},
              credentials: identity.credentials || {},
              last_used: identity.last_used ? new Date(identity.last_used) : null,
              metadata: identity.metadata || {}
            });
            migrated++;
          } catch (error) {
            errors.push(`Failed to migrate identity ${identity.platform}: ${error}`);
          }
        }
      }

      // Migrate leads
      for (const lead of csvData.leads) {
        try {
          await this.createLead({
            first_name: lead.first_name || lead.name?.split(' ')[0] || '',
            last_name: lead.last_name || lead.name?.split(' ').slice(1).join(' ') || '',
            email: lead.email || null,
            phone: lead.phone || lead.phone_e164 || null,
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
          errors.push(`Failed to migrate lead ${lead.email || lead.lead_id}: ${error}`);
        }
      }

      // Migrate approvals
      if (csvData.approvals) {
        for (const approval of csvData.approvals) {
          try {
            await this.createApproval({
              lead_id: approval.lead_id,
              type: approval.type || 'message',
              content: approval.content || approval.draft_content || '',
              channel: approval.channel || 'whatsapp',
              status: approval.status || 'pending',
              ai_score: parseFloat(approval.ai_score) || 0,
              reviewed_by: approval.reviewed_by || approval.approved_by || null,
              reviewed_at: (approval.reviewed_at || approval.approved_at) ? new Date(approval.reviewed_at || approval.approved_at) : null,
              rejection_reason: approval.rejection_reason || null,
              metadata: approval.metadata || {}
            });
            migrated++;
          } catch (error) {
            errors.push(`Failed to migrate approval ${approval.id || approval.approval_id}: ${error}`);
          }
        }
      }

      // Migrate events
      if (csvData.events) {
        for (const event of csvData.events) {
          try {
            await this.createEvent({
              lead_id: event.lead_id || null,
              type: event.type || event.event_type || 'inbound',
              source: event.source || 'csv_import',
              content: event.content || '',
              data: event.data || {},
              direction: event.direction || null,
              timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
              agent_id: event.agent_id || null,
              metadata: event.metadata || {}
            });
            migrated++;
          } catch (error) {
            errors.push(`Failed to migrate event ${event.id || event.event_id}: ${error}`);
          }
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
