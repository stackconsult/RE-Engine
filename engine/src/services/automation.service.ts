/**
 * Automation Service - Orchestrates lead discovery, enrichment, and processing
 * Integrates TinyFish API, Lead Discovery, and Lead Enrichment services
 */

import { LeadDiscoveryService, RealEstateSource } from './lead-discovery.service';
import { LeadEnrichmentService } from './lead-enrichment.service';
import { LeadSearchService } from './lead-search.service';

export interface AutomationConfig {
  dataDir: string;
  tinyfishApiKey?: string;
  enableAutoDiscovery?: boolean;
  enableAutoEnrichment?: boolean;
  discoverySchedule?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    timeOfDay?: string; // HH:MM format
  };
  enrichmentSchedule?: {
    enabled: boolean;
    autoEnrichNewLeads: boolean;
    batchEnrichmentSize: number;
  };
  sources: RealEstateSource[];
}

export interface AutomationJob {
  id: string;
  type: 'discovery' | 'enrichment' | 'search' | 'bulk_process';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  result?: Record<string, unknown>;
  error?: string;
  progress?: number;
  total?: number;
}

export interface AutomationResult {
  success: boolean;
  jobs: AutomationJob[];
  summary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    leadsDiscovered: number;
    leadsEnriched: number;
    processingTime: number;
  };
}

/**
 * Automation Service
 * Orchestrates automated lead discovery and enrichment workflows
 */
export class AutomationService {
  private discoveryService: LeadDiscoveryService;
  private enrichmentService: LeadEnrichmentService;
  private searchService: LeadSearchService;
  private config: AutomationConfig;
  private jobs: Map<string, AutomationJob> = new Map();

  constructor(config: AutomationConfig) {
    this.config = config;
    
    this.discoveryService = new LeadDiscoveryService({
      dataDir: config.dataDir,
      tinyfishApiKey: config.tinyfishApiKey,
      enableAutoImport: true,
      maxLeadsPerSource: 50,
      discoverySources: config.sources
    });

    this.enrichmentService = new LeadEnrichmentService({
      dataDir: config.dataDir,
      enableExternalAPIs: true
    });

    this.searchService = new LeadSearchService({
      dataDir: config.dataDir,
      enableFuzzySearch: true,
      maxResults: 100
    });
  }

  /**
   * Run complete automation workflow
   */
  async runFullAutomation(): Promise<AutomationResult> {
    const jobId = this.createJob('bulk_process', 'Running full automation workflow');
    
    try {
      const results: AutomationJob[] = [];
      
      // Step 1: Lead Discovery
      if (this.config.enableAutoDiscovery) {
        const discoveryJob = await this.runDiscoveryAutomation();
        results.push(discoveryJob);
      }
      
      // Step 2: Lead Enrichment
      if (this.config.enableAutoEnrichment) {
        const enrichmentJob = await this.runEnrichmentAutomation();
        results.push(enrichmentJob);
      }
      
      // Step 3: Update job status
      this.updateJob(jobId, 'completed', {
        jobs: results,
        summary: this.calculateSummary(results)
      });
      
      return {
        success: true,
        jobs: results,
        summary: this.calculateSummary(results)
      };
    } catch (error) {
      this.updateJob(jobId, 'failed', undefined, error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        jobs: [],
        summary: {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 1,
          leadsDiscovered: 0,
          leadsEnriched: 0,
          processingTime: 0
        }
      };
    }
  }

  /**
   * Run discovery automation
   */
  async runDiscoveryAutomation(): Promise<AutomationJob> {
    const jobId = this.createJob('discovery', 'Running lead discovery automation');
    
    try {
      const results = await this.discoveryService.discoverAllLeads();
      
      this.updateJob(jobId, 'completed', {
        results,
        summary: {
          totalSources: results.length,
          totalLeads: results.reduce((sum, r) => sum + r.leads.length, 0),
          imported: results.reduce((sum, r) => sum + r.imported, 0)
        }
      });
      
      return this.jobs.get(jobId)!;
    } catch (error) {
      this.updateJob(jobId, 'failed', undefined, error instanceof Error ? error.message : String(error));
      return this.jobs.get(jobId)!;
    }
  }

