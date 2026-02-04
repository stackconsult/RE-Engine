# Claude on Vertex AI Integration

## 🎯 **OVERVIEW**

Complete Claude on Vertex AI integration with OAuth 2.0 authentication for secure desktop applications.

## ✅ **FEATURES IMPLEMENTED**

### **🔐 OAuth 2.0 Authentication**
- Secure desktop app authentication (no API keys exposed)
- Google Auth Library integration
- Automatic token refresh and management
- Application Default Credentials support

### **🤖 Claude AI Integration**
- Official Anthropic Vertex SDK with manual API fallback
- All Claude models supported (Sonnet, Opus, Haiku variants)
- Complete text generation and token counting
- Model management and information retrieval

### **🏠 Real Estate Use Cases**
- Property description generation
- Market analysis and insights
- Customer service automation
- Lead qualification and responses

## 📋 **SETUP INSTRUCTIONS**

### **1. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

### **2. Required Environment Variables**
```bash
# Claude on Vertex AI Configuration
CLAUDE_VERTEX_PROJECT_ID=your-gcp-project-id
CLAUDE_VERTEX_REGION=global
CLAUDE_VERTEX_OAUTH_CLIENT_ID=your_oauth_client_id_here
CLAUDE_VERTEX_OAUTH_CLIENT_SECRET=your_oauth_client_secret_here
CLAUDE_VERTEX_OAUTH_REDIRECT_URI=http://localhost
CLAUDE_VERTEX_MODEL_ID=claude-sonnet-4-5@20250929
CLAUDE_VERTEX_MAX_TOKENS=4096
CLAUDE_VERTEX_TEMPERATURE=0.7
```

### **3. Google Cloud Setup**
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

# Enable Claude API in Vertex AI Model Garden
```

### **4. Install Dependencies**
```bash
cd engine
npm install
npm run build
```

### **5. Test Integration**
```bash
# Run test suite
node scripts/test-claude-vertex.js
```

## 📊 **AVAILABLE MODELS**

| Model | Vertex ID | Context | Input Price/1K | Output Price/1K |
|-------|-----------|---------|----------------|-----------------|
| Claude Sonnet 4.5 | claude-sonnet-4-5@20250929 | 200K | $0.015 | $0.075 |
| Claude Opus 4.5 | claude-opus-4-5@20251101 | 200K | $0.075 | $0.375 |
| Claude Haiku 4.5 | claude-haiku-4-5@20251001 | 200K | $0.001 | $0.005 |

## 🔧 **USAGE EXAMPLES**

### **Basic Text Generation**
```typescript
import { ClaudeVertexService } from './engine/dist/ai/claude-vertex.service.js';

const claudeVertex = new ClaudeVertexService({
  projectId: process.env.CLAUDE_VERTEX_PROJECT_ID,
  region: process.env.CLAUDE_VERTEX_REGION,
  oauthClientId: process.env.CLAUDE_VERTEX_OAUTH_CLIENT_ID,
  oauthClientSecret: process.env.CLAUDE_VERTEX_OAUTH_CLIENT_SECRET
});

await claudeVertex.initialize();

const response = await claudeVertex.generateCompletion({
  messages: [
    { role: 'user', content: 'Hello! Can you introduce yourself briefly?' }
  ],
  maxTokens: 100
});

console.log(response.content[0].text);
```

### **Property Description Generation**
```typescript
const propertyResponse = await claudeVertex.generateCompletion({
  messages: [{
    role: 'user',
    content: `Generate a compelling property description for:
- 3 bedroom, 2 bathroom house
- 2,500 square feet
- Modern kitchen with granite countertops
- Backyard with garden
- Price: $450,000

Make it engaging and professional.`
  }],
  maxTokens: 200,
  temperature: 0.8
});
```

## 🔒 **SECURITY ADVANTAGES**

### **Why OAuth 2.0 is Better for Desktop Apps**
- **No API Keys Exposed**: Eliminates security risk of exposed API keys
- **Secure Token Flow**: OAuth 2.0 with proper token management
- **Enterprise Authentication**: Google Cloud IAM integration
- **Automatic Refresh**: Token refresh without user intervention
- **Production Security**: Enterprise-grade credential management

## 🚀 **PRODUCTION READY**

### **Features**
- Comprehensive error handling and logging
- Health checks and monitoring
- Token counting for cost management
- Model information and pricing
- Fallback authentication methods
- Structured logging with Pino

### **Monitoring**
```typescript
// Health check
const isHealthy = await claudeVertex.healthCheck();

// Token counting
const tokenCount = await claudeVertex.countTokens({
  messages: [{ role: 'user', content: 'Test message' }]
});

// Model listing
const models = await claudeVertex.listAvailableModels();
```

## 📈 **BUSINESS VALUE**

### **Real Estate Applications**
- **AI-Powered Descriptions**: Automated property listing generation
- **Market Intelligence**: Data-driven analysis and insights
- **Customer Service**: Intelligent response automation
- **Cost Optimization**: Token counting and model selection
- **Competitive Advantage**: Latest Claude models with enterprise security

## 🎯 **NEXT STEPS**

1. **Set up Google Cloud authentication**
2. **Configure environment variables**
3. **Test the integration**
4. **Deploy to production**
5. **Monitor usage and costs**

---

**🎉 Your desktop app now has secure, enterprise-grade Claude AI integration through Vertex AI!**
