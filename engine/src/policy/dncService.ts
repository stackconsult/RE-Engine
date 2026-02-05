import { Store } from "../store/store.ts";
import { DncEntry, Lead, Approval } from "../domain/types.ts";
import { logger } from "../observability/logger.ts";

export interface DncCheckResult {
  allowed: boolean;
  reason?: string;
  dncEntry?: DncEntry;
}

export class DncService {
  constructor(private readonly store: Store) {}

  async checkNumber(phone: string): Promise<DncCheckResult> {
    if (!phone) {
      return { allowed: true };
    }

    // Normalize phone number for comparison
    const normalizedPhone = this.normalizePhone(phone);
    
    // Check DNC list
    const dncList = await this.store.listDnc();
    const dncEntry = dncList.find(entry => 
      this.normalizePhone(entry.value) === normalizedPhone
    );

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

  async checkEmail(email: string): Promise<DncCheckResult> {
    if (!email) {
      return { allowed: true };
    }

    // Normalize email for comparison
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check DNC list
    const dncList = await this.store.listDnc();
    const dncEntry = dncList.find(entry => 
      entry.value.toLowerCase().trim() === normalizedEmail
    );

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

  async checkLead(lead: Lead): Promise<DncCheckResult> {
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

  async checkApproval(approval: Approval): Promise<DncCheckResult> {
    // Extract contact info from draft_to field
    const contactInfo = this.extractContactInfo(approval.draft_to);
    
    // Check based on channel
    if (approval.channel === "email" && contactInfo.email) {
      return await this.checkEmail(contactInfo.email);
    } else if ((approval.channel === "whatsapp" || approval.channel === "telegram") && contactInfo.phone) {
      return await this.checkNumber(contactInfo.phone);
    }

    return { allowed: true };
  }

  async addToDnc(value: string, reason: string, addedBy?: string): Promise<DncEntry> {
    const dncList = await this.store.listDnc();
    
    // Check if already in DNC
    const existing = dncList.find(entry => 
      entry.value.toLowerCase() === value.toLowerCase()
    );
    
    if (existing) {
      logger.warn({ value, existingReason: existing.reason }, "Value already in DNC list");
      return existing;
    }

    const dncEntry: DncEntry = {
      value: value.trim(),
      reason: reason || "Manual addition",
      ts_added: new Date().toISOString()
    };

    const updatedDncList = [...dncList, dncEntry];
    await this.store.upsertDnc(updatedDncList);

    logger.info({ value, reason, addedBy }, "Added to DNC list");
    return dncEntry;
  }

  async removeFromDnc(value: string): Promise<boolean> {
    const dncList = await this.store.listDnc();
    const originalLength = dncList.length;
    
    const filteredList = dncList.filter(entry => 
      entry.value.toLowerCase() !== value.toLowerCase()
    );

    if (filteredList.length === originalLength) {
      logger.warn({ value }, "Value not found in DNC list");
      return false;
    }

    await this.store.upsertDnc(filteredList);
    logger.info({ value }, "Removed from DNC list");
    return true;
  }

  async updateDncReason(value: string, newReason: string): Promise<boolean> {
    const dncList = await this.store.listDnc();
    const entry = dncList.find(entry => 
      entry.value.toLowerCase() === value.toLowerCase()
    );

    if (!entry) {
      logger.warn({ value }, "Value not found in DNC list");
      return false;
    }

    entry.reason = newReason;
    await this.store.upsertDnc(dncList);
    logger.info({ value, newReason }, "Updated DNC reason");
    return true;
  }

  async getDncStats(): Promise<{
    total_entries: number;
    by_reason: Record<string, number>;
    by_type: { emails: number; phones: number };
  }> {
    const dncList = await this.store.listDnc();
    
    const byReason: Record<string, number> = {};
    let emails = 0;
    let phones = 0;

    for (const entry of dncList) {
      // Count by reason
      byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;
      
      // Count by type
      if (this.isEmail(entry.value)) {
        emails++;
      } else if (this.isPhone(entry.value)) {
        phones++;
      }
    }

    return {
      total_entries: dncList.length,
      by_reason: byReason,
      by_type: { emails, phones }
    };
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }

  private extractContactInfo(draftTo: string): { email?: string; phone?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;

    if (emailRegex.test(draftTo)) {
      return { email: draftTo };
    } else if (phoneRegex.test(draftTo)) {
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

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isPhone(value: string): boolean {
    return /^[\+]?[\d\s\-\(\)]+$/.test(value);
  }

  async bulkAddToDnc(entries: Array<{ value: string; reason: string }>, addedBy?: string): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;

    for (const entry of entries) {
      try {
        await this.addToDnc(entry.value, entry.reason, addedBy);
        added++;
      } catch (error) {
        logger.warn({ value: entry.value, error: error instanceof Error ? error.message : String(error) }, "Failed to add to DNC");
        skipped++;
      }
    }

    logger.info({ total: entries.length, added, skipped }, "Bulk DNC addition completed");
    return { added, skipped };
  }

  async exportDncList(): Promise<string> {
    const dncList = await this.store.listDnc();
    
    // Create CSV content
    const headers = "value,reason,ts_added\n";
    const rows = dncList.map(entry => 
      `"${entry.value}","${entry.reason}","${entry.ts_added}"`
    ).join("\n");
    
    return headers + rows;
  }
}
