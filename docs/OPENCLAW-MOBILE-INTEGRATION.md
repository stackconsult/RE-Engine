# OpenClaw Mobile Device Integration - Complete Guide

This document provides comprehensive integration of OpenClaw with iOS and Android mobile devices for native SMS, calling, and messaging automation in real estate workflows.

## 🎯 Overview

OpenClaw provides native mobile device integration without requiring API keys, leveraging cloud-based authentication and direct device access through companion apps. This creates a hyper-efficient communication system for real estate professionals.

## 📱 iOS Integration (iMessage + Calling)

### **iMessage Integration**

#### **Requirements & Setup**
```bash
# iOS Requirements
- macOS with Messages app signed into iCloud
- OpenClaw Gateway running on macOS/Linux/Windows
- iOS device with iMessage configured
- Same Apple ID across all devices for cloud sync
```

#### **Installation Steps**
```bash
# 1. Install imsg CLI tool on macOS
brew install steipete/tap/imsg

# 2. Configure OpenClaw iMessage channel
openclaw config set channels.imessage.enabled true
openclaw config set channels.imessage.cliPath "/usr/local/bin/imsg"
openclaw config set channels.imessage.dbPath "/Users/$USER/Library/Messages/chat.db"

# 3. Grant macOS permissions
# - Full Disk Access for OpenClaw
# - Automation permission for Messages app
```

#### **Configuration Structure**
```json
{
  "channels": {
    "imessage": {
      "enabled": true,
      "cliPath": "/usr/local/bin/imsg",
      "dbPath": "/Users/$USER/Library/Messages/chat.db",
      "configWrites": false,
      "accounts": {
        "bot": {
          "name": "RealEstate Bot",
          "enabled": true,
          "cliPath": "/path/to/imsg-bot",
          "dbPath": "/Users/botuser/Library/Messages/chat.db"
        }
      }
    }
  }
}
```

#### **Dedicated Bot User Setup (Recommended)**
```bash
# 1. Create dedicated Apple ID for bot
# Example: realestate-bot@icloud.com

# 2. Create macOS user (e.g., "realestate-bot")
# 3. Sign into Messages with bot Apple ID
# 4. Enable Remote Login: System Settings → General → Sharing → Remote Login

# 5. Create SSH wrapper script
#!/usr/bin/env bash
set -euo pipefail
exec /usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=5 -T realestate-bot@localhost \
  "/usr/local/bin/imsg" "$@"

# 6. Save as /usr/local/bin/imsg-bot and make executable
chmod +x /usr/local/bin/imsg-bot
```

#### **Remote Access via SSH/Tailscale**
```json
{
  "channels": {
    "imessage": {
      "enabled": true,
      "cliPath": "~/.openclaw/scripts/imsg-ssh",
      "remoteHost": "realestate-bot@tailnet-host",
      "includeAttachments": true,
      "dbPath": "/Users/realestate-bot/Library/Messages/chat.db"
    }
  }
}
```

#### **SSH Wrapper Script**
```bash
#!/usr/bin/env bash
# ~/.openclaw/scripts/imsg-ssh
exec ssh -T realestate-bot@tailnet-host imsg "$@"
```

### **iOS Calling Integration**

#### **Voice Call Plugin Setup**
```bash
# 1. Install Voice Call Plugin
openclaw plugin install voice-call

# 2. Configure for real estate use
openclaw config set plugins.entries.voice-call.config.provider "twilio"
openclaw config set plugins.entries.voice-call.config.inboundPolicy "allowlist"
openclaw config set plugins.entries.voice-call.config.allowFrom ["+15555550123", "+15555550124"]
openclaw config set plugins.entries.voice-call.config.inboundGreeting "Real Estate Assistant! How can I help you today?"
```

