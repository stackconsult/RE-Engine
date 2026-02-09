import { describe, it } from "node:test";
import assert from "node:assert";
import { CsvStore } from "../src/store/csv/csvStore.js";
import { ApprovalService } from "../src/approvals/approvalService.js";
import fs from "node:fs/promises";
import path from "node:path";

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ApprovalService", () => {
  it("creates and approves a draft", async () => {
    const tmpBase = path.join(__dirname, 'tmp');
    await fs.mkdir(tmpBase, { recursive: true });
    const tmp = await fs.mkdtemp(path.join(tmpBase, 'reengine_test_'));

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
