export type ISO8601 = string;

export type Channel =
  | "email"
  | "whatsapp"
  | "telegram"
  | "linkedin"
  | "facebook";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "sent"
  | "failed"
  | "approved_opened"
  | "sent_manual";

export type LeadStatus = "new" | "drafted" | "sent" | "replied" | "hot" | "dnc";

export type ApprovalActionType =
  | "send_email"
  | "reply"
  | "dm"
  | "post"
  | "contact_capture";

export interface Lead {
  lead_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_e164: string;
  city: string;
  province: string;
  source: string;
  tags: string;
  status: LeadStatus;
  created_at: ISO8601;
}

export interface Approval {
  approval_id: string;
  ts_created: ISO8601;
  lead_id: string;
  channel: Channel;
  action_type: ApprovalActionType;
  draft_subject: string;
  draft_text: string;
  draft_to: string;
  status: ApprovalStatus;
  approved_by: string;
  approved_at: string;
  notes: string;
}

export interface EventRow {
  event_id: string;
  ts: ISO8601;
  lead_id: string;
  channel: string;
  event_type: string;
  campaign: string;
  message_id: string;
  meta_json: string;
}

export interface DncEntry {
  value: string;
  reason: string;
  ts_added: ISO8601;
}

export interface ContactMap {
  lead_id: string;
  channel: "whatsapp" | "telegram";
  external_id: string;
}
