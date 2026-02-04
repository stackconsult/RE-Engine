/**
 * Approval Model - Core approval data structure
 * Follows RE Engine safety invariants and production rules
 */

export interface Approval {
  approval_id: string;
  ts_created: string;
  lead_id: string;
  channel: 'email' | 'whatsapp' | 'telegram' | 'linkedin' | 'facebook';
  action_type: 'send' | 'reply' | 'forward' | 'draft';
  draft_subject?: string;
  draft_text: string;
  draft_to: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
  retry_count?: number;
  last_retry_at?: string;
}

export interface CreateApprovalRequest {
  lead_id: string;
  channel: Approval['channel'];
  action_type: Approval['action_type'];
  draft_subject?: string;
  draft_text: string;
  draft_to: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateApprovalRequest {
  status?: Approval['status'];
  approved_by?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalFilter {
  status?: Approval['status'];
  channel?: Approval['channel'];
  lead_id?: string;
  approved_by?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

export interface ApprovalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ApprovalModel {
  static validateCreate(data: CreateApprovalRequest): ApprovalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.lead_id?.trim()) {
      errors.push('lead_id is required');
    }
    if (!data.channel) {
      errors.push('channel is required');
    }
    if (!data.action_type) {
      errors.push('action_type is required');
    }
    if (!data.draft_text?.trim()) {
      errors.push('draft_text is required');
    }
    if (!data.draft_to?.trim()) {
      errors.push('draft_to is required');
    }

    // Email validation for email channel
    if (data.channel === 'email' && data.draft_to) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.draft_to)) {
        errors.push('Invalid email address for email channel');
      }
    }

    // Content validation
    if (data.draft_text && data.draft_text.length > 10000) {
      warnings.push('draft_text is very long (>10k characters)');
    }

    // Subject validation for email
    if (data.channel === 'email' && !data.draft_subject?.trim()) {
      warnings.push('draft_subject recommended for email channel');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateUpdate(data: UpdateApprovalRequest): ApprovalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Status transitions validation
    if (data.status) {
      const validStatuses: Approval['status'][] = ['draft', 'pending', 'approved', 'rejected', 'sent', 'failed'];
      if (!validStatuses.includes(data.status)) {
        errors.push(`Invalid status: ${data.status}`);
      }
    }

    // Approval validation
    if (data.status === 'approved' && !data.approved_by?.trim()) {
      errors.push('approved_by is required when approving');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static createId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createIdempotencyKey(): string {
    return `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static canTransition(from: Approval['status'], to: Approval['status']): boolean {
    const transitions: Record<Approval['status'], Approval['status'][]> = {
      'draft': ['pending', 'rejected'],
      'pending': ['approved', 'rejected'],
      'approved': ['sent', 'failed'],
      'rejected': [], // Terminal state
      'sent': [], // Terminal state
      'failed': ['approved', 'rejected'] // Can retry from failed
    };

    return transitions[from]?.includes(to) || false;
  }

  static isSafeToSend(approval: Approval): boolean {
    // Safety invariant: never send unless approved
    return approval.status === 'approved';
  }

  static sanitizeForAudit(approval: Approval): Omit<Approval, 'draft_text' | 'draft_subject'> {
    // Remove sensitive content for audit logs
    const { draft_text, draft_subject, ...sanitized } = approval;
    return sanitized;
  }
}
