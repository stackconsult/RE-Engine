import { CsvStore } from "../store/csv/csvStore.js";
import { ApprovalService } from "../approvals/approvalService.js";
import { RouterService } from "../router/routerService.js";
import type { Adapters } from "../router/adapters.js";
import { logger } from "../observability/logger.js";

// Production smoke test: draft → approve → route (with mocked adapters)

const dataDir = process.env.REENGINE_DATA_DIR || "./engine/data";

const store = new CsvStore(dataDir);
const approvals = new ApprovalService(store);

const adapters: Adapters = {
  email: { send: async () => ({ ok: true, message_id: "mock_email_1" }) },
  whatsapp: { send: async () => ({ ok: true, message_id: "mock_wa_1" }) },
  telegram: { send: async () => ({ ok: true, message_id: "mock_tg_1" }) },
  linkedin: { send: async () => ({ ok: true }) },
  facebook: { send: async () => ({ ok: true }) },
};

const router = new RouterService(store, adapters);

async function main() {
  const draft = await approvals.createDraft({
    lead_id: "lead_smoke",
    channel: "email",
    action_type: "send_email",
    draft_to: "test@example.com",
    draft_subject: "Smoke Test",
    draft_text: "Hello (smoke).",
    campaign: "smoke",
  });

  await approvals.approve(draft.approval_id, "smoke");

  const res = await router.processApproved(10);
  logger.info({ ok: true, res }, "smoke test complete");
}

main().catch((e) => {
  logger.error(e, "smoke test failed");
  process.exit(1);
});
