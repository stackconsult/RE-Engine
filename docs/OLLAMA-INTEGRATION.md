# Ollama Integration Guide

This document covers the integration of Ollama with RE Engine for local AI model support.

## Overview

RE Engine now supports Ollama as a local AI model provider, enabling:
- **Privacy-first AI**: All models run locally on your machine
- **Cost-effective**: No API charges for model usage
- **Offline capability**: Works without internet connectivity
- **Custom models**: Support for any Ollama-compatible model

## Installation

### Automatic Setup
```bash
npm run setup:ollama
```

### Manual Setup
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull recommended models
ollama pull qwen:7b
ollama pull deepseek-coder:6.7b

# Start server
ollama serve &
```

## Configuration

### Environment Variables
```bash
# Add to .env
OLLAMA_API_KEY=your-ollama-api-key
```

### OpenClaw Configuration
Add to `~/.openclaw/openclaw.json`:
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/qwen:7b"
      }
    }
  },
  "models": {
    "providers": {
      "ollama": {
        "apiKey": "${OLLAMA_API_KEY}",
        "baseUrl": "http://127.0.0.1:11434/v1",
        "api": "openai-responses",
        "models": [
          {
            "id": "qwen:7b",
            "name": "Qwen 7B",
            "reasoning": false,
            "input": ["text"],
            "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0},
            "contextWindow": 32768,
            "maxTokens": 32768
          }
        ]
      }
    }
  }
}
```

## Recommended Models

### Primary Model: Qwen 7B
- **Model**: `qwen:7b`
- **Context**: 32k tokens
- **Use Case**: General purpose, coding, analysis
- **Size**: 4.5GB

### Secondary Model: DeepSeek Coder 6.7B
- **Model**: `deepseek-coder:6.7b`
- **Context**: 32k tokens
- **Use Case**: Code generation, debugging
- **Size**: 3.8GB

## Testing

### Verify Ollama Installation
```bash
npm run test:ollama
```

### Test OpenClaw Integration
```bash
openclaw agent --session-id main --message "Hello from RE Engine with Ollama!"
```

## Troubleshooting

### Common Issues

1. **Ollama server not running**
   ```bash
   ollama serve &
   ```

2. **Model not found**
   ```bash
   ollama list
   ollama pull qwen:7b
   ```

3. **API key errors**
   - Ensure `OLLAMA_API_KEY` is set in environment
   - Check OpenClaw configuration

4. **Connection refused**
   - Verify Ollama is running on port 11434
   - Check firewall settings

### Debug Commands
```bash
# Check Ollama status
ollama ps

# Check available models
ollama list

# Test direct API
curl http://localhost:11434/api/tags

# Check OpenClaw models
openclaw models list --provider ollama
```

## Performance Optimization

### Memory Management
- Monitor RAM usage with large models
- Consider system specifications:
  - **Minimum**: 8GB RAM
  - **Recommended**: 16GB+ RAM

### Model Selection
- Use smaller models for simple tasks
- Reserve larger models for complex analysis
- Consider model context windows for your use case

## Security

### API Key Protection
- API keys are automatically added to `.gitignore`
- Store keys in environment variables, not code
- Use different keys for different environments

### Network Security
- Ollama runs on localhost by default
- No external API calls required
- All processing stays on your machine

## Advanced Configuration

### Custom Models
Add additional models to OpenClaw configuration:
```json
{
  "id": "custom-model",
  "name": "Custom Model",
  "reasoning": false,
  "input": ["text"],
  "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0},
  "contextWindow": 32768,
  "maxTokens": 32768
}
```

### Multiple Providers
Configure fallback models:
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/qwen:7b",
        "fallback": ["ollama/deepseek-coder:6.7b"]
      }
    }
  }
}
```

## Integration with RE Engine

### Message Generation
Ollama models can generate personalized outreach messages based on:
- Lead profiles
- Property details
- Market data
- Historical performance

### Content Analysis
Analyze responses and engagement patterns:
- Sentiment analysis
- Intent detection
- Lead scoring
- Follow-up recommendations

### Automated Workflows
- Draft message generation
- Response categorization
- Lead qualification
- Campaign optimization

## Support

For additional help:
- Check [Ollama Documentation](https://docs.ollama.com)
- Review [OpenClaw Documentation](https://docs.openclaw.ai)
- Open an issue on [GitHub](https://github.com/stackconsult/RE-Engine/issues)
