import path from "node:path";

import { z } from "zod";

import type { Approval, ContactMap, DncEntry, EventRow, Lead } from "../../domain/types.ts";
import {
  ApprovalSchema,
  ContactMapSchema,
  DncEntrySchema,
  EventRowSchema,
  LeadSchema,
} from "../../domain/schemas.ts";
import type { Store } from "../store.ts";
import {
  APPROVALS_HEADERS,
  CONTACTS_HEADERS,
  DNC_HEADERS,
  EVENTS_HEADERS,
  LEADS_HEADERS,
} from "./csvHeaders.ts";
import { atomicWriteFile, fileExists, parseCsv, readText, toCsv } from "./csvIO.ts";

function validateHeaders(found: string[], expected: readonly string[], file: string) {
  const same = found.length === expected.length && found.every((h, i) => h === expected[i]);
  if (!same) {
    throw new Error(
      `CSV headers mismatch for ${file}\nExpected: ${expected.join(",")}\nFound:    ${found.join(",")}`
    );
  }
}

function mapRows<T extends z.ZodTypeAny>(rows: Record<string, string>[], schema: T): z.infer<T>[] {
  return rows.map((r) => schema.parse(r));
}

function serializeRows(headers: readonly string[], rows: unknown[]): Record<string, string>[] {
  return rows.map((r) => {
    const obj = r as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = (obj[h] ?? "").toString();
    return out;
  });
}

export class CsvStore implements Store {
  constructor(private readonly dataDir: string) {}

  private p(name: string) {
    return path.join(this.dataDir, name);
  }

  async listLeads(): Promise<Lead[]> {
    const file = this.p("leads.csv");
    if (!(await fileExists(file))) {
      await atomicWriteFile(file, toCsv(LEADS_HEADERS, []));
    }
    const { headers, rows } = parseCsv(await readText(file));
    validateHeaders(headers, LEADS_HEADERS, file);
    return mapRows(rows, LeadSchema) as Lead[];
  }

  async upsertLeads(leads: Lead[]): Promise<void> {
    const file = this.p("leads.csv");
    const csv = toCsv(LEADS_HEADERS, serializeRows(LEADS_HEADERS, leads));
    await atomicWriteFile(file, csv);
  }

  async listApprovals(): Promise<Approval[]> {
    const file = this.p("approvals.csv");
    if (!(await fileExists(file))) {
      await atomicWriteFile(file, toCsv(APPROVALS_HEADERS, []));
    }
    const { headers, rows } = parseCsv(await readText(file));
    validateHeaders(headers, APPROVALS_HEADERS, file);
    return mapRows(rows, ApprovalSchema) as Approval[];
  }

  async saveApprovals(rows: Approval[]): Promise<void> {
    const file = this.p("approvals.csv");
    const csv = toCsv(APPROVALS_HEADERS, serializeRows(APPROVALS_HEADERS, rows));
    await atomicWriteFile(file, csv);
  }

  async appendEvent(e: EventRow): Promise<void> {
    const file = this.p("events.csv");
    if (!(await fileExists(file))) {
      await atomicWriteFile(file, toCsv(EVENTS_HEADERS, []));
    }
    const parsed = EventRowSchema.parse(e);
    const { headers, rows } = parseCsv(await readText(file));
    validateHeaders(headers, EVENTS_HEADERS, file);
    rows.push(serializeRows(EVENTS_HEADERS, [parsed])[0]!);
    await atomicWriteFile(file, toCsv(EVENTS_HEADERS, rows));
  }

  async listContacts(): Promise<ContactMap[]> {
    const file = this.p("contacts.csv");
    if (!(await fileExists(file))) {
      await atomicWriteFile(file, toCsv(CONTACTS_HEADERS, []));
    }
    const { headers, rows } = parseCsv(await readText(file));
    validateHeaders(headers, CONTACTS_HEADERS, file);
    return mapRows(rows, ContactMapSchema) as ContactMap[];
  }

  async upsertContacts(rows: ContactMap[]): Promise<void> {
    const file = this.p("contacts.csv");
    const csv = toCsv(CONTACTS_HEADERS, serializeRows(CONTACTS_HEADERS, rows));
    await atomicWriteFile(file, csv);
  }

  async listDnc(): Promise<DncEntry[]> {
    const file = this.p("dnc.csv");
    if (!(await fileExists(file))) {
      await atomicWriteFile(file, toCsv(DNC_HEADERS, []));
    }
    const { headers, rows } = parseCsv(await readText(file));
    validateHeaders(headers, DNC_HEADERS, file);
    return mapRows(rows, DncEntrySchema) as DncEntry[];
  }

  async upsertDnc(rows: DncEntry[]): Promise<void> {
    const file = this.p("dnc.csv");
    const csv = toCsv(DNC_HEADERS, serializeRows(DNC_HEADERS, rows));
    await atomicWriteFile(file, csv);
  }

  // Additional methods for ingest services
  async findLeadByEmail(email: string): Promise<Lead | null> {
    const leads = await this.listLeads();
    return leads.find(lead => lead.email === email) || null;
  }

  async findLeadByPhone(phone: string): Promise<Lead | null> {
    const leads = await this.listLeads();
    return leads.find(lead => lead.phone_e164 === phone) || null;
  }

  async createLead(leadData: Omit<Lead, "lead_id" | "created_at">): Promise<Lead> {
    const leads = await this.listLeads();
    
    const newLead: Lead = {
      ...leadData,
      lead_id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString()
    };

    leads.push(newLead);
    await this.upsertLeads(leads);
    
    return newLead;
  }
}
