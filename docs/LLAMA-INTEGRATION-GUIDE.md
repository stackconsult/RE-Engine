# LLAMA Integration Guide

## 🎯 Overview

The RE Engine now includes comprehensive LLAMA integration with Ollama, providing robust local AI capabilities as a free alternative to cloud-based solutions. This integration features intelligent model orchestration, automatic model selection based on use cases, and support for 15+ different LLAMA models.

## 🚀 Features

### Intelligent Model Orchestration
- **Automatic Model Selection**: Chooses optimal model based on use case and requirements
- **Multi-Model Support**: 15+ LLAMA models across different categories
- **Fallback Mechanisms**: Graceful degradation when preferred models unavailable
- **Performance Optimization**: Model selection based on speed, quality, and context requirements

### Model Categories
- **General Purpose**: Llama 3.1, Llama 3, Mistral, Mixtral, Nous Hermes, Solar
- **Code Generation**: Code Llama (7B, 13B, 34B) for programming tasks
- **Chinese Language**: Qwen models (7B, 14B, 72B) for Chinese content
- **Multimodal**: LLaVA models for image analysis and visual reasoning

### Advanced Features
- **Response Caching**: Intelligent caching with TTL for performance
- **Retry Logic**: Automatic retries with exponential backoff
- **Connection Testing**: Health checks and diagnostics
- **Usage Analytics**: Model usage statistics and performance metrics

## 📊 Available LLAMA Models

### General Purpose Models
| Model | Size | Context | Use Cases | Recommended |
|-------|------|---------|-----------|-------------|
| `llama3.1:8b` | 8B | 128K | Text generation, conversation, analysis | ✅ |
| `llama3.1:70b` | 70B | 128K | Complex reasoning, analysis | ❌ |
| `llama3:8b` | 8B | 8K | Basic text generation, conversation | ✅ |
| `llama3:70b` | 70B | 4K | Advanced analysis, reasoning | ❌ |
| `mistral:7b` | 7B | 8K | Efficient general tasks | ✅ |
| `mixtral:8x7b` | 8x7B | 32K | Complex reasoning, analysis | ❌ |
| `nous-hermes:13b` | 13B | 4K | Instruction following | ✅ |
| `solar:10.7b` | 10.7B | 2K | Advanced reasoning | ❌ |

### Code Generation Models
| Model | Size | Context | Specialization | Recommended |
|-------|------|---------|----------------|-------------|
| `codellama:7b` | 7B | 16K | Code generation, debugging | ✅ |
| `codellama:13b` | 13B | 16K | Enhanced code, documentation | ❌ |
| `codellama:34b` | 34B | 16K | Professional code, architecture | ❌ |

### Chinese Language Models
| Model | Size | Context | Language | Recommended |
|-------|------|---------|----------|-------------|
| `qwen:7b` | 7B | 32K | Chinese | ✅ |
| `qwen:14b` | 14B | 32K | Enhanced Chinese | ❌ |
| `qwen:72b` | 72B | 32K | Professional Chinese | ❌ |

### Multimodal Models
| Model | Size | Context | Capabilities | Recommended |
|-------|------|---------|--------------|-------------|
| `llava:7b` | 7B | 4K | Image analysis, vision | ✅ |
| `llava:13b` | 13B | 4K | Enhanced vision analysis | ❌ |

## ⚙️ Configuration

### Environment Variables

Add these to your `.env` file (already configured):

```bash
# =============================================================================
# AI/LLM CONFIGURATION (Ollama/LLAMA)
# =============================================================================
# Ollama Configuration
OLLAMA_API_KEY=25a220dae3084bc597e45ce45a1b4acf.lnm3LOMMFyh-uPM9KZ2urOvX
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=qwen:7b
OLLAMA_TIMEOUT=30000

# Ollama Device Authentication
OLLAMA_DEVICE_KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGJbUlKyHKBE3F16MYw51cuOHS1+yxZr2uO/jN8iYPwB

# Ollama Service Configuration
OLLAMA_MAX_RETRIES=3
OLLAMA_RETRY_DELAY=1000
OLLAMA_HEALTH_CHECK_INTERVAL=60000
OLLAMA_METRICS_ENABLED=true
OLLAMA_CACHE_ENABLED=true
OLLAMA_CACHE_TTL=3600000

# Ollama Model Defaults
OLLAMA_DEFAULT_TEMPERATURE=0.7
OLLAMA_DEFAULT_MAX_TOKENS=1000
OLLAMA_DEFAULT_TOP_P=0.9
OLLAMA_DEFAULT_TOP_K=40
```

