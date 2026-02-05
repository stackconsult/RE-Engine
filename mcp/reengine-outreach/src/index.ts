import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { WhapiIntegration, Lead, OutreachSequence, OutreachStep } from './whapi-integration.js';
import { WorkflowAutomation, WorkflowRule } from './workflow-automation.js';

// Authentication configuration
const SERVICE_CONFIG = {
  serviceId: process.env.SERVICE_ID || 'reengine-outreach',
  apiKey: process.env.OUTREACH_API_KEY || '18b6e54296ae58d582ffe83b66ef45fa2de7057fc6d8d456fa891f7055727243',
  authUrl: process.env.AUTH_URL || 'http://localhost:3001/auth/token'
};

// Get JWT token for service authentication
async function getServiceToken(): Promise<string> {
  try {
    const response = await fetch(SERVICE_CONFIG.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERVICE_CONFIG.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const { token } = await response.json();
    return token;
  } catch (error) {
    console.error('Failed to get service token:', error);
    throw error;
  }
}

// Authenticated fetch wrapper
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getServiceToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

const logger = pino();

// Initialize Whapi Integration
const whapiConfig = {
  apiToken: process.env.WHATSAPP_API_KEY || '',
  baseUrl: process.env.WHATSAPP_API_URL || 'https://gate.whapi.cloud',
  webhookUrl: process.env.WHATSAPP_WEBHOOK_URL
};

const whapi = new WhapiIntegration(whapiConfig);
const workflowAutomation = new WorkflowAutomation(whapi);

// Schemas
const LeadSchema = z.object({
  id: z.string().optional(),
  phone: z.string(),
  name: z.string().optional(),
  source: z.enum(['whatsapp', 'group', 'newsletter', 'cold']).default('whatsapp'),
  score: z.number().default(0),
  status: z.enum(['new', 'contacted', 'engaged', 'qualified', 'converted', 'lost']).default('new'),
  metadata: z.record(z.any()).optional()
});

const OutreachSequenceSchema = z.object({
  leadId: z.string(),
  name: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    type: z.enum(['cold_message', 'follow_up', 'contextual_reply', 'closing', 'story_view', 'product_share']),
    delay: z.number(),
    message: z.string(),
    mediaType: z.enum(['text', 'image', 'video', 'document', 'interactive', 'carousel']).optional(),
    mediaUrl: z.string().optional(),
    status: z.enum(['pending', 'sent', 'delivered', 'read', 'replied']).default('pending')
  }))
});

const WorkflowRuleSchema = z.object({
  name: z.string(),
  trigger: z.enum(['new_lead', 'message_received', 'score_threshold', 'time_based', 'group_activity']),
  conditions: z.record(z.any()),
  actions: z.array(z.object({
    type: z.enum(['create_sequence', 'send_message', 'update_score', 'add_label', 'notify_admin', 'extract_group_leads']),
    parameters: z.record(z.any()),
    delay: z.number().optional()
  })),
  enabled: z.boolean().default(true),
  priority: z.number().default(1)
});

