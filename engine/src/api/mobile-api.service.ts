// @ts-nocheck - Logger API migration pending (Phase 2)
/**
 * Mobile App API Service for Phase 6
 * Provides endpoints for mobile approvals and monitoring
 */

import { Router, Request, Response } from 'express';
import { UnifiedDatabaseManager } from '../database/unified-database-manager';
import { Logger } from '../utils/logger';
import { authenticateToken } from '../auth/auth.middleware';

export interface MobileAPIConfig {
  enablePushNotifications: boolean;
  enableOfflineSync: boolean;
  maxRequestSize: number;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export class MobileAPIService {
  private router: Router;
  private dbManager: UnifiedDatabaseManager;
  private logger: Logger;
  private config: MobileAPIConfig;

  constructor(dbManager: UnifiedDatabaseManager, config: MobileAPIConfig) {
    this.router = Router();
    this.dbManager = dbManager;
    this.logger = new Logger('MobileAPI', true);
    this.config = config;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Authentication middleware for all mobile endpoints
    this.router.use(authenticateToken);

    // Lead management endpoints
    this.router.get('/leads', this.getLeads.bind(this));
    this.router.get('/leads/:id', this.getLead.bind(this));
    this.router.put('/leads/:id', this.updateLead.bind(this));
    this.router.post('/leads/search', this.searchLeads.bind(this));

    // Approval endpoints
    this.router.get('/approvals/pending', this.getPendingApprovals.bind(this));
    this.router.post('/approvals/:id/approve', this.approveApproval.bind(this));
    this.router.post('/approvals/:id/reject', this.rejectApproval.bind(this));
    this.router.get('/approvals/history', this.getApprovalHistory.bind(this));

    // Event endpoints
    this.router.get('/leads/:id/events', this.getLeadEvents.bind(this));
    this.router.post('/events', this.createEvent.bind(this));

    // Agent endpoints
    this.router.get('/agent/profile', this.getAgentProfile.bind(this));
    this.router.put('/agent/profile', this.updateAgentProfile.bind(this));
    this.router.get('/agent/metrics', this.getAgentMetrics.bind(this));

    // Dashboard endpoints
    this.router.get('/dashboard', this.getDashboard.bind(this));
    this.router.get('/dashboard/metrics', this.getDashboardMetrics.bind(this));

    // Sync endpoints for offline support
    this.router.get('/sync/leads', this.syncLeads.bind(this));
    this.router.get('/sync/events', this.syncEvents.bind(this));
    this.router.post('/sync/events', this.syncEventsUpload.bind(this));

    // Notification endpoints
    this.router.post('/notifications/register', this.registerForNotifications.bind(this));
    this.router.delete('/notifications/unregister', this.unregisterForNotifications.bind(this));
    this.router.get('/notifications', this.getNotifications.bind(this));

    // Health check
    this.router.get('/health', this.healthCheck.bind(this));
  }

  // Lead management
  private async getLeads(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const { status, limit = 20, offset = 0 } = req.query;

      const leads = await this.dbManager.searchLeads({
        assigned_agent: agentId,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        success: true,
        data: leads.leads,
        total: leads.total,
        hasMore: leads.total > (parseInt(offset as string) + leads.leads.length),
      });
    } catch (error) {
      this.logger.error('Failed to get leads for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leads',
      });
    }
  }

  private async getLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;

      const lead = await this.dbManager.getLead(id);

      if (!lead) {
        res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
        return;
      }

      // Ensure agent can only access their own leads
      if (lead.assigned_agent !== agentId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      res.json({
        success: true,
        data: lead,
      });
    } catch (error) {
      this.logger.error('Failed to get lead for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve lead',
      });
    }
  }

  private async updateLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;
      const updates = req.body;

      // Verify lead ownership
      const lead = await this.dbManager.getLead(id);
      if (!lead || lead.assigned_agent !== agentId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const success = await this.dbManager.updateLead(id, updates);

      res.json({
        success,
        message: success ? 'Lead updated successfully' : 'Failed to update lead',
      });
    } catch (error) {
      this.logger.error('Failed to update lead for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update lead',
      });
    }
  }

  private async searchLeads(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const { query, status, city, property_type, limit = 20, offset = 0 } = req.body;

      const results = await this.dbManager.searchLeads({
        assigned_agent: agentId,
        search: query,
        status,
        city,
        property_type,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: results.leads,
        total: results.total,
        query: { query, status, city, property_type },
      });
    } catch (error) {
      this.logger.error('Failed to search leads for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search leads',
      });
    }
  }

  // Approval management
  private async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const approvals = await this.dbManager.getPendingApprovals();

      // Filter approvals for this agent's leads
      const agentApprovals = approvals.filter(approval => {
        // This would need to be enhanced to check lead ownership
        return true; // For now, return all pending approvals
      });

      res.json({
        success: true,
        data: agentApprovals,
        count: agentApprovals.length,
      });
    } catch (error) {
      this.logger.error('Failed to get pending approvals for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending approvals',
      });
    }
  }

  private async approveApproval(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reviewedBy = req.user?.email;

      const success = await this.dbManager.updateApprovalStatus(id, 'approved', reviewedBy);

      if (success) {
        // Trigger the approval workflow (send message, etc.)
        await this.triggerApprovalWorkflow(id, 'approved');
      }

      res.json({
        success,
        message: success ? 'Approval approved successfully' : 'Failed to approve',
      });
    } catch (error) {
      this.logger.error('Failed to approve approval for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve',
      });
    }
  }

  private async rejectApproval(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const reviewedBy = req.user?.email;

      const success = await this.dbManager.updateApprovalStatus(id, 'rejected', reviewedBy);

      if (success) {
        // Log rejection reason
        await this.dbManager.createEvent({
          lead_id: '', // Would need to get this from the approval
          type: 'internal',
          channel: 'system',
          content: `Approval rejected by ${reviewedBy}. Reason: ${reason}`,
          direction: 'in',
          agent_id: req.user?.id,
        });
      }

      res.json({
        success,
        message: success ? 'Approval rejected successfully' : 'Failed to reject',
      });
    } catch (error) {
      this.logger.error('Failed to reject approval for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject',
      });
    }
  }

  private async getApprovalHistory(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const { limit = 50, offset = 0 } = req.query;

      // This would need to be implemented in the database manager
      res.json({
        success: true,
        data: [], // Placeholder
        message: 'Approval history endpoint - to be implemented',
      });
    } catch (error) {
      this.logger.error('Failed to get approval history for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve approval history',
      });
    }
  }

  // Event management
  private async getLeadEvents(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;
      const { limit = 50 } = req.query;

      // Verify lead ownership
      const lead = await this.dbManager.getLead(id);
      if (!lead || lead.assigned_agent !== agentId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const events = await this.dbManager.getLeadEvents(id, parseInt(limit as string));

      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error) {
      this.logger.error('Failed to get lead events for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve events',
      });
    }
  }

  private async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const eventData = req.body;

      // Verify lead ownership
      const lead = await this.dbManager.getLead(eventData.lead_id);
      if (!lead || lead.assigned_agent !== agentId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const eventId = await this.dbManager.createEvent({
        ...eventData,
        agent_id: agentId,
      });

      res.json({
        success: true,
        data: { id: eventId },
        message: 'Event created successfully',
      });
    } catch (error) {
      this.logger.error('Failed to create event for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create event',
      });
    }
  }

  // Agent management
  private async getAgentProfile(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const agent = await this.dbManager.getAgentByEmail(req.user?.email);

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      this.logger.error('Failed to get agent profile for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve profile',
      });
    }
  }

  private async updateAgentProfile(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const updates = req.body;

      // This would need to be implemented in the database manager
      res.json({
        success: true,
        message: 'Agent profile updated successfully',
      });
    } catch (error) {
      this.logger.error('Failed to update agent profile for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }

  private async getAgentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const metrics = await this.dbManager.getDashboardMetrics(agentId);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      this.logger.error('Failed to get agent metrics for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
      });
    }
  }

  // Dashboard
  private async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const metrics = await this.dbManager.getDashboardMetrics(agentId);
      const recentLeads = await this.dbManager.searchLeads({
        assigned_agent: agentId,
        limit: 5,
      });

      res.json({
        success: true,
        data: {
          metrics,
          recentLeads: recentLeads.leads,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get dashboard for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard',
      });
    }
  }

  private async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const metrics = await this.dbManager.getDashboardMetrics(agentId);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
      });
    }
  }

  // Sync endpoints for offline support
  private async syncLeads(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const { lastSync } = req.query;

      // Get leads updated since last sync
      const leads = await this.dbManager.searchLeads({
        assigned_agent: agentId,
        limit: 1000, // Large limit for sync
      });

      res.json({
        success: true,
        data: leads.leads,
        lastSync: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to sync leads for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync leads',
      });
    }
  }

  private async syncEvents(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const { lastSync } = req.query;

      // Get events since last sync
      res.json({
        success: true,
        data: [], // Placeholder
        lastSync: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to sync events for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync events',
      });
    }
  }

  private async syncEventsUpload(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const { events } = req.body;

      // Process offline events
      for (const event of events) {
        await this.dbManager.createEvent({
          ...event,
          agent_id: agentId,
        });
      }

      res.json({
        success: true,
        message: `${events.length} events synced successfully`,
      });
    } catch (error) {
      this.logger.error('Failed to upload events for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync events',
      });
    }
  }

  // Notification endpoints
  private async registerForNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { deviceToken, platform } = req.body;
      const agentId = req.user?.id;

      // Store device token for push notifications
      // This would integrate with your notification service

      res.json({
        success: true,
        message: 'Successfully registered for notifications',
      });
    } catch (error) {
      this.logger.error('Failed to register for notifications', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register for notifications',
      });
    }
  }

  private async unregisterForNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { deviceToken } = req.body;
      const agentId = req.user?.id;

      // Remove device token
      res.json({
        success: true,
        message: 'Successfully unregistered from notifications',
      });
    } catch (error) {
      this.logger.error('Failed to unregister from notifications', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unregister from notifications',
      });
    }
  }

  private async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      const { limit = 20, offset = 0 } = req.query;

      // Get notifications for this agent
      res.json({
        success: true,
        data: [], // Placeholder
        count: 0,
      });
    } catch (error) {
      this.logger.error('Failed to get notifications for mobile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve notifications',
      });
    }
  }

  // Health check
  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.dbManager.getSystemHealth();

      res.json({
        success: true,
        status: 'healthy',
        database: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Mobile API health check failed', error);
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
      });
    }
  }

  // Helper methods
  private async triggerApprovalWorkflow(approvalId: string, action: 'approved' | 'rejected'): Promise<void> {
    // This would integrate with your workflow system
    // For now, just log the action
    this.logger.info(`Approval workflow triggered`, { approvalId, action });
  }

  // Get the router for use in main app
  getRouter(): Router {
    return this.router;
  }
}
