import type { Store } from "../store/store.ts";
import type { Adapters, ChannelAdapter } from "./adapters.ts";
import { logger } from "../observability/logger.ts";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class RouterService {
  constructor(
    private readonly store: Store,
    private readonly adapters: Adapters
  ) {}

  async processApproved(max = 20): Promise<{ processed: number; sent: number; failed: number; opened: number }> {
    const approvals = await this.store.listApprovals();

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let opened = 0;

    for (let i = 0; i < approvals.length; i++) {
      if (processed >= max) break;

      const row = approvals[i]!;
      if (row.status !== "approved") continue;

      processed += 1;

      try {
        const adapter = (this.adapters as unknown as Record<string, ChannelAdapter>)[row.channel];
        if (!adapter) throw new Error(`No adapter configured for channel=${row.channel}`);

        const res = await adapter.send(row);

        if (row.channel === "linkedin" || row.channel === "facebook") {
          // Semi-auto: open page and mark approved_opened.
          row.status = "approved_opened";
          opened += 1;
        } else if (res.ok) {
          row.status = "sent";
          sent += 1;
        } else {
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
      } catch (e: unknown) {
        row.status = "failed";
        row.notes = `${new Date().toISOString()} failed: ${getErrorMessage(e)}`;
        approvals[i] = row;

        await this.store.appendEvent({
          event_id: `evt_${Date.now()}`,
          ts: new Date().toISOString(),
          lead_id: row.lead_id,
          channel: row.channel,
          event_type: "failed",
          campaign: "reengine",
          message_id: "",
          meta_json: JSON.stringify({ approval_id: row.approval_id, error: getErrorMessage(e) }),
        });

        failed += 1;
      }
    }

    await this.store.saveApprovals(approvals);

    return { processed, sent, failed, opened };
  }
}