const server = new Server(
  {
    name: 'reengine-outreach',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Lead Management Tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_lead': {
        const validated = LeadSchema.parse(args);
        const lead = await whapi.createLead(validated.phone, validated.name, validated.source);
        
        // Trigger workflow for new lead
        await workflowAutomation.executeWorkflow('new_lead', { lead });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(lead)
            }
          ]
        };
      }

      case 'update_lead_score': {
        const { leadId, factors } = args as { leadId: string; factors: Array<{type: string, weight: number, value: number}> };
        const lead = await whapi.updateLeadScore(leadId, factors);
        
        // Trigger score threshold workflow
        await workflowAutomation.executeWorkflow('score_threshold', { lead, score: lead.score });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(lead)
            }
          ]
        };
      }

      case 'create_outreach_sequence': {
        const validated = OutreachSequenceSchema.parse(args);
        const sequence = await whapi.createOutreachSequence(validated.leadId, validated.name, validated.steps as any);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sequence)
            }
          ]
        };
      }

      case 'execute_sequence_step': {
        const { sequenceId } = args as { sequenceId: string };
        const result = await whapi.executeSequenceStep(sequenceId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_whatsapp_message': {
        const { to, body, type = 'text', mediaUrl, buttons } = args as {
          to: string;
          body: string;
          type?: 'text' | 'image' | 'video' | 'document' | 'interactive';
          mediaUrl?: string;
          buttons?: Array<{id: string, text: string}>;
        };

        let result;
        switch (type) {
          case 'interactive':
            if (!buttons) throw new Error('Buttons required for interactive messages');
            result = await whapi.sendInteractiveMessage(to, body, buttons);
            break;
          case 'image':
          case 'video':
          case 'document':
            if (!mediaUrl) throw new Error('Media URL required for media messages');
            result = await whapi.sendMediaMessage(to, type, mediaUrl, body);
            break;
          default:
            result = await whapi.sendTextMessage(to, body);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'extract_group_leads': {
        const leads = await whapi.extractLeadsFromGroups();
        
        // Trigger workflow for group activity
        await workflowAutomation.executeWorkflow('group_activity', { leads });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                extractedLeads: leads.length,
                leads: leads
              })
            }
          ]
        };
      }

      case 'create_workflow_rule': {
        const validated = WorkflowRuleSchema.parse(args);
        const rule = workflowAutomation.createRule(validated as any);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(rule)
            }
          ]
        };
      }

      case 'execute_workflow': {
        const { trigger, triggerData } = args as { trigger: string; triggerData: any };
        const executions = await workflowAutomation.executeWorkflow(trigger, triggerData);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(executions)
            }
          ]
        };
      }

      case 'track_engagement': {
        const { leadId, event, data } = args as { leadId: string; event: string; data: any };
        await whapi.trackEngagement(leadId, event, data);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ leadId, event, tracked: true })
            }
          ]
        };
      }

      case 'get_lead_analytics': {
        const analytics = await whapi.getLeadAnalytics();
        const workflowAnalytics = workflowAutomation.getWorkflowAnalytics();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                leadAnalytics: analytics,
                workflowAnalytics: workflowAnalytics
              })
            }
          ]
        };
      }

      case 'check_phone_number': {
        const { phone } = args as { phone: string };
        const exists = await whapi.checkPhone(phone);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ phone, exists })
            }
          ]
        };
      }

      case 'create_newsletter': {
        const { name, description } = args as { name: string; description: string };
        const newsletter = await whapi.createNewsletter(name, description);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(newsletter)
            }
          ]
        };
      }

      case 'create_product': {
        const product = args as any;
        const result = await whapi.createProduct(product);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_catalog': {
        const { to, contactId } = args as { to: string; contactId: string };
        const result = await whapi.sendCatalog(to, contactId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_carousel': {
        const { to, cards } = args as { to: string; cards: Array<any> };
        const result = await whapi.sendCarouselMessage(to, cards);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Advanced Features - Stories/Status
      case 'create_text_story': {
        const { text } = args as { text: string };
        const result = await whapi.apiCall('/messages/story/text', 'POST', { body: text });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'create_media_story': {
        const { media, caption } = args as { media: string; caption?: string };
        const result = await whapi.apiCall('/messages/story/media', 'POST', { media, caption });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'get_stories': {
        const result = await whapi.apiCall('/stories');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Newsletter/Channel Management
      case 'create_newsletter': {
        const { name, description } = args as { name: string; description: string };
        const newsletter = await whapi.createNewsletter(name, description);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(newsletter)
            }
          ]
        };
      }

      case 'get_newsletters': {
        const result = await whapi.apiCall('/newsletters');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'subscribe_to_newsletter': {
        const { newsletterId, contactId } = args as { newsletterId: string; contactId: string };
        const result = await whapi.apiCall(`/newsletters/${newsletterId}/subscription`, 'POST', { contactId });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Business Features
      case 'get_business_profile': {
        const result = await whapi.getBusinessProfile();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'create_product': {
        const product = args as any;
        const result = await whapi.createProduct(product);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_catalog': {
        const { to, contactId } = args as { to: string; contactId: string };
        const result = await whapi.sendCatalog(to, contactId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_product': {
        const { to, productId } = args as { to: string; productId: string };
        const result = await whapi.apiCall(`/business/products/${productId}`, 'POST', { to });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Advanced Message Types
      case 'send_poll_message': {
        const { to, question, options } = args as { to: string; question: string; options: string[] };
        const result = await whapi.apiCall('/messages/poll', 'POST', {
          to,
          question,
          options: options.map((text, index) => ({ optionName: text }))
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_location_message': {
        const { to, latitude, longitude, name, address } = args as { 
          to: string; 
          latitude: number; 
          longitude: number; 
          name?: string; 
          address?: string 
        };
        const result = await whapi.apiCall('/messages/location', 'POST', {
          to,
          latitude,
          longitude,
          name,
          address
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_contact_message': {
        const { to, contact } = args as { 
          to: string; 
          contact: { name: string; phone: string; organization?: string } 
        };
        const result = await whapi.apiCall('/messages/contact', 'POST', { to, contact });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Label Management
      case 'get_labels': {
        const result = await whapi.apiCall('/labels');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'create_label': {
        const { name } = args as { name: string };
        const result = await whapi.apiCall('/labels', 'POST', { name });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'add_label_to_entity': {
        const { labelId, entityId } = args as { labelId: string; entityId: string };
        const result = await whapi.apiCall(`/labels/${labelId}/${entityId}`, 'POST');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Chat Management
      case 'get_chats': {
        const result = await whapi.apiCall('/chats');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'archive_chat': {
        const { chatId } = args as { chatId: string };
        const result = await whapi.apiCall(`/chats/${chatId}`, 'POST', { archived: true });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Presence Management
      case 'set_online_presence': {
        const result = await whapi.apiCall('/presences/me', 'PUT', { presence: 'online' });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'send_typing_presence': {
        const { chatId } = args as { chatId: string };
        const result = await whapi.apiCall(`/presences/${chatId}`, 'PUT', { presence: 'typing' });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      // Channel Settings
      case 'get_channel_settings': {
        const result = await whapi.apiCall('/settings');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'get_limits': {
        const result = await whapi.apiCall('/limits');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      case 'check_health': {
        const result = await whapi.apiCall('/health');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error({ tool: name, error: (error as Error).message }, 'Tool execution failed');
    throw error;
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_lead',
        description: 'Create a new lead in the system',
        inputSchema: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: 'Phone number with country code' },
            name: { type: 'string', description: 'Lead name' },
            source: { type: 'string', enum: ['whatsapp', 'group', 'newsletter', 'cold'], description: 'Lead source' },
            score: { type: 'number', description: 'Initial lead score' },
            metadata: { type: 'object', description: 'Additional metadata' }
          },
          required: ['phone']
        }
      },
      {
        name: 'update_lead_score',
        description: 'Update lead score based on various factors',
        inputSchema: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' },
            factors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  weight: { type: 'number' },
                  value: { type: 'number' }
                }
              }
            }
          },
          required: ['leadId', 'factors']
        }
      },
      {
        name: 'create_outreach_sequence',
        description: 'Create an automated outreach sequence for a lead',
        inputSchema: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' },
            name: { type: 'string', description: 'Sequence name' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['cold_message', 'follow_up', 'contextual_reply', 'closing', 'story_view', 'product_share'] },
                  delay: { type: 'number', description: 'Delay in hours' },
                  message: { type: 'string' },
                  mediaType: { type: 'string', enum: ['text', 'image', 'video', 'document', 'interactive', 'carousel'] },
                  mediaUrl: { type: 'string' }
                }
              }
            }
          },
          required: ['leadId', 'name', 'steps']
        }
      },
      {
        name: 'execute_sequence_step',
        description: 'Execute the next step in an outreach sequence',
        inputSchema: {
          type: 'object',
          properties: {
            sequenceId: { type: 'string', description: 'Sequence ID' }
          },
          required: ['sequenceId']
        }
      },
      {
        name: 'send_whatsapp_message',
        description: 'Send a WhatsApp message (text, media, or interactive)',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            body: { type: 'string', description: 'Message content' },
            type: { type: 'string', enum: ['text', 'image', 'video', 'document', 'interactive'], default: 'text' },
            mediaUrl: { type: 'string', description: 'Media URL for media messages' },
            buttons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' }
                }
              }
            }
          },
          required: ['to', 'body']
        }
      },
      {
        name: 'extract_group_leads',
        description: 'Extract leads from WhatsApp groups',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'create_workflow_rule',
        description: 'Create a workflow automation rule',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Rule name' },
            trigger: { type: 'string', enum: ['new_lead', 'message_received', 'score_threshold', 'time_based', 'group_activity'] },
            conditions: { type: 'object', description: 'Trigger conditions' },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['create_sequence', 'send_message', 'update_score', 'add_label', 'notify_admin', 'extract_group_leads'] },
                  parameters: { type: 'object' },
                  delay: { type: 'number' }
                }
              }
            },
            enabled: { type: 'boolean', default: true },
            priority: { type: 'number', default: 1 }
          },
          required: ['name', 'trigger', 'conditions', 'actions']
        }
      },
      {
        name: 'execute_workflow',
        description: 'Execute workflow rules for a trigger',
        inputSchema: {
          type: 'object',
          properties: {
            trigger: { type: 'string', description: 'Trigger type' },
            triggerData: { type: 'object', description: 'Trigger data' }
          },
          required: ['trigger', 'triggerData']
        }
      },
      {
        name: 'track_engagement',
        description: 'Track lead engagement events',
        inputSchema: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' },
            event: { type: 'string', description: 'Event type' },
            data: { type: 'object', description: 'Event data' }
          },
          required: ['leadId', 'event', 'data']
        }
      },
      {
        name: 'get_lead_analytics',
        description: 'Get comprehensive lead and workflow analytics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'check_phone_number',
        description: 'Check if a phone number is registered on WhatsApp',
        inputSchema: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: 'Phone number to check' }
          },
          required: ['phone']
        }
      },
      {
        name: 'create_newsletter',
        description: 'Create a WhatsApp newsletter/channel',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Newsletter name' },
            description: { type: 'string', description: 'Newsletter description' }
          },
          required: ['name', 'description']
        }
      },
      {
        name: 'create_product',
        description: 'Create a product for WhatsApp Business',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product name' },
            description: { type: 'string', description: 'Product description' },
            price: { type: 'number', description: 'Product price' },
            currency: { type: 'string', description: 'Currency code' },
            imageUrl: { type: 'string', description: 'Product image URL' }
          },
          required: ['name', 'description', 'price']
        }
      },
      {
        name: 'send_catalog',
        description: 'Send product catalog to a contact',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['to', 'contactId']
        }
      },
      {
        name: 'send_carousel',
        description: 'Send a carousel message with multiple cards',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            cards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  header: { type: 'string' },
                  body: { type: 'string' },
                  mediaUrl: { type: 'string' },
                  buttonId: { type: 'string' },
                  buttonText: { type: 'string' }
                }
              }
            }
          },
          required: ['to', 'cards']
        }
      },
      {
        name: 'create_text_story',
        description: 'Create and publish a text story/status',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Story text content' }
          },
          required: ['text']
        }
      },
      {
        name: 'create_media_story',
        description: 'Create and publish a media story/status',
        inputSchema: {
          type: 'object',
          properties: {
            media: { type: 'string', description: 'Media file URL or base64' },
            caption: { type: 'string', description: 'Media caption' }
          },
          required: ['media']
        }
      },
      {
        name: 'get_stories',
        description: 'Get list of published stories',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'create_newsletter',
        description: 'Create a WhatsApp newsletter/channel',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Newsletter name' },
            description: { type: 'string', description: 'Newsletter description' }
          },
          required: ['name', 'description']
        }
      },
      {
        name: 'get_newsletters',
        description: 'Get all newsletters/channels',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'subscribe_to_newsletter',
        description: 'Subscribe a contact to a newsletter',
        inputSchema: {
          type: 'object',
          properties: {
            newsletterId: { type: 'string', description: 'Newsletter ID' },
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['newsletterId', 'contactId']
        }
      },
      {
        name: 'get_business_profile',
        description: 'Get WhatsApp Business profile',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'create_product',
        description: 'Create a product for WhatsApp Business',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product name' },
            description: { type: 'string', description: 'Product description' },
            price: { type: 'number', description: 'Product price' },
            currency: { type: 'string', description: 'Currency code' },
            imageUrl: { type: 'string', description: 'Product image URL' },
            url: { type: 'string', description: 'Product URL' }
          },
          required: ['name', 'description', 'price']
        }
      },
      {
        name: 'send_catalog',
        description: 'Send product catalog to a contact',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['to', 'contactId']
        }
      },
      {
        name: 'send_product',
        description: 'Send a specific product to a contact',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            productId: { type: 'string', description: 'Product ID' }
          },
          required: ['to', 'productId']
        }
      },
      {
        name: 'send_poll_message',
        description: 'Send an interactive poll message',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            question: { type: 'string', description: 'Poll question' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Poll options'
            }
          },
          required: ['to', 'question', 'options']
        }
      },
      {
        name: 'send_location_message',
        description: 'Send a location message',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            latitude: { type: 'number', description: 'Latitude' },
            longitude: { type: 'number', description: 'Longitude' },
            name: { type: 'string', description: 'Location name' },
            address: { type: 'string', description: 'Location address' }
          },
          required: ['to', 'latitude', 'longitude']
        }
      },
      {
        name: 'send_contact_message',
        description: 'Send a contact message',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            contact: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Contact name' },
                phone: { type: 'string', description: 'Contact phone' },
                organization: { type: 'string', description: 'Organization' }
              },
              required: ['name', 'phone']
            }
          },
          required: ['to', 'contact']
        }
      },
      {
        name: 'get_labels',
        description: 'Get all WhatsApp labels',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'create_label',
        description: 'Create a new WhatsApp label',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Label name' }
          },
          required: ['name']
        }
      },
      {
        name: 'add_label_to_entity',
        description: 'Add a label to a message or chat',
        inputSchema: {
          type: 'object',
          properties: {
            labelId: { type: 'string', description: 'Label ID' },
            entityId: { type: 'string', description: 'Entity ID (message/chat ID)' }
          },
          required: ['labelId', 'entityId']
        }
      },
      {
        name: 'get_chats',
        description: 'Get all chats',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'archive_chat',
        description: 'Archive or unarchive a chat',
        inputSchema: {
          type: 'object',
          properties: {
            chatId: { type: 'string', description: 'Chat ID' }
          },
          required: ['chatId']
        }
      },
      {
        name: 'set_online_presence',
        description: 'Set online presence',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'send_typing_presence',
        description: 'Send typing presence to a chat',
        inputSchema: {
          type: 'object',
          properties: {
            chatId: { type: 'string', description: 'Chat ID' }
          },
          required: ['chatId']
        }
      },
      {
        name: 'get_channel_settings',
        description: 'Get channel settings and configuration',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_limits',
        description: 'Get API usage limits and quotas',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'check_health',
        description: 'Check API health and channel status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('RE Engine Outreach MCP server started');
  
  // Initialize workflow cleanup
  setInterval(async () => {
    await workflowAutomation.cleanup();
  }, 60 * 60 * 1000); // Cleanup every hour
}

if (require.main === module) {
  main().catch((error) => {
    logger.error({ error: (error as Error).message }, 'Server startup failed');
    process.exit(1);
  });
}
