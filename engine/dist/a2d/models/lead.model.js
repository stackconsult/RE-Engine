/**
 * Lead Model - Core lead data structure
 * Follows RE Engine safety invariants and production rules
 */
export class LeadModel {
    static validateCreate(data) {
        const errors = [];
        const warnings = [];
        // Required fields
        if (!data.first_name?.trim()) {
            errors.push('first_name is required');
        }
        if (!data.last_name?.trim()) {
            errors.push('last_name is required');
        }
        if (!data.source?.trim()) {
            errors.push('source is required');
        }
        // Contact validation - at least one contact method required
        if (!data.email?.trim() && !data.phone_e164?.trim()) {
            warnings.push('Either email or phone is recommended');
        }
        // Email validation
        if (data.email && data.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.push('Invalid email format');
            }
        }
        // Phone validation (E.164 format)
        if (data.phone_e164 && data.phone_e164.trim()) {
            const phoneRegex = /^\+?[1-9]\d{1,14}$/;
            if (!phoneRegex.test(data.phone_e164)) {
                errors.push('Phone must be in E.164 format (e.g., +1234567890)');
            }
        }
        // Name validation
        if (data.first_name && data.first_name.length > 50) {
            warnings.push('First name is very long (>50 characters)');
        }
        if (data.last_name && data.last_name.length > 50) {
            warnings.push('Last name is very long (>50 characters)');
        }
        // Tags validation
        if (data.tags && data.tags.length > 20) {
            warnings.push('Too many tags (>20)');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    static validateUpdate(data) {
        const errors = [];
        const warnings = [];
        // Email validation
        if (data.email && data.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.push('Invalid email format');
            }
        }
        // Phone validation
        if (data.phone_e164 && data.phone_e164.trim()) {
            const phoneRegex = /^\+?[1-9]\d{1,14}$/;
            if (!phoneRegex.test(data.phone_e164)) {
                errors.push('Phone must be in E.164 format (e.g., +1234567890)');
            }
        }
        // Status validation
        if (data.status) {
            const validStatuses = ['active', 'inactive', 'dnc', 'bounced', 'unsubscribed'];
            if (!validStatuses.includes(data.status)) {
                errors.push(`Invalid status: ${data.status}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    static createId() {
        return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static getFullName(lead) {
        return `${lead.first_name} ${lead.last_name}`.trim();
    }
    static getPrimaryContact(lead) {
        if (lead.email) {
            return { type: 'email', value: lead.email };
        }
        if (lead.phone_e164) {
            return { type: 'phone', value: lead.phone_e164 };
        }
        return null;
    }
    static hasContactMethod(lead, type) {
        return type === 'email' ? !!lead.email : !!lead.phone_e164;
    }
    static isContactable(lead, channel) {
        // Safety check for DNC status
        if (lead.status === 'dnc' || lead.status === 'unsubscribed') {
            return false;
        }
        // Channel-specific contactability
        switch (channel) {
            case 'email':
                return !!lead.email;
            case 'whatsapp':
            case 'telegram':
                return !!lead.phone_e164;
            default:
                return false;
        }
    }
    static sanitizeForExport(lead) {
        // Remove sensitive metadata for exports
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { metadata, ...sanitized } = lead;
        return sanitized;
    }
    static updateContactCount(lead) {
        return {
            ...lead,
            contact_count: (lead.contact_count || 0) + 1,
            last_contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    static addTag(lead, tag) {
        const tags = new Set(lead.tags);
        tags.add(tag);
        return {
            ...lead,
            tags: Array.from(tags),
            updated_at: new Date().toISOString()
        };
    }
    static removeTag(lead, tag) {
        return {
            ...lead,
            tags: lead.tags.filter(t => t !== tag),
            updated_at: new Date().toISOString()
        };
    }
}
//# sourceMappingURL=lead.model.js.map