import { randomUUID } from "node:crypto";
import { logger } from "../observability/logger.js";
export class ApprovalService {
    store;
    constructor(store) {
        this.store = store;
    }
    async listByStatus(status) {
        const rows = await this.store.listApprovals();
        if (!status)
            return rows;
        return rows.filter((r) => (r.status || "").toLowerCase() === status.toLowerCase());
    }
    async createDraft(params) {
        const rows = await this.store.listApprovals();
        const approval = {
            approval_id: `appr_${randomUUID().slice(0, 12)}`,
            ts_created: new Date().toISOString(),
            lead_id: params.lead_id || "",
            channel: params.channel,
            action_type: params.action_type,
            draft_subject: params.draft_subject || "",
            draft_text: params.draft_text,
            draft_to: params.draft_to,
            status: "pending",
            approved_by: "",
            approved_at: "",
            notes: params.campaign ? `campaign=${params.campaign}` : "",
        };
        rows.push(approval);
        await this.store.saveApprovals(rows);
        await this.store.appendEvent({
            event_id: `evt_${Date.now()}`,
            ts: new Date().toISOString(),
            lead_id: approval.lead_id,
            channel: approval.channel,
            event_type: "draft_created",
            campaign: params.campaign || "reengine",
            message_id: "",
            meta_json: JSON.stringify({ approval_id: approval.approval_id, to: approval.draft_to }),
        });
        logger.info({ approval_id: approval.approval_id, channel: approval.channel }, "draft created");
        return approval;
    }
    async approve(approval_id, by = "windsurf") {
        const rows = await this.store.listApprovals();
        const idx = rows.findIndex((r) => r.approval_id === approval_id);
        if (idx < 0)
            throw new Error(`approval_id not found: ${approval_id}`);
        const row = rows[idx];
        if (row.status === "sent")
            return row;
        row.status = "approved";
        row.approved_by = by;
        row.approved_at = new Date().toISOString();
        rows[idx] = row;
        await this.store.saveApprovals(rows);
        await this.store.appendEvent({
            event_id: `evt_${Date.now()}`,
            ts: new Date().toISOString(),
            lead_id: row.lead_id,
            channel: row.channel,
            event_type: "approve",
            campaign: "reengine",
            message_id: "",
            meta_json: JSON.stringify({ approval_id }),
        });
        return row;
    }
    async reject(approval_id, reason = "rejected", by = "windsurf") {
        const rows = await this.store.listApprovals();
        const idx = rows.findIndex((r) => r.approval_id === approval_id);
        if (idx < 0)
            throw new Error(`approval_id not found: ${approval_id}`);
        const row = rows[idx];
        if (row.status === "sent")
            return row;
        row.status = "rejected";
        row.approved_by = by;
        row.approved_at = new Date().toISOString();
        row.notes = reason;
        rows[idx] = row;
        await this.store.saveApprovals(rows);
        await this.store.appendEvent({
            event_id: `evt_${Date.now()}`,
            ts: new Date().toISOString(),
            lead_id: row.lead_id,
            channel: row.channel,
            event_type: "reject",
            campaign: "reengine",
            message_id: "",
            meta_json: JSON.stringify({ approval_id, reason }),
        });
        return row;
    }
}
//# sourceMappingURL=approvalService.js.map