import { v4 as uuidv4 } from "uuid";
import { logger } from "../observability/logger.js";
export class BaseIngestService {
    store;
    approvalService;
    connected = false;
    constructor(store, approvalService) {
        this.store = store;
        this.approvalService = approvalService;
    }
    isConnected() {
        return this.connected;
    }
    createEvent(leadId, channel, eventType, meta = {}) {
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
    async findOrCreateLead(message) {
        // Try to find existing lead by email or phone
        let lead = null;
        if (message.channel === "email" && message.from) {
            lead = await this.store.findLeadByEmail(message.from);
        }
        else if ((message.channel === "whatsapp" || message.channel === "telegram") && message.from) {
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
            status: "new",
            created_at: new Date().toISOString(),
        };
        await this.store.createLead(newLead);
        logger.info({ leadId: newLead.lead_id, from: message.from }, `Created new lead from ${message.channel}`);
        return { lead: newLead, isNew: true };
    }
    async createReplyApproval(lead, message) {
        const approval = {
            approval_id: uuidv4(),
            ts_created: new Date().toISOString(),
            lead_id: lead.lead_id,
            channel: message.channel,
            action_type: "reply",
            draft_subject: message.subject || `Re: ${message.channel} message`,
            draft_text: this.generateReplyDraft(message),
            draft_to: message.from,
            status: "pending",
            approved_by: "",
            approved_at: "",
            notes: `Auto-generated from inbound ${message.channel} message`,
        };
        await this.approvalService.createDraft(approval);
        logger.info({ approvalId: approval.approval_id, leadId: lead.lead_id }, `Created reply approval`);
    }
    generateReplyDraft(message) {
        // Basic reply draft generation - can be enhanced with AI
        return `Thank you for your message. We'll get back to you shortly.

Original message:
${message.body}`;
    }
}
//# sourceMappingURL=baseIngestService.js.map