# Getting Started with RE Engine

This guide will help you set up and configure the RE Engine for WhatsApp automation and multi-channel outreach.

## 🎯 Prerequisites

Before you begin, make sure you have:

- **Node.js v22+** installed
- **macOS** (current MVP target)
- **Whapi.Cloud account** with WhatsApp number
- **SpaceEmail account** (for SMTP/IMAP)
- **Git** installed

## 📋 Quick Setup Overview

1. **Clone and install** the RE Engine
2. **Set up WhatsApp** integration with Whapi.Cloud
3. **Configure MCP servers** for Windsurf Cascade
4. **Install dependencies** (OpenClaw, Ollama)
5. **Configure environment** variables
6. **Test the integration**
7. **Start the dashboard**

## 🚀 Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/stackconsult/RE-Engine.git
cd RE-Engine

# Install main dependencies
npm install

# Build WhatsApp MCP server
cd mcp/reengine-outreach
npm install
npm run build
cd ../..
```

### 2. Set Up WhatsApp Integration

#### Create Whapi.Cloud Account
1. Go to [Whapi.Cloud](https://whapi.cloud)
2. Sign up for an account
3. Connect your WhatsApp number via QR code
4. Get your API token from the dashboard

#### Configure WhatsApp Environment
```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your WhatsApp credentials:
```bash
# WhatsApp API Configuration (Whapi.Cloud)
WHATSAPP_API_KEY="your_whapi_cloud_api_key_here"
WHATSAPP_API_URL="https://gate.whapi.cloud"
WHATSAPP_WEBHOOK_URL="https://your-domain.cloud/webhook-path"
WHATSAPP_CHANNEL_ID="your_channel_id_here"
WHATSAPP_PHONE_NUMBER="+1234567890"
WHATSAPP_START_CHAT_LINK="https://wa.me/1234567890?text=Start"

# SpaceEmail Configuration
SPACEMAIL_USER="your-email@domain.com"
SPACEMAIL_PASS="your_password"
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

### 3. Configure MCP Integration

The RE Engine includes 3 MCP servers automatically configured in `.windsurf/mcp-config.json`:

1. **reengine-outreach** - Complete WhatsApp automation (35+ tools)
2. **reengine-tinyfish** - Web scraping and data extraction
3. **whapi-mcp-optimal** - Official Whapi.Cloud API server

These are automatically loaded by Windsurf Cascade when you start the system.

### 4. Install Additional Dependencies

#### Install OpenClaw (Messaging Framework)
```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

#### Install Ollama (AI Model Provider)
```bash
# Download and install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull recommended models
ollama pull qwen:7b
ollama pull deepseek-coder:6.7b

# Start Ollama server
ollama serve &
```

### 5. Configure OpenClaw

Create `~/.openclaw/openclaw.json`:
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

### 6. Initialize Data Storage

```bash
# Create data directory
mkdir -p data

# The system will create CSV files automatically:
# - leads.csv
# - approvals.csv
# - events.csv
# - contacts.csv
# - identities.csv
```

### 7. Test WhatsApp Integration

```bash
# Test WhatsApp MCP server
node mcp/reengine-outreach/dist/index.js

# Test basic WhatsApp connection
curl -X POST http://localhost:3000/api/test-whatsapp
```

### 8. Link Communication Channels

#### WhatsApp Setup
```bash
# Login to WhatsApp
openclaw channels login

# Approve WhatsApp pairing (scan QR code)
openclaw pairing approve whatsapp <code>
```

#### Telegram Setup (Optional)
```bash
# Create a bot at https://t.me/BotFather
# Get your bot token and add to .env

# Approve Telegram pairing
openclaw pairing approve telegram <code>
```

### 9. Start the System

#### Start Web Dashboard
```bash
npm run dashboard
```

Access the dashboard at `http://localhost:3000`

#### Start Automated Workflows
```bash
# Daily outreach drafts (150/day at 8:00 AM)
npm run schedule:daily

# IMAP polling (every 15 minutes)
npm run schedule:imap

# Approval processing (every 5 minutes)
npm run schedule:approvals
```

## 🎯 First WhatsApp Campaign

### 1. Create a Lead
Use the MCP tools in Windsurf Cascade:

```javascript
// Create a new lead
await create_lead({
  phone: "+1234567890",
  name: "John Doe",
  source: "whatsapp"
});
```

### 2. Set Up Lead Scoring
```javascript
// Update lead score with multiple factors
await update_lead_score("lead-id", [
  { type: "engagement", weight: 0.4, value: 0.8 },
  { type: "response", weight: 0.3, value: 0.9 },
  { type: "timing", weight: 0.2, value: 0.7 },
  { type: "context", weight: 0.1, value: 0.8 }
]);
```