### Ollama Setup

1. **Install Ollama** (if not already installed):
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

2. **Start Ollama Server**:
```bash
ollama serve
```

3. **Pull Recommended Models**:
```bash
# General purpose models
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull nous-hermes:13b

# Code generation models
ollama pull codellama:7b

# Chinese models
ollama pull qwen:7b

# Multimodal models
ollama pull llava:7b
```

4. **Verify Installation**:
```bash
ollama list
```

## 🔧 MCP Integration

The LLAMA server is automatically configured in `.windsurf/mcp-config.json`:

```json
{
  "mcpServers": {
    "reengine-llama": {
      "command": "node",
      "args": ["mcp/reengine-llama/dist/index.js"],
      "cwd": ".",
      "env": {
        "OLLAMA_API_KEY": "${OLLAMA_API_KEY}",
        "OLLAMA_BASE_URL": "${OLLAMA_BASE_URL:-http://127.0.0.1:11434/v1}",
        "OLLAMA_MODEL": "${OLLAMA_MODEL:-qwen:7b}",
        "OLLAMA_TIMEOUT": "${OLLAMA_TIMEOUT:-30000}",
        "OLLAMA_MAX_RETRIES": "${OLLAMA_MAX_RETRIES:-3}",
        "OLLAMA_RETRY_DELAY": "${OLLAMA_RETRY_DELAY:-1000}",
        "OLLAMA_CACHE_ENABLED": "${OLLAMA_CACHE_ENABLED:-true}",
        "OLLAMA_CACHE_TTL": "${OLLAMA_CACHE_TTL:-3600000}",
        "LOG_LEVEL": "${LOG_LEVEL:-info}",
        "HOSTNAME": "${HOSTNAME:-localhost}"
      }
    }
  }
}
```

## 📊 Usage Examples

### Intelligent Text Generation
```javascript
// Automatic model selection based on use case
const result = await generate_text({
  prompt: "Write a professional email to a real estate lead",
  useCase: "text_generation",
  requirements: {
    speed: "fast",
    quality: "good"
  }
});

console.log(result.text); // Generated text
console.log(result.selectedModel); // Automatically chosen model
console.log(result.modelInfo); // Model details
```

### Code Generation
```javascript
// Specialized code generation
const codeResult = await generate_code({
  prompt: "Create a Node.js function to validate phone numbers",
  language: "javascript",
  requirements: {
    quality: "excellent"
  }
});

console.log(codeResult.code);
console.log(codeResult.selectedModel); // Likely codellama:7b
```

### Image Analysis
```javascript
// Multimodal image analysis
const imageResult = await analyze_image({
  image: "base64-encoded-property-image",
  prompt: "Analyze this property photo for key features"
});

console.log(imageResult.analysis);
console.log(imageResult.selectedModel); // Likely llava:7b
```

### Model Optimization
```javascript
// Get optimal model recommendation
const optimization = await optimize_model({
  useCase: "code_generation",
  requirements: {
    speed: "fast",
    quality: "good",
    context: "medium"
  }
});

console.log(optimization.recommended); // codellama:7b
console.log(optimization.alternatives); // Other suitable models
```

### Model Management
```javascript
// List available models
const models = await list_models({
  category: "code",
  recommended: true
});

console.log(models.models); // Filtered list of code models

// Get detailed model information
const modelInfo = await get_model_info("codellama:7b");
console.log(modelInfo);
```

## 🎯 Real Estate Use Cases

### Lead Management
```javascript
// AI-powered lead analysis with automatic model selection
const analyzeLead = async (lead) => {
  const result = await generate_text({
    prompt: `Analyze this lead for qualification:
    Name: ${lead.name}
    Budget: ${lead.budget}
    Timeline: ${lead.timeline}
    Message: ${lead.message}
    
    Provide score (1-10) and reasoning.`,
    useCase: "analysis",
    requirements: {
      quality: "excellent",
      context: "short"
    }
  });
  
  return {
    analysis: result.text,
    model: result.selectedModel,
    confidence: extractConfidence(result.text)
  };
};
```

