#!/bin/bash

# RE Engine Ollama Setup Script
# This script installs and configures Ollama for RE Engine

set -e

echo "🦞 Setting up Ollama for RE Engine..."

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
else
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
fi

# Start Ollama server
echo "🚀 Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama server to be ready..."
sleep 5

# Pull recommended models
echo "📥 Pulling recommended models..."
ollama pull qwen:7b
ollama pull deepseek-coder:6.7b

# Verify installation
echo "🔍 Verifying installation..."
ollama list

echo "✅ Ollama setup complete!"
echo "📝 Don't forget to set your OLLAMA_API_KEY in your environment"
echo "🌐 Ollama server is running at http://localhost:11434"
