# Claude Code + Ollama Integration for RE-Engine

## Overview

This document describes the integration of Claude Code with Ollama to enhance RE-Engine development and operations capabilities.

## Architecture

```
RE-Engine + Claude Code + Ollama
├── Claude Code (AI coding assistant)
├── Ollama (Local model server)
│   ├── qwen3-coder (30B parameter, coding specialist)
│   ├── glm-4.7:cloud (Reasoning specialist)
│   └── gpt-oss:20b (General purpose)
├── Anthropic Compatibility API
└── RE-Engine (Production outreach system)
```

## Installation

### Quick Setup
```bash
# Run the automated setup script
bash scripts/setup-claude-code.sh
```

### Manual Setup
```bash
# 1. Install Ollama
brew install ollama
brew services start ollama

# 2. Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# 3. Pull models
ollama pull qwen3-coder
ollama pull gpt-oss:20b

# 4. Configure environment
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
export ANTHROPIC_BASE_URL=http://localhost:11434

# 5. Test integration
claude --model qwen3-coder
```

## Model Specializations

### qwen3-coder (Local)
- **Purpose**: Coding and development tasks
- **Size**: 30B parameters
- **VRAM**: 24GB recommended
- **Context**: 64k tokens
- **Use Cases**: MCP server development, TypeScript coding, refactoring

### glm-4.7:cloud (Cloud)
- **Purpose**: Reasoning and message generation
- **Context**: 32k tokens
- **Use Cases**: Outreach strategy, message personalization, campaign optimization

### gpt-oss:20b (Local)
- **Purpose**: General operations and maintenance
- **Size**: 20B parameters
- **Context**: 64k tokens
- **Use Cases**: Debugging, operations, documentation

## Usage Patterns

### Development Workflow
```bash
# Start Claude Code for RE-Engine development
cd /path/to/RE-Engine
export ANTHROPIC_AUTH_TOKEN=ollama ANTHROPIC_BASE_URL=http://localhost:11434 ANTHROPIC_API_KEY=""
claude --model qwen3-coder

# In Claude Code:
# - Analyze entire codebase with 64k context
# - Refactor MCP servers
# - Add new features to engine
# - Debug production issues
```

### Message Generation Workflow
```bash
# Use reasoning model for outreach optimization
claude --model glm-4.7:cloud

# In Claude Code:
# - Analyze lead data for personalization
# - Generate message templates
# - Optimize campaign strategies
# - Review approval workflows
```

### Operations Workflow
```bash
# Use general model for maintenance
claude --model gpt-oss:20b

# In Claude Code:
# - Debug production issues
# - Update documentation
# - Review system logs
# - Plan maintenance tasks
```

## Integration Points

### OpenClaw Configuration
Update `~/.openclaw/openclaw.json` with Claude Code + Ollama settings:

```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "api": "anthropic-compatibility",
        "models": [
          {
            "id": "qwen3-coder",
            "name": "Qwen 3 Coder",
            "contextWindow": 65536,
            "maxTokens": 32768
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {"primary": "ollama/qwen3-coder"}
    }
  }
}
```

### MCP Server Enhancement
Leverage enhanced AI capabilities in MCP servers:

- **reengine-core**: Better approval reasoning
- **reengine-browser**: Enhanced automation scripts
- **reengine-integrations**: Improved API integrations
- **reengine-tinyfish**: Advanced data scraping

## Benefits for RE-Engine

### Enhanced Development
- **64k Context Window**: Analyze entire codebase
- **Coding Specialization**: Better TypeScript/Node.js support
- **Real-time Analysis**: Immediate code quality feedback

### Improved Operations
- **Better Debugging**: Enhanced error analysis
- **Automated Documentation**: Generate docs from code
- **Performance Optimization**: Code optimization suggestions

### Advanced Message Generation
- **Personalization**: Better lead-specific messaging
- **A/B Testing**: Generate message variations
- **Compliance**: Ensure regulatory compliance

## Testing

### Verify Installation
```bash
# Test Ollama API compatibility
curl -X POST http://localhost:11434/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: ollama" \
  -d '{"model": "qwen3-coder", "max_tokens": 100, "messages": [{"role": "user", "content": "Test"}]}'

# Test Claude Code
claude --model qwen3-coder --help
```

### Test RE-Engine Integration
```bash
# Test with RE-Engine codebase
cd engine/
claude --model qwen3-coder

# In Claude Code, run:
# "Analyze this RE-Engine codebase and suggest improvements"
```

## Troubleshooting

### Common Issues

**Ollama not running**
```bash
brew services list | grep ollama
brew services start ollama
```

**Environment variables not set**
```bash
echo $ANTHROPIC_AUTH_TOKEN  # Should be "ollama"
echo $ANTHROPIC_BASE_URL    # Should be "http://localhost:11434"
```

**Model not found**
```bash
ollama list
ollama pull qwen3-coder
```

**Claude Code not found**
```bash
which claude
curl -fsSL https://claude.ai/install.sh | bash
```

### Performance Optimization

**VRAM Issues**
- Use cloud models (glm-4.7:cloud) for lower VRAM usage
- Reduce context length if needed
- Monitor VRAM usage with `ollama ps`

**Slow Response**
- Use local models for faster response
- Ensure sufficient system RAM
- Consider model size vs. speed trade-offs

## Security Considerations

- **No API Keys**: Local models don't require external API keys
- **Data Privacy**: All processing stays local
- **Approval-First**: Maintain approval-first messaging policies
- **No Secrets**: Never commit credentials to repository

## Future Enhancements

- **Fine-tuned Models**: Train RE-Engine specific models
- **Advanced Tooling**: Enhanced MCP tool capabilities
- **Multi-modal**: Image processing for real estate
- **Real-time Integration**: Live campaign optimization

## Support

- **Documentation**: `/docs/`
- **Issues**: GitHub Issues
- **Community**: Discussions
- **Updates**: Check for model updates regularly
