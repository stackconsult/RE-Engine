import { describe, it } from "node:test";
import assert from "node:assert";
import { CsvStore } from "../src/store/csv/csvStore.js";
import { ApprovalService } from "../src/approvals/approvalService.js";
import fs from "node:fs/promises";
import path from "node:path";
describe("ApprovalService", () => {
    it("creates and approves a draft", async () => {
        const tmp = path.join("/Users/kirtissiemens/.gemini/tmp/48988562a6ad217ad9a52dcc8d28f1d5d0edeed18d0b9311e9f17102177477ae", `reengine_test_${Date.now()}`);
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
        assert.strictEqual(draft.status, "pending");
        const approved = await svc.approve(draft.approval_id, "test");
        assert.strictEqual(approved.status, "approved");
    });
});
//# sourceMappingURL=approvalService.test.js.map