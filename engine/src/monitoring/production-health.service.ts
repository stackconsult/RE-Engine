/**
 * Production Health Monitoring Service
 * Comprehensive health monitoring and observability for production deployment
 */

export interface HealthMonitoringDependencies {
  metricsCollector: MetricsCollector;
  alertManager: AlertManager;
  dashboardService: DashboardService;
  tracingService: TracingService;
}

export interface HealthMonitoringResult {
  status: 'monitoring-active' | 'failed';
  endpoints: HealthEndpoint[];
  metrics: MetricsConfiguration;
  alerts: AlertConfiguration;
}

export interface HealthEndpoint {
  path: string;
  type: 'liveness' | 'readiness' | 'startup';
  status: 'active' | 'inactive';
  lastChecked: number;
}

export class ProductionHealthService {
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private dashboardService: DashboardService;
  private tracingService: TracingService;
  
  constructor(dependencies: HealthMonitoringDependencies) {
    this.metricsCollector = dependencies.metricsCollector;
    this.alertManager = dependencies.alertManager;
    this.dashboardService = dependencies.dashboardService;
    this.tracingService = dependencies.tracingService;
  }
  
  async initializeHealthMonitoring(): Promise<HealthMonitoringResult> {
    try {
      // STEP 2.7.1: Metrics Collection
      await this.setupMetricsCollection();
      
      // STEP 2.7.2: Alert Management
      await this.setupAlertManagement();
      
      // STEP 2.7.3: Dashboard Integration
      await this.setupDashboardIntegration();
      
      // STEP 2.7.4: Distributed Tracing
      await this.setupDistributedTracing();
      
      return { 
        status: 'monitoring-active', 
        endpoints: this.getHealthEndpoints(),
        metrics: this.getMetricsConfiguration(),
        alerts: this.getAlertConfiguration()
      };
      
    } catch (error) {
      await this.handleHealthMonitoringError(error);
      throw error;
    }
  }
  
  private async setupMetricsCollection(): Promise<void> {
    await this.metricsCollector.configure({
      prometheus: {
        enabled: true,
        port: 9090,
        path: '/metrics',
        collectDefaultMetrics: true
      },
      customMetrics: [
        'lead_discovery_duration',
        'ai_processing_time',
        'database_query_time',
        'api_response_time',
        'error_rate',
        'throughput'
      ]
    });
    
    // Custom metric definitions
    await this.metricsCollector.defineMetric('lead_discovery_duration', {
      type: 'histogram',
      help: 'Duration of lead discovery operations',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });
    
    await this.metricsCollector.defineMetric('ai_processing_time', {
      type: 'histogram',
      help: 'AI model processing time',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20]
    });
    
    await this.metricsCollector.defineMetric('error_rate', {
      type: 'gauge',
      help: 'Current error rate'
    });
    
