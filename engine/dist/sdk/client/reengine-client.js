/**
 * RE Engine Client SDK - Main client interface
 * Follows RE Engine safety invariants and production rules
 */
import { ApprovalsRepository } from '../../a2d/repositories/approvals.repository';
import { LeadsRepository } from '../../a2d/repositories/leads.repository';
/**
 * Main RE Engine Client
 * Provides a high-level interface for interacting with the RE Engine
 */
export class REEngineClient {
    approvals;
    leads;
    options;
    constructor(options) {
        this.options = {
            environment: 'development',
            timeout: 30000,
            apiKey: '',
            ...options
        };
        this.approvals = new ApprovalsRepository({ dataDir: options.dataDir });
        this.leads = new LeadsRepository({ dataDir: options.dataDir });
    }
    /**
     * Initialize the client and data stores
     */
    async initialize() {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            // Initialize repositories
            const approvalsInit = await this.approvals.initialize();
            const leadsInit = await this.leads.initialize();
            if (!approvalsInit.success) {
                return this.createResponse(requestId, startTime, false, undefined, approvalsInit.error);
            }
            if (!leadsInit.success) {
                return this.createResponse(requestId, startTime, false, undefined, leadsInit.error);
            }
            return this.createResponse(requestId, startTime, true, true);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    // ===== APPROVALS =====
    /**
     * Create a new approval
     */
    async createApproval(data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.create(data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Query approvals
     */
    async queryApprovals(filter = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.query(filter);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            const response = this.createResponse(requestId, startTime, true, result.data);
            if (result.total !== undefined) {
                response.pagination = {
                    total: result.total,
                    offset: filter.offset || 0,
                    limit: filter.limit || 100,
                    hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
                };
            }
            return response;
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Get approval by ID
     */
    async getApproval(approvalId) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.getById(approvalId);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Update approval
     */
    async updateApproval(approvalId, data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.update(approvalId, data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Approve an approval
     */
    async approveApproval(approvalId, approvedBy) {
        return this.updateApproval(approvalId, {
            status: 'approved',
            approved_by: approvedBy
        });
    }
    /**
     * Reject an approval
     */
    async rejectApproval(approvalId, reason, rejectedBy) {
        return this.updateApproval(approvalId, {
            status: 'rejected',
            notes: reason,
            approved_by: rejectedBy
        });
    }
    /**
     * Get pending approvals
     */
    async getPendingApprovals() {
        return this.queryApprovals({ status: 'pending' });
    }
    /**
     * Get approvals ready to send
     */
    async getReadyToSendApprovals() {
        return this.queryApprovals({ status: 'approved' });
    }
    // ===== LEADS =====
    /**
     * Create a new lead
     */
    async createLead(data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.create(data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Query leads
     */
    async queryLeads(filter = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.query(filter);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            const response = this.createResponse(requestId, startTime, true, result.data);
            if (result.total !== undefined) {
                response.pagination = {
                    total: result.total,
                    offset: filter.offset || 0,
                    limit: filter.limit || 100,
                    hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
                };
            }
            return response;
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Get lead by ID
     */
    async getLead(leadId) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.getById(leadId);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Update lead
     */
    async updateLead(leadId, data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.update(leadId, data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    // ===== UTILITY METHODS =====
    /**
     * Get client status and health
     */
    async getStatus() {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const approvalsStats = this.approvals.getStats('approvals.csv');
            const leadsStats = this.leads.getStats('leads.csv');
            return this.createResponse(requestId, startTime, true, {
                environment: this.options.environment,
                dataDir: this.options.dataDir,
                repositories: {
                    approvals: approvalsStats?.exists || false,
                    leads: leadsStats?.exists || false
                }
            });
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Generate a unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create a standardized response
     */
    createResponse(requestId, startTime, success, data, error) {
        const duration = Date.now() - startTime;
        const response = {
            success,
            metadata: {
                requestId,
                timestamp: new Date().toISOString(),
                duration
            }
        };
        if (data !== undefined) {
            response.data = data;
        }
        if (error) {
            response.error = error;
        }
        return response;
    }
}
/**
 * Factory function to create RE Engine client
 */
export function createREEngineClient(options) {
    return new REEngineClient(options);
}
//# sourceMappingURL=reengine-client.js.map