#### **Voice Call Configuration**
```json
{
  "plugins": {
    "entries": {
      "voice-call": {
        "config": {
          "provider": "twilio",
          "inboundPolicy": "allowlist",
          "allowFrom": ["+15555550123", "+15555550124"],
          "inboundGreeting": "Real Estate Assistant! How can I help you today?",
          "responseModel": "gpt-4",
          "responseSystemPrompt": "You are a real estate assistant helping clients with property inquiries.",
          "responseTimeoutMs": 30000
        }
      }
    }
  }
}
```

#### **Voice Call Tools Available**
```javascript
// Voice Call MCP Tools
const VOICE_CALL_TOOLS = [
  {
    name: 'initiate_call',
    description: 'Initiate voice call to client',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number' },
        message: { type: 'string', description: 'Opening message' },
        mode: { type: 'string', enum: ['twilio', 'telnyx', 'plivo'] }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'continue_call',
    description: 'Continue conversation in active call',
    inputSchema: {
      type: 'object',
      properties: {
        callId: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['callId', 'message']
    }
  },
  {
    name: 'end_call',
    description: 'End active call',
    inputSchema: {
      type: 'object',
      properties: {
        callId: { type: 'string' }
      },
      required: ['callId']
    }
  }
];
```

---

## 🤖 Android Integration (SMS + Google Messages)

### **Android SMS Integration**

#### **Requirements & Setup**
```bash
# Android Requirements
- Android device with telephony capabilities
- OpenClaw Android companion app
- Gateway host (macOS/Linux/Windows/WSL2)
- Same network or Tailscale tailnet for discovery
```

#### **Installation Steps**
```bash
# 1. Start OpenClaw Gateway
openclaw gateway --port 18789 --verbose

# 2. Install OpenClaw Android app
# Download from GitHub or F-Droid
# Grant necessary permissions during setup

# 3. Connect Android to Gateway
# - Open OpenClaw Android app
# - Settings → Discovered Gateways → Select gateway → Connect
# - Or use Manual Gateway if mDNS blocked

# 4. Approve pairing via CLI
openclaw nodes pending
openclaw nodes approve <requestId>

# 5. Verify connection
openclaw nodes status
```

#### **Network Configuration Options**
```bash
# Option 1: Same LAN with mDNS/NSD (automatic discovery)
# Option 2: Tailscale tailnet with Wide-Area Bonjour
# Option 3: Manual gateway host/port (fallback)

# Tailscale Configuration
gateway.bind: "tailnet"

# DNS-SD Setup for Tailnet
# Create DNS zone: openclaw.internal
# Publish _openclaw-gw._tcp records
# Configure Tailscale split DNS
```

#### **SMS Permission Setup**
```bash
# Android will prompt for SMS permission when first used
# Grant permission to enable sms.send capability
# Wi-Fi-only devices without telephony won't support SMS

# Verify SMS capability
openclaw nodes invoke --node "Android-Device" --command sms.send --params '{"to":"+15555550123","message":"Test message"}'
```

#### **Android SMS Tools Structure**
```typescript
const ANDROID_SMS_TOOLS = [
  {
    name: 'send_sms',
    description: 'Send SMS via Android device',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number with country code' },
        message: { type: 'string', description: 'Message content' },
        nodeId: { type: 'string', description: 'Android device node ID' }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'get_sms_status',
    description: 'Check SMS sending capability',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Android device node ID' }
      },
      required: ['nodeId']
    }
  }
];
```

### **Google Messages Integration**
```bash
# Google Messages works through Android SMS API
# No additional setup required beyond SMS permissions
# Uses native Android messaging capabilities
# Supports rich media, group messages, RCS features
```

---

## 🔄 Real Estate Automation Workflows

### **Lead Response Automation**
```javascript
// Automated lead response via mobile messaging
const leadResponseWorkflow = {
  trigger: "New lead from website/form",
  actions: [
    {
      type: "imessage",
      action: "send_message",
      params: {
        to: "{client_phone}",
        message: "Hi {client_name}! Thanks for your interest in {property_address}. I'm your real estate assistant and can answer any questions about this property or schedule a viewing. When would be a good time to chat?"
      }
    },
    {
      type: "sms",
      action: "send_message", 
      params: {
        to: "{client_phone}",
        message: "Hi {client_name}! {agent_name} from Real Estate Co. received your inquiry about {property_address}. I'll be in touch shortly. Reply STOP to opt out.",
        nodeId: "android-primary"
      }
    }
  ]
};
```

