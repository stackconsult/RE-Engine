/**
 * NEON & SuperBase Integration Configuration
 * Solves the persistent storage and multi-user challenges for LLAMA + Fish API
 */

export interface NeonConfig {
  connectionString: string;
  database: string;
  poolSize: number;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export interface SuperBaseConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
  realtimeUrl: string;
  storageUrl: string;
}

export interface IntegrationConfig {
  neon: NeonConfig;
  supabase: SuperBaseConfig;
  features: {
    vectorSearch: boolean;
    realTimeCollaboration: boolean;
    persistentStorage: boolean;
    userAuthentication: boolean;
    fileStorage: boolean;
    semanticSearch: boolean;
  };
}

export const defaultIntegrationConfig: IntegrationConfig = {
  neon: {
    connectionString: process.env.NEON_CONNECTION_STRING || 'postgresql://localhost/reengine',
    database: process.env.NEON_DATABASE || 'reengine',
    poolSize: 20,
    maxConnections: 100,
    idleTimeout: 30000,
    connectionTimeout: 10000
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://localhost:8000',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    realtimeUrl: process.env.SUPABASE_REALTIME_URL || 'wss://localhost:8000/realtime',
    storageUrl: process.env.SUPABASE_STORAGE_URL || 'https://localhost:8000/storage/v1'
  },
  features: {
    vectorSearch: true,
    realTimeCollaboration: true,
    persistentStorage: true,
    userAuthentication: true,
    fileStorage: true,
    semanticSearch: true
  }
};