### Property Description Generation
```javascript
// Generate property descriptions with optimal model
const generatePropertyDescription = async (property) => {
  const result = await generate_text({
    prompt: `Create compelling property description:
    Property: ${property.name}
    Features: ${property.features}
    Price: ${property.price}
    Location: ${property.location}
    
    Requirements: Professional, engaging, under 200 words`,
    useCase: "text_generation",
    requirements: {
      quality: "excellent",
      speed: "medium"
    }
  });
  
  return result.text;
};
```

### Code Generation for Automation
```javascript
// Generate automation scripts
const createAutomationScript = async (requirement) => {
  const result = await generate_code({
    prompt: `Create automation script for: ${requirement}
    Requirements: Node.js, error handling, logging`,
    language: "javascript",
    useCase: "code_generation",
    requirements: {
      quality: "excellent",
      context: "medium"
    }
  });
  
  return {
    code: result.code,
    model: result.selectedModel,
    language: "javascript"
  };
};
```

### Multilingual Support
```javascript
// Chinese content generation
const generateChineseContent = async (content) => {
  const result = await generate_text({
    prompt: `生成中文内容: ${content}`,
    useCase: "chinese_content",
    requirements: {
      quality: "good"
    }
  });
  
  return result.text; // Chinese text
};
```

### Image Analysis for Properties
```javascript
// Analyze property images
const analyzePropertyImage = async (imageBase64) => {
  const result = await analyze_image({
    image: imageBase64,
    prompt: "Analyze this property photo for: architectural style, condition, key features, estimated value factors",
    useCase: "image_analysis",
    requirements: {
      quality: "good"
    }
  });
  
  return {
    analysis: result.analysis,
    features: extractFeatures(result.analysis),
    model: result.selectedModel
  };
};
```

## 🔄 Model Orchestration Logic

### Automatic Selection Algorithm

The system uses intelligent model selection based on:

1. **Use Case Matching**: Models filtered by intended use case
2. **Requirements Analysis**: Speed, quality, context preferences
3. **Recommendation Priority**: Recommended models preferred
4. **Performance Factors**: Model size vs. speed trade-offs
5. **Availability Fallbacks**: Graceful degradation

### Selection Examples

```javascript
// Fast, basic quality → mistral:7b (small, efficient)
selectOptimalModel('text_generation', { speed: 'fast', quality: 'basic' })

// High quality, complex reasoning → llama3.1:70b (large, capable)
selectOptimalModel('analysis', { quality: 'excellent', context: 'long' })

// Code generation → codellama:7b (specialized)
selectOptimalModel('code_generation', { quality: 'good' })

// Chinese content → qwen:7b (language-specific)
selectOptimalModel('chinese_content', { quality: 'good' })

// Image analysis → llava:7b (multimodal)
selectOptimalModel('image_analysis', { quality: 'good' })
```

## 📈 Performance Optimization

### Caching Strategy
```javascript
// Automatic caching enabled
const cacheConfig = {
  enabled: true,
  ttl: 3600000, // 1 hour
  maxSize: 1000 // Maximum cached responses
};

// Cache status monitoring
const cacheStatus = await get_cache_status();
console.log(`Cache size: ${cacheStatus.size}, Expired: ${cacheStatus.expired}`);

// Manual cache clearing
const cleared = await clear_cache();
console.log(`Cleared ${cleared.cleared} cache entries`);
```

### Retry Logic
```javascript
// Automatic retries with exponential backoff
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // Starting delay
  maxDelay: 10000 // Maximum delay
};

// Failed requests automatically retried
// Connection errors handled gracefully
```

### Performance Monitoring
```javascript
// Connection testing
const health = await test_connection();
console.log(`Status: ${health.status}, Models: ${health.availableModels}`);

// Usage analytics
const usage = await get_usage_stats();
console.log(`Total requests: ${usage.total}, Cache hit rate: ${usage.cacheHitRate}%`);
```

