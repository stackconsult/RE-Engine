# Vertex AI Integration Guide

## 🎯 Overview

The RE Engine now includes comprehensive Google Vertex AI integration with Gemini models, providing advanced AI capabilities for text generation, content analysis, image processing, and code generation.

## 🚀 Features

### AI Model Capabilities
- **Text Generation**: Advanced text generation using Gemini 2.5 Flash Lite
- **Content Generation**: Multi-modal content creation and analysis
- **Embedding Generation**: Vector embeddings for semantic search
- **Image Analysis**: Vision-based image content analysis
- **Code Generation**: AI-powered code generation and assistance
- **Model Management**: Access to multiple Vertex AI models

### MCP Tools (8 Tools)
1. **generate_content** - Generate content with structured prompts
2. **generate_text** - Simple text generation
3. **generate_embedding** - Create vector embeddings
4. **analyze_image** - Analyze images with AI vision
5. **generate_code** - Generate code snippets
6. **get_model_info** - Get current model information
7. **list_available_models** - List all available models
8. **test_connection** - Test Vertex AI connectivity

## ⚙️ Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# =============================================================================
# GOOGLE VERTEX AI CONFIGURATION
# =============================================================================
# Vertex AI API Configuration
VERTEX_AI_API_KEY=your_vertex_ai_api_key_here
VERTEX_AI_PROJECT_ID=your_google_cloud_project_id_here
VERTEX_AI_LOCATION=your_vertex_ai_location_here
VERTEX_AI_MODEL=gemini-2.5-flash-lite

# Vertex AI Webhook Configuration
VERTEX_AI_WEBHOOK_URL=https://your-domain.cloud/webhook/vertex-ai
VERTEX_AI_WEBHOOK_SECRET=your_webhook_secret_here
```

### Google Cloud Setup

1. **Create Google Cloud Project**
   ```bash
   # Create new project or use existing one
   gcloud projects create your-project-id
   ```

2. **Enable Vertex AI API**
   ```bash
   gcloud services enable aiplatform.googleapis.com --project=your-project-id
   ```

3. **Create Service Account**
   ```bash
   gcloud iam service-accounts create vertex-ai-service \
     --project=your-project-id \
     --display-name="Vertex AI Service"
   ```

4. **Grant Permissions**
   ```bash
   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:vertex-ai-service@your-project-id.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

5. **Generate API Key**
   ```bash
   # Create API key for service account
   gcloud iam service-accounts keys create key.json \
     --iam-account=vertex-ai-service@your-project-id.iam.gserviceaccount.com
   ```

6. **Set Application Credentials**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
   ```

## 🔧 Installation

### Build Vertex AI MCP Server
```bash
cd mcp/reengine-vertexai
npm install
npm run build
```

### MCP Configuration
The Vertex AI server is automatically configured in `.windsurf/mcp-config.json`:

```json
{
  "mcpServers": {
    "reengine-vertexai": {
      "command": "node",
      "args": ["mcp/reengine-vertexai/dist/index.js"],
      "cwd": ".",
      "env": {
        "VERTEX_AI_API_KEY": "${VERTEX_AI_API_KEY}",
        "VERTEX_AI_PROJECT_ID": "${VERTEX_AI_PROJECT_ID}",
        "VERTEX_AI_LOCATION": "${VERTEX_AI_LOCATION:-us-central1}",
        "VERTEX_AI_MODEL": "${VERTEX_AI_MODEL:-gemini-2.5-flash-lite}",
        "VERTEX_AI_WEBHOOK_URL": "${VERTEX_AI_WEBHOOK_URL}",
        "VERTEX_AI_WEBHOOK_SECRET": "${VERTEX_AI_WEBHOOK_SECRET}",
        "LOG_LEVEL": "${LOG_LEVEL:-info}",
        "HOSTNAME": "${HOSTNAME:-localhost}"
      }
    }
  }
}
```

## 📊 Usage Examples

### Text Generation
```javascript
// Generate simple text
const result = await generate_text({
  prompt: "Write a professional email to a real estate lead",
  temperature: 0.7,
  maxOutputTokens: 500
});

