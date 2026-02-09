import { Logger } from '../utils/logger.js';

export interface ReportConfig {
    reportType: ReportType;
    tenantId: string;
    dateRange: {
        start: Date;
        end: Date;
    };
    filters?: Record<string, any>;
    format?: 'json' | 'csv' | 'pdf';
}

export type ReportType =
    | 'lead_funnel'
    | 'agent_performance'
    | 'revenue_summary'
    | 'property_matching'
    | 'communication_activity'
    | 'approval_metrics';

export interface ReportResult {
    reportType: ReportType;
    generatedAt: string;
    dateRange: { start: string; end: string };
    data: any;
    summary: Record<string, any>;
}

export class ReportService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('ReportService');
    }

    /**
     * Generate a report based on configuration
     */
    async generateReport(config: ReportConfig): Promise<ReportResult> {
        this.logger.info('Generating report', {
            type: config.reportType,
            tenantId: config.tenantId
        });

        switch (config.reportType) {
            case 'lead_funnel':
                return this.generateLeadFunnelReport(config);
            case 'agent_performance':
                return this.generateAgentPerformanceReport(config);
            case 'revenue_summary':
                return this.generateRevenueSummaryReport(config);
            case 'property_matching':
                return this.generatePropertyMatchingReport(config);
            case 'communication_activity':
                return this.generateCommunicationReport(config);
            case 'approval_metrics':
                return this.generateApprovalMetricsReport(config);
            default:
                throw new Error(`Unknown report type: ${config.reportType}`);
        }
    }

    private async generateLeadFunnelReport(config: ReportConfig): Promise<ReportResult> {
        // Placeholder - would query database for actual data
        const data = {
            stages: [
                { name: 'New', count: 150, percentage: 100 },
                { name: 'Contacted', count: 120, percentage: 80 },
                { name: 'Qualified', count: 80, percentage: 53 },
                { name: 'Converted', count: 45, percentage: 30 },
                { name: 'Closed', count: 25, percentage: 17 }
            ],
            conversionRate: 16.7,
            averageTimeInFunnel: '14 days'
        };

        return this.buildReportResult('lead_funnel', config, data, {
            totalLeads: 150,
            conversions: 25,
            conversionRate: '16.7%'
        });
    }

    private async generateAgentPerformanceReport(config: ReportConfig): Promise<ReportResult> {
        const data = {
            agents: [
                { name: 'Agent A', leads: 45, conversions: 12, responseTime: '2.5h', score: 92 },
                { name: 'Agent B', leads: 38, conversions: 10, responseTime: '3.1h', score: 88 },
                { name: 'Agent C', leads: 42, conversions: 8, responseTime: '4.2h', score: 79 }
            ],
            teamAverages: {
                leadsPerAgent: 41.7,
                conversionsPerAgent: 10,
                avgResponseTime: '3.3h'
            }
        };

        return this.buildReportResult('agent_performance', config, data, {
            topPerformer: 'Agent A',
            totalConversions: 30,
            avgScore: 86.3
        });
    }

    private async generateRevenueSummaryReport(config: ReportConfig): Promise<ReportResult> {
        const data = {
            revenue: {
                total: 15000,
                credits_sold: 150000,
                average_transaction: 100
            },
            breakdown: [
                { category: 'AI Matching', amount: 6000, credits: 60000 },
                { category: 'Voice Messages', amount: 3000, credits: 30000 },
                { category: 'Video Calls', amount: 4500, credits: 45000 },
                { category: 'SMS', amount: 1500, credits: 15000 }
            ],
            trends: {
                monthOverMonth: '+12%',
                yearOverYear: '+45%'
            }
        };

        return this.buildReportResult('revenue_summary', config, data, {
            totalRevenue: '$15,000',
            topCategory: 'AI Matching',
            growth: '+12% MoM'
        });
    }

    private async generatePropertyMatchingReport(config: ReportConfig): Promise<ReportResult> {
        const data = {
            matches: {
                total: 850,
                successful: 680,
                accuracy: 80
            },
            topFeatures: [
                { feature: 'Location', importance: 35 },
                { feature: 'Price', importance: 28 },
                { feature: 'Size', importance: 20 },
                { feature: 'Amenities', importance: 17 }
            ]
        };

        return this.buildReportResult('property_matching', config, data, {
            totalMatches: 850,
            successRate: '80%',
            topFeature: 'Location'
        });
    }

    private async generateCommunicationReport(config: ReportConfig): Promise<ReportResult> {
        const data = {
            channels: [
                { name: 'WhatsApp', sent: 1200, received: 890, engagement: 74 },
                { name: 'Email', sent: 800, received: 320, engagement: 40 },
                { name: 'Voice', sent: 150, duration: '12h 30m', engagement: 85 },
                { name: 'Video', sent: 45, duration: '8h 15m', engagement: 92 }
            ],
            totalMessages: 2195,
            avgResponseTime: '45 minutes'
        };

        return this.buildReportResult('communication_activity', config, data, {
            totalMessages: 2195,
            topChannel: 'WhatsApp',
            avgEngagement: '72.75%'
        });
    }

    private async generateApprovalMetricsReport(config: ReportConfig): Promise<ReportResult> {
        const data = {
            approvals: {
                total: 450,
                approved: 380,
                rejected: 70,
                pending: 15
            },
            averageApprovalTime: '2.3 hours',
            byType: [
                { type: 'Message', count: 320, approved: 290 },
                { type: 'Email', count: 100, approved: 75 },
                { type: 'Call', count: 30, approved: 15 }
            ]
        };

        return this.buildReportResult('approval_metrics', config, data, {
            approvalRate: '84.4%',
            avgTime: '2.3 hours',
            pending: 15
        });
    }

    private buildReportResult(
        reportType: ReportType,
        config: ReportConfig,
        data: any,
        summary: Record<string, any>
    ): ReportResult {
        return {
            reportType,
            generatedAt: new Date().toISOString(),
            dateRange: {
                start: config.dateRange.start.toISOString(),
                end: config.dateRange.end.toISOString()
            },
            data,
            summary
        };
    }

    /**
     * Export report to specified format
     */
    async exportReport(report: ReportResult, format: 'json' | 'csv'): Promise<string> {
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        }

        if (format === 'csv') {
            return this.convertToCSV(report.data);
        }

        throw new Error(`Unsupported format: ${format}`);
    }

    private convertToCSV(data: any): string {
        if (Array.isArray(data)) {
            if (data.length === 0) return '';
            const headers = Object.keys(data[0]);
            const rows = data.map(row =>
                headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
            );
            return [headers.join(','), ...rows].join('\n');
        }

        // For object data, create key-value pairs
        return Object.entries(data)
            .map(([key, value]) => `${key},${JSON.stringify(value)}`)
            .join('\n');
    }
}

// Singleton
let reportInstance: ReportService | null = null;

export function getReportService(): ReportService {
    if (!reportInstance) {
        reportInstance = new ReportService();
    }
    return reportInstance;
}
