import type { Approval, ContactMap, DncEntry, EventRow, Lead } from "../domain/types.js";

export interface Store {
  // Leads
  listLeads(): Promise<Lead[]>;
  upsertLeads(leads: Lead[]): Promise<void>;
  findLeadByEmail(email: string): Promise<Lead | null>;
  findLeadByPhone(phone: string): Promise<Lead | null>;
  createLead(lead: Omit<Lead, "lead_id" | "created_at">): Promise<Lead>;

  // Approvals
  listApprovals(): Promise<Approval[]>;
  saveApprovals(rows: Approval[]): Promise<void>;

  // Events
  appendEvent(e: EventRow): Promise<void>;

  // Contacts + DNC
  listContacts(): Promise<ContactMap[]>;
  upsertContacts(rows: ContactMap[]): Promise<void>;

  listDnc(): Promise<DncEntry[]>;
  upsertDnc(rows: DncEntry[]): Promise<void>;
}