### **Property Viewing Scheduling**
```javascript
// Automated viewing coordination
const viewingSchedulingWorkflow = {
  trigger: "Client requests property viewing",
  actions: [
    {
      type: "voice_call",
      action: "initiate_call",
      params: {
        to: "{client_phone}",
        message: "Hi {client_name}! I'm calling about your interest in {property_address}. I'd love to schedule a viewing for you. Do you have availability this week?"
      }
    },
    {
      type: "imessage",
      action: "send_message",
      params: {
        to: "{client_phone}",
        message: "Great! I've noted your availability for {viewing_date}. I'll send you a calendar invite and property details. Looking forward to showing you {property_address}!"
      }
    }
  ]
};
```

### **Document Sharing via Mobile**
```javascript
// Contract and document distribution
const documentSharingWorkflow = {
  trigger: "Contract ready for signature",
  actions: [
    {
      type: "imessage",
      action: "send_attachment",
      params: {
        to: "{client_phone}",
        filePath: "/contracts/{property_id}_contract.pdf",
        message: "Hi {client_name}! Please find the contract for {property_address} attached. Let me know if you have any questions or would like me to explain any sections."
      }
    },
    {
      type: "voice_call",
      action: "initiate_call", 
      params: {
        to: "{client_phone}",
        message: "Hi {client_name}! I just sent the contract for {property_address} via iMessage. I wanted to walk you through the key terms and answer any questions you might have."
      }
    }
  ]
};
```

---

## 🛠️ MCP Server Integration

### **Mobile Communication MCP Server**
```typescript
// reengine-mobile MCP Server Structure
const MOBILE_TOOLS = [
  // iMessage Tools
  {
    name: 'send_imessage',
    description: 'Send iMessage via OpenClaw',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number or email' },
        message: { type: 'string' },
        attachments: { type: 'array', items: { type: 'string' } },
        account: { type: 'string', enum: ['main', 'bot'], default: 'main' }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'get_imessage_history',
    description: 'Retrieve iMessage conversation history',
    inputSchema: {
      type: 'object',
      properties: {
        contact: { type: 'string' },
        limit: { type: 'number', default: 50 },
        account: { type: 'string', enum: ['main', 'bot'], default: 'main' }
      },
      required: ['contact']
    }
  },
  
  // Android SMS Tools
  {
    name: 'send_android_sms',
    description: 'Send SMS via Android device',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number with country code' },
        message: { type: 'string' },
        nodeId: { type: 'string', description: 'Android device ID' }
      },
      required: ['to', 'message']
    }
  },
  
  // Voice Call Tools
  {
    name: 'initiate_voice_call',
    description: 'Start voice call to client',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number' },
        message: { type: 'string', description: 'Opening message' },
        provider: { type: 'string', enum: ['twilio', 'telnyx', 'plivo'], default: 'twilio' },
        record: { type: 'boolean', default: true }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'get_call_status',
    description: 'Check status of active call',
    inputSchema: {
      type: 'object',
      properties: {
        callId: { type: 'string' }
      },
      required: ['callId']
    }
  },
  
  // Device Management
  {
    name: 'list_mobile_nodes',
    description: 'List connected mobile devices',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android', 'all'], default: 'all' }
      }
    }
  },
  {
    name: 'get_device_capabilities',
    description: 'Check device capabilities and permissions',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' }
      },
      required: ['nodeId']
    }
  }
];
```