export const databaseSchema = {
  extensions: [
    'uuid-ossp',
    'pgvector',
    'postgis',
    'pg_trgm',
    'btree_gin'
  ],
  schemas: [
    'public',
    'real_estate',
    'workflows',
    'analytics',
    'auth'
  ],
  tables: {
    listings: `
      CREATE TABLE IF NOT EXISTS listings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        address TEXT NOT NULL,
        price NUMERIC,
        bedrooms INTEGER,
        bathrooms INTEGER,
        sqft INTEGER,
        year_built INTEGER,
        property_type TEXT,
        coordinates POINT,
        embedding vector(1536),
        metadata JSONB,
        images TEXT[],
        description TEXT,
        listing_url TEXT,
        source TEXT,
        scraped_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX idx_listings_embedding ON listings USING ivfflat (embedding vector_cosine_ops);
      CREATE INDEX idx_listings_coordinates ON listings USING gist (coordinates);
      CREATE INDEX idx_listings_price ON listings (price);
      CREATE INDEX idx_listings_property_type ON listings (property_type);
      CREATE INDEX idx_listings_metadata ON listings USING gin (metadata);
    `,
    
    market_insights: `
      CREATE TABLE IF NOT EXISTS market_insights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        location TEXT NOT NULL,
        insight_type TEXT,
        confidence_score FLOAT,
        ai_model_used TEXT,
        raw_response JSONB,
        processed_insights JSONB,
        embedding vector(1536),
        workflow_id UUID REFERENCES user_workflows(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX idx_market_insights_embedding ON market_insights USING ivfflat (embedding vector_cosine_ops);
      CREATE INDEX idx_market_insights_location ON market_insights (location);
      CREATE INDEX idx_market_insights_type ON market_insights (insight_type);
    `,
    
    user_workflows: `
      CREATE TABLE IF NOT EXISTS user_workflows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id),
        workflow_type TEXT,
        status TEXT DEFAULT 'pending',
        input_data JSONB,
        results JSONB,
        shared_with UUID[] DEFAULT '{}',
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      
      CREATE INDEX idx_user_workflows_user_id ON user_workflows (user_id);
      CREATE INDEX idx_user_workflows_status ON user_workflows (status);
      CREATE INDEX idx_user_workflows_shared_with ON user_workflows USING gin (shared_with);
    `,
    
    scraping_sessions: `
      CREATE TABLE IF NOT EXISTS scraping_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id),
        source_url TEXT,
        status TEXT DEFAULT 'queued',
        progress INTEGER DEFAULT 0,
        results JSONB,
        error_message TEXT,
        metadata JSONB,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      
      CREATE INDEX idx_scraping_sessions_user_id ON scraping_sessions (user_id);
      CREATE INDEX idx_scraping_sessions_status ON scraping_sessions (status);
    `,
    
    market_alerts: `
      CREATE TABLE IF NOT EXISTS market_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id),
        watch_id UUID REFERENCES market_watches(id),
        listing_id UUID REFERENCES listings(id),
        alert_type TEXT,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX idx_market_alerts_user_id ON market_alerts (user_id);
      CREATE INDEX idx_market_alerts_watch_id ON market_alerts (watch_id);
      CREATE INDEX idx_market_alerts_is_read ON market_alerts (is_read);
    `,
    
    market_watches: `
      CREATE TABLE IF NOT EXISTS market_watches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id),
        name TEXT NOT NULL,
        criteria JSONB,
        status TEXT DEFAULT 'active',
        last_checked TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX idx_market_watches_user_id ON market_watches (user_id);
      CREATE INDEX idx_market_watches_status ON market_watches (status);
    `
  },
  
  functions: {
    update_timestamp: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `,
    
    generate_embedding: `
      CREATE OR REPLACE FUNCTION generate_listing_embedding()
      RETURNS TRIGGER AS $$
      BEGIN
        -- This would call the LLAMA embedding service
        -- For now, we'll generate a placeholder embedding
        NEW.embedding = array_fill(0.0, ARRAY[1536])::vector(1536);
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `,
    
    calculate_similarity: `
      CREATE OR REPLACE FUNCTION calculate_property_similarity(
        listing1 vector(1536),
        listing2 vector(1536)
      ) RETURNS FLOAT AS $$
      BEGIN
        RETURN 1 - (listing1 <=> listing2);
      END;
      $$ language 'plpgsql';
    `
  },
  
  triggers: {
    update_listings_timestamp: `
      CREATE TRIGGER update_listings_updated_at
        BEFORE UPDATE ON listings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `,
    
    update_workflows_timestamp: `
      CREATE TRIGGER update_workflows_updated_at
        BEFORE UPDATE ON user_workflows
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `,
    
    generate_listing_embedding: `
      CREATE TRIGGER generate_listing_embedding_trigger
        BEFORE INSERT OR UPDATE ON listings
        FOR EACH ROW
        EXECUTE FUNCTION generate_listing_embedding();
    `
  }
};

export const storageConfiguration = {
  buckets: {
    'listing-images': {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      transformations: true
    },
    'documents': {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['application/pdf', 'text/plain', 'application/json']
    },
    'exports': {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['application/json', 'text/csv', 'application/vnd.ms-excel']
    }
  },
  
  policies: {
    listingImages: `
      POLICY "Users can upload listing images" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'listing-images' AND
          auth.role() = 'authenticated'
        );
      
      POLICY "Users can view their listing images" ON storage.objects
        FOR SELECT USING (
          bucket_id = 'listing-images' AND
          auth.role() = 'authenticated'
        );
      
      POLICY "Users can update their listing images" ON storage.objects
        FOR UPDATE USING (
          bucket_id = 'listing-images' AND
          auth.role() = 'authenticated'
        );
      
      POLICY "Users can delete their listing images" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'listing-images' AND
          auth.role() = 'authenticated'
        );
    `,
    
    documents: `
      POLICY "Users can manage their documents" ON storage.objects
        FOR ALL USING (
          bucket_id = 'documents' AND
          auth.role() = 'authenticated'
        );
    `,
    
    exports: `
      POLICY "Users can manage their exports" ON storage.objects
        FOR ALL USING (
          bucket_id = 'exports' AND
          auth.role() = 'authenticated'
        );
    `
  }
};

export const realtimeChannels = {
  workflows: {
    name: 'workflows',
    events: ['progress_update', 'status_change', 'completion', 'error'],
    authorization: 'user_can_access_workflow'
  },
  
  collaboration: {
    name: 'collaboration',
    events: ['user_joined', 'user_left', 'cursor_move', 'selection_change'],
    authorization: 'user_can_collaborate'
  },
  
  alerts: {
    name: 'alerts',
    events: ['new_alert', 'alert_read', 'alert_deleted'],
    authorization: 'user_owns_alert'
  },
  
  market_updates: {
    name: 'market_updates',
    events: ['new_listing', 'price_change', 'market_trend'],
    authorization: 'user_subscribed_to_market'
  }
};

export const apiRateLimits = {
  scraping: {
    requests: 100,
    window: '1m',
    burst: 10
  },
  
  analysis: {
    requests: 50,
    window: '1m',
    burst: 5
  },
  
  search: {
    requests: 200,
    window: '1m',
    burst: 20
  },
  
  uploads: {
    requests: 20,
    window: '1m',
    burst: 5
  }
};

export const monitoringMetrics = {
  database: [
    'connection_count',
    'query_duration',
    'cache_hit_ratio',
    'deadlock_count',
    'transaction_duration'
  ],
  
  application: [
    'scraping_success_rate',
    'analysis_accuracy',
    'user_session_duration',
    'collaboration_events',
    'search_response_time'
  ],
  
  business: [
    'active_users',
    'workflows_completed',
    'data_volume_processed',
    'api_requests_served',
    'storage_utilization'
  ]
};
