# RE Engine (Real Estate Outreach Engine)

A production-ready multi-channel outreach automation system for real estate professionals. Built with Node.js, featuring MCP integration, Playwright browser automation, and approval-first messaging across WhatsApp, Telegram, Email, LinkedIn, and Facebook.

## 🚀 Features

- **Multi-channel outreach**: WhatsApp, Telegram, Email, LinkedIn, Facebook
- **Approval-first system**: All outbound messages require explicit approval
- **CSV-based storage**: Local-first data storage with upgrade path to PostgreSQL
- **Browser automation**: Playwright-powered human-in-the-loop automation
- **MCP integration**: Extensible tool servers for enhanced capabilities
- **Real-time monitoring**: Web dashboard for approvals and oversight
- **Automated workflows**: Scheduled campaigns and response routing

## 🏗️ Architecture

```
RE-Engine/
├── engine/           # Core Node.js engine
├── playwright/       # Browser automation harness
├── mcp/             # MCP servers for tool integration
├── web-dashboard/   # React-based approval dashboard
├── docs/           # Documentation and specs
├── tests/          # Unit and integration tests
└── scripts/        # Deployment and utility scripts
```

## 📋 Prerequisites

- Node.js v22+
- macOS (current MVP target)
- Dedicated WhatsApp number
- SpaceEmail account (for SMTP/IMAP)

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/stackconsult/RE-Engine.git
cd RE-Engine
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install OpenClaw (required for messaging)
```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### 4. Install Ollama (AI model provider)
```bash
# Download and install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull recommended models
ollama pull qwen:7b
ollama pull deepseek-coder:6.7b

# Start Ollama server
ollama serve &
```

### 5. Configure environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

## ⚙️ Configuration

### Environment Variables
```bash
# SpaceEmail Configuration
SPACEMAIL_USER="your-email@domain.com"
SPACEMAIL_PASS="your-password"
SPACEMAIL_IMAP_HOST="mail.spacemail.com"
SPACEMAIL_IMAP_PORT="993"
SPACEMAIL_SMTP_HOST="mail.spacemail.com"
SPACEMAIL_SMTP_PORT="465"

# Telegram Configuration
RE_TELEGRAM_ALERT_TARGET="your-chat-id"
RE_CONTACT_CAPTURE_ALERTS="telegram"

# Ollama Configuration
OLLAMA_API_KEY="your-ollama-api-key"
```

### OpenClaw + Ollama Configuration
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
  },
  "channels": {
    "whatsapp": {
      "dmPolicy": "pairing",
      "allowFrom": ["+1YOUR_OWNER_PHONE"],
      "ackReaction": {
        "emoji": "👀",
        "direct": true,
        "group": "mentions"
      }
    },
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_BOT_TOKEN",
      "dmPolicy": "pairing"
    }
  },
  "browser": {
    "enabled": true,
    "defaultProfile": "openclaw"
  }
}
```

## 🚀 Quick Start

### 1. Initialize data storage
```bash
mkdir -p data
# The system will create CSV files automatically
```

### 2. Link communication channels
```bash
# WhatsApp (QR scan)
openclaw channels login

# Approve WhatsApp pairing
openclaw pairing approve whatsapp <code>

# Approve Telegram pairing
openclaw pairing approve telegram <code>
```

### 3. Start the web dashboard
```bash
npm run dashboard
```

### 4. Set up automated workflows
```bash
# Daily outreach drafts (150/day at 8:00 AM)
npm run schedule:daily

# IMAP polling (every 15 minutes)
npm run schedule:imap

# Approval processing (every 5 minutes)
npm run schedule:approvals
```

## 📊 Usage

### Web Dashboard
Access the approval dashboard at `http://localhost:3000` to:
- Review pending message approvals
- Approve/reject outbound messages
- Monitor campaign performance
- View lead status and activity

### Command Line Interface
```bash
# Show pending approvals
npm run approvals:show

# Approve a message
npm run approvals:approve <approval_id>

# Reject a message
npm run approvals:reject <approval_id>

# Generate daily reports
npm run report:daily
```

## 🔄 Data Storage

### CSV-based Storage (MVP)
The system uses CSV files for local-first data storage:
- `leads.csv` - Lead information and status
- `approvals.csv` - Message approval queue
- `events.csv` - Activity log and audit trail
- `contacts.csv` - Channel contact mappings
- `identities.csv` - Social media identity tracking

### Upgrade Path
Migration path to PostgreSQL (Neon/Supabase):
```bash
npm run migrate:postgres
```

## 🔧 Development

### Running Tests
```bash
npm test
npm run test:integration
npm run test:smoke
```

### Code Quality
```bash
npm run lint
npm run format
npm run type-check
```

### MCP Development
```bash
# Start MCP servers
npm run mcp:start

# Test MCP integration
npm run mcp:test
```

## 📚 Documentation

- [Production Spec](./REENGINE-PRODUCTION-SPEC.md) - System architecture and requirements
- [Agent Instructions](./AGENTS.md) - Development guidelines and policies
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](./docs/API.md) - REST API reference

## 🔒 Security

- **Approval-first sending**: No outbound messages without explicit approval
- **No secrets in repo**: All credentials stored in environment variables
- **Audit logging**: All actions recorded in events.csv
- **Pairing-based access**: Unknown contacts require manual approval

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Documentation: [docs/](./docs/)
- Issues: [GitHub Issues](https://github.com/stackconsult/RE-Engine/issues)
- Community: [Discussions](https://github.com/stackconsult/RE-Engine/discussions)

## 🗺️ Roadmap

- [ ] PostgreSQL/Neon database integration
- [ ] Advanced AI-powered message generation
- [ ] Multi-tenant support
- [ ] Mobile app for on-the-go approvals
- [ ] Advanced analytics and reporting
- [ ] CRM integrations (Zillow, Realtor.com)

---

**Built with ❤️ by StackConsult**
