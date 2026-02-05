import { IngestService, IngestResult, IngestMessage } from "./types.js";
import { Store } from "../store/store.js";
import { ApprovalService } from "../approvals/approvalService.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../observability/logger.js";
import { EventRow } from "../domain/types.js";

export abstract class BaseIngestService implements IngestService {
  protected store: Store;
  protected approvalService: ApprovalService;
  protected connected = false;

  constructor(store: Store, approvalService: ApprovalService) {
    this.store = store;
    this.approvalService = approvalService;
  }

  abstract ingest(): Promise<IngestResult[]>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  protected createEvent(leadId: string, channel: string, eventType: string, meta: any = {}): EventRow {
    return {
      event_id: uuidv4(),
      ts: new Date().toISOString(),
      lead_id: leadId,
      channel,
      event_type: eventType,
      campaign: meta.campaign || "",
      message_id: meta.message_id || "",
      meta_json: JSON.stringify(meta),
    };
  }

  protected async findOrCreateLead(message: IngestMessage): Promise<{ lead: any; isNew: boolean }> {
    // Try to find existing lead by email or phone
    let lead = null;
    
    if (message.channel === "email" && message.from) {
      lead = await this.store.findLeadByEmail(message.from);
    } else if ((message.channel === "whatsapp" || message.channel === "telegram") && message.from) {
      lead = await this.store.findLeadByPhone(message.from);
    }

    if (lead) {
      return { lead, isNew: false };
    }

    // Create new lead
    const newLead = {
      lead_id: uuidv4(),
      first_name: "",
      last_name: "",
      email: message.channel === "email" ? message.from : "",
      phone_e164: (message.channel === "whatsapp" || message.channel === "telegram") ? message.from : "",
      city: "",
      province: "",
      source: `ingest_${message.channel}`,
      tags: "",
      status: "new" as const,
      created_at: new Date().toISOString(),
    };

    await this.store.createLead(newLead);
    logger.info({ leadId: newLead.lead_id, from: message.from }, `Created new lead from ${message.channel}`);

    return { lead: newLead, isNew: true };
  }

  protected async createReplyApproval(lead: any, message: IngestMessage): Promise<void> {
    const approval = {
      approval_id: uuidv4(),
      ts_created: new Date().toISOString(),
      lead_id: lead.lead_id,
      channel: message.channel,
      action_type: "reply" as const,
      draft_subject: message.subject || `Re: ${message.channel} message`,
      draft_text: this.generateReplyDraft(message),
      draft_to: message.from,
      status: "pending" as const,
      approved_by: "",
      approved_at: "",
      notes: `Auto-generated from inbound ${message.channel} message`,
    };

    await this.approvalService.createDraft(approval);
    logger.info({ approvalId: approval.approval_id, leadId: lead.lead_id }, `Created reply approval`);
  }

  protected generateReplyDraft(message: IngestMessage): string {
    // Basic reply draft generation - can be enhanced with AI
    return `Thank you for your message. We'll get back to you shortly.

Original message:
${message.body}`;
  }
}
