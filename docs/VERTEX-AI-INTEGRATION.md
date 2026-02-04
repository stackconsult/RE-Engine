# Google Vertex AI Integration Guide

This guide provides comprehensive instructions for integrating Google Vertex AI with the RE Engine for AI/LLM completion services.

## 📋 Prerequisites

### Required Google Cloud Resources
- **Google Cloud Project** with billing enabled
- **Vertex AI API** enabled
- **Service Account** with Vertex AI permissions
- **API Key** or service account authentication

### Required Permissions
- `aiplatform.user` - For model access
- `aiplatform.admin` - For model management (optional)
- `serviceaccounts.actAs` - For service account authentication

## 🔧 Setup Instructions

### 1. Enable Vertex AI API

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID

# Verify API is enabled
gcloud services list --enabled --filter=aiplatform.googleapis.com
```

### 2. Create Service Account

```bash
# Create service account for Vertex AI
gcloud iam service-accounts create vertex-ai-service \
    --display-name="Vertex AI Service" \
    --description="Service account for Vertex AI API access" \
    --project=YOUR_PROJECT_ID

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Create and download service account key
gcloud iam service-accounts keys create ~/vertex-ai-key.json \
    --iam-account=vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com \
    --project=YOUR_PROJECT_ID
```

### 3. Generate API Key (Alternative Method)

```bash
# Create API key through Google Cloud Console
# 1. Go to: https://console.cloud.google.com/apis/credentials
# 2. Click "Create Credentials" > "API Key"
# 3. Restrict the key to Vertex AI API only
# 4. Copy the API key for environment configuration
```

## 🌩️ Environment Configuration

### Required Environment Variables

Add these to your `.env` file:

```bash
# Google Vertex AI Configuration
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_REGION=us-central1
VERTEX_AI_SERVICE_ACCOUNT_EMAIL=vertex-ai-service@your-project.iam.gserviceaccount.com
VERTEX_AI_API_KEY=your_vertex_ai_api_key_here
VERTEX_AI_MODEL_ID=text-bison
VERTEX_AI_EMBEDDING_MODEL_ID=textembedding-gecko

# Vertex AI Service Configuration
VERTEX_AI_MAX_RETRIES=3
VERTEX_AI_RETRY_DELAY=1000
VERTEX_AI_TIMEOUT=60000
VERTEX_AI_CACHE_ENABLED=true
VERTEX_AI_CACHE_TTL=3600000

# Vertex AI Model Defaults
VERTEX_AI_DEFAULT_TEMPERATURE=0.7
VERTEX_AI_DEFAULT_MAX_TOKENS=1024
VERTEX_AI_DEFAULT_TOP_P=0.9
VERTEX_AI_DEFAULT_TOP_K=40
VERTEX_AI_DEFAULT_CANDIDATE_COUNT=1
```

### Service Account Authentication (Alternative)

```bash
# Set service account key file path
export GOOGLE_APPLICATION_CREDENTIALS="~/vertex-ai-key.json"

# Or add to .env file
GOOGLE_APPLICATION_CREDENTIALS=~/vertex-ai-key.json
```

## 🚀 Usage Examples

### Basic Completion

```typescript
import { VertexAIService } from './src/ai/vertex-ai.service.js';

const vertexAI = new VertexAIService({
  projectId: process.env.VERTEX_AI_PROJECT_ID!,
  region: process.env.VERTEX_AI_REGION!,
  serviceAccountEmail: process.env.VERTEX_AI_SERVICE_ACCOUNT_EMAIL!,
  apiKey: process.env.VERTEX_AI_API_KEY,
  modelId: 'text-bison'
});

await vertexAI.initialize();

const response = await vertexAI.generateCompletion({
  prompt: "What is the future of real estate technology?",
  maxTokens: 500,
  temperature: 0.7
});

console.log(response.candidates[0].content);
```

### Embedding Generation

```typescript
const embeddingResponse = await vertexAI.generateEmbedding({
  content: "Real estate investment opportunities in Austin, Texas"
});

console.log(embeddingResponse.embeddings.values);
```

### Using AI Service Manager (Recommended)

```typescript
import { AIServiceManager } from './src/ai/ai-service-manager.js';

const aiManager = new AIServiceManager({
  primaryProvider: 'vertex-ai',
  fallbackProvider: 'ollama',
  enableFallback: true,
  fallbackThreshold: 0.1,
  vertexConfig: {
    projectId: process.env.VERTEX_AI_PROJECT_ID!,
    region: process.env.VERTEX_AI_REGION!,
    serviceAccountEmail: process.env.VERTEX_AI_SERVICE_ACCOUNT_EMAIL!,
    apiKey: process.env.VERTEX_AI_API_KEY
  }
});

await aiManager.initialize();

const response = await aiManager.generateCompletion({
  prompt: "Generate a property description for a luxury condo",
  maxTokens: 300
});
```

## 📊 Available Models

### Text Generation Models
- **text-bison** - General purpose text generation
- **text-bison-32k** - Extended context (32k tokens)
- **text-unicorn** - Advanced reasoning capabilities
- **chat-bison** - Conversational AI
- **chat-bison-32k** - Extended context chat

### Embedding Models
- **textembedding-gecko** - General text embeddings
- **textembedding-gecko-multilingual** - Multilingual embeddings
- **textembedding-gecko@001** - Latest embedding model

### Model Information

```typescript
// List available models
const models = await vertexAI.listModels();
console.log(models);

