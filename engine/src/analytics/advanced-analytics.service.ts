// @ts-nocheck - Supabase SDK/Type migration pending (Phase 2)
/**
 * Advanced Analytics Service for Phase 6
 * Real-time dashboards and reporting with VRCL integration
 */

import { UnifiedDatabaseManager } from '../database/unified-database-manager';
import { Logger } from '../utils/logger';

export interface AnalyticsConfig {
  enableRealtime: boolean;
  enableVRCL: boolean;
  vrclEndpoint: string;
  vrclApiKey: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  aggregationWindow: number; // minutes
}

export interface LeadAnalytics {
  totalLeads: number;
  newLeads: number;
  conversionRate: number;
  averageResponseTime: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  leadsByCity: Record<string, number>;
  leadsByPropertyType: Record<string, number>;
  leadsByPriceRange: Record<string, number>;
  conversionFunnel: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    closed: number;
  };
  trends: {
    daily: Array<{ date: string; leads: number; conversions: number }>;
    weekly: Array<{ week: string; leads: number; conversions: number }>;
    monthly: Array<{ month: string; leads: number; conversions: number }>;
  };
}

export interface AgentAnalytics {
  totalAgents: number;
  activeAgents: number;
  topPerformers: Array<{
    agentId: string;
    name: string;
    email: string;
    leads: number;
    conversions: number;
    rate: number;
    revenue: number;
  }>;
  performanceDistribution: {
    excellent: number; // >80% conversion
    good: number; // 60-80%
    average: number; // 40-60%
    poor: number; // <40%
  };
  activityMetrics: {
    avgLeadsPerAgent: number;
    avgResponseTime: number;
    avgApprovalTime: number;
    totalApprovals: number;
    approvalRate: number;
  };
}

export interface SystemAnalytics {
  systemHealth: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    api: 'healthy' | 'degraded' | 'unhealthy';
    mcp: 'healthy' | 'degraded' | 'unhealthy';
    overall: 'healthy' | 'degraded' | 'unhealthy';
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  usage: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    apiCalls: number;
    messagesProcessed: number;
    approvalsProcessed: number;
  };
  resources: {
    databaseConnections: number;
    memoryUsage: number;
    cpuUsage: number;
    storageUsage: number;
  };
}

export interface VRCLData {
  marketTrends: {
    medianPrice: number;
    pricePerSqft: number;
    daysOnMarket: number;
    inventory: number;
    absorptionRate: number;
  };
  demographicData: {
    population: number;
    medianIncome: number;
    ageDistribution: Record<string, number>;
    employmentRate: number;
  };
  competitiveAnalysis: {
    competitorCount: number;
    avgMarketShare: number;
    topCompetitors: Array<{
      name: string;
      marketShare: number;
      strengths: string[];
      weaknesses: string[];
    }>;
  };
  predictions: {
    priceTrend: 'increasing' | 'stable' | 'decreasing';
    demandLevel: 'high' | 'medium' | 'low';
    marketOutlook: 'bullish' | 'neutral' | 'bearish';
    confidence: number;
  };
}

export class AdvancedAnalyticsService {
  private dbManager: UnifiedDatabaseManager;
  private logger: Logger;
  private config: AnalyticsConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(dbManager: UnifiedDatabaseManager, config: AnalyticsConfig) {
    this.dbManager = dbManager;
    this.config = config;
    this.logger = new Logger('AdvancedAnalytics', true);
  }

