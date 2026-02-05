/**
 * CRM Integrations Service for Phase 6
 * Integrates with Zillow, Realtor.com, and MLS systems
 */

import { Logger } from '../utils/logger';
import { UnifiedDatabaseManager } from '../database/unified-database-manager';

export interface CRMConfig {
  zillow: {
    enabled: boolean;
    apiKey: string;
    webhookUrl: string;
    syncInterval: number; // minutes
  };
  realtor: {
    enabled: boolean;
    apiKey: string;
    webhookUrl: string;
    syncInterval: number;
  };
  mls: {
    enabled: boolean;
    provider: 'rapido' | 'trestle' | 'spark';
    apiKey: string;
    endpoint: string;
    syncInterval: number;
  };
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface PropertyData {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSize: number;
  yearBuilt: number;
  propertyType: string;
  listingStatus: 'active' | 'pending' | 'sold' | 'off_market';
  daysOnMarket: number;
  description: string;
  images: string[];
  features: string[];
  agent?: {
    name: string;
    email: string;
    phone: string;
    brokerage: string;
  };
  source: 'zillow' | 'realtor' | 'mls';
  lastUpdated: Date;
}

export interface LeadMatch {
  leadId: string;
  propertyId: string;
  score: number;
  reasons: string[];
  property: PropertyData;
  recommendations: string[];
}

export class CRMIntegrationService {
  private logger: Logger;
  private config: CRMConfig;
  private dbManager: UnifiedDatabaseManager;
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: CRMConfig, dbManager: UnifiedDatabaseManager) {
    this.config = config;
    this.dbManager = dbManager;
    this.logger = new Logger('CRMIntegration', true);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing CRM integrations...');
    
    try {
      // Start sync intervals for enabled services
      if (this.config.zillow.enabled) {
        this.startZillowSync();
      }
      
      if (this.config.realtor.enabled) {
        this.startRealtorSync();
      }
      
      if (this.config.mls.enabled) {
        this.startMLSSync();
      }

      this.logger.info('CRM integrations initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CRM integrations', error);
      throw error;
    }
  }

  // Zillow integration
  private startZillowSync(): void {
    const interval = setInterval(async () => {
      try {
        await this.syncZillowData();
      } catch (error) {
        this.logger.error('Zillow sync failed', error);
      }
    }, this.config.zillow.syncInterval * 60 * 1000);

    this.syncIntervals.set('zillow', interval);
    this.logger.info('Zillow sync started');
  }

