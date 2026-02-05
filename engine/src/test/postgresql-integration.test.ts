/**
 * PostgreSQL/Neon Integration Test
 * Phase 6 Database Integration Validation
 */

import { Pool } from 'pg';
import { Logger } from '../utils/logger';

// Test configuration - would come from environment in production
const TEST_CONFIG = {
  neon: {
    connectionString: process.env.NEON_DATABASE_URL || 'postgresql://test:test@localhost:5432/reengine_test',
    pooledConnectionString: process.env.NEON_POOLED_URL || 'postgresql://test:test@localhost:5432/reengine_test?pgbouncer=true',
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:8000',
    anonKey: process.env.SUPABASE_ANON_KEY || 'test-key',
  },
};

// Memory recall cache implementation
class MemoryRecallCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 1000;
  private defaultTtl = 300000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTtl): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Memory recall - get related data
  async recallRelated(leadId: string): Promise<{
    lead: any;
    approvals: any[];
    events: any[];
  }> {
    const lead = this.get(`lead:${leadId}`);
    const approvals = this.get(`approvals:${leadId}`) || [];
    const events = this.get(`events:${leadId}`) || [];

    return {
      lead,
      approvals,
      events,
    };
  }

  // Preload frequently accessed data
  async preloadHotData(pool: Pool): Promise<void> {
    try {
      const client = await pool.connect();
      
      // Preload recent leads
      const recentLeads = await client.query(`
        SELECT id, first_name, last_name, email, status, assigned_agent 
        FROM leads 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC 
        LIMIT 50
      `);

      recentLeads.rows.forEach(lead => {
        this.set(`lead:${lead.id}`, lead);
      });

      client.release();
      console.log(`Preloaded ${recentLeads.rows.length} recent leads into cache`);
    } catch (error) {
      console.error('Failed to preload hot data:', error);
    }
  }
}

