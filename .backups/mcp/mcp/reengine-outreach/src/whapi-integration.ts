import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export interface WhapiConfig {
  apiToken: string;
  baseUrl: string;
  webhookUrl?: string;
}

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  source: 'whatsapp' | 'group' | 'newsletter' | 'cold';
  score: number;
  status: 'new' | 'contacted' | 'engaged' | 'qualified' | 'converted' | 'lost';
  lastActivity: string;
  metadata: Record<string, any>;
}

export interface OutreachSequence {
  id: string;
  leadId: string;
  name: string;
  steps: OutreachStep[];
  currentStep: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface OutreachStep {
  id: string;
  type: 'cold_message' | 'follow_up' | 'contextual_reply' | 'closing' | 'story_view' | 'product_share';
  delay: number;
  message: string;
  mediaType?: 'text' | 'image' | 'video' | 'document' | 'interactive' | 'carousel';
  mediaUrl?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  scheduledTime?: string;
  sentTime?: string;
  messageId?: string;
}

export class WhapiIntegration {
  private config: WhapiConfig;
  private leads: Map<string, Lead> = new Map();
  private sequences: Map<string, OutreachSequence> = new Map();
  private engagementMetrics: Map<string, any> = new Map();

  constructor(config: WhapiConfig) {
    this.config = config;
    logger.info({ baseUrl: config.baseUrl }, 'Whapi Integration initialized');
  }

  // Core API Methods
  public async apiCall(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET', body?: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json'
    };

