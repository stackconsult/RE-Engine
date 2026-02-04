# LiteLLM + Ollama Integration Guide

## 🎯 **OVERVIEW**

This guide covers the complete integration of LiteLLM proxy with Ollama to enable Claude Code compatibility for the RE Engine. This setup allows you to use Claude Code with local Ollama models seamlessly.

## ✅ **WHAT'S IMPLEMENTED**

### **🔧 Core Components**
- **LiteLLM Proxy Service**: Complete proxy management with health checks
- **Enhanced Ollama Service**: Dual-mode operation (direct + proxy)
- **Automated Setup Scripts**: One-click installation and configuration
- **Comprehensive Testing**: Full validation suite for all components
- **Claude Code Compatibility**: Seamless integration with Claude Code

### **🤖 Model Mappings**
| Claude Model | Ollama Model | Use Case |
|-------------|--------------|----------|
| claude-sonnet-4-5 | deepseek-coder-v2 | General purpose, coding |
| claude-opus-4-5 | qwen:7b | Complex reasoning |
| claude-haiku-4-5 | llama3.1:8b | Fast responses |

## 📋 **SETUP INSTRUCTIONS**

### **1. Prerequisites**
```bash
# Ensure you have:
- Python 3.8+
- Node.js 16+
- Ollama installed and running
- At least one Ollama model pulled
```

### **2. Automated Setup**
```bash
# Run the automated setup script
node scripts/setup-litellm.js

# This will:
- Install LiteLLM and dependencies
- Generate secure master key
- Create configuration files
- Update environment variables
- Test the integration
```

### **3. Manual Setup (Optional)**
```bash
# Install LiteLLM
pip install litellm[proxy]

# Create config directory
mkdir -p config

# Generate master key
openssl rand -hex 32

# Update .env with LiteLLM configuration
```

## 🔧 **CONFIGURATION**

### **Environment Variables**
```bash
# LiteLLM Proxy Configuration
LITELLM_ENABLED=true
LITELLM_PROXY_URL=http://localhost:4000
LITELLM_MASTER_KEY=your-super-secret-key
LITELLM_CONFIG_PATH=./config/litellm-config.yaml
LITELLM_AUTO_START=true

# Ollama Model Mappings
OLLAMA_CLAUDE_SONNET_MODEL=deepseek-coder-v2
OLLAMA_CLAUDE_OPUS_MODEL=qwen:7b
OLLAMA_CLAUDE_HAIKU_MODEL=llama3.1:8b
```

### **LiteLLM Configuration**
```yaml
# config/litellm-config.yaml
model_list:
  - model_name: claude-sonnet-4-5
    litellm_params:
      model: ollama/deepseek-coder-v2
      api_base: "http://localhost:11434"
  - model_name: claude-opus-4-5
    litellm_params:
      model: ollama/qwen:7b
      api_base: "http://localhost:11434"
  - model_name: claude-haiku-4-5
    litellm_params:
      model: ollama/llama3.1:8b
      api_base: "http://localhost:11434"

litellm_settings:
  master_key: ${LITELLM_MASTER_KEY}
  drop_params: true
  set_verbose: false
```

## 🚀 **USAGE**

### **1. Start LiteLLM Proxy**
```bash
# Start the proxy
litellm --config config/litellm-config.yaml

# Or use the RE Engine service (if integrated)
node -e "
const { LiteLLMProxyService } = require('./engine/dist/ai/litellm-proxy.service.js');
const service = new LiteLLMProxyService({
  enabled: true,
  proxyUrl: 'http://localhost:4000',
  masterKey: process.env.LITELLM_MASTER_KEY,
  configPath: './config/litellm-config.yaml'
});
service.initialize();
"
```

### **2. Configure Claude Code**
```bash
# Set environment variables
export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"

# Add to shell profile
echo 'export ANTHROPIC_BASE_URL="http://localhost:4000"' >> ~/.bashrc
echo 'export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"' >> ~/.bashrc
```

### **3. Use Claude Code**
```bash
# Test with Claude Code
claude --model claude-sonnet-4-5 "Hello! Can you introduce yourself?"

# Use for coding tasks
claude --model claude-sonnet-4-5 "Refactor this function to be more efficient"

# Use for analysis
claude --model claude-opus-4-5 "Analyze this business requirement and suggest implementation"
```

### **4. Use with RE Engine**
```typescript
import { OllamaService } from './engine/dist/ollama/ollama.service.js';

const ollamaService = new OllamaService({
  useProxy: true,
  proxyConfig: {
    enabled: true,
    proxyUrl: 'http://localhost:4000',
    masterKey: process.env.LITELLM_MASTER_KEY,
    configPath: './config/litellm-config.yaml',
    modelMappings: [
      {
        claudeModelName: 'claude-sonnet-4-5',
        ollamaModelName: 'deepseek-coder-v2',
        apiBase: 'http://localhost:11434'
      }
    ]
  },
  directConfig: {
    baseUrl: 'http://localhost:11434',
    model: 'deepseek-coder-v2'
  },
  defaultModel: 'deepseek-coder-v2',
  fallbackToDirect: true
});

await ollamaService.initialize();

// Use with Claude model compatibility
const response = await ollamaService.generateCompletion({
  prompt: 'Generate a Python function for data analysis',
  claudeModel: 'claude-sonnet-4-5',
  temperature: 0.7,
  maxTokens: 500
});

console.log(response.content);
```

## 🧪 **TESTING**

### **Run Test Suite**
```bash
# Comprehensive integration tests
node scripts/test-litellm-integration.js

# This tests:
- Prerequisites and dependencies
- LiteLLM proxy startup and health
- Model listing and availability
- Claude API compatibility
- Multiple model mappings
- Performance benchmarks
```

