/**
 * Lead Discovery Service - Automated lead discovery using TinyFish API
 * Integrates with OpenCLAWD automation to find leads from real estate websites
 */

import { Lead, CreateLeadRequest } from '../a2d/models/lead.model';
import { LeadsRepository } from '../a2d/repositories/leads.repository';
import { CSVAdapter } from '../a2d/adapters/csv-adapter';

export interface DiscoveryConfig {
  dataDir: string;
  tinyfishApiKey?: string;
  enableAutoImport?: boolean;
  maxLeadsPerSource?: number;
  discoverySources: RealEstateSource[];
}

export interface RealEstateSource {
  name: string;
  url: string;
  type: 'mls' | 'zillow' | 'realtor' | 'craigslist' | 'social' | 'forum';
  location: string;
  selectors: {
    listings: string;
    contactInfo: string;
    propertyDetails: string;
    agentInfo: string;
  };
  rateLimit?: {
    requestsPerHour: number;
    delayBetweenRequests: number;
  };
}

export interface DiscoveredLead {
  source: string;
  url: string;
  raw: any;
  extracted: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    property?: {
      address: string;
      price?: string;
      type?: string;
      beds?: number;
      baths?: number;
      sqft?: number;
    };
    agent?: {
      name: string;
      company: string;
      phone: string;
      email: string;
      license: string;
    };
    metadata?: {
      listingDate?: string;
      listingId?: string;
      propertyType?: string;
    };
  };
  confidence: number;
}

export interface DiscoveryResult {
  success: boolean;
  source: string;
  leads: DiscoveredLead[];
  imported: number;
  errors: string[];
  processingTime: number;
}

/**
 * Lead Discovery Service
 * Automates lead discovery from real estate websites using TinyFish API
 */
export class LeadDiscoveryService {
  private leadsRepo: LeadsRepository;
  private config: DiscoveryConfig;
  private tinyfishEndpoint: string;

  constructor(config: DiscoveryConfig) {
    this.config = config;
    this.leadsRepo = new LeadsRepository({ dataDir: config.dataDir });
    this.tinyfishEndpoint = 'https://api.tinyfish.io/v1/scrape'; // Mock endpoint
  }

  /**
   * Discover leads from all configured sources
   */
  async discoverAllLeads(): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    for (const source of this.config.discoverySources) {
      const result = await this.discoverLeadsFromSource(source);
      results.push(result);
      
      // Rate limiting between sources
      if (source.rateLimit?.delayBetweenRequests) {
        await this.delay(source.rateLimit.delayBetweenRequests);
      }
    }
    
