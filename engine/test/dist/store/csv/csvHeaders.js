export const LEADS_HEADERS = [
    "lead_id",
    "first_name",
    "last_name",
    "email",
    "phone_e164",
    "city",
    "province",
    "source",
    "tags",
    "status",
    "created_at",
];
export const APPROVALS_HEADERS = [
    "approval_id",
    "ts_created",
    "lead_id",
    "channel",
    "action_type",
    "draft_subject",
    "draft_text",
    "draft_to",
    "status",
    "approved_by",
    "approved_at",
    "notes",
];
export const EVENTS_HEADERS = [
    "event_id",
    "ts",
    "lead_id",
    "channel",
    "event_type",
    "campaign",
    "message_id",
    "meta_json",
];
export const CONTACTS_HEADERS = ["lead_id", "channel", "external_id"];
export const DNC_HEADERS = ["value", "reason", "ts_added"];
//# sourceMappingURL=csvHeaders.js.map