  // Lead analytics
  async getLeadAnalytics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<LeadAnalytics> {
    const cacheKey = `lead_analytics_${timeframe}`;
    
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const baseMetrics = await this.dbManager.getDashboardMetrics();
      
      // Get detailed analytics from database
      const detailedMetrics = await this.getDetailedLeadMetrics(timeframe);
      
      const analytics: LeadAnalytics = {
        totalLeads: baseMetrics.totalLeads,
        newLeads: baseMetrics.activeLeads,
        conversionRate: baseMetrics.conversionRate,
        averageResponseTime: baseMetrics.recentActivity.length > 0 ? 
          this.calculateAverageResponseTime(baseMetrics.recentActivity) : 0,
        leadsByStatus: detailedMetrics.leadsByStatus,
        leadsBySource: detailedMetrics.leadsBySource,
        leadsByCity: detailedMetrics.leadsByCity,
        leadsByPropertyType: detailedMetrics.leadsByPropertyType,
        leadsByPriceRange: detailedMetrics.leadsByPriceRange,
        conversionFunnel: detailedMetrics.conversionFunnel,
        trends: await this.getLeadTrends(timeframe),
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      this.logger.error('Failed to get lead analytics', error);
      throw error;
    }
  }

  private async getDetailedLeadMetrics(timeframe: string): Promise<any> {
    // This would query the database for detailed metrics
    // For now, return placeholder data
    return {
      leadsByStatus: {
        new: 45,
        contacted: 32,
        qualified: 18,
        converted: 12,
        closed: 8,
      },
      leadsBySource: {
        website: 35,
        referral: 28,
        social: 22,
        email: 15,
      },
      leadsByCity: {
        'Toronto': 28,
        'Vancouver': 22,
        'Montreal': 18,
        'Calgary': 15,
        'Ottawa': 12,
      },
      leadsByPropertyType: {
        'Condo': 35,
        'House': 42,
        'Townhouse': 18,
        'Apartment': 5,
      },
      leadsByPriceRange: {
        '300k-500k': 25,
        '500k-750k': 38,
        '750k-1M': 22,
        '1M+': 15,
      },
      conversionFunnel: {
        new: 115,
        contacted: 78,
        qualified: 45,
        converted: 23,
        closed: 15,
      },
    };
  }

  private async getLeadTrends(timeframe: string): Promise<any> {
    // Generate trend data based on timeframe
    const trends = {
      daily: this.generateDailyTrends(30),
      weekly: this.generateWeeklyTrends(12),
      monthly: this.generateMonthlyTrends(12),
    };

    return trends[timeframe] || trends.weekly;
  }

