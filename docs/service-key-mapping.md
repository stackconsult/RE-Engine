# RE-Engine Service Key Configuration Mapping
# Generated: Thu Feb  5 01:55:00 MST 2026

## =============================================================================
# INTERNAL SERVICE KEYS (NEWLY GENERATED & HASHED)
# =============================================================================

### 1. ENGINE_API_KEY
# **Purpose**: Main RE-Engine API server authentication
# **Location**: engine/src/app.ts, engine/src/api/server.ts
# **Usage**: 
#   - JWT token generation endpoint (/auth/token)
#   - Protected API endpoints (/api/*)
#   - Service-to-service authentication
# **Generated Key**: 85b395096def72b7c13867842e4b23e8f3dd51fb4026071ee623e6319d1cc9b0
# **Bcrypt Hash**: $2b$12$zd8mtppdnsI1lV4BbHykIu0p0CsVRL/E8a5WtubPorFnlJbcBqR8a

### 2. BROWSER_API_KEY
# **Purpose**: Browser MCP server authentication
# **Location**: mcp/reengine-browser/src/index.ts
# **Usage**:
#   - Browser automation API calls
#   - Playwright session management
#   - Screenshot and scraping operations
# **Generated Key**: 1dc0f0656ba2f6174c29ff6c98d01a713f404b22248dfb5d35d95243e9333fc9
# **Bcrypt Hash**: $2b$12$RCwjASdWz5DYD.qu7rkzs.z8bhcS2YYDulSnhTj1Vj.aQHdxDvK3a

### 3. TINYFISH_API_KEY (INTERNAL)
# **Purpose**: Tinyfish MCP server authentication (different from external API)
# **Location**: mcp/reengine-tinyfish/src/index.ts
# **Usage**:
#   - Internal MCP server authentication
#   - Service-to-service communication
#   - JWT token exchange for Tinyfish service
# **Generated Key**: 686c184ccb4cb7a4e7eb53bd9fdab429f425eb06a1e1046ac2b2534dc994e2b5
# **Bcrypt Hash**: $2b$12$Cp3BjImExPvTMDH9ihXBhOaCJzSYOy5/J9Fg9tYbIIYpk7XornB0K

### 4. LLAMA_API_KEY (INTERNAL)
# **Purpose**: Llama MCP server authentication (different from Ollama API)
# **Location**: mcp/reengine-llama/src/index.ts
# **Usage**:
#   - Internal MCP server authentication
#   - LLM model management
#   - Service-to-service communication
# **Generated Key**: ed5d3985bc222140465acc648be2b2154fa519d31a2a04611d8d244084cdc393
# **Bcrypt Hash**: $2b$12$8ipoI4E8yYWGFSQd1VFtXO9lta/KRKfphYfiId1jqXRhOc1tHxkqq

### 5. CORE_API_KEY
# **Purpose**: Core workflow orchestration service
# **Location**: mcp/reengine-core/src/index.ts, engine/src/orchestration/master-orchestrator.ts
# **Usage**:
#   - Workflow execution API
#   - Service orchestration
#   - Internal system management
# **Generated Key**: e4b12df5b1cb4547a2532f7315e9a18046235a65812261a9e650cfa164763b06
# **Bcrypt Hash**: $2b$12$A9GSQIvHOlW9y3hmqLe8nOQANKcpb/g9scun3/JNWi/vyFjsfFKNq

### 6. OUTREACH_API_KEY (INTERNAL)
# **Purpose**: Outreach MCP server authentication (different from WhatsApp API)
# **Location**: mcp/reengine-outreach/src/index.ts
# **Usage**:
#   - Internal MCP server authentication
#   - Outreach workflow management
#   - Service-to-service communication
# **Generated Key**: 18b6e54296ae58d582ffe83b66ef45fa2de7057fc6d8d456fa891f7055727243
# **Bcrypt Hash**: $2b$12$4iBNPZociwm.TDGGSAUiGu9DdbTi.KnI1RFvhnKioYKEQR6DtNari

## =============================================================================
# EXTERNAL API KEYS (EXISTING - KEPT AS IS)
# =============================================================================

### EXTERNAL OLLAMA_API_KEY
# **Purpose**: Ollama external API authentication
# **Location**: .env file (external service)
# **Usage**: Direct Ollama API calls
# **Value**: 25a220dae3084bc597e45ce45a1b4acf.lnm3LOMMFyh-uPM9KZ2urOvX

### EXTERNAL TINYFISH_API_KEY
# **Purpose**: Tinyfish external API authentication (mino.ai)
# **Location**: .env file (external service)
# **Usage**: Direct Tinyfish API calls
# **Value**: sk-mino-tOMZqYYXaSHBUitVeusYXQH6E5IzthoE

### EXTERNAL WHATSAPP_API_KEY
# **Purpose**: WhatsApp API authentication (Whapi.Cloud)
# **Location**: .env file (external service)
# **Usage**: Direct WhatsApp API calls
# **Value**: 6Nd1MPAaFLLe1UJAXdwXcVYvcwwGbwOM

## =============================================================================
# AUTHENTICATION FLOW
# =============================================================================

### Internal Service Authentication:
1. MCP Server → JWT Token Exchange (using INTERNAL API_KEY)
2. JWT Token → Protected API Calls (Bearer token)
3. Database → bcrypt.compare() validation
4. Audit Log → Authentication tracking

### External API Authentication:
1. Service → Direct API Call (using EXTERNAL API_KEY)
2. External Service → API Response
3. No JWT exchange required (external services)

## =============================================================================
# NEXT STEPS
# =============================================================================

1. Add INTERNAL keys to MCP server environment variables
2. Update MCP servers to use JWT authentication
3. Run database migration with bcrypt hashes
4. Test all service-to-service communication
5. Monitor audit logs for authentication patterns
