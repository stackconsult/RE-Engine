import { logger } from "../observability/logger.js";
export class DncService {
    store;
    constructor(store) {
        this.store = store;
    }
    async checkNumber(phone) {
        if (!phone) {
            return { allowed: true };
        }
        // Normalize phone number for comparison
        const normalizedPhone = this.normalizePhone(phone);
        // Check DNC list
        const dncList = await this.store.listDnc();
        const dncEntry = dncList.find(entry => this.normalizePhone(entry.value) === normalizedPhone);
        if (dncEntry) {
            logger.info({ phone: normalizedPhone, reason: dncEntry.reason }, "Number blocked by DNC");
            return {
                allowed: false,
                reason: `Number blocked by DNC: ${dncEntry.reason}`,
                dncEntry
            };
        }
        return { allowed: true };
    }
    async checkEmail(email) {
        if (!email) {
            return { allowed: true };
        }
        // Normalize email for comparison
        const normalizedEmail = email.toLowerCase().trim();
        // Check DNC list
        const dncList = await this.store.listDnc();
        const dncEntry = dncList.find(entry => entry.value.toLowerCase().trim() === normalizedEmail);
        if (dncEntry) {
            logger.info({ email: normalizedEmail, reason: dncEntry.reason }, "Email blocked by DNC");
            return {
                allowed: false,
                reason: `Email blocked by DNC: ${dncEntry.reason}`,
                dncEntry
            };
        }
        return { allowed: true };
    }
    async checkLead(lead) {
        // Check phone first
        if (lead.phone_e164) {
            const phoneCheck = await this.checkNumber(lead.phone_e164);
            if (!phoneCheck.allowed) {
                return phoneCheck;
            }
        }
        // Check email
        if (lead.email) {
            const emailCheck = await this.checkEmail(lead.email);
            if (!emailCheck.allowed) {
                return emailCheck;
            }
        }
        return { allowed: true };
    }
    async checkApproval(approval) {
        // Extract contact info from draft_to field
        const contactInfo = this.extractContactInfo(approval.draft_to);
        // Check based on channel
        if (approval.channel === "email" && contactInfo.email) {
            return await this.checkEmail(contactInfo.email);
        }
        else if ((approval.channel === "whatsapp" || approval.channel === "telegram") && contactInfo.phone) {
            return await this.checkNumber(contactInfo.phone);
        }
        return { allowed: true };
    }
    async addToDnc(value, reason, addedBy) {
        const dncList = await this.store.listDnc();
        // Check if already in DNC
        const existing = dncList.find(entry => entry.value.toLowerCase() === value.toLowerCase());
        if (existing) {
            logger.warn({ value, as, any, existingReason: existing.reason }, "Value already in DNC list");
            return existing;
        }
        const dncEntry = {
            value: value.trim(),
            reason: reason || "Manual addition",
            ts_added: new Date().toISOString()
        };
        const updatedDncList = [...dncList, dncEntry];
        await this.store.upsertDnc(updatedDncList);
        logger.info({ value, as, any, reason, addedBy }, "Added to DNC list");
        return dncEntry;
    }
    async removeFromDnc(value) {
        const dncList = await this.store.listDnc();
        const originalLength = dncList.length;
        const filteredList = dncList.filter(entry => entry.value.toLowerCase() !== value.toLowerCase());
        if (filteredList.length === originalLength) {
            logger.warn({ value }, "Value not found in DNC list");
            return false;
        }
        await this.store.upsertDnc(filteredList);
        logger.info({ value }, "Removed from DNC list");
        return true;
    }
    async updateDncReason(value, newReason) {
        const dncList = await this.store.listDnc();
        const entry = dncList.find(entry => entry.value.toLowerCase() === value.toLowerCase());
        if (!entry) {
            logger.warn({ value }, "Value not found in DNC list");
            return false;
        }
        entry.reason = newReason;
        await this.store.upsertDnc(dncList);
        logger.info({ value, as, any, newReason }, "Updated DNC reason");
        return true;
    }
    async getDncStats() {
        const dncList = await this.store.listDnc();
        const byReason = {};
        let emails = 0;
        let phones = 0;
        for (const entry of dncList) {
            // Count by reason
            byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;
            // Count by type
            if (this.isEmail(entry.value)) {
                emails++;
            }
            else if (this.isPhone(entry.value)) {
                phones++;
            }
        }
        return {
            total_entries: dncList.length,
            by_reason: byReason,
            by_type: { emails, phones }
        };
    }
    normalizePhone(phone) {
        // Remove all non-digit characters except +
        return phone.replace(/[^\d+]/g, '');
    }
    extractContactInfo(draftTo) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (emailRegex.test(draftTo)) {
            return { email: draftTo };
        }
        else if (phoneRegex.test(draftTo)) {
            return { phone: draftTo };
        }
        // Try to extract from more complex strings
        const emailMatch = draftTo.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
        if (emailMatch) {
            return { email: emailMatch[0] };
        }
        const phoneMatch = draftTo.match(/[\+]?[\d\s\-\(\)]+/);
        if (phoneMatch) {
            return { phone: phoneMatch[0] };
        }
        return {};
    }
    isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    isPhone(value) {
        return /^[\+]?[\d\s\-\(\)]+$/.test(value);
    }
    async bulkAddToDnc(entries, addedBy) {
        let added = 0;
        let skipped = 0;
        for (const entry of entries) {
            try {
                await this.addToDnc(entry.value, entry.reason, addedBy);
                added++;
            }
            catch (error) {
                logger.warn({ value: entry.value, error: error instanceof Error ? error.message : String(error) }, "Failed to add to DNC");
                skipped++;
            }
        }
        logger.info({ total: entries.length, added, skipped }, "Bulk DNC addition completed");
        return { added, skipped };
    }
    async exportDncList() {
        const dncList = await this.store.listDnc();
        // Create CSV content
        const headers = "value,reason,ts_added\n";
        const rows = dncList.map(entry => `"${entry.value}","${entry.reason}","${entry.ts_added}"`).join("\n");
        return headers + rows;
    }
}
//# sourceMappingURL=dncService.js.map