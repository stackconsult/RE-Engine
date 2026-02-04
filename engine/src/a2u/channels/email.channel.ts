/**
 * Email Channel - Email communication implementation
 * Follows RE Engine safety invariants and production rules
 */

export interface EmailMessage {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerResponse?: unknown;
}

export interface EmailConfig {
  provider: 'sendgrid' | 'ses' | 'smtp';
  apiKey?: string;
  region?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    email: string;
    name: string;
  };
  rateLimit?: {
    perSecond: number;
    perHour: number;
  };
}

export interface EmailDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'unsubscribed' | 'opened' | 'clicked';
  timestamp: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Email Channel implementation
 * Handles email sending with safety checks and compliance
 */
export class EmailChannel {
  private config: EmailConfig;
  private rateLimiter: Map<string, number[]> = new Map();

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Send email message
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Safety checks
      const validationResult = this.validateMessage(message);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      // Rate limiting
      const rateLimitResult = this.checkRateLimit(message.to);
      if (!rateLimitResult.allowed) {
        return { success: false, error: `Rate limit exceeded: ${rateLimitResult.reason}` };
      }

      // Send based on provider
      let result: EmailSendResult;
      
      switch (this.config.provider) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(message);
          break;
        case 'ses':
          result = await this.sendViaSES(message);
          break;
        case 'smtp':
          result = await this.sendViaSMTP(message);
          break;
        default:
          return { success: false, error: `Unsupported provider: ${this.config.provider}` };
      }

      // Update rate limiter
      if (result.success) {
        this.updateRateLimit(message.to);
      }

      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate email message
   */
  private validateMessage(message: EmailMessage): { valid: boolean; error?: string } {
    // Required fields
    if (!message.to?.trim()) {
      return { valid: false, error: 'Recipient email is required' };
    }

    if (!message.subject?.trim()) {
      return { valid: false, error: 'Subject is required' };
    }

    if (!message.text?.trim() && !message.html?.trim()) {
      return { valid: false, error: 'Either text or HTML content is required' };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(message.to)) {
      return { valid: false, error: 'Invalid recipient email format' };
    }

    // CC/BCC validation
    if (message.cc) {
      for (const cc of message.cc) {
        if (!emailRegex.test(cc)) {
          return { valid: false, error: `Invalid CC email format: ${cc}` };
        }
      }
    }

    if (message.bcc) {
      for (const bcc of message.bcc) {
        if (!emailRegex.test(bcc)) {
          return { valid: false, error: `Invalid BCC email format: ${bcc}` };
        }
      }
    }

    // Content length validation
    if (message.text && message.text.length > 100000) {
      return { valid: false, error: 'Text content too long (>100KB)' };
    }

    if (message.html && message.html.length > 1000000) {
      return { valid: false, error: 'HTML content too long (>1MB)' };
    }

    return { valid: true };
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(email: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const limits = this.rateLimiter.get(email) || [];
    
    // Check per-second limit
    const recentSecond = limits.filter(timestamp => now - timestamp < 1000);
    if (this.config.rateLimit?.perSecond && recentSecond.length >= this.config.rateLimit.perSecond) {
      return { allowed: false, reason: 'Per-second rate limit exceeded' };
    }

    // Check per-hour limit
    const recentHour = limits.filter(timestamp => now - timestamp < 3600000);
    if (this.config.rateLimit?.perHour && recentHour.length >= this.config.rateLimit.perHour) {
      return { allowed: false, reason: 'Per-hour rate limit exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Update rate limiting
   */
  private updateRateLimit(email: string): void {
    const now = Date.now();
    const limits = this.rateLimiter.get(email) || [];
    
    // Add current timestamp
    limits.push(now);
    
    // Remove old timestamps (older than 1 hour)
    const filtered = limits.filter(timestamp => now - timestamp < 3600000);
    
    this.rateLimiter.set(email, filtered);
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Mock SendGrid implementation
      // In production, this would use @sendgrid/mail
      const messageId = `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`[SendGrid] Sending to ${message.to}: ${message.subject}`);
      
      return {
        success: true,
        messageId,
        providerResponse: { messageId, status: 'processed' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send via AWS SES
   */
  private async sendViaSES(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Mock SES implementation
      // In production, this would use @aws-sdk/client-ses
      const messageId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`[SES] Sending to ${message.to}: ${message.subject}`);
      
      return {
        success: true,
        messageId,
        providerResponse: { MessageId: messageId }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send via SMTP
   */
  private async sendViaSMTP(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Mock SMTP implementation
      // In production, this would use nodemailer
      const messageId = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`[SMTP] Sending to ${message.to}: ${message.subject}`);
      
      return {
        success: true,
        messageId,
        providerResponse: { messageId, accepted: [message.to] }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus | null> {
    try {
      // Mock implementation - in production would query provider
      return {
        messageId,
        status: 'delivered',
        timestamp: new Date().toISOString(),
        metadata: { provider: this.config.provider }
      };
    } catch (error) {
      console.error('Error getting delivery status:', error);
      return null;
    }
  }

  /**
   * Parse incoming email
   */
  async parseIncoming(_rawEmail: string): Promise<{
    from: string;
    to: string;
    subject: string;
    text: string;
    headers: Record<string, string>;
  }> {
    try {
      // Mock implementation - in production would use mailparser
      return {
        from: 'sender@example.com',
        to: this.config.from.email,
        subject: 'Re: Original Subject',
        text: 'This is the email content',
        headers: {
          'message-id': `incoming_${Date.now()}`,
          'date': new Date().toUTCString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse incoming email: ${error}`);
    }
  }

  /**
   * Get channel status
   */
  getStatus(): {
    provider: string;
    from: string;
    rateLimitActive: boolean;
    activeConnections: number;
  } {
    return {
      provider: this.config.provider,
      from: `${this.config.from.name} <${this.config.from.email}>`,
      rateLimitActive: !!this.config.rateLimit,
      activeConnections: this.rateLimiter.size
    };
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock connection test
      console.log(`Testing ${this.config.provider} connection...`);
      
      // In production, would send a test email or ping the service
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