console.log(result.text);
```

### Content Generation
```javascript
// Generate structured content
const result = await generate_content({
  contents: [
    {
      role: "user",
      parts: [
        { text: "Create a property description for a luxury villa" },
        { text: "Include 5 bedrooms, ocean view, and modern amenities" }
      ]
    }
  ],
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 1000
  }
});
```

### Code Generation
```javascript
// Generate code for automation
const result = await generate_code({
  prompt: "Create a Node.js function to validate phone numbers",
  language: "javascript",
  temperature: 0.1,
  maxOutputTokens: 500
});

console.log(result.code);
```

### Image Analysis
```javascript
// Analyze property image
const result = await analyze_image({
  image: "base64-encoded-image-data",
  features: ["labels", "text", "objects"],
  language: "en"
});

console.log(result.analysis);
```

### Embedding Generation
```javascript
// Create embeddings for semantic search
const result = await generate_embedding({
  content: "Luxury oceanfront villa with 5 bedrooms",
  taskType: "retrieval_document"
});

console.log(result.embedding);
```

## 🎯 Real Estate Use Cases

### Lead Qualification
```javascript
// Analyze lead message for qualification
const analysis = await generate_text({
  prompt: `Analyze this lead message for qualification:
  "${leadMessage}"
  
  Consider:
  1. Budget indicators
  2. Timeline urgency
  3. Property type preferences
  4. Decision-making authority
  
  Provide a score (1-10) and reasoning.`
});

// Generate embedding for similarity matching
const embedding = await generate_embedding({
  content: leadMessage,
  taskType: "semantic_similarity"
});
```

### Property Descriptions
```javascript
// Generate compelling property descriptions
const description = await generate_content({
  contents: [
    {
      role: "user",
      parts: [
        { text: "Create a compelling property description" },
        { text: "Property: 5-bedroom luxury villa" },
        { text: "Features: Ocean view, infinity pool, smart home" },
        { text: "Location: Prime beachfront location" },
        { text: "Target: High-net-worth buyers" }
      ]
    }
  ],
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 800
  }
});
```

### Market Analysis
```javascript
// Analyze market trends
const analysis = await generate_text({
  prompt: `Analyze real estate market trends for ${location}:
  
  Current data:
  - Average price: ${avgPrice}
  - Days on market: ${daysOnMarket}
  - Inventory levels: ${inventory}
  
  Provide insights on:
  1. Market direction
  2. Pricing recommendations
  3. Investment opportunities
  4. Risk factors`
});
```

### Automated Responses
```javascript
// Generate personalized responses
const response = await generate_text({
  prompt: `Generate a personalized WhatsApp response:
  
  Lead: ${leadName}
  Property: ${propertyName}
  Budget: ${budget}
  Timeline: ${timeline}
  
  Response should be:
  - Professional and friendly
  - Address their specific needs
  - Include relevant property details
  - Call to action for next step
  - Under 160 characters for SMS`,
  maxOutputTokens: 200
});
```

## 🔍 Advanced Features

### Multi-Modal Analysis
```javascript
// Analyze property images with text
const analysis = await analyze_image({
  image: propertyImageBase64,
  features: ["labels", "text", "objects"],
  language: "en"
});

// Generate description based on image analysis
const description = await generate_text({
  prompt: `Based on this image analysis: ${analysis.analysis}
  Generate a compelling property description highlighting the key features.`
});
```

### Semantic Search
```javascript
// Create embeddings for property database
const properties = [
  { id: 1, description: "Luxury beachfront villa with infinity pool" },
  { id: 2, description: "Modern downtown condo with city views" },
  { id: 3, description: "Suburban family home with large yard" }
];

// Generate embeddings
const embeddings = await Promise.all(
  properties.map(async (prop) => ({
    id: prop.id,
    embedding: await generate_embedding({
      content: prop.description,
      taskType: "retrieval_document"
    })
  }))
);

// Search for similar properties
const searchEmbedding = await generate_embedding({
  content: "luxury ocean view property with pool",
  taskType: "semantic_similarity"
});

// Find most similar properties (cosine similarity)
const similarProperties = embeddings
  .map(item => ({
    ...item,
    similarity: cosineSimilarity(searchEmbedding.embedding, item.embedding)
  }))
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 3);
```

### Code Generation for Automation
```javascript
// Generate automation scripts
const script = await generate_code({
  prompt: `Create a Node.js function to:
  1. Validate phone numbers with international format
  2. Extract country code
  3. Format for WhatsApp API
  4. Return validation result object`,
  language: "javascript",
  temperature: 0.1
});

