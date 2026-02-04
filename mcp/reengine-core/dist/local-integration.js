/**
 * Local MCP Server Implementation
 * Uses direct CSV operations instead of engine imports
 */
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
export class LocalMCPIntegration {
    dataDir;
    constructor() {
        this.dataDir = process.env.DATA_DIR || path.join(process.cwd(), '..', '..', 'data');
    }
    async initialize() {
        try {
            await fs.access(this.dataDir);
        }
        catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }
    async close() {
        // No cleanup needed for CSV-based approach
    }
    // Approvals
    async listApprovals(status) {
        try {
            const filePath = path.join(this.dataDir, 'approvals.csv');
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length <= 1)
                return [];
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const approvals = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const approval = {};
                headers.forEach((header, index) => {
                    approval[header] = values[index] || '';
                });
                if (!status || approval.status === status) {
                    approvals.push(approval);
                }
            }
            return approvals;
        }
        catch (error) {
            console.error('Failed to list approvals:', error);
            return [];
        }
    }
    async getApproval(approvalId) {
        const approvals = await this.listApprovals();
        return approvals.find(a => a.approval_id === approvalId) || null;
    }
    async approveApproval(approvalId, approvedBy) {
        const approvals = await this.listApprovals();
        const approval = approvals.find(a => a.approval_id === approvalId);
        if (!approval || approval.status !== 'pending') {
            return null;
        }
        // Update approval
        approval.status = 'approved';
        approval.approved_by = approvedBy || 'system';
        approval.approved_at = new Date().toISOString();
        // Save back to CSV
        await this.saveApprovals(approvals);
        return approval;
    }
    async rejectApproval(approvalId, reason) {
        const approvals = await this.listApprovals();
        const approval = approvals.find(a => a.approval_id === approvalId);
        if (!approval || approval.status !== 'pending') {
            return null;
        }
        // Update approval
        approval.status = 'rejected';
        approval.rejection_reason = reason || 'Rejected';
        approval.approved_by = 'system';
        approval.approved_at = new Date().toISOString();
        // Save back to CSV
        await this.saveApprovals(approvals);
        return approval;
    }
    async saveApprovals(approvals) {
        const filePath = path.join(this.dataDir, 'approvals.csv');
        if (approvals.length === 0) {
            await fs.writeFile(filePath, 'approval_id,status,lead_id,channel,draft_to,draft_subject,draft_content,draft_from,approved_by,approved_at,created_at,updated_at,rejection_reason\n');
            return;
        }
        const headers = Object.keys(approvals[0]);
        const csvContent = [
            headers.join(','),
            ...approvals.map(approval => headers.map(header => {
                const value = approval[header] || '';
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(','))
        ].join('\n');
        await fs.writeFile(filePath, csvContent, 'utf-8');
    }
    // Leads
    async listLeads(filter) {
        try {
            const filePath = path.join(this.dataDir, 'leads.csv');
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length <= 1)
                return [];
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const leads = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const lead = {};
                headers.forEach((header, index) => {
                    lead[header] = values[index] || '';
                });
                // Apply basic filtering
                if (!filter || Object.entries(filter).every(([key, value]) => lead[key] === value)) {
                    leads.push(lead);
                }
            }
            return leads;
        }
        catch (error) {
            console.error('Failed to list leads:', error);
            return [];
        }
    }
    async getLead(leadId) {
        const leads = await this.listLeads();
        return leads.find(l => l.lead_id === leadId) || null;
    }
    async createLead(data) {
        const leads = await this.listLeads();
        const newLead = {
            lead_id: uuidv4(),
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        leads.push(newLead);
        await this.saveLeads(leads);
        return newLead;
    }
    async saveLeads(leads) {
        const filePath = path.join(this.dataDir, 'leads.csv');
        if (leads.length === 0) {
            await fs.writeFile(filePath, 'lead_id,first_name,last_name,email,phone_e164,city,province,source,tags,status,created_at,updated_at,metadata\n');
            return;
        }
        const headers = Object.keys(leads[0]);
        const csvContent = [
            headers.join(','),
            ...leads.map(lead => headers.map(header => {
                const value = lead[header] || '';
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(','))
        ].join('\n');
        await fs.writeFile(filePath, csvContent, 'utf-8');
    }
    // Health check
    async health() {
        try {
            await fs.access(this.dataDir);
            return {
                database: true,
                engine: true,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                database: false,
                engine: false,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
//# sourceMappingURL=local-integration.js.map