  /**
   * Run enrichment automation
   */
  async runEnrichmentAutomation(): Promise<AutomationJob> {
    const jobId = this.createJob('enrichment', 'Running lead enrichment automation');
    
    try {
      // Get all leads that haven't been enriched
      const searchResult = await this.searchService.search({
        filters: {
          // Would filter by enrichment status in production
        }
      });
      
      const leads = searchResult.leads;
      const batchSize = this.config.enrichmentSchedule?.batchEnrichmentSize || 10;
      let enrichedCount = 0;
      
      // Process leads in batches
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        
        for (const lead of batch) {
          try {
            await this.enrichmentService.enrichLead(lead.lead_id);
            enrichedCount++;
            
            // Update progress
            this.updateJob(jobId, 'running', undefined, undefined, {
              progress: Math.round((enrichedCount / leads.length) * 100),
              total: leads.length
            });
          } catch (error) {
            console.error(`Failed to enrich lead ${lead.lead_id}:`, error);
          }
        }
        
        // Rate limiting between batches
        await this.delay(1000);
      }
      
      this.updateJob(jobId, 'completed', {
        enrichedCount,
        totalLeads: leads.length
      });
      
      return this.jobs.get(jobId)!;
    } catch (error) {
      this.updateJob(jobId, 'failed', undefined, error instanceof Error ? error.message : String(error));
      return this.jobs.get(jobId)!;
    }
  }

  /**
   * Schedule automated discovery
   */
  scheduleAutomation(): void {
    if (!this.config.discoverySchedule?.enabled) {
      return;
    }

    const { frequency } = this.config.discoverySchedule;
    
    // Set up interval based on frequency
    const intervalMs = this.getIntervalFromFrequency(frequency);
    
    setInterval(async () => {
      try {
        console.log(`Running scheduled automation (${frequency})`);
        await this.runFullAutomation();
      } catch (error) {
        console.error('Scheduled automation failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Get automation status
   */
  getAutomationStatus(): {
    activeJobs: number;
    recentJobs: AutomationJob[];
    config: AutomationConfig;
    nextRun: string;
  } {
    const jobs = Array.from(this.jobs.values());
    const recentJobs = jobs.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    ).slice(0, 10);
    
    return {
      activeJobs: jobs.filter(j => j.status === 'running').length,
      recentJobs,
      config: this.config,
      nextRun: this.getNextRunTime()
    };
  }

  /**
   * Get job details
   */
  getJob(jobId: string): AutomationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      this.updateJob(jobId, 'failed', undefined, 'Job cancelled by user');
      return true;
    }
    return false;
  }

  /**
   * Create new automation job
   */
  private createJob(type: AutomationJob['type'], _description: string): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: AutomationJob = {
      id: jobId,
      type,
      status: 'pending',
      startTime: new Date().toISOString()
    };
    
    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Update job status
   */
  private updateJob(jobId: string, status: AutomationJob['status'], result?: Record<string, unknown>, error?: string, progress?: { progress: number; total: number }): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.status = status;
    if (status === 'completed' || status === 'failed') {
      job.endTime = new Date().toISOString();
    }
    if (result) {
      job.result = result;
    }
    if (error) {
      job.error = error;
    }
    if (progress) {
      job.progress = progress.progress;
      job.total = progress.total;
    }
  }

  /**
   * Calculate summary from job results
   */
  private calculateSummary(jobs: AutomationJob[]): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    leadsDiscovered: number;
    leadsEnriched: number;
    processingTime: number;
  } {
    const summary = {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      leadsDiscovered: 0,
      leadsEnriched: 0,
      processingTime: 0
    };
    
    for (const job of jobs) {
      if (job.result) {
        if (job.type === 'discovery' && Array.isArray(job.result.results)) {
          summary.leadsDiscovered += job.result.results.reduce((sum: number, r: { leads: unknown[] }) => sum + r.leads.length, 0);
        }
        if (job.type === 'enrichment' && typeof job.result.enrichedCount === 'number') {
          summary.leadsEnriched += job.result.enrichedCount;
        }
      }
      
      if (job.startTime && job.endTime) {
        summary.processingTime += new Date(job.endTime).getTime() - new Date(job.startTime).getTime();
      }
    }
    
    return summary;
  }

  /**
   * Get interval from frequency string
   */
  private getIntervalFromFrequency(frequency: string): number {
    switch (frequency) {
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  /**
   * Get next run time
   */
  private getNextRunTime(): string {
    if (!this.config.discoverySchedule?.enabled) {
      return 'Not scheduled';
    }
    
    const now = new Date();
    const interval = this.getIntervalFromFrequency(this.config.discoverySchedule.frequency);
    const nextRun = new Date(now.getTime() + interval);
    
    return nextRun.toISOString();
  }

  /**
   * Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add discovery source
   */
  async addDiscoverySource(source: RealEstateSource): Promise<void> {
    await this.discoveryService.addDiscoverySource(source);
    this.config.sources.push(source);
  }

  /**
   * Remove discovery source
   */
  async removeDiscoverySource(sourceName: string): Promise<void> {
    await this.discoveryService.removeDiscoverySource(sourceName);
    this.config.sources = this.config.sources.filter(s => s.name !== sourceName);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
