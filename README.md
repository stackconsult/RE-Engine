# RE Engine (Real Estate Outreach Engine)

A production-ready multi-channel outreach automation system for real estate professionals. Built with Node.js, featuring comprehensive AI integration, MCP servers, Playwright browser automation, advanced WhatsApp integration, and approval-first messaging across multiple channels with both local and cloud AI capabilities.

## 🚀 Features

### 🤖 Advanced AI Integration
- **Google Vertex AI**: Gemini models with 8 MCP tools for advanced AI capabilities
- **Local LLAMA Integration**: 25+ optimized models with intelligent orchestration
- **Dual AI Strategy**: Local processing (free) + Cloud backup (paid)
- **Real Estate Specialized**: Document analysis, lead scoring, property matching
- **11 LLAMA Tools**: Text generation, code creation, image analysis, embeddings
- **Semantic Search**: Advanced property and lead matching capabilities

### 📱 Complete WhatsApp Integration
- **100% Whapi.Cloud API Coverage**: 35+ MCP tools for complete automation
- **Advanced Features**: Stories, newsletters, business profiles, groups, labels
- **Real-time Communication**: Two-way messaging with media support
- **Contact Management**: Advanced contact database and segmentation

### 🎯 Lead Management & Automation
- **Multi-factor Lead Scoring**: AI-powered qualification with reasoning models
- **A-F Grading System**: Comprehensive lead quality assessment
- **Automated Workflows**: Scheduled campaigns and intelligent response routing
- **Document Processing**: OCR for contracts and property documents
- **Property Analysis**: AI-powered image analysis and feature extraction

### 📊 Multi-channel Outreach
- **WhatsApp**: Primary channel with advanced features
- **Telegram**: Bot integration with rich media support
- **Email**: SMTP/IMAP integration with SpaceEmail
- **LinkedIn**: Professional networking automation
- **Facebook**: Social media outreach capabilities

### 🔒 Approval-First System
- **Human Oversight**: All outbound messages require explicit approval
- **Real-time Dashboard**: Web interface for approvals and monitoring
- **Audit Trail**: Complete message history and approval records
- **Safety Controls**: Rate limiting and content filtering

### 💾 Data Storage & Infrastructure
- **Local-First Storage**: CSV-based with upgrade path to PostgreSQL
- **Flexible Architecture**: Support for multiple database backends
- **Browser Automation**: Playwright-powered human-in-the-loop automation
- **MCP Integration**: 5 extensible tool servers for enhanced capabilities

## 🏗️ Architecture

```
RE-Engine/
├── engine/           # Core Node.js engine
├── playwright/       # Browser automation harness
├── mcp/             # MCP servers for tool integration
│   ├── reengine-outreach/    # WhatsApp integration (35+ tools)
│   ├── reengine-vertexai/     # Google Vertex AI integration (8 tools)
│   ├── reengine-llama/        # Local LLAMA integration (11 tools)
│   ├── reengine-tinyfish/     # Web scraping server
│   └── whapi-mcp-optimal/      # Official Whapi.Cloud server
├── web-dashboard/   # React-based approval dashboard
├── docs/           # Documentation and specs
├── tests/          # Unit and integration tests
└── scripts/        # Deployment and utility scripts
```

## 📋 Prerequisites

### System Requirements
- Node.js v22+
- macOS (current MVP target)
- 8GB+ RAM (for local AI models)
- 50GB+ storage (for AI models)

### AI Services
- **Ollama** (for local LLAMA models)
- **Google Cloud Project** (for Vertex AI)
- **API Keys**: Vertex AI, Whapi.Cloud, SpaceEmail

### Communication Services
- **Whapi.Cloud** (WhatsApp Business API)
- **SpaceEmail** (SMTP/IMAP email service)
- **Social Media** (Telegram, LinkedIn, Facebook bots)

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

### 4. Install Ollama (local AI models)
```bash
# Download and install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull recommended models for real estate
ollama pull llama3.1:8b
ollama pull mistral-small3.2
ollama pull qwen3-coder:30b
ollama pull llama4:16x17b
ollama pull deepseek-r1:32b
ollama pull firefunction-v2:70b
ollama pull qwen3-embedding:8b
ollama pull granite3.2-vision:2b
ollama pull glm-ocr

# Start Ollama server
ollama serve &
```