// Generate API integration code
const apiCode = await generate_code({
  prompt: `Create TypeScript code for Vertex AI integration:
  - Handle API authentication
  - Implement error handling
  - Include retry logic
  - Add type definitions`,
  language: "typescript",
  temperature: 0.1
});
```

## 📈 Performance Optimization

### Model Selection
```javascript
// Get available models
const models = await list_available_models();

// Choose optimal model based on task
const modelForTask = (task) => {
  switch(task) {
    case 'text_generation':
      return 'gemini-2.5-flash-lite'; // Fast, cost-effective
    case 'code_generation':
      return 'gemini-2.5-flash-lite'; // Good for code
    case 'image_analysis':
      return 'gemini-2.5-flash-lite'; // Multi-modal
    case 'embedding':
      return 'text-embedding-004'; // Specialized embedding model
    default:
      return 'gemini-2.5-flash-lite';
  }
};
```

### Caching Strategy
```javascript
// Cache embeddings for repeated content
const embeddingCache = new Map();

const getCachedEmbedding = async (content) => {
  const cacheKey = content.toLowerCase().trim();
  
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }
  
  const embedding = await generate_embedding({
    content,
    taskType: 'retrieval_document'
  });
  
  embeddingCache.set(cacheKey, embedding);
  return embedding;
};
```

### Batch Processing
```javascript
// Process multiple items efficiently
const batchGenerateText = async (prompts) => {
  const results = await Promise.allSettled(
    prompts.map(prompt => 
      generate_text({
        prompt,
        temperature: 0.7,
        maxOutputTokens: 500
      })
    )
  );
  
  return results.map((result, index) => ({
    index,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
};
```

## 🔒 Security Best Practices

### API Key Management
```javascript
// Validate API key format
const validateApiKey = (apiKey) => {
  return apiKey && apiKey.length > 20 && apiKey.startsWith('AIza');
};

// Secure API key storage
const secureConfig = {
  apiKey: process.env.VERTEX_AI_API_KEY,
  projectId: process.env.VERTEX_AI_PROJECT_ID,
  // Never log or expose API keys
};
```

### Input Validation
```javascript
// Validate inputs before processing
const validateTextInput = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input');
  }
  
  if (text.length > 10000) {
    throw new Error('Text input too long');
  }
  
  return text.trim();
};

const validateImageInput = (imageBase64) => {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Invalid image input');
  }
  
  // Basic base64 validation
  if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
    throw new Error('Invalid base64 format');
  }
  
  return imageBase64;
};
```

### Rate Limiting
```javascript
// Implement rate limiting
const rateLimiter = {
  requests: new Map(),
  
  checkLimit: (key, limit = 100, window = 60000) => {
    const now = Date.now();
    const requests = rateLimiter.requests.get(key) || [];
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < window);
    
    if (validRequests.length >= limit) {
      throw new Error('Rate limit exceeded');
    }
    
    validRequests.push(now);
    rateLimiter.requests.set(key, validRequests);
  }
};
```

## 🚨 Troubleshooting

### Common Issues

#### Authentication Errors
```bash
# Check service account permissions
gcloud auth activate-service-account vertex-ai-service@your-project-id.iam.gserviceaccount.com

# Verify API is enabled
gcloud services list --enabled --filter=aiplatform.googleapis.com

# Test API access
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://aiplatform.googleapis.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite"
```

#### Connection Issues
```javascript
// Test connection
try {
  const result = await test_connection();
  console.log('Vertex AI connection successful:', result);
} catch (error) {
  console.error('Connection failed:', error.message);
  
  // Check configuration
  console.log('Configuration:', {
    projectId: vertexConfig.projectId,
    location: vertexConfig.location,
    model: vertexConfig.model,
    apiKey: vertexConfig.apiKey ? '***' : 'Missing'
  });
}
```

#### Model Availability
```javascript
// Check available models
const models = await list_available_models();
console.log('Available models:', models.models.map(m => m.name));

// Verify specific model
const modelInfo = getModelInfo();
console.log('Current model:', modelInfo);
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run mcp:start

# Test specific tool
node -e "
import { generate_text } from './dist/index.js';
generate_text({ prompt: 'Test message' })
  .then(console.log)
  .catch(console.error);
