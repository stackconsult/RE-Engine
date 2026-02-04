---
name: reengine-claude-code
description: Use Claude Code with Ollama for enhanced RE-Engine development and operations
---

# RE Engine Claude Code Integration

## When to use
Use this skill when you need to leverage Claude Code with Ollama models for RE-Engine development tasks.

## Environment Setup
- Ollama running with qwen3-coder, glm-4.7:cloud, gpt-oss:20b models
- Anthropic compatibility environment variables set
- Claude Code installed and configured

## Model Specializations
- **qwen3-coder**: Best for coding tasks, MCP server development, TypeScript/Node.js work
- **glm-4.7:cloud**: Best for message generation, reasoning about outreach strategies
- **gpt-oss:20b**: Best for operations, debugging, and general maintenance

## Procedure
1) Ensure Ollama service is running: `brew services list | grep ollama`
2) Set environment: `export ANTHROPIC_AUTH_TOKEN=ollama ANTHROPIC_BASE_URL=http://localhost:11434 ANTHROPIC_API_KEY=""`
3) Choose appropriate model for task:
   - Development: `claude --model qwen3-coder`
   - Messaging: `claude --model glm-4.7:cloud` 
   - Operations: `claude --model gpt-oss:20b`
4) Run Claude Code in RE-Engine directory
5) Leverage enhanced context window (64k) for complex codebase analysis

## Integration Points
- MCP Server development: Use qwen3-coder for complex tool implementations
- Message template optimization: Use glm-4.7:cloud for personalization strategies
- Production debugging: Use gpt-oss:20b for operational issues
- Code refactoring: Use qwen3-coder with full codebase context

## Mandatory checks
- Never expose API keys or secrets in Claude Code sessions
- Ensure approval-first policies are maintained in all generated code
- Test all code changes in development environment before production
- Update documentation when adding new Claude Code workflows
