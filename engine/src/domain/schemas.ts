import { z } from "zod";

export const ChannelSchema = z.enum([
  "email",
  "whatsapp",
  "telegram",
  "linkedin",
  "facebook",
]);

export const ApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "sent",
  "failed",
  "approved_opened",
  "sent_manual",
]);

export const LeadStatusSchema = z.enum(["new", "drafted", "sent", "replied", "hot", "dnc"]);

export const ApprovalActionTypeSchema = z.enum([
  "send_email",
  "reply",
  "dm",
  "post",
  "contact_capture",
]);

export const LeadSchema = z.object({
  lead_id: z.string().min(1),
  first_name: z.string().optional().default(""),
  last_name: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone_e164: z.string().optional().default(""),
  city: z.string().optional().default(""),
  province: z.string().optional().default(""),
  source: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  status: LeadStatusSchema,
  created_at: z.string(),
});

export const ApprovalSchema = z.object({
  approval_id: z.string().min(1),
  ts_created: z.string(),
  lead_id: z.string().optional().default(""),
  channel: ChannelSchema,
  action_type: ApprovalActionTypeSchema,
  draft_subject: z.string().optional().default(""),
  draft_text: z.string().optional().default(""),
  draft_to: z.string().optional().default(""),
  status: ApprovalStatusSchema,
  approved_by: z.string().optional().default(""),
  approved_at: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const EventRowSchema = z.object({
  event_id: z.string().min(1),
  ts: z.string(),
  lead_id: z.string().optional().default(""),
  channel: z.string().optional().default(""),
  event_type: z.string().min(1),
  campaign: z.string().optional().default(""),
  message_id: z.string().optional().default(""),
  meta_json: z.string().optional().default("{}"),
});

export const DncEntrySchema = z.object({
  value: z.string().min(1),
  reason: z.string().optional().default(""),
  ts_added: z.string(),
});

export const ContactMapSchema = z.object({
  lead_id: z.string().min(1),
  channel: z.enum(["whatsapp", "telegram"]),
  external_id: z.string().min(1),
});
