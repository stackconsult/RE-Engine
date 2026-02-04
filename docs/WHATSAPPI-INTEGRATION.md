# WhatsApp Integration with Whapi.Cloud

## Overview

The RE Engine integrates with Whapi.Cloud for comprehensive WhatsApp automation, including lead generation, outreach sequences, workflow automation, and real-time messaging capabilities.

## Features

### Core WhatsApp Capabilities
- **Send & Receive Messages**: Text, media, documents, interactive buttons, carousels
- **Group Management**: Extract leads from groups, manage participants, automated engagement
- **Channel Broadcasting**: Create and manage WhatsApp channels for bulk outreach
- **Business Features**: Product catalogs, order processing, business profiles
- **Status & Stories**: Automated status updates and story posting

### Lead Management System
- **Lead Scoring**: Multi-factor scoring algorithm (engagement, response, timing, context)
- **Lead Grading**: A-F grading system based on budget, timeline, authority, engagement
- **Source Tracking**: WhatsApp, groups, newsletters, cold outreach
- **Status Management**: New → Contacted → Engaged → Qualified → Converted/Lost

### Workflow Automation
- **Trigger-Based Rules**: New leads, score thresholds, time-based, group activity
- **Action Types**: Send messages, create sequences, update scores, notify admins
- **Priority System**: Rule prioritization for conflict resolution
- **Real-time Execution**: Instant workflow processing

### Outreach Sequences
- **Multi-step Campaigns**: Cold messages, follow-ups, contextual replies, closing
- **Media Support**: Images, videos, documents, interactive content
- **Scheduling**: Hour-based delays between steps
- **Status Tracking**: Pending → Sent → Delivered → Read → Replied

## Architecture

### MCP Server Structure
```
mcp/reengine-outreach/
├── src/
│   ├── index.ts              # Main MCP server with tool definitions
│   ├── whapi-integration.ts  # Whapi.Cloud API integration layer
│   └── workflow-automation.ts # Workflow engine and automation
├── package.json
└── tsconfig.json
```

### Key Components

#### WhapiIntegration Class
- Core API communication with Whapi.Cloud
- Lead management and scoring
- Outreach sequence execution
- Group and channel operations
- Engagement tracking

#### WorkflowAutomation Class
- Rule-based automation engine
- Default workflow templates
- Action execution framework
- Analytics and monitoring

#### MCP Tools
- 15+ tools for lead management, messaging, automation
- Comprehensive input validation with Zod schemas
- Real-time webhook integration
- Audit logging and error handling

## Setup Instructions

### 1. Whapi.Cloud Account Setup

1. **Create Account**: Sign up at [Whapi.Cloud](https://whapi.cloud/)
2. **Connect WhatsApp**: Link your WhatsApp number via QR code
3. **Get API Token**: Copy your API token from the dashboard
4. **Configure Webhooks**: Set up webhook URL for real-time events

### 2. Environment Configuration

Add to your `.env` file:
```bash
# WhatsApp API Configuration (Whapi.Cloud)
WHATSAPP_API_KEY=your_whapi_cloud_api_key_here
WHATSAPP_API_URL=https://gate.whapi.cloud
WHATSAPP_WEBHOOK_URL=https://your-domain.com/webhook/whatsapp
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. MCP Server Configuration

The outreach MCP server is configured in `.windsurf/mcp-config.json`:
```json
{
  "mcpServers": {
    "reengine-outreach": {
      "command": "node",
      "args": ["mcp/reengine-outreach/dist/index.js"],
      "cwd": ".",
      "env": {
        "WHATSAPP_API_KEY": "${WHATSAPP_API_KEY}",
        "WHATSAPP_API_URL": "${WHATSAPP_API_URL:-https://gate.whapi.cloud}",
        "WHATSAPP_WEBHOOK_URL": "${WHATSAPP_WEBHOOK_URL}",
        "LOG_LEVEL": "${LOG_LEVEL:-info}"
      }
    }
  }
}
```

### 4. Build and Install

```bash
cd mcp/reengine-outreach
npm install
npm run build
```

## Usage Examples

### Lead Management

```javascript
// Create a new lead
const lead = await createLead({
  phone: "+1234567890",
  name: "John Doe",
  source: "whatsapp"
});

// Update lead score
await updateLeadScore(lead.id, [
  { type: "engagement", weight: 0.4, value: 0.8 },
  { type: "response", weight: 0.3, value: 0.9 },
  { type: "timing", weight: 0.2, value: 0.7 },
  { type: "context", weight: 0.1, value: 0.8 }
]);
```

### Outreach Sequences

```javascript
// Create automated outreach sequence
const sequence = await createOutreachSequence({
  leadId: "lead-123",
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
    },
    {
      id: "step-3",
      type: "product_share",
      delay: 72,
      message: "Here are some featured properties...",
      mediaUrl: "https://example.com/properties.jpg",
      status: "pending"
    }
  ]
});
```

### Workflow Automation

```javascript
// Create workflow rule
const rule = await createWorkflowRule({
  name: "High Score Lead Priority",
  trigger: "score_threshold",
  conditions: {
    score: { min: 80 },
    status: "engaged"
  },
  actions: [
    {
      type: "send_message",
      parameters: {
        message: "Based on your interest level, I'd like to offer a personalized consultation...",
        delay: 60
      }
    },
    {
      type: "notify_admin",
      parameters: {
        message: "Hot lead detected! {{name}} ({{phone}}) scored {{score}}...",
        delay: 0
      }
    }
  ],
  enabled: true,
  priority: 1
});
```

### WhatsApp Messaging

```javascript
// Send text message
await sendWhatsappMessage({
  to: "+1234567890",
  body: "Hello! How can I help you today?",
  type: "text"
});