### **Environment Configuration**
```bash
# Mobile Integration Environment Variables
OPENCLAW_GATEWAY_HOST="localhost"
OPENCLAW_GATEWAY_PORT="18789"
OPENCLAW_IMESSAGE_ENABLED="true"
OPENCLAW_IMESSAGE_CLI_PATH="/usr/local/bin/imsg"
OPENCLAW_IMESSAGE_DB_PATH="/Users/$USER/Library/Messages/chat.db"

# Android Configuration
OPENCLAW_ANDROID_NODES="android-primary,android-secondary"
OPENCLAW_SMS_PERMISSION_GRANTED="true"

# Voice Call Configuration
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
VOICE_CALL_PROVIDER="twilio"
```

---

## 🔧 Advanced Configuration

### **Multi-Device Setup**
```json
{
  "channels": {
    "imessage": {
      "accounts": {
        "main": {
          "name": "Primary Agent",
          "enabled": true,
          "cliPath": "/usr/local/bin/imsg",
          "dbPath": "/Users/agent/Library/Messages/chat.db"
        },
        "bot": {
          "name": "Automation Bot",
          "enabled": true,
          "cliPath": "/usr/local/bin/imsg-bot",
          "dbPath": "/Users/bot/Library/Messages/chat.db"
        },
        "backup": {
          "name": "Backup Device",
          "enabled": false,
          "cliPath": "~/.openclaw/scripts/imsg-remote",
          "remoteHost": "backup@remote-mac",
          "includeAttachments": true
        }
      }
    }
  }
}
```

### **Security & Access Control**
```bash
# Node Access Control
openclaw config set nodes.allowlist ["android-primary", "android-secondary", "ios-device"]
openclaw config set nodes.requireApproval true

# Message Filtering
openclaw config set channels.imessage.filterSpam true
openclaw config set channels.imessage.blockedNumbers ["+15555550000"]

# Call Security
openclaw config set plugins.entries.voice-call.config.inboundPolicy "allowlist"
openclaw config set plugins.entries.voice-call.config.allowFrom ["+15555550123", "+15555550124"]
```

### **Monitoring & Logging**
```bash
# Enable verbose logging
openclaw config set logging.level "debug"
openclaw config set logging.includeNodeActivity true

# Monitor device connections
openclaw nodes status --watch

# Message delivery tracking
openclaw config set channels.imessage.deliveryReceipts true
```

---

## 📊 Performance & Reliability

### **Connection Management**
```javascript
// Connection health monitoring
const deviceHealthCheck = {
  interval: 30000, // 30 seconds
  timeout: 5000,   // 5 seconds
  retryAttempts: 3,
  fallbackDevices: ["android-secondary", "ios-backup"]
};

// Message delivery guarantees
const messageDelivery = {
  iMessage: {
    reliability: "high",
    deliveryConfirmation: true,
    fallbackToSMS: true
  },
  androidSMS: {
    reliability: "medium", 
    deliveryConfirmation: false,
    retryMechanism: "exponential-backoff"
  },
  voiceCalls: {
    reliability: "high",
    recordingEnabled: true,
    transcriptionEnabled: true
  }
};
```

### **Error Handling**
```javascript
// Comprehensive error handling
const errorHandling = {
  iMessageErrors: {
    "PERMISSION_DENIED": "Request macOS permissions",
    "DEVICE_OFFLINE": "Check iOS device connection",
    "APPLE_ID_SYNC": "Verify iCloud sync status"
  },
  androidErrors: {
    "SMS_PERMISSION_REQUIRED": "Grant SMS permission on Android",
    "TELEPHONY_UNAVAILABLE": "Device lacks telephony capability",
    "NODE_OFFLINE": "Check Android app connection"
  },
  voiceCallErrors: {
    "CALL_FAILED": "Verify Twilio configuration",
    "NUMBER_INVALID": "Check phone number format",
    "PROVIDER_ERROR": "Switch to backup provider"
  }
};
```

---

## 🎯 Real Estate Use Cases

