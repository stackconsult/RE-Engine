import { describe, expect, it } from "vitest";
import { CsvStore } from "../src/store/csv/csvStore.js";
import { ApprovalService } from "../src/approvals/approvalService.js";
import fs from "node:fs/promises";
import path from "node:path";
describe("ApprovalService", () => {
    it("creates and approves a draft", async () => {
        const tmp = path.join("/tmp", `reengine_test_${Date.now()}`);
        await fs.mkdir(tmp, { recursive: true });
        const store = new CsvStore(tmp);
        const svc = new ApprovalService(store);
        const draft = await svc.createDraft({
            lead_id: "lead_1",
            channel: "email",
            action_type: "send_email",
            draft_to: "a@b.com",
            draft_text: "hello",
            campaign: "test",
        });
        expect(draft.status).toBe("pending");
        const approved = await svc.approve(draft.approval_id, "test");
        expect(approved.status).toBe("approved");
    });
});
//# sourceMappingURL=approvalService.test.js.map