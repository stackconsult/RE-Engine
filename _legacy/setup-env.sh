#!/bin/bash

# RE Engine Environment Setup Script
# This script helps set up environment variables securely

set -e

echo "🔧 RE Engine Environment Setup"
echo "================================"

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backup created as .env.backup"
    cp .env .env.backup
fi

# Create .env from template if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created successfully"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔐 Next Steps:"
echo "1. Edit .env file with your actual API keys and secrets"
echo "2. Replace placeholder values like 'your_api_key_here'"
echo "3. Never commit .env file to version control"
echo ""
echo "📋 Required Environment Variables:"
echo "- OLLAMA_API_KEY: Your Ollama API key"
echo "- OLLAMA_DEVICE_KEY: Your SSH device key for Ollama"
echo "- JWT_SECRET: Secret for JWT token signing"
echo "- SESSION_SECRET: Secret for session management"
echo ""
echo "⚡ Quick Edit Commands:"
echo "nano .env          # Edit with nano"
echo "vim .env           # Edit with vim"
echo "code .env          # Edit with VS Code"
echo ""
echo "🔒 Security Reminder:"
echo "The .env file is already in .gitignore and will not be committed."