  private async syncZillowData(): Promise<void> {
    if (!this.checkRateLimit('zillow')) {
      this.logger.warn('Zillow rate limit exceeded');
      return;
    }

    try {
      // Get active leads to find matching properties
      const leads = await this.dbManager.searchLeads({
        status: 'new',
        limit: 100,
      });

      for (const lead of leads.leads) {
        if (lead.city && lead.property_address) {
          const properties = await this.searchZillowProperties(lead.city, lead.property_address);
          await this.processPropertyMatches(lead.id, properties, 'zillow');
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync Zillow data', error);
    }
  }

  private async searchZillowProperties(city: string, address?: string): Promise<PropertyData[]> {
    // Mock Zillow API call - replace with actual implementation
    await this.delay(100); // Simulate API call

    return [
      {
        id: 'zillow_1',
        address: '123 Main St',
        city: city,
        state: 'ON',
        zipCode: 'M5V 2T6',
        price: 750000,
        beds: 3,
        baths: 2,
        sqft: 1500,
        lotSize: 5000,
        yearBuilt: 2010,
        propertyType: 'House',
        listingStatus: 'active',
        daysOnMarket: 15,
        description: 'Beautiful family home in great neighborhood',
        images: ['image1.jpg', 'image2.jpg'],
        features: ['Garage', 'Basement', 'Updated Kitchen'],
        agent: {
          name: 'John Smith',
          email: 'john@realestate.com',
          phone: '416-555-0123',
          brokerage: 'Royal LePage',
        },
        source: 'zillow',
        lastUpdated: new Date(),
      },
    ];
  }

  // Realtor.com integration
  private startRealtorSync(): void {
    const interval = setInterval(async () => {
      try {
        await this.syncRealtorData();
      } catch (error) {
        this.logger.error('Realtor.com sync failed', error);
      }
    }, this.config.realtor.syncInterval * 60 * 1000);

    this.syncIntervals.set('realtor', interval);
    this.logger.info('Realtor.com sync started');
  }

  private async syncRealtorData(): Promise<void> {
    if (!this.checkRateLimit('realtor')) {
      this.logger.warn('Realtor.com rate limit exceeded');
      return;
    }

    try {
      // Similar to Zillow sync but for Realtor.com
      const leads = await this.dbManager.searchLeads({
        status: 'qualified',
        limit: 50,
      });

      for (const lead of leads.leads) {
        if (lead.city) {
          const properties = await this.searchRealtorProperties(lead.city, lead.price_range);
          await this.processPropertyMatches(lead.id, properties, 'realtor');
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync Realtor.com data', error);
    }
  }

  private async searchRealtorProperties(city: string, priceRange?: string): Promise<PropertyData[]> {
    // Mock Realtor.com API call
    await this.delay(150);

    return [
      {
        id: 'realtor_1',
        address: '456 Oak Ave',
        city: city,
        state: 'ON',
        zipCode: 'M4V 1M4',
        price: 625000,
        beds: 2,
        baths: 1,
        sqft: 1200,
        lotSize: 3000,
        yearBuilt: 2005,
        propertyType: 'Condo',
        listingStatus: 'active',
        daysOnMarket: 8,
        description: 'Modern condo with great amenities',
        images: ['condo1.jpg', 'condo2.jpg'],
        features: ['Gym', 'Pool', 'Concierge'],
        source: 'realtor',
        lastUpdated: new Date(),
      },
    ];
  }

  // MLS integration
  private startMLSSync(): void {
    const interval = setInterval(async () => {
      try {
        await this.syncMLSData();
      } catch (error) {
        this.logger.error('MLS sync failed', error);
      }
    }, this.config.mls.syncInterval * 60 * 1000);

    this.syncIntervals.set('mls', interval);
    this.logger.info('MLS sync started');
  }

  private async syncMLSData(): Promise<void> {
    if (!this.checkRateLimit('mls')) {
      this.logger.warn('MLS rate limit exceeded');
      return;
    }

    try {
      // MLS sync with more comprehensive data
      const properties = await this.searchMLSProperties({
        cities: ['Toronto', 'Vancouver', 'Montreal'],
        propertyTypes: ['House', 'Condo', 'Townhouse'],
        status: 'active',
      });

      await this.updatePropertyDatabase(properties);
    } catch (error) {
      this.logger.error('Failed to sync MLS data', error);
    }
  }

  private async searchMLSProperties(criteria: any): Promise<PropertyData[]> {
    // Mock MLS API call
    await this.delay(200);

    return [
      {
        id: 'mls_1',
        address: '789 Maple Dr',
        city: 'Toronto',
        state: 'ON',
        zipCode: 'M3H 2B5',
        price: 890000,
        beds: 4,
        baths: 3,
        sqft: 2200,
        lotSize: 6000,
        yearBuilt: 2018,
        propertyType: 'House',
        listingStatus: 'active',
        daysOnMarket: 5,
        description: 'Luxury home with modern finishes',
        images: ['luxury1.jpg', 'luxury2.jpg'],
        features: ['Smart Home', 'Pool', 'Home Theater'],
        source: 'mls',
        lastUpdated: new Date(),
      },
    ];
  }

  // Property matching and recommendations
  private async processPropertyMatches(leadId: string, properties: PropertyData[], source: string): Promise<void> {
    try {
      const lead = await this.dbManager.getLead(leadId);
      if (!lead) return;

      const matches: LeadMatch[] = [];

      for (const property of properties) {
        const score = this.calculateMatchScore(lead, property);
        if (score > 0.6) { // Only include good matches
          matches.push({
            leadId,
            propertyId: property.id,
            score,
            reasons: this.getMatchReasons(lead, property),
            property,
            recommendations: this.generateRecommendations(lead, property),
          });
        }
      }

      // Sort by score and store top matches
      matches.sort((a, b) => b.score - a.score);
      
      // Store matches in database (would need to implement this)
      await this.storePropertyMatches(matches.slice(0, 5)); // Top 5 matches

      this.logger.info(`Processed ${matches.length} property matches for lead ${leadId}`, { source });
    } catch (error) {
      this.logger.error('Failed to process property matches', error);
    }
  }

  private calculateMatchScore(lead: any, property: PropertyData): number {
    let score = 0;
    let factors = 0;

    // City match
    if (lead.city?.toLowerCase() === property.city.toLowerCase()) {
      score += 0.3;
    }
    factors++;

    // Price range match
    if (lead.price_range) {
      const priceMatch = this.checkPriceRangeMatch(lead.price_range, property.price);
      score += priceMatch * 0.25;
    }
    factors++;

    // Property type match
    if (lead.property_type?.toLowerCase() === property.propertyType.toLowerCase()) {
      score += 0.2;
    }
    factors++;

    // Bedroom/bathroom match
    if (lead.metadata?.bedrooms && property.beds >= lead.metadata.bedrooms) {
      score += 0.15;
    }
    factors++;

    // Timeline match (days on market)
    if (lead.timeline === 'urgent' && property.daysOnMarket < 30) {
      score += 0.1;
    } else if (lead.timeline === 'flexible' && property.daysOnMarket < 90) {
      score += 0.05;
    }
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  private checkPriceRangeMatch(leadPriceRange: string, propertyPrice: number): number {
    const rangeMap: Record<string, { min: number; max: number }> = {
      '300k-500k': { min: 300000, max: 500000 },
      '500k-750k': { min: 500000, max: 750000 },
      '750k-1M': { min: 750000, max: 1000000 },
      '1M+': { min: 1000000, max: Infinity },
    };

    const range = rangeMap[leadPriceRange];
    if (!range) return 0;

    if (propertyPrice >= range.min && propertyPrice <= range.max) {
      return 1; // Perfect match
    } else if (propertyPrice < range.min * 0.9 || propertyPrice > range.max * 1.1) {
      return 0; // Poor match
    } else {
      return 0.5; // Close match
    }
  }

  private getMatchReasons(lead: any, property: PropertyData): string[] {
    const reasons = [];

    if (lead.city?.toLowerCase() === property.city.toLowerCase()) {
      reasons.push(`Located in ${property.city}`);
    }

    if (this.checkPriceRangeMatch(lead.price_range, property.price) === 1) {
      reasons.push(`Price $${property.price.toLocaleString()} matches your budget`);
    }

    if (lead.property_type?.toLowerCase() === property.propertyType.toLowerCase()) {
      reasons.push(`${property.propertyType} type as requested`);
    }

    if (property.daysOnMarket < 30) {
      reasons.push('Recently listed property');
    }

    if (property.beds >= 3) {
      reasons.push(`${property.beds} bedrooms`);
    }

    return reasons;
  }

  private generateRecommendations(lead: any, property: PropertyData): string[] {
    const recommendations = [];

    if (property.daysOnMarket < 7) {
      recommendations.push('Act quickly - this property was just listed');
    }

    if (property.price > 750000) {
      recommendations.push('Consider mortgage pre-approval for this price range');
    }

    if (property.propertyType === 'Condo') {
      recommendations.push('Review condo fees and amenities');
    }

    if (property.yearBuilt > 2015) {
      recommendations.push('Modern construction with updated systems');
    }

    if (property.features.includes('Pool')) {
      recommendations.push('Great for families - includes pool');
    }

    return recommendations;
  }

  // Public API methods
  async getPropertyMatches(leadId: string): Promise<LeadMatch[]> {
    try {
      // Retrieve stored matches for the lead
      return []; // Placeholder - would fetch from database
    } catch (error) {
      this.logger.error('Failed to get property matches', error);
      throw error;
    }
  }

  async searchProperties(criteria: {
    city?: string;
    priceRange?: string;
    propertyType?: string;
    beds?: number;
    baths?: number;
    sources?: ('zillow' | 'realtor' | 'mls')[];
  }): Promise<PropertyData[]> {
    try {
      const allProperties: PropertyData[] = [];
      const sources = criteria.sources || ['zillow', 'realtor', 'mls'];

      for (const source of sources) {
        if (!this.checkRateLimit(source)) {
          this.logger.warn(`${source} rate limit exceeded`);
          continue;
        }

        let properties: PropertyData[] = [];

        switch (source) {
          case 'zillow':
            properties = await this.searchZillowProperties(criteria.city || 'Toronto');
            break;
          case 'realtor':
            properties = await this.searchRealtorProperties(criteria.city || 'Toronto', criteria.priceRange);
            break;
          case 'mls':
            properties = await this.searchMLSProperties(criteria);
            break;
        }

        allProperties.push(...properties);
      }

      // Filter results based on criteria
      return this.filterProperties(allProperties, criteria);
    } catch (error) {
      this.logger.error('Failed to search properties', error);
      throw error;
    }
  }

  private filterProperties(properties: PropertyData[], criteria: any): PropertyData[] {
    return properties.filter(property => {
      if (criteria.priceRange) {
        const priceMatch = this.checkPriceRangeMatch(criteria.priceRange, property.price);
        if (priceMatch === 0) return false;
      }

      if (criteria.propertyType && property.propertyType.toLowerCase() !== criteria.propertyType.toLowerCase()) {
        return false;
      }

      if (criteria.beds && property.beds < criteria.beds) {
        return false;
      }

      if (criteria.baths && property.baths < criteria.baths) {
        return false;
      }

      return true;
    });
  }

  // Webhook handlers
  async handleZillowWebhook(payload: any): Promise<void> {
    try {
      this.logger.info('Received Zillow webhook', payload);
      
      // Process webhook data (new listings, price changes, etc.)
      if (payload.type === 'new_listing') {
        await this.processNewListing(payload.data, 'zillow');
      } else if (payload.type === 'price_change') {
        await this.processPriceChange(payload.data, 'zillow');
      }
    } catch (error) {
      this.logger.error('Failed to handle Zillow webhook', error);
    }
  }

  async handleRealtorWebhook(payload: any): Promise<void> {
    try {
      this.logger.info('Received Realtor.com webhook', payload);
      
      if (payload.type === 'new_listing') {
        await this.processNewListing(payload.data, 'realtor');
      }
    } catch (error) {
      this.logger.error('Failed to handle Realtor.com webhook', error);
    }
  }

  private async processNewListing(listing: any, source: string): Promise<void> {
    // Find matching leads and create notifications
    const matchingLeads = await this.findLeadsForProperty(listing);
    
    for (const lead of matchingLeads) {
      await this.notifyLeadOfNewProperty(lead.id, listing, source);
    }
  }

  private async processPriceChange(listing: any, source: string): Promise<void> {
    // Find leads who have shown interest in this property
    await this.notifyLeadsOfPriceChange(listing, source);
  }

  private async findLeadsForProperty(property: any): Promise<any[]> {
    // Find leads that match this property
    return []; // Placeholder
  }

  private async notifyLeadOfNewProperty(leadId: string, property: any, source: string): Promise<void> {
    // Send notification to lead about new property
    this.logger.info(`Notifying lead ${leadId} about new ${source} property`);
  }

  private async notifyLeadsOfPriceChange(property: any, source: string): Promise<void> {
    // Notify interested leads about price change
    this.logger.info(`Notifying leads about ${source} price change`);
  }

  // Utility methods
  private checkRateLimit(service: string): boolean {
    const limiter = this.rateLimiters.get(service);
    const now = Date.now();

    if (!limiter || now > limiter.resetTime) {
      // Reset or create limiter
      this.rateLimiters.set(service, {
        count: 1,
        resetTime: now + 60000, // 1 minute window
      });
      return true;
    }

    if (limiter.count >= this.config.rateLimiting.requestsPerMinute) {
      return false;
    }

    limiter.count++;
    return true;
  }

  private async storePropertyMatches(matches: LeadMatch[]): Promise<void> {
    // Store matches in database for later retrieval
    this.logger.info(`Storing ${matches.length} property matches`);
  }

  private async updatePropertyDatabase(properties: PropertyData[]): Promise<void> {
    // Update property database with latest MLS data
    this.logger.info(`Updating property database with ${properties.length} properties`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
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
    this.logger.info('CRM integration service cleaned up');
  }
}