## 🔍 Advanced Features

### Model Comparison
```javascript
// Compare models for specific task
const compareModels = async (prompt, useCase) => {
  const models = ['llama3.1:8b', 'mistral:7b', 'nous-hermes:13b'];
  const results = await Promise.all(
    models.map(model => 
      generate_text({ prompt, model, useCase })
    )
  );
  
  return results.map((result, index) => ({
    model: models[index],
    text: result.text,
    responseTime: result.responseTime,
    quality: result.quality
  }));
};
```

### Batch Processing
```javascript
// Process multiple requests efficiently
const batchGenerate = async (prompts, useCase) => {
  const results = await Promise.allSettled(
    prompts.map(prompt => 
      generate_text({ prompt, useCase })
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

### Custom Model Selection
```javascript
// Override automatic selection
const customGeneration = async (prompt, preferredModel) => {
  return await generate_text({
    prompt,
    model: preferredModel, // Force specific model
    useCase: "text_generation"
  });
};
```

## 🚨 Troubleshooting

### Common Issues

#### Ollama Connection Issues
```bash
# Check Ollama status
ollama list

# Restart Ollama service
ollama serve

# Check network connectivity
curl http://127.0.0.1:11434/api/tags
```

#### Model Not Available
```bash
# Pull missing models
ollama pull llama3.1:8b
ollama pull codellama:7b
ollama pull qwen:7b
ollama pull llava:7b

# Verify installation
ollama list
```

#### Performance Issues
```javascript
// Check cache status
const cacheStatus = await get_cache_status();
if (cacheStatus.expired > cacheStatus.size * 0.5) {
  await clear_cache();
}

// Monitor response times
const start = Date.now();
const result = await generate_text({ prompt: "test" });
const responseTime = Date.now() - start;
console.log(`Response time: ${responseTime}ms`);
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run mcp:start

# Test specific model
node -e "
import { generate_text } from './dist/index.js';
generate_text({ prompt: 'Test message', model: 'llama3.1:8b' })
  .then(console.log)
  .catch(console.error);