"
```

## 📚 API Reference

### Tool Parameters

#### generate_text
- `prompt` (string, required): Text prompt for generation
- `temperature` (number, optional): 0.0-2.0, default 0.7
- `maxOutputTokens` (number, optional): 1-8192, default 2048
- `topK` (number, optional): 1-40, default 40
- `topP` (number, optional): 0.0-0.95, default 0.95

#### generate_content
- `contents` (array, required): Array of content objects with role and parts
- `generationConfig` (object, optional): Generation configuration

#### generate_embedding
- `content` (string, required): Text to embed
- `taskType` (string, optional): retrieval_document, semantic_similarity, classification, clustering

#### analyze_image
- `image` (string, required): Base64 encoded image
- `features` (array, optional): Features to extract
- `language` (string, optional): Language for text extraction

#### generate_code
- `prompt` (string, required): Code generation prompt
- `language` (string, optional): Programming language
- `temperature` (number, optional): 0.0-2.0, default 0.1
- `maxOutputTokens` (number, optional): 1-8192, default 4096

### Response Format

```javascript
{
  "text": "Generated text content",
  "model": "gemini-2.5-flash-lite",
  "usage": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 50,
    "totalTokenCount": 60
  }
}
```

## 🎯 Best Practices

### Prompt Engineering
1. **Be Specific**: Clear, detailed prompts produce better results
2. **Provide Context**: Include relevant background information
3. **Set Constraints**: Specify format, length, and style requirements
4. **Use Examples**: Include few-shot examples when helpful

### Cost Optimization
1. **Choose Right Model**: Use flash models for simple tasks
2. **Limit Tokens**: Set appropriate maxOutputTokens
3. **Batch Operations**: Process multiple items together
4. **Cache Results**: Store embeddings and repeated content

### Performance Optimization
1. **Async Operations**: Use Promise.all for parallel processing
2. **Error Handling**: Implement proper error recovery
3. **Rate Limiting**: Prevent API quota exhaustion
4. **Monitoring**: Track usage and performance metrics

## 🔄 Integration Examples

### WhatsApp + Vertex AI
```javascript
// Generate personalized WhatsApp messages
const generateWhatsAppMessage = async (lead, property) => {
  const prompt = `Generate a WhatsApp message for:
  Lead: ${lead.name}, Budget: ${lead.budget}
  Property: ${property.name}, Price: ${property.price}
  
  Requirements:
  - Personalized and professional
  - Under 160 characters
  - Include call-to-action
  - Mention key property feature`;

  return await generate_text({
    prompt,
    temperature: 0.7,
    maxOutputTokens: 200
  });
};
```

### Lead Scoring with AI
```javascript
// AI-powered lead scoring
const scoreLead = async (lead) => {
  const prompt = `Score this lead (1-10) and provide reasoning:
  
  Lead Data:
  - Name: ${lead.name}
  - Budget: ${lead.budget}
  - Timeline: ${lead.timeline}
  - Source: ${lead.source}
  - Message: ${lead.message}
  
  Scoring Criteria:
  - Budget alignment (1-3 points)
  - Timeline urgency (1-3 points)
  - Decision authority (1-2 points)
  - Engagement level (1-2 points)`;

  const result = await generate_text({
    prompt,
    temperature: 0.3,
    maxOutputTokens: 300
  });

  // Extract score from AI response
  const scoreMatch = result.text.match(/(\d+)\/10/);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : 5,
    reasoning: result.text
  };
};
```

### Property Matching
```javascript
// AI-powered property matching
const findMatchingProperties = async (lead, properties) => {
  const prompt = `Find best matching properties for:
  Lead Requirements: ${lead.requirements}
  Budget: ${lead.budget}
  Location: ${lead.location}
  
  Available Properties:
  ${properties.map(p => `- ${p.name}: ${p.description} ($${p.price})`).join('\n')}
  
  Rank top 3 matches with reasoning.`;

  const result = await generate_text({
    prompt,
    temperature: 0.5,
    maxOutputTokens: 500
  });

  return result.text;
};
```

## 🚀 Next Steps

1. **Test Integration**: Verify Vertex AI connection and basic functionality
2. **Implement Use Cases**: Apply to real estate workflows
3. **Monitor Usage**: Track API costs and performance
4. **Optimize Prompts**: Refine for better results
5. **Scale Integration**: Expand to more automation workflows

---

**Ready to supercharge your RE Engine with Google Vertex AI! 🚀**