// Send interactive message with buttons
await sendWhatsappMessage({
  to: "+1234567890",
  body: "Would you like to see our property listings?",
  type: "interactive",
  buttons: [
    { id: "yes", text: "Yes, show me" },
    { id: "no", text: "Not now" }
  ]
});

// Send carousel with multiple cards
await sendCarousel({
  to: "+1234567890",
  cards: [
    {
      header: "Luxury Villa",
      body: "5 bedroom villa with ocean view",
      mediaUrl: "https://example.com/villa.jpg",
      buttonId: "view_villa",
      buttonText: "View Details"
    },
    {
      header: "Modern Apartment", 
      body: "2 bedroom apartment in city center",
      mediaUrl: "https://example.com/apartment.jpg",
      buttonId: "view_apartment",
      buttonText: "View Details"
    }
  ]
});
```

## Default Workflows

The system includes 4 pre-configured workflows:

### 1. New Lead Welcome Sequence
- **Trigger**: New lead creation
- **Actions**: Welcome message + nurturing sequence
- **Priority**: 1 (highest)

### 2. High Score Lead Priority
- **Trigger**: Score ≥ 80 and status = engaged
- **Actions**: Personalized consultation offer + admin notification
- **Priority**: 2

### 3. Group Lead Extraction
- **Trigger**: Daily at 9 AM
- **Actions**: Extract leads from groups + personalized outreach
- **Priority**: 3

### 4. Inactive Lead Re-engagement
- **Trigger**: 7 days inactive
- **Actions**: Re-engagement message with new opportunities
- **Priority**: 4

## Analytics and Monitoring

### Lead Analytics
```javascript
const analytics = await getLeadAnalytics();
// Returns:
// - Total leads, leads by source/status
// - Average score, conversion rate
// - Active/completed sequences
```

### Workflow Analytics
```javascript
const workflowAnalytics = workflowAutomation.getWorkflowAnalytics();
// Returns:
// - Total/enabled rules
// - Execution success/failure rates
// - Most triggered rules
```

## Webhook Integration

Configure your Whapi.Cloud webhook to receive:
- **Message Events**: New messages, status updates
- **Group Events**: Member changes, group updates
- **Contact Events**: Profile changes, presence updates
- **Business Events**: Orders, product interactions

## Best Practices

### Lead Management
- Score leads within 24 hours of first contact
- Update scores based on engagement patterns
- Use contextual information for personalization

### Message Timing
- Respect business hours (9 AM - 6 PM local time)
- Add delays between sequence steps (24-72 hours)
- Avoid excessive messaging to prevent spam reports

### Content Guidelines
- Personalize messages with lead data
- Use interactive elements for better engagement
- Include relevant media (property photos, videos)

### Workflow Design
- Set clear trigger conditions
- Prioritize rules appropriately
- Monitor execution success rates
- Update rules based on performance

## Troubleshooting

### Common Issues

1. **API Authentication Errors**
   - Verify WHATSAPP_API_KEY is correct
   - Check API token permissions in Whapi.Cloud dashboard

2. **Webhook Not Receiving Events**
   - Verify WHATSAPP_WEBHOOK_URL is accessible
   - Check webhook configuration in Whapi.Cloud

3. **Build Errors**
   - Run `npm install` to update dependencies
   - Check TypeScript version compatibility

4. **Workflow Not Executing**
   - Verify trigger conditions match event data
   - Check rule priority and enabled status

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug
```

## Security Considerations

- **API Keys**: Store in environment variables, never commit to git
- **Webhook Security**: Use webhook secrets for request validation
- **Data Privacy**: Comply with WhatsApp terms and GDPR
- **Rate Limiting**: Respect Whapi.Cloud rate limits
- **Message Content**: Avoid prohibited content types

## Integration with Other Systems

### CRM Integration
- Export lead data to external CRM
- Sync contact information and status
- Import existing leads for nurturing

### Analytics Integration
- Send engagement data to analytics platforms
- Track conversion metrics
- Monitor campaign performance

### Email Integration
- Combine WhatsApp with email campaigns
- Use email for follow-ups when appropriate
- Maintain consistent messaging across channels

## API Reference

### Core Tools
- `create_lead`: Create new lead record
- `update_lead_score`: Update lead scoring
- `create_outreach_sequence`: Create automated sequences
- `send_whatsapp_message`: Send various message types
- `extract_group_leads`: Extract leads from groups
- `create_workflow_rule`: Create automation rules
- `get_lead_analytics`: Get comprehensive analytics

### Advanced Features
- `check_phone_number`: Verify WhatsApp registration
- `create_newsletter`: Create WhatsApp channels
- `send_catalog`: Send product catalogs
- `send_carousel`: Send interactive carousels

For complete API documentation, see the MCP tool definitions in `src/index.ts`.

## Support

- **Whapi.Cloud Documentation**: [https://whapi.readme.io](https://whapi.readme.io)
- **RE Engine Documentation**: See `/docs/` directory
- **Issues**: Report via GitHub issues
- **Community**: Join our Discord for support