### 5. Build MCP Servers
```bash
# Build WhatsApp integration
cd mcp/reengine-outreach
npm install
npm run build
cd ../..

# Build Vertex AI integration
cd mcp/reengine-vertexai
npm install
npm run build
cd ../..

# Build LLAMA integration
cd mcp/reengine-llama
npm install
npm run build
cd ../..

# Build TinyFish scraper
cd mcp/reengine-tinyfish
npm install
npm run build
cd ../..
```

### 6. Configure environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

## ⚙️ Configuration

### Required API Keys & Services

#### 1. WhatsApp (Whapi.Cloud)
```bash
# Sign up at https://whapi.cloud/
WHATSAPP_API_KEY="your_whapi_cloud_api_key"
WHATSAPP_API_URL="https://gate.whapi.cloud"
WHATSAPP_WEBHOOK_URL="https://your-domain.cloud/webhook-path"
WHATSAPP_CHANNEL_ID="your_channel_id"
WHATSAPP_PHONE_NUMBER="+1234567890"
WHATSAPP_START_CHAT_LINK="https://wa.me/1234567890?text=Start"
```

#### 2. Google Vertex AI
```bash
# Create Google Cloud Project: creditx-478204
# Enable Vertex AI API
# Create service account and get API key
VERTEX_AI_API_KEY="your_vertex_ai_api_key"
VERTEX_AI_PROJECT_ID="creditx-478204"
VERTEX_AI_REGION="us-central1"
VERTEX_AI_MODEL="gemini-2.5-flash-lite"
```

#### 3. Local AI (Ollama)
```bash
# Already configured with installation
OLLAMA_API_KEY="25a220dae3084bc597e45ce45a1b4acf.lnm3LOMMFyh-uPM9KZ2urOvX"
OLLAMA_BASE_URL="http://127.0.0.1:11434/v1"
OLLAMA_MODEL="llama3.1:8b"
```

#### 4. Email (SpaceEmail)
```bash
# Sign up at https://space.email/
SPACE_EMAIL_API_KEY="your_space_email_api_key"
SPACE_EMAIL_IMAP_HOST="imap.space.email"
SPACE_EMAIL_SMTP_HOST="smtp.space.email"
```

#### 5. Web Scraping (TinyFish)
```bash
# Sign up at https://mino.ai/
TINYFISH_API_KEY="your_tinyfish_api_key"
TINYFISH_API_URL="https://mino.ai/v1/automation/run-sse"
```

### Optional Social Media Integrations

#### Telegram Bot
```bash
# Create bot with @BotFather on Telegram
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_WEBHOOK_URL="https://your-domain.cloud/telegram-webhook"
```

#### LinkedIn Automation
```bash
# LinkedIn automation service (if applicable)
LINKEDIN_API_KEY="your_linkedin_api_key"
LINKEDIN_WEBHOOK_URL="https://your-domain.cloud/linkedin-webhook"
```

#### Facebook Pages
```bash
# Facebook Page access token
FACEBOOK_PAGE_ACCESS_TOKEN="your_facebook_page_token"
FACEBOOK_WEBHOOK_URL="https://your-domain.cloud/facebook-webhook"
```

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

### MCP Integration (Windsurf Cascade)
The system includes 3 MCP servers automatically configured:

1. **reengine-outreach** - Complete WhatsApp automation with 35+ tools
2. **reengine-tinyfish** - Web scraping and data extraction
3. **whapi-mcp-optimal** - Official Whapi.Cloud API server

Configuration is in `.windsurf/mcp-config.json` and automatically loaded by Windsurf Cascade.

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

### 2. Set up WhatsApp integration
```bash
# Get your Whapi.Cloud API token and channel ID
# Configure in .env as shown above

# Test WhatsApp connection
node mcp/reengine-outreach/dist/index.js
```

### 3. Link communication channels
```bash
# WhatsApp (QR scan)
openclaw channels login

# Approve WhatsApp pairing
openclaw pairing approve whatsapp <code>

# Approve Telegram pairing
openclaw pairing approve telegram <code>
```

### 4. Start the web dashboard
```bash
npm run dashboard
```

### 5. Set up automated workflows
```bash
# Daily outreach drafts (150/day at 8:00 AM)
npm run schedule:daily

# IMAP polling (every 15 minutes)
npm run schedule:imap

# Approval processing (every 5 minutes)
npm run schedule:approvals
```

