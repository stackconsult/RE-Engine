/**
 * Lead Model - Core lead data structure
 * Follows RE Engine safety invariants and production rules
 */

export interface Lead {
  lead_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_e164?: string;
  city?: string;
  province?: string;
  source: string;
  tags: string[];
  status: 'active' | 'inactive' | 'dnc' | 'bounced' | 'unsubscribed';
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  last_contacted_at?: string;
  contact_count?: number;
}

export interface CreateLeadRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone_e164?: string;
  city?: string;
  province?: string;
  source: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateLeadRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_e164?: string;
  city?: string;
  province?: string;
  tags?: string[];
  status?: Lead['status'];
  metadata?: Record<string, unknown>;
}

export interface LeadFilter {
  status?: Lead['status'];
  source?: string;
  tags?: string[];
  city?: string;
  province?: string;
  created_after?: string;
  created_before?: string;
  has_email?: boolean;
  has_phone?: boolean;
  limit?: number;
  offset?: number;
}

export interface LeadValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class LeadModel {
  static validateCreate(data: CreateLeadRequest): LeadValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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

  static validateUpdate(data: UpdateLeadRequest): LeadValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
      const validStatuses: Lead['status'][] = ['active', 'inactive', 'dnc', 'bounced', 'unsubscribed'];
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

  static createId(): string {
    return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getFullName(lead: Lead): string {
    return `${lead.first_name} ${lead.last_name}`.trim();
  }

  static getPrimaryContact(lead: Lead): { type: 'email' | 'phone'; value: string } | null {
    if (lead.email) {
      return { type: 'email', value: lead.email };
    }
    if (lead.phone_e164) {
      return { type: 'phone', value: lead.phone_e164 };
    }
    return null;
  }

  static hasContactMethod(lead: Lead, type: 'email' | 'phone'): boolean {
    return type === 'email' ? !!lead.email : !!lead.phone_e164;
  }

  static isContactable(lead: Lead, channel: 'email' | 'whatsapp' | 'telegram'): boolean {
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

  static sanitizeForExport(lead: Lead): Omit<Lead, 'metadata'> {
    // Remove sensitive metadata for exports
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { metadata, ...sanitized } = lead;
    return sanitized;
  }

  static updateContactCount(lead: Lead): Lead {
    return {
      ...lead,
      contact_count: (lead.contact_count || 0) + 1,
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  static addTag(lead: Lead, tag: string): Lead {
    const tags = new Set(lead.tags);
    tags.add(tag);
    return {
      ...lead,
      tags: Array.from(tags),
      updated_at: new Date().toISOString()
    };
  }

  static removeTag(lead: Lead, tag: string): Lead {
    return {
      ...lead,
      tags: lead.tags.filter(t => t !== tag),
      updated_at: new Date().toISOString()
    };
  }
}
