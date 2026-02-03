import { logger } from "../observability/logger.js";
export class RouterService {
    store;
    adapters;
    constructor(store, adapters) {
        this.store = store;
        this.adapters = adapters;
    }
    async processApproved(max = 20) {
        const approvals = await this.store.listApprovals();
        let processed = 0;
        let sent = 0;
        let failed = 0;
        let opened = 0;
        for (let i = 0; i < approvals.length; i++) {
            if (processed >= max)
                break;
            const row = approvals[i];
            if (row.status !== "approved")
                continue;
            processed += 1;
            try {
                const adapter = this.adapters[row.channel];
                if (!adapter)
                    throw new Error(`No adapter configured for channel=${row.channel}`);
                const res = await adapter.send(row);
                if (row.channel === "linkedin" || row.channel === "facebook") {
                    // Semi-auto: open page and mark approved_opened.
                    row.status = "approved_opened";
                    opened += 1;
                }
                else if (res.ok) {
                    row.status = "sent";
                    sent += 1;
                }
                else {
                    row.status = "failed";
                    row.notes = `${new Date().toISOString()} failed: ${res.error || "unknown"}`;
                    failed += 1;
                }
                approvals[i] = row;
                await this.store.appendEvent({
                    event_id: `evt_${Date.now()}`,
                    ts: new Date().toISOString(),
                    lead_id: row.lead_id,
                    channel: row.channel,
                    event_type: row.status === "sent" ? "sent" : row.status,
                    campaign: "reengine",
                    message_id: res.message_id || "",
                    meta_json: JSON.stringify({ approval_id: row.approval_id, to: row.draft_to, ok: res.ok }),
                });
                logger.info({ approval_id: row.approval_id, status: row.status }, "router processed approval");
            }
            catch (e) {
                row.status = "failed";
                row.notes = `${new Date().toISOString()} failed: ${String(e?.message || e)}`;
                approvals[i] = row;
                await this.store.appendEvent({
                    event_id: `evt_${Date.now()}`,
                    ts: new Date().toISOString(),
                    lead_id: row.lead_id,
                    channel: row.channel,
                    event_type: "failed",
                    campaign: "reengine",
                    message_id: "",
                    meta_json: JSON.stringify({ approval_id: row.approval_id, error: String(e?.message || e) }),
                });
                failed += 1;
            }
        }
        await this.store.saveApprovals(approvals);
        return { processed, sent, failed, opened };
    }
}
//# sourceMappingURL=routerService.js.map