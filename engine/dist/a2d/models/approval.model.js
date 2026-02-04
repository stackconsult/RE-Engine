/**
 * Approval Model - Core approval data structure
 * Follows RE Engine safety invariants and production rules
 */
export class ApprovalModel {
    static validateCreate(data) {
        const errors = [];
        const warnings = [];
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
    static validateUpdate(data) {
        const errors = [];
        const warnings = [];
        // Status transitions validation
        if (data.status) {
            const validStatuses = ['draft', 'pending', 'approved', 'rejected', 'sent', 'failed'];
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
    static createId() {
        return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static createIdempotencyKey() {
        return `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static canTransition(from, to) {
        const transitions = {
            'draft': ['pending', 'rejected'],
            'pending': ['approved', 'rejected'],
            'approved': ['sent', 'failed'],
            'rejected': [], // Terminal state
            'sent': [], // Terminal state
            'failed': ['approved', 'rejected'] // Can retry from failed
        };
        return transitions[from]?.includes(to) || false;
    }
    static isSafeToSend(approval) {
        // Safety invariant: never send unless approved
        return approval.status === 'approved';
    }
    static sanitizeForAudit(approval) {
        // Remove sensitive content for audit logs
        const { draft_text, draft_subject, ...sanitized } = approval;
        return sanitized;
    }
}
//# sourceMappingURL=approval.model.js.map