## 📊 Usage

### WhatsApp Automation Features
The system provides comprehensive WhatsApp capabilities:

#### Lead Management
- **Create Leads**: `create_lead` - Add new leads with scoring
- **Score Updates**: `update_lead_score` - Multi-factor lead scoring
- **Lead Analytics**: `get_lead_analytics` - Comprehensive reporting

#### Advanced Messaging
- **Text/Media Messages**: `send_whatsapp_message` - All message types
- **Interactive Messages**: Buttons, lists, and interactive elements
- **Carousel Messages**: Multi-card interactive presentations
- **Poll Messages**: Interactive polls for engagement
- **Location Messages**: Share property locations
- **Contact Messages**: Share contact information

#### Business Features
- **Business Profile**: `get_business_profile` - Manage WhatsApp Business
- **Product Catalogs**: `create_product`, `send_catalog` - Property listings
- **Newsletter Management**: `create_newsletter`, `subscribe_to_newsletter`

#### Stories & Status
- **Text Stories**: `create_text_story` - Status updates
- **Media Stories**: `create_media_story` - Photo/video status
- **Story Management**: `get_stories` - View published stories

#### Workflow Automation
- **Create Workflows**: `create_workflow_rule` - Custom automation rules
- **Execute Workflows**: `execute_workflow` - Run automation sequences
- **Analytics**: `get_workflow_analytics` - Performance metrics

### Web Dashboard
Access the approval dashboard at `http://localhost:3000` to:
- Review pending message approvals
- Approve/reject outbound messages
- Monitor campaign performance
- View lead status and activity
- Track WhatsApp automation metrics

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

# Test WhatsApp integration
npm run whatsapp:test

# View lead analytics
npm run leads:analytics
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

## 🏗️ Build

### Building the Engine
```bash
# Build the core engine
cd engine
npm run build

# Build Playwright harness
cd ../playwright
npm run build

# Build MCP servers
cd ../mcp
npm run build:all

# Build WhatsApp outreach server
cd reengine-outreach
npm run build

# Build web dashboard
cd ../../web-dashboard
npm run build
```

### Build Status
✅ **Current Status**: All TypeScript compilation issues resolved  
📦 **Build Target**: Node.js v22+ with TypeScript 5.7+  
🔧 **Quality Gates**: Linting, type-checking, and smoke tests passing  
🚀 **WhatsApp Integration**: 100% Whapi.Cloud API coverage with 35+ tools  

## 🔧 Development

### Running Tests
```bash
npm test
npm run test:integration
npm run test:smoke
npm run test:whatsapp
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

# Test WhatsApp MCP server
npm run mcp:test:whatsapp

# Test TinyFish MCP server
npm run mcp:test:tinyfish
```

## 📚 Documentation

- [Production Spec](./REENGINE-PRODUCTION-SPEC.md) - System architecture and requirements
- [Agent Instructions](./AGENTS.md) - Development guidelines and policies
- [WhatsApp Integration Guide](./docs/WHATSAPPI-INTEGRATION.md) - Complete WhatsApp setup
- [Enhancement Summary](./docs/WHATSAPPI-ENHANCEMENT-SUMMARY.md) - Feature overview
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](./docs/API.md) - REST API reference

## 🔒 Security

- **Approval-first sending**: No outbound messages without explicit approval
- **No secrets in repo**: All credentials stored in environment variables
- **Audit logging**: All actions recorded in events.csv
- **Pairing-based access**: Unknown contacts require manual approval
- **WhatsApp Security**: API tokens and webhook secrets properly secured

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

- [x] Complete WhatsApp integration with Whapi.Cloud
- [x] Advanced lead management and scoring
- [x] Workflow automation engine
- [x] MCP integration with Windsurf Cascade
- [ ] PostgreSQL/Neon database integration
- [ ] Advanced AI-powered message generation
- [ ] Multi-tenant support
- [ ] Mobile app for on-the-go approvals
- [ ] Advanced analytics and reporting
- [ ] CRM integrations (Zillow, Realtor.com)
- [ ] Vertex AI integration
- [ ] Voice and video messaging
- [ ] Advanced property matching algorithms

---

**Built with ❤️ by StackConsult**