"
```

## 📚 MCP Tools Reference

### Core Tools (9 Tools)

1. **generate_text** - Intelligent text generation with model selection
2. **generate_code** - Specialized code generation
3. **analyze_image** - Multimodal image analysis
4. **list_models** - Filter and browse available models
5. **optimize_model** - Get optimal model recommendations
6. **get_model_info** - Detailed model information
7. **test_connection** - Health checks and diagnostics
8. **get_cache_status** - Cache monitoring and statistics
9. **clear_cache** - Cache management

### Tool Parameters

#### generate_text
- `prompt` (string, required): Text prompt for generation
- `model` (string, optional): Force specific model
- `useCase` (string, optional): Use case for optimization
- `temperature` (number, optional): 0.0-2.0, default 0.7
- `maxTokens` (number, optional): 1-8192, default 2048
- `topP` (number, optional): 0.0-1.0, default 0.9
- `topK` (number, optional): 1-100, default 40

#### generate_code
- `prompt` (string, required): Code generation prompt
- `language` (string, optional): Programming language
- `model` (string, optional): Force specific model
- `temperature` (number, optional): 0.0-2.0, default 0.1
- `maxTokens` (number, optional): 1-8192, default 4096

#### analyze_image
- `image` (string, required): Base64 encoded image
- `prompt` (string, optional): Analysis prompt
- `model` (string, optional): Force specific model

#### list_models
- `category` (string, optional): Filter by category
- `recommended` (boolean, optional): Show only recommended models

#### optimize_model
- `useCase` (string, required): Intended use case
- `requirements` (object, optional): Performance requirements

### Response Format

```javascript
{
  "text": "Generated content",
  "model": "llama3.1:8b",
  "selectedModel": "llama3.1:8b",
  "modelInfo": {
    "category": "general",
    "description": "Llama 3.1 8B - General purpose model",
    "useCases": ["text_generation", "conversation", "analysis"],
    "capabilities": ["text", "reasoning", "analysis"],
    "contextWindow": 128000,
    "recommended": true
  },
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 50,
    "total_tokens": 60
  },
  "cached": false
}
```

## 🎯 Best Practices

### Model Selection
1. **Use Automatic Selection**: Let system choose optimal models
2. **Specify Use Cases**: Help system make better choices
3. **Set Requirements**: Define speed/quality trade-offs
4. **Monitor Performance**: Track response times and quality

### Performance Optimization
1. **Enable Caching**: Reduce API calls for repeated requests
2. **Use Recommended Models**: Better performance and reliability
3. **Batch Operations**: Process multiple requests together
4. **Monitor Cache**: Clear expired entries regularly

### Error Handling
1. **Implement Retries**: Automatic retry logic built-in
2. **Fallback Models**: Graceful degradation when models fail
3. **Connection Testing**: Regular health checks
4. **Logging**: Comprehensive error tracking

### Real Estate Integration
1. **Lead Analysis**: Use analysis models for qualification
2. **Content Generation**: Use text models for descriptions
3. **Code Generation**: Use code models for automation
4. **Image Analysis**: Use multimodal models for property photos
5. **Multilingual**: Use Chinese models for international clients

## 🔄 Integration Examples

### WhatsApp + LLAMA Integration
```javascript
// Generate personalized WhatsApp messages with local AI
const generateWhatsAppMessage = async (lead, property) => {
  const result = await generate_text({
    prompt: `Generate WhatsApp message for:
    Lead: ${lead.name}, Budget: ${lead.budget}
    Property: ${property.name}, Price: ${property.price}
    
    Requirements: Personalized, professional, under 160 characters`,
    useCase: "text_generation",
    requirements: {
      speed: "fast",
      quality: "good"
    }
  });
  
  return result.text;
};
```

### Lead Scoring with Local AI
```javascript
// AI-powered lead scoring without cloud costs
const scoreLead = async (lead) => {
  const result = await generate_text({
    prompt: `Score lead 1-10 with reasoning:
    Name: ${lead.name}
    Budget: ${lead.budget}
    Timeline: ${lead.timeline}
    Message: ${lead.message}
    
    Criteria: Budget (1-3), Timeline (1-3), Authority (1-2), Engagement (1-2)`,
    useCase: "analysis",
    requirements: {
      quality: "excellent",
      context: "short"
    }
  });
  
  return {
    score: extractScore(result.text),
    reasoning: result.text,
    model: result.selectedModel,
    local: true
  };
};
```

### Property Matching with Local AI
```javascript
// Intelligent property matching using local models
const findMatchingProperties = async (lead, properties) => {
  const result = await generate_text({
    prompt: `Match lead to properties:
    Lead: ${lead.requirements}, Budget: ${lead.budget}
    Properties: ${properties.map(p => `${p.name}: $${p.price}`).join(', ')}
    
    Rank top 3 matches with reasoning.`,
    useCase: "analysis",
    requirements: {
      quality: "good",
      context: "medium"
    }
  });
  
  return parseMatches(result.text);
};
```

## 🚀 Next Steps

1. **Install Models**: Pull recommended LLAMA models
2. **Test Integration**: Verify all 9 MCP tools work correctly
3. **Optimize Selection**: Fine-tune model selection for your use cases
4. **Monitor Performance**: Track usage and optimize caching
5. **Scale Usage**: Gradually increase local AI automation

## 📊 System Architecture

### Current MCP Servers (5 Total)
1. **reengine-outreach** - WhatsApp automation (35+ tools)
2. **reengine-tinyfish** - Web scraping and data extraction
3. **whapi-mcp-optimal** - Official Whapi.Cloud server
4. **reengine-vertexai** - Google Vertex AI integration (8 tools)
5. **reengine-llama** - LLAMA/Ollama integration (9 tools) ✨ **NEW**

### AI Orchestration Flow
```
User Request → Use Case Analysis → Model Selection → Local AI (LLAMA) → Cloud AI (Vertex AI) → Response
```

### Cost Optimization
- **Local First**: LLAMA models for free local processing
- **Cloud Backup**: Vertex AI for advanced capabilities
- **Intelligent Routing**: Automatic selection based on requirements
- **Caching**: Reduce redundant API calls

---

**Ready for robust local AI automation with LLAMA! 🚀**
