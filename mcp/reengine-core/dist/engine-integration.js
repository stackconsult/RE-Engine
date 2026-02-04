/**
 * RE Engine Integration for MCP Servers
 * Provides real engine connections instead of mock data
 */
import { getDatabase } from '../../../engine/src/database/index.js';
import { ApprovalService } from '../../../engine/src/approvals/approvalService.js';
import { LeadsRepository } from '../../../engine/src/a2d/repositories/leads.repository.js';
export class REEngineIntegration {
    db = getDatabase();
    approvalService;
    leadsRepository;
    constructor() {
        this.approvalService = new ApprovalService(this.db);
        this.leadsRepository = new LeadsRepository(this.db);
    }
    async initialize() {
        await this.db.initialize();
    }
    async close() {
        await this.db.close();
    }
    // Approvals
    async listApprovals(status) {
        try {
            const result = await this.approvalService.query(status ? { status } : {});
            return result.success ? result.data : [];
        }
        catch (error) {
            console.error('Failed to list approvals:', error);
            return [];
        }
    }
    async getApproval(approvalId) {
        try {
            const result = await this.approvalService.getById(approvalId);
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to get approval:', error);
            return null;
        }
    }
    async createApproval(data) {
        try {
            const result = await this.approvalService.create(data);
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to create approval:', error);
            return null;
        }
    }
    async updateApproval(approvalId, data) {
        try {
            const result = await this.approvalService.update(approvalId, data);
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to update approval:', error);
            return null;
        }
    }
    async approveApproval(approvalId, approvedBy) {
        try {
            const result = await this.approvalService.update(approvalId, {
                status: 'approved',
                approved_by: approvedBy,
                approved_at: new Date().toISOString()
            });
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to approve approval:', error);
            return null;
        }
    }
    async rejectApproval(approvalId, reason) {
        try {
            const result = await this.approvalService.update(approvalId, {
                status: 'rejected',
                notes: reason || 'Rejected'
            });
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to reject approval:', error);
            return null;
        }
    }
    // Leads
    async listLeads(filter) {
        try {
            const result = await this.leadsRepository.query(filter || {});
            return result.success ? result.data : [];
        }
        catch (error) {
            console.error('Failed to list leads:', error);
            return [];
        }
    }
    async getLead(leadId) {
        try {
            const result = await this.leadsRepository.getById(leadId);
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to get lead:', error);
            return null;
        }
    }
    async createLead(data) {
        try {
            const result = await this.leadsRepository.create(data);
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to create lead:', error);
            return null;
        }
    }
    async updateLead(leadId, data) {
        try {
            const result = await this.leadsRepository.update(leadId, data);
            return result.success ? result.data : null;
        }
        catch (error) {
            console.error('Failed to update lead:', error);
            return null;
        }
    }
    // Health check
    async health() {
        try {
            const dbHealth = await this.db.health();
            return {
                database: dbHealth,
                engine: true,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Health check failed:', error);
            return {
                database: false,
                engine: false,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
//# sourceMappingURL=engine-integration.js.map