// Get specific model info
const modelInfo = await vertexAI.getModelInfo('text-bison');
console.log(modelInfo);
```

## 🔒 Security Best Practices

### API Key Management
1. **Never commit API keys** to version control
2. **Use environment variables** for configuration
3. **Rotate API keys** regularly
4. **Restrict API key scope** to Vertex AI only
5. **Monitor API usage** and set up alerts

### Service Account Security
1. **Principle of least privilege** - grant only necessary permissions
2. **Regular key rotation** - update service account keys periodically
3. **Audit access** - monitor service account usage
4. **Separate environments** - use different service accounts for dev/staging/prod

### Data Privacy
1. **Sensitive data** - avoid sending PII to Vertex AI
2. **Data retention** - understand Google's data retention policies
3. **Compliance** - ensure compliance with relevant regulations

## 📈 Performance Optimization

### Caching
```typescript
// Enable caching in configuration
const aiManager = new AIServiceManager({
  // ... other config
  vertexConfig: {
    // ... vertex config
  },
  enableCaching: true,
  cacheTTL: 3600000 // 1 hour
});
```

### Batch Processing
```typescript
// Process multiple requests in parallel
const prompts = [
  "Describe modern kitchen features",
  "What makes a good neighborhood?",
  "Benefits of smart home technology"
];

const responses = await Promise.all(
  prompts.map(prompt => 
    vertexAI.generateCompletion({ prompt, maxTokens: 200 })
  )
);
```

### Model Selection
```typescript
// Choose appropriate model based on task
const getOptimalModel = (task: string) => {
  switch (task) {
    case 'chat':
      return 'chat-bison';
    case 'long-form':
      return 'text-bison-32k';
    case 'reasoning':
      return 'text-unicorn';
    default:
      return 'text-bison';
  }
};
```

## 🔧 Configuration Options

### Model Parameters
- **temperature** (0.0-1.0) - Controls randomness
- **maxTokens** - Maximum response length
- **topP** (0.0-1.0) - Nucleus sampling
- **topK** - Top-k sampling
- **stopSequences** - Stop generation at these sequences
- **candidateCount** - Number of responses to generate

### Service Configuration
- **maxRetries** - Number of retry attempts
- **retryDelay** - Delay between retries (ms)
- **timeout** - Request timeout (ms)
- **cacheEnabled** - Enable response caching
- **cacheTTL** - Cache time-to-live (ms)

## 🐛 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```bash
# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
    --flatten="bindings[].members" \
    --format="table(bindings.role, bindings.members)"

# Test API access
curl -X POST "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/text-bison:generateText" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"instances": [{"content": "Hello"}]}'
```

#### 2. Model Not Available
```bash
# List available models in your region
gcloud ai models list --region=us-central1 --filter="displayName~text"

# Check model availability
curl -X GET "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

#### 3. Rate Limiting
```typescript
// Implement exponential backoff
const generateWithRetry = async (request: CompletionRequest, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await vertexAI.generateCompletion(request);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### Debug Logging
```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Monitor API calls
const originalGenerate = vertexAI.generateCompletion.bind(vertexAI);
vertexAI.generateCompletion = async (request) => {
  console.log('Vertex AI Request:', JSON.stringify(request, null, 2));
  const response = await originalGenerate(request);
  console.log('Vertex AI Response:', JSON.stringify(response, null, 2));
  return response;
};
```

## 📊 Monitoring and Analytics

### Metrics Collection
```typescript
// Track usage metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  tokenUsage: 0
};

// Update metrics after each request
const trackMetrics = (startTime: number, response: CompletionResponse) => {
  const responseTime = Date.now() - startTime;
  metrics.totalRequests++;
  metrics.successfulRequests++;
  metrics.averageResponseTime = 
    (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
  metrics.tokenUsage += response.usage.totalTokens;
};
```

### Health Checks
```typescript
// Implement health checks
const healthCheck = async () => {
  try {
    await vertexAI.healthCheck();
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date() };
  }
};
```

## 🚀 Advanced Features

### Custom Prompts
```typescript
// Create prompt templates
const propertyDescriptionPrompt = (property: Property) => `
Generate a compelling property description for:
- Address: ${property.address}
- Type: ${property.type}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square feet: ${property.squareFeet}
- Features: ${property.features.join(', ')}

Focus on lifestyle benefits and unique selling points.
Keep it under 200 words.
`;

const response = await vertexAI.generateCompletion({
  prompt: propertyDescriptionPrompt(property),
  maxTokens: 300,
  temperature: 0.8
});
```

### Multi-Modal Support (Future)
```typescript
// Prepare for multimodal models
const multimodalRequest = {
  prompt: "Describe this property image",
  image: "base64-encoded-image-data",
  modelId: "multimodal-model"
};
```

### Fine-Tuning (Future)
```typescript
// Prepare for custom model training
const fineTuningRequest = {
  baseModel: "text-bison",
  trainingData: "path/to/training/data",
  hyperparameters: {
    learningRate: 0.001,
    epochs: 10
  }
};
```

## 📚 Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Google Cloud Authentication](https://cloud.google.com/docs/authentication)
- [Vertex AI Quotas and Limits](https://cloud.google.com/vertex-ai/docs/quotas)
- [Model Garden](https://cloud.google.com/vertex-ai/docs/model-garden)

## 🆘 Support

For issues related to:
- **Vertex AI API**: Contact Google Cloud Support
- **RE Engine Integration**: Create an issue in the GitHub repository
- **Authentication**: Check IAM permissions and service account configuration

---

**Next Steps:**
1. Set up Google Cloud project and enable Vertex AI API
2. Create service account and obtain API key
3. Configure environment variables
4. Test integration with sample requests
5. Implement in your RE Engine workflow

Happy AI integration! 🤖
