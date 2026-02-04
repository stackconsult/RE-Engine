#!/bin/bash

# RE-Engine Claude Code + Ollama Setup Script
# This script configures the complete integration

set -e

echo "🚀 Setting up Claude Code + Ollama for RE-Engine..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama not found. Installing via Homebrew..."
    brew install ollama
    brew services start ollama
else
    echo "✅ Ollama found"
fi

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code not found. Installing..."
    curl -fsSL https://claude.ai/install.sh | bash
else
    echo "✅ Claude Code found"
fi

# Pull recommended models
echo "📥 Pulling recommended models..."
ollama pull qwen3-coder
ollama pull gpt-oss:20b

# Note: glm-4.7:cloud is available without pulling

# Set environment variables
echo "⚙️  Setting up environment variables..."
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
export ANTHROPIC_BASE_URL=http://localhost:11434

# Add to shell profile
if ! grep -q "ANTHROPIC_AUTH_TOKEN=ollama" ~/.zshrc; then
    echo 'export ANTHROPIC_AUTH_TOKEN=ollama' >> ~/.zshrc
    echo 'export ANTHROPIC_API_KEY=""' >> ~/.zshrc
    echo 'export ANTHROPIC_BASE_URL=http://localhost:11434' >> ~/.zshrc
fi

# Test Ollama Anthropic API compatibility
echo "🧪 Testing Ollama Anthropic API compatibility..."
curl -s -X POST http://localhost:11434/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: ollama" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "qwen3-coder",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "RE-Engine test"}]
  }' | jq -r '.content[0].text' | head -c 50

echo ""
echo "🔧 Configuring Claude Code with Ollama..."
ollama launch claude --config

# Create model aliases for easier usage
echo "🏷️  Creating model aliases..."
ollama cp qwen3-coder claude-3-5-sonnet  # For tools expecting default Claude model

echo ""
echo "✅ Claude Code + Ollama setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your terminal or run: source ~/.zshrc"
echo "2. Test with: claude --model qwen3-coder"
echo "3. Update OpenClaw config with provided template"
echo "4. Test RE-Engine integration"
echo ""
echo "🎯 Model usage:"
echo "  Development: claude --model qwen3-coder"
echo "  Messaging:   claude --model glm-4.7:cloud"
echo "  Operations:  claude --model gpt-oss:20b"
