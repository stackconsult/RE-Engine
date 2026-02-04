# Environment Setup Guide

## Overview

The RE Engine uses environment variables for configuration and secrets. This guide explains how to properly set up and manage your environment configuration.

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Or use the setup script:**
   ```bash
   ./scripts/setup-env.sh
   ```

3. **Edit your .env file with actual values:**
   ```bash
   nano .env
   ```

## Required Environment Variables

### AI/LLM Configuration
- `OLLAMA_API_KEY`: Your Ollama API key for cloud model access
- `OLLAMA_DEVICE_KEY`: SSH device key for Ollama authentication
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://127.0.0.1:11434/v1)
- `OLLAMA_MODEL`: Default model to use (default: qwen:7b)

### Security
- `JWT_SECRET`: Secret key for JWT token signing (use a strong random string)
- `SESSION_SECRET`: Secret key for session management

### Database (if using PostgreSQL)
- `DB_TYPE`: Set to 'postgresql' for production
- `DB_HOST`: Database host
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password

## Security Best Practices

### ✅ DO:
- Store secrets in `.env` file only
- Use strong, random secrets for JWT_SECRET and SESSION_SECRET
- Keep `.env` in `.gitignore` (already configured)
- Rotate API keys regularly
- Use different keys for development and production

### ❌ DON'T:
- Commit `.env` to version control
- Share API keys in code, comments, or documentation
- Use default/weak secrets
- Store keys in public repositories

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
PLAYWRIGHT_HEADLESS=false
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
PLAYWRIGHT_HEADLESS=true
DEBUG=false
```

## API Key Setup

### Ollama API Key
1. Go to [Ollama Account Settings](https://ollama.com/account)
2. Generate a new API key
3. Add to `.env`: `OLLAMA_API_KEY=your_key_here`

### Ollama Device Key
1. Run `ollama signin` in CLI
2. Or add device key manually in Ollama app settings
3. Add to `.env`: `OLLAMA_DEVICE_KEY=your_ssh_key_here`

## Troubleshooting

### Common Issues

**"API key not found" error:**
- Check that `.env` file exists
- Verify variable names match exactly
- Restart application after changing `.env`

**"Invalid JWT secret" error:**
- Ensure JWT_SECRET is set and not empty
- Use a strong random string (64+ characters)

**Permission denied:**
- Ensure `.env` file has correct permissions: `chmod 600 .env`

### Validation Script

Run the environment validation script:
```bash
./scripts/validate-env.sh
```

## File Structure

```
RE-Engine/
├── .env                 # Your secrets (never commit)
├── .env.example         # Template with placeholders
├── .gitignore           # Excludes .env from version control
├── scripts/
│   ├── setup-env.sh     # Environment setup script
│   └── validate-env.sh  # Environment validation script
└── docs/
    └── ENVIRONMENT-SETUP.md  # This guide
```

## Support

For issues with environment setup:
1. Check this guide first
2. Run the validation script
3. Check the logs for specific error messages
4. Ensure all required variables are set