### 3. Create Outreach Sequence
```javascript
// Create automated outreach sequence
await create_outreach_sequence({
  leadId: "lead-id",
  name: "Real Estate Nurturing",
  steps: [
    {
      id: "step-1",
      type: "cold_message",
      delay: 0,
      message: "Hi {{name}}! I noticed you're interested in real estate...",
      status: "pending"
    },
    {
      id: "step-2",
      type: "follow_up",
      delay: 24,
      message: "Following up on our conversation...",
      status: "pending"
    }
  ]
});
```

### 4. Send WhatsApp Message
```javascript
// Send text message
await send_whatsapp_message({
  to: "+1234567890",
  body: "Hello! How can I help you today?",
  type: "text"
});

// Send interactive carousel
await send_carousel({
  to: "+1234567890",
  cards: [
    {
      header: "Luxury Villa",
      body: "5 bedroom villa with ocean view",
      mediaUrl: "https://example.com/villa.jpg",
      buttonId: "view_villa",
      buttonText: "View Details"
    }
  ]
});
```

## 📊 Monitor Your Campaign

### Web Dashboard Features
- **Approvals Queue**: Review and approve outbound messages
- **Lead Status**: Track lead progression and scores
- **Campaign Analytics**: Monitor message performance
- **Real-time Activity**: Live updates on WhatsApp interactions

### Command Line Monitoring
```bash
# Show pending approvals
npm run approvals:show

# Approve a message
npm run approvals:approve <approval_id>

# Generate daily report
npm run report:daily

# View lead analytics
npm run leads:analytics
```

## 🔧 Advanced Configuration

### Custom Workflows
Create custom automation rules in Windsurf Cascade:

```javascript
// Create high-score lead workflow
await create_workflow_rule({
  name: "Hot Lead Alert",
  trigger: "score_threshold",
  conditions: {
    score: { min: 80 },
    status: "engaged"
  },
  actions: [
    {
      type: "send_message",
      parameters: {
        message: "Hot lead detected! Immediate follow-up required.",
        delay: 0
      }
    },
    {
      type: "notify_admin",
      parameters: {
        message: "Hot lead: {{name}} ({{phone}} scored {{score}}",
        delay: 0
      }
    }
  ],
  enabled: true,
  priority: 1
});
```

### Business Features
```javascript
// Create product catalog
await create_product({
  name: "Luxury Villa",
  description: "5 bedroom oceanfront property",
  price: 2500000,
  currency: "USD",
  imageUrl: "https://example.com/villa.jpg"
});

// Send product catalog
await send_catalog({
  to: "+1234567890",
  contactId: "contact-id"
});
```

### Newsletter Management
```javascript
// Create newsletter
await create_newsletter({
  name: "Property Weekly",
  description: "Weekly property updates and market insights"
});

// Subscribe contact
await subscribe_to_newsletter({
  newsletterId: "newsletter-id",
  contactId: "contact-id"
});
```

## 🚨 Troubleshooting

### Common Issues

#### WhatsApp Connection Failed
1. Check your WHATSAPP_API_KEY in `.env`
2. Verify your Whapi.Cloud account is active
3. Ensure webhook URL is accessible

#### MCP Server Not Starting
1. Check if Node.js v22+ is installed
2. Verify dependencies: `cd mcp/reengine-outreach && npm install`
3. Check TypeScript compilation: `npm run build`

#### OpenClaw Pairing Issues
1. Ensure OpenClaw daemon is running: `openclaw status`
2. Check configuration in `~/.openclaw/openclaw.json`
3. Verify phone number format: `+1234567890`

#### Dashboard Not Loading
1. Check if port 3000 is available
2. Verify environment variables are set
3. Check logs: `npm run dashboard:logs`

### Getting Help

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/stackconsult/RE-Engine/issues)
- **Community**: [Discussions](https://github.com/stackconsult/RE-Engine/discussions)

## 🎉 Next Steps

Once you have the basic setup working:

1. **Explore MCP Tools**: Try all 35+ WhatsApp automation tools
2. **Set Up Workflows**: Create custom automation rules
3. **Configure Webhooks**: Set up real-time event handling
4. **Scale Up**: Consider upgrading your Whapi.Cloud plan
5. **Integrate CRM**: Connect with your existing CRM system

## 📚 Additional Resources

- [WhatsApp Integration Guide](./WHATSAPPI-INTEGRATION.md) - Complete API reference
- [Enhancement Summary](./WHATSAPPI-ENHANCEMENT-SUMMARY.md) - Feature overview
- [Production Spec](./REENGINE-PRODUCTION-SPEC.md) - System architecture
- [Agent Instructions](./AGENTS.md) - Development guidelines

---

**Ready to automate your WhatsApp outreach! 🚀**