    await this.metricsCollector.defineMetric('throughput', {
      type: 'counter',
      help: 'Total number of requests processed'
    });
  }
  
  private async setupAlertManagement(): Promise<void> {
    await this.alertManager.configure({
      channels: [
        { 
          type: 'email', 
          config: { 
            recipients: ['ops@reengine.com'],
            template: 'production-alert'
          } 
        },
        { 
          type: 'slack', 
          config: { 
            webhook: process.env.SLACK_WEBHOOK_URL,
            channel: '#alerts'
          } 
        },
        { 
          type: 'pagerduty', 
          config: { 
            serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
            severity: 'critical'
          } 
        }
      ],
      rules: [
        {
          name: 'High Error Rate',
          condition: 'error_rate > 0.05',
          severity: 'critical',
          cooldown: 300000, // 5 minutes
          message: 'Error rate is above 5%'
        },
        {
          name: 'High Response Time',
          condition: 'response_time_p95 > 5000',
          severity: 'warning',
          cooldown: 600000, // 10 minutes
          message: '95th percentile response time is above 5 seconds'
        },
        {
          name: 'Service Down',
          condition: 'service_up == 0',
          severity: 'critical',
          cooldown: 60000, // 1 minute
          message: 'Service is down'
        },
        {
          name: 'High Memory Usage',
          condition: 'memory_usage > 0.8',
          severity: 'warning',
          cooldown: 300000,
          message: 'Memory usage is above 80%'
        },
        {
          name: 'High CPU Usage',
          condition: 'cpu_usage > 0.8',
          severity: 'warning',
          cooldown: 300000,
          message: 'CPU usage is above 80%'
        }
      ]
    });
  }
  
  private async setupDashboardIntegration(): Promise<void> {
    await this.dashboardService.configure({
      grafana: {
        enabled: true,
        url: process.env.GRAFANA_URL,
        apiKey: process.env.GRAFANA_API_KEY
      },
      dashboards: [
        {
          name: 'System Overview',
          panels: [
            { metric: 'error_rate', type: 'stat' },
            { metric: 'response_time', type: 'graph' },
            { metric: 'throughput', type: 'graph' },
            { metric: 'memory_usage', type: 'gauge' },
            { metric: 'cpu_usage', type: 'gauge' }
          ]
        },
        {
          name: 'AI Performance',
          panels: [
            { metric: 'ai_processing_time', type: 'histogram' },
            { metric: 'model_accuracy', type: 'stat' },
            { metric: 'model_usage', type: 'graph' }
          ]
        },
        {
          name: 'Lead Pipeline',
          panels: [
            { metric: 'lead_discovery_duration', type: 'histogram' },
            { metric: 'leads_processed', type: 'counter' },
            { metric: 'conversion_rate', type: 'stat' }
          ]
        }
      ]
    });
  }
  
  private async setupDistributedTracing(): Promise<void> {
    await this.tracingService.configure({
      jaeger: {
        endpoint: process.env.JAEGER_ENDPOINT,
        serviceName: 'reengine-production',
        sampleRate: 0.1
      },
      spans: [
        'lead-discovery',
        'lead-enrichment',
        'ai-processing',
        'database-query',
        'api-request'
      ]
    });
    
    // Trace configuration for key operations
    await this.tracingService.configureTracing('lead-discovery', {
      tags: ['operation', 'lead-discovery'],
      includeError: true,
      includeDuration: true
    });
    
    await this.tracingService.configureTracing('ai-processing', {
      tags: ['operation', 'ai', 'model'],
      includeError: true,
      includeDuration: true,
      includeModelInfo: true
    });
  }
  
  private getHealthEndpoints(): HealthEndpoint[] {
    return [
      {
        path: '/health/live',
        type: 'liveness',
        status: 'active',
        lastChecked: Date.now()
      },
      {
        path: '/health/ready',
        type: 'readiness',
        status: 'active',
        lastChecked: Date.now()
      },
      {
        path: '/health/startup',
        type: 'startup',
        status: 'active',
        lastChecked: Date.now()
      }
    ];
  }
  
  private getMetricsConfiguration(): MetricsConfiguration {
    return {
      prometheus: {
        enabled: true,
        port: 9090,
        path: '/metrics'
      },
      customMetrics: [
        'lead_discovery_duration',
        'ai_processing_time',
        'database_query_time',
        'api_response_time',
        'error_rate',
        'throughput'
      ],
      collectionInterval: 15000, // 15 seconds
      retentionPeriod: 86400000 // 24 hours
    };
  }
  
  private getAlertConfiguration(): AlertConfiguration {
    return {
      channels: ['email', 'slack', 'pagerduty'],
      rules: [
        'High Error Rate',
        'High Response Time',
        'Service Down',
        'High Memory Usage',
        'High CPU Usage'
      ],
      escalationPolicy: {
        level1: { delay: 0, channels: ['slack'] },
        level2: { delay: 300000, channels: ['email'] },
        level3: { delay: 600000, channels: ['pagerduty'] }
      }
    };
  }
  
  private async handleHealthMonitoringError(error: Error): Promise<void> {
    console.error('Health monitoring initialization failed:', error);
    // Fallback to basic monitoring
  }
}

interface MetricsConfiguration {
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
  };
  customMetrics: string[];
  collectionInterval: number;
  retentionPeriod: number;
}

interface AlertConfiguration {
  channels: string[];
  rules: string[];
  escalationPolicy: {
    level1: { delay: number; channels: string[] };
    level2: { delay: number; channels: string[] };
    level3: { delay: number; channels: string[] };
  };
}