// Database schema for testing
const SCHEMA_SQL = `
-- Drop tables if they exist (for testing)
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Agents table
CREATE TABLE agents (
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

-- Leads table
CREATE TABLE leads (
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
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approvals table
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    ai_score DECIMAL(3,2) DEFAULT 0.00,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
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

-- Performance indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_agent ON leads(assigned_agent);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_metadata_gin ON leads USING GIN(metadata);

CREATE INDEX idx_approvals_lead_id ON approvals(lead_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_created_at ON approvals(created_at);

CREATE INDEX idx_events_lead_id ON events(lead_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_type ON events(type);

-- Trigger for updated_at
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

// Test data for validation
const TEST_DATA = {
  agents: [
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@realestate.com',
      phone: '416-555-0123',
      license_number: 'ON-12345',
      brokerage: 'Royal LePage',
      specialties: ['luxury', 'downtown', 'condos'],
    },
    {
      name: 'Mike Chen',
      email: 'mike.chen@realestate.com',
      phone: '416-555-0124',
      license_number: 'ON-67890',
      brokerage: 'RE/MAX',
      specialties: ['family', 'suburban', 'houses'],
    },
  ],
  leads: [
    {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@email.com',
      phone: '416-555-0145',
      property_address: '123 Main St',
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M5V 2T6',
      property_type: 'Condo',
      price_range: '500k-750k',
      timeline: 'within-month',
      source: 'website',
      status: 'new',
      metadata: { budget: 600000, bedrooms: 2, move_date: '2024-03-01' },
    },
    {
      first_name: 'Emily',
      last_name: 'Davis',
      email: 'emily.davis@email.com',
      phone: '416-555-0146',
      property_address: '456 Oak Ave',
      city: 'Vancouver',
      province: 'BC',
      postal_code: 'V6B 1M4',
      property_type: 'House',
      price_range: '750k-1M',
      timeline: 'flexible',
      source: 'referral',
      status: 'contacted',
      metadata: { budget: 850000, bedrooms: 3, pets: true },
    },
  ],
};

// Integration test class
class PostgreSQLIntegrationTest {
  private pool: Pool;
  private cache: MemoryRecallCache;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PostgreSQLIntegrationTest', true);
    this.cache = new MemoryRecallCache();
    
    // Setup connection pool with production-like configuration
    this.pool = new Pool({
      connectionString: TEST_CONFIG.neon.connectionString,
      max: 20,        // Maximum connections
      min: 5,         // Minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: {
        rejectUnauthorized: false, // For testing
      },
    });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing PostgreSQL integration test...');
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.logger.info('Database connection successful');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async setupSchema(): Promise<void> {
    try {
      this.logger.info('Setting up database schema...');
      
      const client = await this.pool.connect();
      await client.query(SCHEMA_SQL);
      client.release();
      
      this.logger.info('Database schema created successfully');
    } catch (error) {
      this.logger.error('Failed to setup schema', error);
      throw error;
    }
  }

  async testBasicCRUD(): Promise<void> {
    try {
      this.logger.info('Testing basic CRUD operations...');
      
      const client = await this.pool.connect();
      
      // Test agent creation
      const agentResult = await client.query(`
        INSERT INTO agents (name, email, phone, license_number, brokerage, specialties)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, email, created_at
      `, [
        TEST_DATA.agents[0].name,
        TEST_DATA.agents[0].email,
        TEST_DATA.agents[0].phone,
        TEST_DATA.agents[0].license_number,
        TEST_DATA.agents[0].brokerage,
        TEST_DATA.agents[0].specialties,
      ]);
      
      const agent = agentResult.rows[0];
      this.logger.info('Agent created:', { id: agent.id, name: agent.name });
      
      // Test lead creation
      const leadResult = await client.query(`
        INSERT INTO leads (first_name, last_name, email, phone, property_address, city, province, 
                          postal_code, property_type, price_range, timeline, source, status, assigned_agent, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, first_name, last_name, email, status, created_at
      `, [
        TEST_DATA.leads[0].first_name,
        TEST_DATA.leads[0].last_name,
        TEST_DATA.leads[0].email,
        TEST_DATA.leads[0].phone,
        TEST_DATA.leads[0].property_address,
        TEST_DATA.leads[0].city,
        TEST_DATA.leads[0].province,
        TEST_DATA.leads[0].postal_code,
        TEST_DATA.leads[0].property_type,
        TEST_DATA.leads[0].price_range,
        TEST_DATA.leads[0].timeline,
        TEST_DATA.leads[0].source,
        TEST_DATA.leads[0].status,
        agent.id,
        JSON.stringify(TEST_DATA.leads[0].metadata),
      ]);
      
      const lead = leadResult.rows[0];
      this.logger.info('Lead created:', { id: lead.id, name: `${lead.first_name} ${lead.last_name}` });
      
      // Test approval creation
      const approvalResult = await client.query(`
        INSERT INTO approvals (lead_id, type, content, channel, status, ai_score, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, type, status, created_at
      `, [
        lead.id,
        'message',
        'Welcome message for new lead',
        'whatsapp',
        'pending',
        0.85,
        JSON.stringify({ priority: 'high', template: 'welcome' }),
      ]);
      
      const approval = approvalResult.rows[0];
      this.logger.info('Approval created:', { id: approval.id, type: approval.type });
      
      // Test event creation
      const eventResult = await client.query(`
        INSERT INTO events (lead_id, type, channel, content, direction, agent_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, type, timestamp
      `, [
        lead.id,
        'inbound',
        'website',
        'Lead submitted contact form',
        'in',
        agent.id,
        JSON.stringify({ source: 'landing_page', utm_campaign: 'spring_sale' }),
      ]);
      
      const event = eventResult.rows[0];
      this.logger.info('Event created:', { id: event.id, type: event.type });
      
      client.release();
      this.logger.info('Basic CRUD operations test completed successfully');
    } catch (error) {
      this.logger.error('CRUD operations test failed', error);
      throw error;
    }
  }

  async testMemoryRecall(): Promise<void> {
    try {
      this.logger.info('Testing memory recall system...');
      
      const client = await this.pool.connect();
      
      // Get some test data
      const leadsResult = await client.query(`
        SELECT id, first_name, last_name, email, status, assigned_agent 
        FROM leads 
        LIMIT 5
      `);
      
      // Store in cache
      leadsResult.rows.forEach(lead => {
        this.cache.set(`lead:${lead.id}`, lead);
      });
      
      // Test cache retrieval
      const cachedLead = this.cache.get(`lead:${leadsResult.rows[0].id}`);
      if (cachedLead) {
        this.logger.info('Cache hit successful:', { leadId: cachedLead.id });
      } else {
        throw new Error('Cache retrieval failed');
      }
      
      // Test cache expiration
      this.cache.set('test:expire', 'test-data', 100); // 100ms TTL
      await new Promise(resolve => setTimeout(resolve, 150));
      const expiredData = this.cache.get('test:expire');
      if (expiredData === null) {
        this.logger.info('Cache expiration working correctly');
      } else {
        throw new Error('Cache expiration failed');
      }
      
      // Test memory recall - related data
      const approvalsResult = await client.query(`
        SELECT * FROM approvals WHERE lead_id = $1
      `, [leadsResult.rows[0].id]);
      
      const eventsResult = await client.query(`
        SELECT * FROM events WHERE lead_id = $1
      `, [leadsResult.rows[0].id]);
      
      this.cache.set(`approvals:${leadsResult.rows[0].id}`, approvalsResult.rows);
      this.cache.set(`events:${leadsResult.rows[0].id}`, eventsResult.rows);
      
      const relatedData = await this.cache.recallRelated(leadsResult.rows[0].id);
      
      this.logger.info('Memory recall test:', {
        lead: relatedData.lead ? 'found' : 'missing',
        approvals: relatedData.approvals.length,
        events: relatedData.events.length,
      });
      
      client.release();
      this.logger.info('Memory recall system test completed successfully');
    } catch (error) {
      this.logger.error('Memory recall test failed', error);
      throw error;
    }
  }

  async testPerformance(): Promise<void> {
    try {
      this.logger.info('Testing performance metrics...');
      
      const client = await this.pool.connect();
      
      // Test query performance
      const startTime = Date.now();
      
      await client.query(`
        SELECT l.*, a.name as agent_name 
        FROM leads l 
        LEFT JOIN agents a ON l.assigned_agent = a.id 
        WHERE l.status = 'new' 
        ORDER BY l.created_at DESC 
        LIMIT 10
      `);
      
      const queryTime = Date.now() - startTime;
      this.logger.info('Query performance:', { time: `${queryTime}ms` });
      
      // Test cache performance
      const cacheStartTime = Date.now();
      this.cache.set('performance:test', { data: 'test' });
      const cachedData = this.cache.get('performance:test');
      const cacheTime = Date.now() - cacheStartTime;
      
      this.logger.info('Cache performance:', { time: `${cacheTime}ms`, hit: cachedData ? 'success' : 'miss' });
      
      // Test connection pool
      const poolStartTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          this.pool.query('SELECT 1 as test').then(result => result.rows[0])
        );
      }
      
      await Promise.all(promises);
      const poolTime = Date.now() - poolStartTime;
      
      this.logger.info('Connection pool performance:', { 
        time: `${poolTime}ms`, 
        queries: 10,
        avgPerQuery: `${poolTime / 10}ms`
      });
      
      client.release();
      this.logger.info('Performance test completed successfully');
    } catch (error) {
      this.logger.error('Performance test failed', error);
      throw error;
    }
  }

  async testAnalytics(): Promise<void> {
    try {
      this.logger.info('Testing analytics queries...');
      
      const client = await this.pool.connect();
      
      // Lead analytics
      const leadMetrics = await client.query(`
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
          COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
          COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads
        FROM leads
      `);
      
      this.logger.info('Lead metrics:', leadMetrics.rows[0]);
      
      // Agent performance
      const agentMetrics = await client.query(`
        SELECT 
          a.name,
          a.email,
          COUNT(l.id) as total_leads,
          COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
          CASE 
            WHEN COUNT(l.id) = 0 THEN 0 
            ELSE (COUNT(CASE WHEN l.status = 'converted' THEN 1 END) * 100.0 / COUNT(l.id))
          END as conversion_rate
        FROM agents a
        LEFT JOIN leads l ON a.id = l.assigned_agent
        GROUP BY a.id, a.name, a.email
        ORDER BY conversions DESC
      `);
      
      this.logger.info('Agent performance:', agentMetrics.rows);
      
      // Time-based analytics
      const timeMetrics = await client.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as leads_created
        FROM leads
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `);
      
      this.logger.info('Daily lead creation:', timeMetrics.rows);
      
      client.release();
      this.logger.info('Analytics test completed successfully');
    } catch (error) {
      this.logger.error('Analytics test failed', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.logger.info('Cleaning up test data...');
      
      const client = await this.pool.connect();
      await client.query('DROP TABLE IF EXISTS events CASCADE');
      await client.query('DROP TABLE IF EXISTS approvals CASCADE');
      await client.query('DROP TABLE IF EXISTS leads CASCADE');
      await client.query('DROP TABLE IF EXISTS agents CASCADE');
      client.release();
      
      this.cache.clear();
      
      this.logger.info('Cleanup completed');
    } catch (error) {
      this.logger.error('Cleanup failed', error);
    }
  }

  async close(): Promise<void> {
    try {
      this.logger.info('Closing database connections...');
      await this.pool.end();
      this.logger.info('Database connections closed');
    } catch (error) {
      this.logger.error('Failed to close connections', error);
    }
  }
}

// Main test runner
async function runIntegrationTest(): Promise<void> {
  const test = new PostgreSQLIntegrationTest();
  
  try {
    console.log('🚀 Starting PostgreSQL/Neon Integration Test\n');
    
    // Initialize
    await test.initialize();
    console.log('✅ Database connection established');
    
    // Setup schema
    await test.setupSchema();
    console.log('✅ Database schema created');
    
    // Test CRUD operations
    await test.testBasicCRUD();
    console.log('✅ CRUD operations test passed');
    
    // Test memory recall
    await test.testMemoryRecall();
    console.log('✅ Memory recall test passed');
    
    // Test performance
    await test.testPerformance();
    console.log('✅ Performance test passed');
    
    // Test analytics
    await test.testAnalytics();
    console.log('✅ Analytics test passed');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('📊 PostgreSQL/Neon integration is ready for Phase 6');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await test.cleanup();
    await test.close();
  }
}

// Export for use in other modules
export { PostgreSQLIntegrationTest, MemoryRecallCache, runIntegrationTest };

// Run test if this file is executed directly
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}