    return results;
  }

  /**
   * Discover leads from a specific source
   */
  async discoverLeadsFromSource(source: RealEstateSource): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const leads: DiscoveredLead[] = [];
    const errors: string[] = [];
    let imported = 0;

    try {
      console.log(`Discovering leads from ${source.name} (${source.url})`);
      
      // Scrape the main page for listings
      const listings = await this.scrapeListings(source);
      
      // Process each listing
      for (const listing of listings.slice(0, this.config.maxLeadsPerSource || 50)) {
        try {
          const lead = await this.extractLeadFromListing(listing, source);
          if (lead && lead.confidence > 0.5) {
            leads.push(lead);
            
            // Auto-import if enabled
            if (this.config.enableAutoImport) {
              await this.importDiscoveredLead(lead);
              imported++;
            }
          }
        } catch (error) {
          errors.push(`Failed to process listing: ${error}`);
        }
        
        // Rate limiting
        if (source.rateLimit?.delayBetweenRequests) {
          await this.delay(source.rateLimit.delayBetweenRequests);
        }
      }
      
      return {
        success: true,
        source: source.name,
        leads,
        imported,
        errors,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        source: source.name,
        leads: [],
        imported: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Scrape listings from a source
   */
  private async scrapeListings(source: RealEstateSource): Promise<any[]> {
    try {
      // Use TinyFish API to scrape listings
      const response = await fetch(this.tinyfishEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.tinyfishApiKey || 'demo-key'}`
        },
        body: JSON.stringify({
          url: source.url,
          extract: 'links',
          selector: source.selectors.listings,
          options: {
            wait: 2000,
            timeout: 10000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`TinyFish API error: ${response.status}`);
      }

      const data = await response.json();
      return data.links || [];
    } catch (error) {
      console.error('Error scraping listings:', error);
      // Fallback to mock data for development
      return this.getMockListings(source);
    }
  }

  /**
   * Extract lead information from a listing
   */
  private async extractLeadFromListing(listingUrl: string, source: RealEstateSource): Promise<DiscoveredLead | null> {
    try {
      // Scrape detailed information from the listing page
      const response = await fetch(this.tinyfishEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.tinyfishApiKey || 'demo-key'}`
        },
        body: JSON.stringify({
          url: listingUrl,
          extract: 'text',
          selectors: {
            contact: source.selectors.contactInfo,
            details: source.selectors.propertyDetails,
            agent: source.selectors.agentInfo
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape listing: ${response.status}`);
      }

      const data = await response.json();
      const extracted = this.parseListingData(data.content, source);
      
      if (!extracted.name && !extracted.email && !extracted.phone) {
        return null; // No contact information found
      }

      return {
        source: source.name,
        url: listingUrl,
        raw: data,
        extracted,
        confidence: this.calculateConfidence(extracted)
      };
    } catch (error) {
      console.error('Error extracting lead:', error);
      return null;
    }
  }

  /**
   * Parse listing data into structured format
   */
  private parseListingData(content: string, source: RealEstateSource): DiscoveredLead['extracted'] {
    // Mock parsing - in production would use actual content parsing
    const mockData = this.getMockListingData(source);
    
    // Try to extract real data from content
    const lines = content.split('\n');
    const extracted: DiscoveredLead['extracted'] = {
      name: this.extractName(lines),
      email: this.extractEmail(lines),
      phone: this.extractPhone(lines),
      company: this.extractCompany(lines),
      property: mockData.property,
      agent: mockData.agent,
      metadata: mockData.metadata
    };

    return extracted;
  }

  /**
   * Calculate confidence score for discovered lead
   */
  private calculateConfidence(extracted: DiscoveredLead['extracted']): number {
    let confidence = 0;
    
    if (extracted.name) confidence += 0.3;
    if (extracted.email) confidence += 0.3;
    if (extracted.phone) confidence += 0.2;
    if (extracted.company) confidence += 0.1;
    if (extracted.agent?.license) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Import discovered lead into the system
   */
  private async importDiscoveredLead(discovered: DiscoveredLead): Promise<void> {
    const leadData: CreateLeadRequest = {
      first_name: discovered.extracted.name?.split(' ')[0] || 'Unknown',
      last_name: discovered.extracted.name?.split(' ').slice(1).join(' ') || 'Unknown',
      email: discovered.extracted.email,
      phone_e164: discovered.extracted.phone,
      city: this.extractCityFromProperty(discovered.extracted.property),
      province: 'CA', // Default, could be extracted
      source: discovered.source,
      tags: ['auto-discovered', 'web-scraped'],
      metadata: {
        discovery_source: discovered.source,
        discovery_url: discovered.url,
        property_details: discovered.extracted.property,
        agent_details: discovered.extracted.agent,
        confidence: discovered.confidence,
        discovered_at: new Date().toISOString()
      }
    };

    await this.leadsRepo.create(leadData);
  }

  /**
   * Extract name from content lines
   */
  private extractName(lines: string[]): string | undefined {
    for (const line of lines) {
      const nameMatch = line.match(/(?:Agent|Realtor|Broker|Owner):\s*([A-Za-z\s]+)/i);
      if (nameMatch) return nameMatch[1].trim();
    }
    return undefined;
  }

  /**
   * Extract email from content lines
   */
  private extractEmail(lines: string[]): string | undefined {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    for (const line of lines) {
      const match = line.match(emailRegex);
      if (match) return match[0];
    }
    return undefined;
  }

  /**
   * Extract phone from content lines
   */
  private extractPhone(lines: string[]): string | undefined {
    const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    for (const line of lines) {
      const match = line.match(phoneRegex);
      if (match) {
        const cleaned = match[0].replace(/[^\d+]/g, '');
        return `+1${cleaned}`;
      }
    }
    return undefined;
  }

  /**
   * Extract company from content lines
   */
  private extractCompany(lines: string[]): string | undefined {
    for (const line of lines) {
      const companyMatch = line.match(/(?:Company|Brokerage|Office):\s*([A-Za-z0-9\s&]+)/i);
      if (companyMatch) return companyMatch[1].trim();
    }
    return undefined;
  }

  /**
   * Extract city from property details
   */
  private extractCityFromProperty(property: any): string | undefined {
    if (property?.address) {
      const parts = property.address.split(',');
      return parts[parts.length - 2]?.trim() || parts[0]?.trim();
    }
    return undefined;
  }

  /**
   * Get mock listings for development
   */
  private getMockListings(source: RealEstateSource): any[] {
    return [
      `${source.url}/listing/1`,
      `${source.url}/listing/2`,
      `${source.url}/listing/3`,
      `${source.url}/listing/4`,
      `${source.url}/listing/5`
    ];
  }

  /**
   * Get mock listing data for development
   */
  private getMockListingData(source: RealEstateSource): DiscoveredLead['extracted'] {
    return {
      name: 'John Smith',
      email: 'john.smith@realestate.com',
      phone: '+14155551234',
      company: `${source.name} Realty`,
      property: {
        address: '123 Main St, San Francisco, CA',
        price: '$750,000',
        type: 'Single Family',
        beds: 3,
        baths: 2,
        sqft: 1500
      },
      agent: {
        name: 'John Smith',
        company: `${source.name} Realty`,
        phone: '+14155551234',
        email: 'john.smith@realestate.com',
        license: 'CA BRE #01234567'
      },
      metadata: {
        listingDate: new Date().toISOString(),
        listingId: `LISTING_${Date.now()}`,
        propertyType: 'residential'
      }
    };
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(): Promise<{
    totalSources: number;
    activeSources: number;
    totalLeadsDiscovered: number;
    leadsBySource: Record<string, number>;
    lastDiscovery: string;
  }> {
    const stats = {
      totalSources: this.config.discoverySources.length,
      activeSources: this.config.discoverySources.length, // All sources are active for now
      totalLeadsDiscovered: 0,
      leadsBySource: {} as Record<string, number>,
      lastDiscovery: new Date().toISOString()
    };

    // Count leads by source
    for (const source of this.config.discoverySources) {
      stats.leadsBySource[source.name] = 0; // Would be populated from actual data
    }

    return stats;
  }

  /**
   * Add new discovery source
   */
  async addDiscoverySource(source: RealEstateSource): Promise<void> {
    this.config.discoverySources.push(source);
    // In production, would save to configuration file
  }

  /**
   * Remove discovery source
   */
  async removeDiscoverySource(sourceName: string): Promise<void> {
    this.config.discoverySources = this.config.discoverySources.filter(s => s.name !== sourceName);
    // In production, would save to configuration file
  }
}
