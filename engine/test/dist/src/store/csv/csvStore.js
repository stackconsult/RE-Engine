import path from "node:path";
import { ApprovalSchema, ContactMapSchema, DncEntrySchema, EventRowSchema, LeadSchema, } from "../../domain/schemas.js";
import { APPROVALS_HEADERS, CONTACTS_HEADERS, DNC_HEADERS, EVENTS_HEADERS, LEADS_HEADERS, } from "./csvHeaders.js";
import { atomicWriteFile, fileExists, parseCsv, readText, toCsv } from "./csvIO.js";
function validateHeaders(found, expected, file) {
    const same = found.length === expected.length && found.every((h, i) => h === expected[i]);
    if (!same) {
        throw new Error(`CSV headers mismatch for ${file}\nExpected: ${expected.join(",")}\nFound:    ${found.join(",")}`);
    }
}
function mapRows(rows, schema) {
    return rows.map((r) => schema.parse(r));
}
function serializeRows(headers, rows) {
    return rows.map((r) => {
        const obj = r;
        const out = {};
        for (const h of headers)
            out[h] = (obj[h] ?? "").toString();
        return out;
    });
}
export class CsvStore {
    dataDir;
    constructor(dataDir) {
        this.dataDir = dataDir;
    }
    p(name) {
        return path.join(this.dataDir, name);
    }
    async listLeads() {
        const file = this.p("leads.csv");
        if (!(await fileExists(file))) {
            await atomicWriteFile(file, toCsv(LEADS_HEADERS, []));
        }
        const { headers, rows } = parseCsv(await readText(file));
        validateHeaders(headers, LEADS_HEADERS, file);
        return mapRows(rows, LeadSchema);
    }
    async upsertLeads(leads) {
        const file = this.p("leads.csv");
        const csv = toCsv(LEADS_HEADERS, serializeRows(LEADS_HEADERS, leads));
        await atomicWriteFile(file, csv);
    }
    async listApprovals() {
        const file = this.p("approvals.csv");
        if (!(await fileExists(file))) {
            await atomicWriteFile(file, toCsv(APPROVALS_HEADERS, []));
        }
        const { headers, rows } = parseCsv(await readText(file));
        validateHeaders(headers, APPROVALS_HEADERS, file);
        return mapRows(rows, ApprovalSchema);
    }
    async saveApprovals(rows) {
        const file = this.p("approvals.csv");
        const csv = toCsv(APPROVALS_HEADERS, serializeRows(APPROVALS_HEADERS, rows));
        await atomicWriteFile(file, csv);
    }
    async appendEvent(e) {
        const file = this.p("events.csv");
        if (!(await fileExists(file))) {
            await atomicWriteFile(file, toCsv(EVENTS_HEADERS, []));
        }
        const parsed = EventRowSchema.parse(e);
        const { headers, rows } = parseCsv(await readText(file));
        validateHeaders(headers, EVENTS_HEADERS, file);
        rows.push(serializeRows(EVENTS_HEADERS, [parsed])[0]);
        await atomicWriteFile(file, toCsv(EVENTS_HEADERS, rows));
    }
    async listContacts() {
        const file = this.p("contacts.csv");
        if (!(await fileExists(file))) {
            await atomicWriteFile(file, toCsv(CONTACTS_HEADERS, []));
        }
        const { headers, rows } = parseCsv(await readText(file));
        validateHeaders(headers, CONTACTS_HEADERS, file);
        return mapRows(rows, ContactMapSchema);
    }
    async upsertContacts(rows) {
        const file = this.p("contacts.csv");
        const csv = toCsv(CONTACTS_HEADERS, serializeRows(CONTACTS_HEADERS, rows));
        await atomicWriteFile(file, csv);
    }
    async listDnc() {
        const file = this.p("dnc.csv");
        if (!(await fileExists(file))) {
            await atomicWriteFile(file, toCsv(DNC_HEADERS, []));
        }
        const { headers, rows } = parseCsv(await readText(file));
        validateHeaders(headers, DNC_HEADERS, file);
        return mapRows(rows, DncEntrySchema);
    }
    async upsertDnc(rows) {
        const file = this.p("dnc.csv");
        const csv = toCsv(DNC_HEADERS, serializeRows(DNC_HEADERS, rows));
        await atomicWriteFile(file, csv);
    }
    // Additional methods for ingest services
    async findLeadByEmail(email) {
        const leads = await this.listLeads();
        return leads.find(lead => lead.email === email) || null;
    }
    async findLeadByPhone(phone) {
        const leads = await this.listLeads();
        return leads.find(lead => lead.phone_e164 === phone) || null;
    }
    async createLead(leadData) {
        const leads = await this.listLeads();
        const newLead = {
            ...leadData,
            lead_id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            created_at: new Date().toISOString()
        };
        leads.push(newLead);
        await this.upsertLeads(leads);
        return newLead;
    }
}
//# sourceMappingURL=csvStore.js.map