  private generateDailyTrends(days: number): Array<{ date: string; leads: number; conversions: number }> {
    const trends = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        leads: Math.floor(Math.random() * 15) + 5,
        conversions: Math.floor(Math.random() * 5) + 1,
      });
    }
    
    return trends;
  }

  private generateWeeklyTrends(weeks: number): Array<{ week: string; leads: number; conversions: number }> {
    const trends = [];
    const today = new Date();
    
    for (let i = weeks - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7));
      
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      
      trends.push({
        week: weekStart.toISOString().split('T')[0],
        leads: Math.floor(Math.random() * 80) + 20,
        conversions: Math.floor(Math.random() * 20) + 5,
      });
    }
    
    return trends;
  }

  private generateMonthlyTrends(months: number): Array<{ month: string; leads: number; conversions: number }> {
    const trends = [];
    const today = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      
      trends.push({
        month: date.toISOString().slice(0, 7),
        leads: Math.floor(Math.random() * 300) + 100,
        conversions: Math.floor(Math.random() * 80) + 20,
      });
    }
    
    return trends;
  }

  // Agent analytics
  async getAgentAnalytics(): Promise<AgentAnalytics> {
    const cacheKey = 'agent_analytics';
    
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      // This would query the database for agent performance data
      const analytics: AgentAnalytics = {
        totalAgents: 12,
        activeAgents: 10,
        topPerformers: [
          {
            agentId: '1',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            leads: 45,
            conversions: 18,
            rate: 40.0,
            revenue: 2250000,
          },
          {
            agentId: '2',
            name: 'Mike Chen',
            email: 'mike@example.com',
            leads: 38,
            conversions: 15,
            rate: 39.5,
            revenue: 1875000,
          },
          {
            agentId: '3',
            name: 'Emily Davis',
            email: 'emily@example.com',
            leads: 42,
            conversions: 16,
            rate: 38.1,
            revenue: 2000000,
          },
        ],
        performanceDistribution: {
          excellent: 3,
          good: 4,
          average: 3,
          poor: 2,
        },
        activityMetrics: {
          avgLeadsPerAgent: 35.2,
          avgResponseTime: 2.4,
          avgApprovalTime: 1.8,
          totalApprovals: 156,
          approvalRate: 87.5,
        },
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      this.logger.error('Failed to get agent analytics', error);
      throw error;
    }
  }

  // System analytics
  async getSystemAnalytics(): Promise<SystemAnalytics> {
    const cacheKey = 'system_analytics';
    
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const health = await this.dbManager.getSystemHealth();
      
      const analytics: SystemAnalytics = {
        systemHealth: {
          database: health.neon === 'healthy' ? 'healthy' : 'degraded',
          api: 'healthy', // Would check actual API health
          mcp: 'healthy', // Would check MCP server health
          overall: health.overall,
        },
        performance: {
          avgResponseTime: 245,
          p95ResponseTime: 892,
          p99ResponseTime: 1456,
          throughput: 1250,
          errorRate: 0.02,
          uptime: 99.8,
        },
        usage: {
          dailyActiveUsers: 45,
          weeklyActiveUsers: 78,
          monthlyActiveUsers: 124,
          apiCalls: 45678,
          messagesProcessed: 2341,
          approvalsProcessed: 567,
        },
        resources: {
          databaseConnections: 18,
          memoryUsage: 67.5,
          cpuUsage: 42.3,
          storageUsage: 23.8,
        },
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      this.logger.error('Failed to get system analytics', error);
      throw error;
    }
  }

  // VRCL integration
  async getVRCLAnalytics(location: string): Promise<VRCLData> {
    if (!this.config.enableVRCL) {
      throw new Error('VRCL integration is not enabled');
    }

    const cacheKey = `vrcl_${location}`;
    
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const vrclData = await this.fetchVRCLData(location);
      
      this.setCache(cacheKey, vrclData);
      return vrclData;
    } catch (error) {
      this.logger.error('Failed to get VRCL analytics', error);
      throw error;
    }
  }

  private async fetchVRCLData(location: string): Promise<VRCLData> {
    // This would integrate with the actual VRCL API
    // For now, return mock data that matches the expected structure
    
    return {
      marketTrends: {
        medianPrice: 685000,
        pricePerSqft: 525,
        daysOnMarket: 28,
        inventory: 1245,
        absorptionRate: 3.2,
      },
      demographicData: {
        population: 2845000,
        medianIncome: 78000,
        ageDistribution: {
          '25-34': 22,
          '35-44': 28,
          '45-54': 24,
          '55-64': 18,
          '65+': 8,
        },
        employmentRate: 94.2,
      },
      competitiveAnalysis: {
        competitorCount: 156,
        avgMarketShare: 0.64,
        topCompetitors: [
          {
            name: 'Royal LePage',
            marketShare: 18.5,
            strengths: ['Brand recognition', 'Large network', 'Marketing budget'],
            weaknesses: ['Higher fees', 'Slower technology adoption'],
          },
          {
            name: 'RE/MAX',
            marketShare: 15.2,
            strengths: ['Agent support', 'Training programs', 'Global presence'],
            weaknesses: ['Inconsistent service quality', 'Limited local focus'],
          },
        ],
      },
      predictions: {
        priceTrend: 'increasing',
        demandLevel: 'high',
        marketOutlook: 'bullish',
        confidence: 0.87,
      },
    };
  }

  // Real-time dashboard data
  async getRealtimeDashboard(): Promise<{
    leadAnalytics: LeadAnalytics;
    agentAnalytics: AgentAnalytics;
    systemAnalytics: SystemAnalytics;
    vrclData?: VRCLData;
    alerts: Array<{
      type: 'info' | 'warning' | 'error';
      title: string;
      message: string;
      timestamp: string;
      action?: string;
    }>;
  }> {
    try {
      const [leadAnalytics, agentAnalytics, systemAnalytics] = await Promise.all([
        this.getLeadAnalytics(),
        this.getAgentAnalytics(),
        this.getSystemAnalytics(),
      ]);

      const alerts = this.generateAlerts(systemAnalytics, leadAnalytics);
      
      const dashboard = {
        leadAnalytics,
        agentAnalytics,
        systemAnalytics,
        alerts,
      };

      // Add VRCL data if enabled
      if (this.config.enableVRCL) {
        try {
          dashboard.vrclData = await this.getVRCLAnalytics('Toronto'); // Default location
        } catch (error) {
          this.logger.warn('Failed to fetch VRCL data for dashboard', error);
        }
      }

      return dashboard;
    } catch (error) {
      this.logger.error('Failed to get realtime dashboard', error);
      throw error;
    }
  }

  private generateAlerts(systemAnalytics: SystemAnalytics, leadAnalytics: LeadAnalytics): Array<any> {
    const alerts = [];

    // System health alerts
    if (systemAnalytics.systemHealth.overall !== 'healthy') {
      alerts.push({
        type: 'error',
        title: 'System Health Issue',
        message: `System health is ${systemAnalytics.systemHealth.overall}`,
        timestamp: new Date().toISOString(),
        action: 'check-systems',
      });
    }

    // Performance alerts
    if (systemAnalytics.performance.avgResponseTime > 500) {
      alerts.push({
        type: 'warning',
        title: 'High Response Time',
        message: `Average response time is ${systemAnalytics.performance.avgResponseTime}ms`,
        timestamp: new Date().toISOString(),
        action: 'optimize-performance',
      });
    }

    // Lead conversion alerts
    if (leadAnalytics.conversionRate < 15) {
      alerts.push({
        type: 'warning',
        title: 'Low Conversion Rate',
        message: `Lead conversion rate is ${leadAnalytics.conversionRate}%`,
        timestamp: new Date().toISOString(),
        action: 'review-workflows',
      });
    }

    // Success alerts
    if (leadAnalytics.conversionRate > 35) {
      alerts.push({
        type: 'info',
        title: 'Great Performance!',
        message: `Lead conversion rate is ${leadAnalytics.conversionRate}% - excellent work!`,
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // Custom reports
  async generateCustomReport(params: {
    startDate: string;
    endDate: string;
    metrics: string[];
    filters?: Record<string, any>;
    format: 'json' | 'csv' | 'pdf';
  }): Promise<any> {
    try {
      // Generate custom report based on parameters
      const report = {
        metadata: {
          generatedAt: new Date().toISOString(),
          period: {
            start: params.startDate,
            end: params.endDate,
          },
          metrics: params.metrics,
          filters: params.filters,
        },
        data: await this.fetchReportData(params),
      };

      return report;
    } catch (error) {
      this.logger.error('Failed to generate custom report', error);
      throw error;
    }
  }

  private async fetchReportData(params: any): Promise<any> {
    // This would query the database based on the report parameters
    return {
      summary: {
        totalLeads: 234,
        conversions: 67,
        revenue: 3450000,
      },
      details: [], // Detailed data based on metrics
    };
  }

  // Utility methods
  private calculateAverageResponseTime(events: any[]): number {
    if (events.length === 0) return 0;
    
    // Calculate average time between lead creation and first response
    const responseTimes = events
      .filter(event => event.type === 'outbound')
      .map(event => {
        // This would calculate actual response time
        return Math.random() * 60; // Mock data in minutes
      });

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  private getFromCache(key: string): any {
    if (!this.config.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheTTL * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    if (!this.config.cacheEnabled) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Cleanup
  cleanup(): void {
    this.cache.clear();
    this.logger.info('Advanced analytics service cleaned up');
  }
}
