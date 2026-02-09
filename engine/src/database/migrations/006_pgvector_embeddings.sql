-- Phase 6.6: Enable pgvector and add embedding columns
-- Run this migration on your Neon PostgreSQL database

-- Step 1: Enable the pgvector extension (Neon supports this natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 3: Add preference_embedding column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preference_embedding vector(1536);

-- Step 4: Create index for efficient similarity search on properties
-- Using IVFFlat index for cosine distance operations
-- Note: You should have at least a few hundred rows before creating this index
CREATE INDEX IF NOT EXISTS idx_properties_embedding 
ON properties USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Step 5: Create index for lead preference embeddings
CREATE INDEX IF NOT EXISTS idx_leads_preference_embedding 
ON leads USING ivfflat (preference_embedding vector_cosine_ops) 
WITH (lists = 50);

-- Verification queries
-- Check pgvector is enabled:
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check columns exist:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'properties' AND column_name = 'embedding';

-- Test vector similarity (once you have data):
-- SELECT property_id, 
--        1 - (embedding <=> '[...]'::vector) AS similarity
-- FROM properties
-- WHERE embedding IS NOT NULL
-- ORDER BY embedding <=> '[...]'::vector
-- LIMIT 10;