### **Manual Testing**
```bash
# Test proxy health
curl http://localhost:4000/health

# Test model listing
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
     http://localhost:4000/v1/models

# Test Claude API
curl -X POST http://localhost:4000/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -d '{
    "model": "claude-sonnet-4-5",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

## 📊 **PERFORMANCE**

### **Expected Performance**
- **Startup Time**: 3-5 seconds for LiteLLM proxy
- **Response Time**: 1-3 seconds depending on model and prompt
- **Memory Usage**: ~100-200MB for proxy + Ollama
- **Concurrent Requests**: Support for multiple simultaneous requests

### **Optimization Tips**
```bash
# Use smaller models for faster responses
claude --model claude-haiku-4-5 "Quick question"

# Adjust temperature for more deterministic responses
claude --model claude-sonnet-4-5 --temperature 0.1 "Technical question"

# Limit tokens for faster responses
claude --model claude-sonnet-4-5 --max-tokens 200 "Brief summary"
```

## 🔧 **ADVANCED CONFIGURATION**

### **Custom Model Mappings**
```yaml
# Add your own model mappings
model_list:
  - model_name: claude-custom
    litellm_params:
      model: ollama/your-custom-model
      api_base: "http://localhost:11434"
```

### **Proxy Settings**
```yaml
litellm_settings:
  master_key: ${LITELLM_MASTER_KEY}
  drop_params: true
  set_verbose: false
  max_budget: 10.0  # Budget tracking
  budget_duration: "30d"  # Budget period
```

### **Performance Tuning**
```yaml
litellm_settings:
  max_parallel_requests: 10
  request_timeout: 300
  retry_attempts: 3
```

## 🔒 **SECURITY**

### **Security Best Practices**
```bash
# Generate secure master key
openssl rand -hex 32

# Restrict proxy to localhost
# (Default in configuration)

# Use environment variables for secrets
export LITELLM_MASTER_KEY="your-secure-key"

# Regularly rotate keys
# Update master key and restart proxy
```

### **Network Security**
```bash
# Proxy only listens on localhost (recommended)
# For remote access, use SSH tunnel:
ssh -L 4000:localhost:4000 user@server

# Or use nginx reverse proxy with SSL
```

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **LiteLLM Won't Start**
```bash
# Check Python dependencies
pip install litellm[proxy]

# Check configuration file
litellm --config config/litellm-config.yaml --dry-run

# Check port availability
lsof -i :4000
```

#### **Claude Code Connection Issues**
```bash
# Verify proxy is running
curl http://localhost:4000/health

# Check environment variables
echo $ANTHROPIC_BASE_URL
echo $ANTHROPIC_AUTH_TOKEN

# Test API directly
curl -X POST http://localhost:4000/v1/messages \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet-4-5", "messages": [{"role": "user", "content": "test"}]}'
```

#### **Model Not Available**
```bash
# Check Ollama models
curl http://localhost:11434/api/tags

# Pull missing models
ollama pull deepseek-coder-v2
ollama pull qwen:7b
ollama pull llama3.1:8b

# Check model mapping in config
grep -A 5 "model_name:" config/litellm-config.yaml
```

#### **Performance Issues**
```bash
# Check system resources
top -p $(pgrep litellm)
top -p $(pgrep ollama)

# Monitor proxy logs
litellm --config config/litellm-config.yaml --verbose

# Test with smaller model
claude --model claude-haiku-4-5 "test"
```

## 📈 **MONITORING**

### **Health Monitoring**
```bash
# Proxy health endpoint
curl http://localhost:4000/health

# Model availability
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
     http://localhost:4000/v1/models

# System metrics
curl http://localhost:4000/metrics  # If enabled
```

### **Logging**
```bash
# Enable verbose logging
litellm --config config/litellm-config.yaml --verbose

# Log to file
litellm --config config/litellm-config.yaml --log-file /var/log/litellm.log
```

## 🔄 **MAINTENANCE**

### **Regular Maintenance**
```bash
# Update LiteLLM
pip install --upgrade litellm

# Update Ollama models
ollama pull deepseek-coder-v2
ollama pull qwen:7b

# Rotate master key
openssl rand -hex 32
# Update .env and restart proxy
```

### **Backup Configuration**
```bash
# Backup configuration
cp config/litellm-config.yaml config/litellm-config.yaml.backup
cp .env .env.backup

# Restore if needed
cp config/litellm-config.yaml.backup config/litellm-config.yaml
```

## 🎯 **NEXT STEPS**

### **Production Deployment**
1. **Set up process manager** (systemd, PM2)
2. **Configure reverse proxy** (nginx with SSL)
3. **Set up monitoring** (Prometheus, Grafana)
4. **Implement backup strategy**
5. **Configure alerting**

### **Advanced Features**
1. **Load balancing** for multiple Ollama instances
2. **Model routing** based on request type
3. **Cost tracking** and budget management
4. **Custom middleware** for request processing
5. **Integration with other AI providers**

---

## 🎉 **SUCCESS METRICS**

### **✅ Integration Complete When**
- [ ] LiteLLM proxy starts successfully
- [ ] Health checks pass
- [ ] Model listing works
- [ ] Claude Code connects and responds
- [ ] All model mappings work
- [ ] Performance benchmarks met
- [ ] Security measures in place

### **🚀 Ready for Production**
- [ ] Automated setup works
- [ ] Comprehensive testing passes
- [ ] Documentation is complete
- [ ] Troubleshooting guide available
- [ ] Monitoring and logging configured

---

**🎯 Your RE Engine now has seamless Claude Code compatibility with local Ollama models through LiteLLM!**