    logger.debug({ endpoint, method, url }, 'Whapi API call');

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`Whapi API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug(`Whapi API response: ${endpoint}, status: ${response.status}`);
      return data;
    } catch (error) {
      logger.error(`Whapi API call failed: ${endpoint}, method: ${method}, error: ${(error as Error).message}`);
      throw error;
    }
  }

  // Lead Management
  async createLead(phone: string, name?: string, source: Lead['source'] = 'whatsapp'): Promise<Lead> {
    const lead: Lead = {
      id: uuidv4(),
      phone,
      name,
      source,
      score: 0,
      status: 'new',
      lastActivity: new Date().toISOString(),
      metadata: {}
    };

    this.leads.set(lead.id, lead);
    
    logger.info(`Lead created: ${lead.id}, phone: ${phone}, source: ${source}`);
    
    // Audit log
    logger.info('LEAD_CREATED %j', {
      leadId: lead.id,
      phone,
      name,
      source,
      timestamp: new Date().toISOString()
    });

    return lead;
  }

  async updateLeadScore(leadId: string, factors: Array<{type: string, weight: number, value: number}>): Promise<Lead> {
    const lead = this.leads.get(leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Calculate weighted score
    const totalScore = factors.reduce((sum, factor) => {
      return sum + (factor.weight * factor.value);
    }, 0);

    lead.score = Math.min(100, Math.max(0, totalScore));
    lead.lastActivity = new Date().toISOString();

    // Update status based on score
    if (lead.score >= 80) {
      lead.status = 'qualified';
    } else if (lead.score >= 60) {
      lead.status = 'engaged';
    }

    this.leads.set(leadId, lead);

    logger.info(`Lead score updated: ${leadId}, score: ${lead.score}`);
    
    // Audit log
    logger.info('LEAD_SCORED %j', {
      leadId,
      score: lead.score,
      factors,
      category: lead.score >= 80 ? 'hot' : lead.score >= 60 ? 'warm' : 'cold',
      timestamp: new Date().toISOString()
    });

    return lead;
  }

  // Message Operations
  async sendTextMessage(to: string, body: string, options?: any): Promise<any> {
    return this.apiCall('/messages/text', 'POST', {
      to,
      body,
      ...options
    });
  }

  async sendInteractiveMessage(to: string, body: string, buttons: Array<{id: string, text: string}>): Promise<any> {
    return this.apiCall('/messages/interactive', 'POST', {
      to,
      body,
      keyboard: {
        buttons: buttons.map(btn => ({
          buttonId: btn.id,
          buttonText: { displayText: btn.text },
          type: 1
        }))
      }
    });
  }

  async sendMediaMessage(to: string, mediaType: 'image' | 'video' | 'document', media: string, caption?: string): Promise<any> {
    const endpoint = `/messages/${mediaType}`;
    return this.apiCall(endpoint, 'POST', {
      to,
      media,
      caption
    });
  }

  async sendProductMessage(to: string, productId: string): Promise<any> {
    return this.apiCall('/business/products/' + productId, 'POST', { to });
  }

  async sendCarouselMessage(to: string, cards: Array<{header: string, body: string, mediaUrl?: string, buttonId?: string, buttonText?: string}>): Promise<any> {
    return this.apiCall('/messages/carousel', 'POST', {
      to,
      cards: cards.map(card => ({
        header: card.header,
        body: card.body,
        mediaUrl: card.mediaUrl,
        buttonId: card.buttonId,
        buttonText: card.buttonText
      }))
    });
  }

  // Group Operations for Lead Generation
  async getGroups(): Promise<any> {
    return this.apiCall('/groups');
  }

  async getGroupParticipants(groupId: string): Promise<any> {
    return this.apiCall(`/groups/${groupId}/participants`);
  }

  async extractLeadsFromGroups(): Promise<Lead[]> {
    const groups = await this.getGroups();
    const newLeads: Lead[] = [];

    for (const group of groups) {
      try {
        const participants = await this.getGroupParticipants(group.id);
        
        for (const participant of participants) {
          // Check if lead already exists
          const existingLead = Array.from(this.leads.values()).find(lead => lead.phone === participant.phone);
          
          if (!existingLead) {
            const lead = await this.createLead(participant.phone, participant.name || participant.phone, 'group');
            lead.metadata = {
              groupId: group.id,
              groupName: group.name,
              joinedAt: participant.joinedAt,
              role: participant.role
            };
            newLeads.push(lead);
          }
        }
      } catch (error) {
        logger.error(`Failed to extract leads from group: ${group.id}, error: ${(error as Error).message}`);
      }
    }

    logger.info(`Leads extracted from groups: ${newLeads.length}`);
    return newLeads;
  }

  // Newsletter Operations
  async getNewsletters(): Promise<any> {
    return this.apiCall('/newsletters');
  }

  async createNewsletter(name: string, description: string): Promise<any> {
    return this.apiCall('/newsletters', 'POST', {
      name,
      description
    });
  }

  async subscribeToNewsletter(newsletterId: string, contactId: string): Promise<any> {
    return this.apiCall(`/newsletters/${newsletterId}/subscription`, 'POST', {
      contactId
    });
  }

  // Business Operations
  async createProduct(product: any): Promise<any> {
    return this.apiCall('/business/products', 'POST', product);
  }

  async sendCatalog(to: string, contactId: string): Promise<any> {
    return this.apiCall(`/business/catalogs/${contactId}`, 'POST', { to });
  }

  // Outreach Sequence Management
  async createOutreachSequence(leadId: string, name: string, steps: OutreachStep[]): Promise<OutreachSequence> {
    const sequence: OutreachSequence = {
      id: uuidv4(),
      leadId,
      name,
      steps: steps.map((step, index) => ({
        ...step,
        id: step.id || uuidv4(),
        status: 'pending',
        scheduledTime: new Date(Date.now() + step.delay * 60 * 60 * 1000).toISOString()
      })),
      currentStep: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.sequences.set(sequence.id, sequence);

    logger.info(`Outreach sequence created: ${sequence.id}, lead: ${leadId}, name: ${name}, steps: ${steps.length}`);

    // Audit log
    logger.info('SEQUENCE_CREATED %j', {
      sequenceId: sequence.id,
      leadId,
      name,
      totalSteps: steps.length,
      timestamp: new Date().toISOString()
    });

    return sequence;
  }

  async executeSequenceStep(sequenceId: string): Promise<any> {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence not found: ${sequenceId}`);
    }

    const lead = this.leads.get(sequence.leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${sequence.leadId}`);
    }

    const currentStep = sequence.steps[sequence.currentStep];
    if (!currentStep || currentStep.status !== 'pending') {
      throw new Error('No pending step to execute');
    }

    try {
      let result;

      switch (currentStep.type) {
        case 'cold_message':
          result = await this.sendTextMessage(lead.phone, currentStep.message);
          break;
        case 'follow_up':
          result = await this.sendTextMessage(lead.phone, currentStep.message);
          break;
        case 'contextual_reply':
          result = await this.sendInteractiveMessage(
            lead.phone, 
            currentStep.message,
            [{ id: 'interested', text: 'Interested' }, { id: 'not_now', text: 'Not now' }]
          );
          break;
        case 'product_share':
          if (currentStep.mediaUrl) {
            result = await this.sendMediaMessage(lead.phone, 'image', currentStep.mediaUrl, currentStep.message);
          } else {
            result = await this.sendTextMessage(lead.phone, currentStep.message);
          }
          break;
        case 'closing':
          result = await this.sendInteractiveMessage(
            lead.phone,
            currentStep.message,
            [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }]
          );
          break;
        default:
          result = await this.sendTextMessage(lead.phone, currentStep.message);
      }

      // Update step status
      currentStep.status = 'sent';
      currentStep.sentTime = new Date().toISOString();
      currentStep.messageId = result.id;

      // Update lead
      lead.lastActivity = new Date().toISOString();
      lead.status = 'contacted';

      // Move to next step or complete sequence
      if (sequence.currentStep < sequence.steps.length - 1) {
        sequence.currentStep++;
      } else {
        sequence.status = 'completed';
      }

      sequence.updatedAt = new Date().toISOString();

      logger.info(`Sequence step executed: ${sequenceId}, step: ${currentStep.id}, type: ${currentStep.type}, message: ${result.id}`);

      // Audit log
      logger.info(`STEP_EXECUTED: ${JSON.stringify({
        sequenceId,
        stepId: currentStep.id,
        leadId: sequence.leadId,
        messageType: currentStep.type,
        messageId: result.id,
        timestamp: new Date().toISOString()
      })}`);

      return result;

    } catch (error) {
      currentStep.status = 'failed';
      sequence.status = 'failed';
      
      logger.error(`Sequence step failed: ${sequenceId}, step: ${currentStep.id}, error: ${(error as Error).message}`);

      throw error;
    }
  }

  // Engagement Monitoring
  async trackEngagement(leadId: string, event: string, data: any): Promise<void> {
    const metrics = this.engagementMetrics.get(leadId) || {
      messageCount: 0,
      responseRate: 0,
      averageResponseTime: 0,
      lastSeen: null,
      events: []
    };

    metrics.events.push({
      event,
      timestamp: new Date().toISOString(),
      data
    });

    // Update metrics
    if (event === 'message_received') {
      metrics.messageCount++;
    } else if (event === 'message_sent') {
      metrics.messageCount++;
    }

    metrics.lastSeen = new Date().toISOString();
    this.engagementMetrics.set(leadId, metrics);

    logger.debug(`Engagement tracked: ${leadId}, event: ${event}`);
  }

  // Analytics and Reporting
  async getLeadAnalytics(): Promise<any> {
    const leads = Array.from(this.leads.values());
    const sequences = Array.from(this.sequences.values());

    return {
      totalLeads: leads.length,
      leadsBySource: leads.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      leadsByStatus: leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageScore: leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length || 0,
      activeSequences: sequences.filter(seq => seq.status === 'active').length,
      completedSequences: sequences.filter(seq => seq.status === 'completed').length,
      conversionRate: leads.filter(lead => lead.status === 'converted').length / leads.length || 0
    };
  }

  // Utility Methods
  async checkPhone(phone: string): Promise<boolean> {
    try {
      const result = await this.apiCall('/contacts', 'POST', { phones: [phone] });
      return result[0]?.exists || false;
    } catch (error) {
      logger.error(`Phone check failed: ${phone}, error: ${(error as Error).message}`);
      return false;
    }
  }

  async getBusinessProfile(): Promise<any> {
    return this.apiCall('/business');
  }

  async updateBusinessProfile(profile: any): Promise<any> {
    return this.apiCall('/business', 'POST', profile);
  }
}
