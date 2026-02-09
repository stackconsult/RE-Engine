/**
 * CRM Integrations Service for Phase 6
 * Integrates with Zillow, Realtor.com, and MLS systems via Adapters
 */

import { Logger } from '../utils/logger.js';
import { UnifiedDatabaseManager } from '../database/unified-database-manager.js';
import {
  CRMAdapter,
  CRMIntegrationConfig,
  PropertyData,
  LeadMatch
} from './interfaces/crm-definitions.js';
import { ZillowAdapter } from './adapters/zillow-adapter.js';
import { RealtorAdapter } from './adapters/realtor-adapter.js';
import { MLSAdapter } from './adapters/mls-adapter.js';
import { PropertyDatabaseService } from '../database/property-database.service.js';

// TODO: Replace with dynamic tenant fetching
const DEFAULT_TENANT_ID = 'default';

export class CRMIntegrationService {
  private logger: Logger;
  private config: CRMIntegrationConfig;
  private dbManager: UnifiedDatabaseManager;
  private propertyDb: PropertyDatabaseService; // New service

  private adapters: Map<string, CRMAdapter> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    config: CRMIntegrationConfig,
    dbManager: UnifiedDatabaseManager,
    propertyDb: PropertyDatabaseService
  ) {
    this.config = config;
    this.dbManager = dbManager;
    this.propertyDb = propertyDb;
    this.logger = new Logger('CRMIntegration', true);

    // Initialize adapters
    if (this.config.zillow.enabled) {
      this.adapters.set('zillow', new ZillowAdapter(this.config.zillow));
    }
    if (this.config.realtor.enabled) {
      this.adapters.set('realtor', new RealtorAdapter(this.config.realtor));
    }
    if (this.config.mls.enabled) {
      this.adapters.set('mls', new MLSAdapter(this.config.mls));
    }
  }

  async handleWebhook(source: string, tenantId: string, payload: any): Promise<void> {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`No adapter found for source: ${source}`);
    }

    this.logger.info(`Processing ${source} webhook for tenant ${tenantId}`);

    // Adapters should have a mapWebhookPayload method or similar
    // For now, we'll assume the payload can be mapped via search results logic or a dedicated method
    // In a real implementation, we'd add `mapWebhookPayload(payload: any): PropertyData` to CRMAdapter
    const property = await (adapter as any).mapWebhookPayload(tenantId, payload);

    if (property) {
      const propertyId = await this.propertyDb.upsertProperty(property);
      property.property_id = propertyId;

      // Trigger matching for this new/updated property
      await this.matchPropertyToLeads(tenantId, property);
    }
  }

  private async matchPropertyToLeads(tenantId: string, property: PropertyData): Promise<void> {
    const leads = await this.dbManager.searchLeads(tenantId, {
      status: 'active',
      limit: 100
    });

    for (const lead of leads.leads) {
      await this.processPropertyMatch(tenantId, lead, property);
    }
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing CRM integrations...');

    try {
      // Initialize all adapters
      for (const [name, adapter] of this.adapters) {
        await adapter.initialize();
        this.startSync(name, adapter);
      }

      this.logger.info('CRM integrations initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CRM integrations', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private startSync(name: string, adapter: CRMAdapter): void {
    const config: any = (this.config as any)[name];
    if (!config || !config.syncInterval) return;

    this.logger.info(`Starting sync for ${name} every ${config.syncInterval} minutes`);

    const interval = setInterval(async () => {
      try {
        await this.syncData(name, adapter);
      } catch (error) {
        this.logger.error(`${name} sync failed`, error instanceof Error ? error : new Error(String(error)));
      }
    }, config.syncInterval * 60 * 1000);

    this.syncIntervals.set(name, interval);
  }

  private async syncData(name: string, adapter: CRMAdapter): Promise<void> {
    if (!this.checkRateLimit(name)) {
      this.logger.warn(`${name} rate limit exceeded`);
      return;
    }

    try {
      // Dynamic tenant fetching for true multi-tenancy
      const tenants = await this.dbManager.listTenants();

      for (const tenant of tenants) {
        const tenantId = tenant.id || tenant.tenant_id || DEFAULT_TENANT_ID;
        this.logger.info(`Syncing ${name} data for tenant ${tenantId} (${tenant.name || 'Unknown'})`);

        // Get leads to drive the search (Search properties relevant to leads)
        const leads = await this.dbManager.searchLeads(tenantId, {
          status: 'new',
          limit: 50
        });

        for (const lead of leads.leads) {
          if (lead.city) {
            const criteria = {
              city: lead.city,
              price_min: (lead as any).price_min, // Assuming enriched lead data
              price_max: (lead as any).price_max,
              property_type: (lead as any).property_type,
              limit: 10
            };

            const properties = await adapter.searchProperties(tenantId, criteria);

            // Store properties and create matches
            for (const property of properties) {
              // Upsert property to DB
              const propertyId = await this.propertyDb.upsertProperty(property);
              property.property_id = propertyId;

              // Match logic
              await this.processPropertyMatch(tenantId, lead, property);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync ${name} data`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Rate Limiting Logic
  private checkRateLimit(service: string): boolean {
    const limiter = this.rateLimiters.get(service);
    const now = Date.now();

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(service, {
        count: 1,
        resetTime: now + 60000,
      });
      return true;
    }

    if (limiter.count >= this.config.rateLimiting.requestsPerMinute) {
      return false;
    }

    limiter.count++;
    return true;
  }

  // Property Matching Logic
  private async processPropertyMatch(tenantId: string, lead: any, property: PropertyData): Promise<void> {
    const score = this.calculateMatchScore(lead, property);

    if (score > 0.6) {
      await this.propertyDb.createPropertyMatch({
        tenant_id: tenantId,
        lead_id: lead.lead_id,
        property_id: property.property_id!, // Assumed set by upsert
        score: score,
        reasons: this.getMatchReasons(lead, property),
        recommendations: this.generateRecommendations(lead, property),
        status: 'pending'
      });

      this.logger.info(`Match found: Lead ${lead.lead_id} -> Property ${property.external_id} (${score})`);
    }
  }

  private calculateMatchScore(lead: any, property: PropertyData): number {
    let score = 0;
    let factors = 0;

    // City match
    if (lead.city?.toLowerCase() === property.city?.toLowerCase()) {
      score += 0.3;
    }
    factors++;

    // Price match logic (simplified)
    if (property.price && lead.budget) {
      if (property.price <= lead.budget * 1.1) score += 0.3;
    }
    factors++;

    // Property Type
    if (lead.property_type && property.property_type &&
      lead.property_type.toLowerCase() === property.property_type.toLowerCase()) {
      score += 0.2;
    }
    factors++;

    return factors > 0 ? score / factors * (factors / 3) + 0.2 : 0; // weighted
  }

  private getMatchReasons(lead: any, property: PropertyData): string[] {
    const reasons = [];
    if (lead.city?.toLowerCase() === property.city?.toLowerCase()) reasons.push('Location match');
    if (property.price && lead.budget && property.price <= lead.budget) reasons.push('Within budget');
    return reasons;
  }

  private generateRecommendations(lead: any, property: PropertyData): string[] {
    return ['Schedule a viewing', 'Send to client'];
  }

  // Public API methods
  async searchProperties(tenantId: string, criteria: any): Promise<PropertyData[]> {
    // Aggregated search across all enabled adapters
    const results: PropertyData[] = [];

    const sources = criteria.sources || Array.from(this.adapters.keys());

    for (const source of sources) {
      const adapter = this.adapters.get(source);
      if (adapter && this.checkRateLimit(source)) {
        try {
          const props = await adapter.searchProperties(tenantId, criteria);
          results.push(...props);
        } catch (e) {
          this.logger.warn(`Search failed for ${source}`, e);
        }
      }
    }

    return results;
  }

  stopAllSyncs(): void {
    for (const [service, interval] of this.syncIntervals) {
      clearInterval(interval);
      this.logger.info(`Stopped ${service} sync`);
    }
    this.syncIntervals.clear();
  }

  cleanup(): void {
    this.stopAllSyncs();
    this.rateLimiters.clear();
  }
}