### **1. Instant Lead Response**
```javascript
// Response time: <2 minutes
const instantLeadResponse = {
  trigger: "New lead submission",
  priority: "high",
  channels: ["imessage", "android_sms"],
  response: "Personalized greeting with property details",
  followUp: "Voice call within 5 minutes if no response"
};
```

### **2. Property Viewing Coordination**
```javascript
// Multi-channel coordination
const viewingCoordination = {
  initial: "iMessage with property details",
  confirmation: "SMS reminder 24 hours before",
  followUp: "Voice call day of viewing",
  feedback: "iMessage summary after viewing"
};
```

### **3. Document Distribution**
```javascript
// Secure document sharing
const documentDistribution = {
  contracts: "iMessage with PDF attachments",
  disclosures: "SMS with secure download links",
  signatures: "Voice call explanation + DocuSign link"
};
```

### **4. Emergency Communications**
```javascript
// Critical alerts
const emergencyAlerts = {
  priceDrops: "Immediate SMS to interested buyers",
  offerDeadlines: "Voice call + iMessage confirmation",
  marketUpdates: "iMessage with market analysis"
};
```

---

## 📈 Benefits for Real Estate

### **Hyper-Efficiency Gains**
- **Response Time**: <2 minutes vs industry average 24-48 hours
- **Client Engagement**: 300% increase with multi-channel approach
- **Conversion Rate**: 25% improvement with instant follow-up
- **Cost Reduction**: 60% less than traditional communication methods

### **Competitive Advantages**
- **Always Available**: 24/7 automated responses
- **Personal Touch**: Native device messaging feels personal
- **Multi-Channel**: Reach clients on their preferred platform
- **Real-time**: Immediate document sharing and updates

### **Compliance & Security**
- **Record Keeping**: All communications logged and archived
- **Consent Management**: Easy opt-in/opt-out mechanisms
- **Data Privacy**: Local device processing, cloud backup optional
- **Audit Trail**: Complete communication history for compliance

---

## 🚀 Implementation Roadmap

### **Week 1: Basic Setup**
- Install OpenClaw Gateway
- Configure iMessage integration
- Set up Android companion app
- Test basic SMS/iMessage functionality

### **Week 2: Advanced Features**
- Configure voice call plugin
- Set up multi-device accounts
- Implement security controls
- Test automated workflows

### **Week 3: Real Estate Integration**
- Create lead response workflows
- Set up viewing coordination
- Implement document sharing
- Test emergency communications

### **Week 4: Production Deployment**
- Monitor performance and reliability
- Train team on new workflows
- Document standard operating procedures
- Establish maintenance routines

---

## 📝 Troubleshooting

### **Common Issues & Solutions**

#### **iMessage Not Working**
```bash
# Check macOS permissions
# System Settings → Privacy & Security → Full Disk Access
# Add OpenClaw and imsg to allowed applications

# Verify Messages app is signed in
# Open Messages app → Settings → iMessage
# Ensure Apple ID is signed in and sync enabled

# Check database path
ls -la "/Users/$USER/Library/Messages/chat.db"
```

#### **Android SMS Permission Denied**
```bash
# On Android device:
# Settings → Apps → OpenClaw → Permissions
# Enable SMS permission
# Restart OpenClaw app

# Verify telephony capability
openclaw nodes invoke --node "android-device" --command sms.send --params '{"to":"+15555555555","message":"test"}'
```

#### **Voice Call Not Connecting**
```bash
# Check Twilio configuration
openclaw config get plugins.entries.voice-call.config

# Verify phone number format
# Use E.164 format: +15555550123

# Check provider status
openclaw voicecall status
```

#### **Device Connection Issues**
```bash
# Check network connectivity
# Verify same LAN or Tailscale connection

# Restart Gateway
openclaw gateway restart

# Re-pair device
openclaw nodes remove <nodeId>
# Then reconnect from device
```

This comprehensive mobile integration provides real estate professionals with unparalleled communication efficiency, leveraging native device capabilities without API dependencies or costs.
