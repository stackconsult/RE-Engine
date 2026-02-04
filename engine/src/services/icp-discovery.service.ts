/**
 * ICP Discovery Service - Ideal Client Profile driven discovery
 * Uses OpenCLAWD + TinyFish API + Playwright/Puppeteer for comprehensive lead discovery
 */

import { Lead, CreateLeadRequest } from '../a2d/models/lead.model';
import { LeadsRepository } from '../a2d/repositories/leads.repository';

export interface ICPProfile {
  id: string;
  name: string;
  description: string;
  criteria: {
    // Geographic criteria
    locations: {
      cities: string[];
      states: string[];
      zipCodes: string[];
      radius: number; // miles from center
    };
    
    // Investment criteria
    investment: {
      propertyTypes: string[]; // 'single_family', 'multi_family', 'commercial', 'land'
      priceRange: {
        min: number;
        max: number;
      };
      capRate: {
        min?: number;
        max?: number;
      };
      cashFlow: {
        min?: number;
        max?: number;
      };
      roi: {
        min?: number;
        max?: number;
      };
    };
    
    // Professional criteria
    professional: {
      industries: string[];
      companySize: string[]; // 'small', 'medium', 'large', 'enterprise'
      revenueRange: {
        min?: number;
        max?: number;
      };
      jobTitles: string[];
      seniority: string[]; // 'c_level', 'director', 'manager', 'individual'
    };
    
    // Behavioral criteria
    behavior: {
      buyingSignals: string[];
      timeline: string[]; // 'immediate', '1-3_months', '3-6_months', '6-12_months'
      budgetRange: {
        min?: number;
        max?: number;
      };
      decisionMaker: boolean;
      experience: string[]; // 'beginner', 'intermediate', 'advanced', 'expert'
    };
    
    // Platform targeting
    platforms: {
      linkedin: boolean;
      zillow: boolean;
      realtor: boolean;
      craigslist: boolean;
      facebook: boolean;
      instagram: boolean;
      twitter: boolean;
      customSites: string[];
    };
  };
  
  // Discovery settings
  settings: {
    maxLeadsPerDay: number;
    discoveryFrequency: string; // 'hourly', 'daily', 'weekly'
    confidenceThreshold: number; // 0-1
    excludeDuplicates: boolean;
    enrichmentEnabled: boolean;
  };
}

export interface DiscoveryTarget {
  platform: string;
  url: string;
  searchType: 'location' | 'keyword' | 'profile' | 'listing';
  query: string;
  filters: Record<string, any>;
  selectors: {
    container: string;
    title: string;
    contact: string;
    location: string;
    description?: string;
    metadata?: Record<string, string>;
  };
  rateLimit: {
    delay: number; // ms between requests
    maxRequests: number; // per hour
  };
}

export interface DiscoveredLead {
  id: string;
  platform: string;
  url: string;
  profile: {
    name: string;
    title?: string;
    company?: string;
    email?: string;
    phone?: string;
    location?: string;
    description?: string;
    linkedinUrl?: string;
    socialProfiles?: Record<string, string>;
  };
  property?: {
    address?: string;
    price?: number;
    type?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    capRate?: number;
    cashFlow?: number;
  };
  metadata: {
    icpMatch: number; // 0-1 how well matches ICP
    confidence: number; // 0-1 data quality
    discoveryTime: string;
    duplicate: boolean;
    enrichmentData?: any;
  };
}

export interface ICPDiscoveryResult {
  success: boolean;
  icpId: string;
  leads: DiscoveredLead[];
  summary: {
    totalFound: number;
    duplicatesRemoved: number;
    highConfidence: number;
    platforms: Record<string, number>;
    avgMatchScore: number;
  };
  processingTime: number;
  errors: string[];
}

/**
 * ICP Discovery Service
 * Discovers leads based on Ideal Client Profile using multiple platforms
 */
export class ICPDiscoveryService {
  private leadsRepo: LeadsRepository;
  private tinyfishEndpoint: string;
  private playwrightEndpoint: string;

  constructor(dataDir: string) {
    this.leadsRepo = new LeadsRepository({ dataDir });
    this.tinyfishEndpoint = 'https://api.tinyfish.io/v1/scrape';
    this.playwrightEndpoint = 'http://localhost:4000'; // Playwright MCP server
  }

  /**
   * Discover leads based on ICP profile
   */
  async discoverByICP(icp: ICPProfile): Promise<ICPDiscoveryResult> {
    const startTime = Date.now();
    const leads: DiscoveredLead[] = [];
    const errors: string[] = [];
    const platformCounts: Record<string, number> = {};

    try {
      // Generate discovery targets based on ICP
      const targets = this.generateDiscoveryTargets(icp);
      
      // Discover leads from each target
      for (const target of targets) {
        try {
          const platformLeads = await this.discoverFromTarget(target, icp);
          leads.push(...platformLeads);
          platformCounts[target.platform] = platformLeads.length;
          
          // Rate limiting
          await this.delay(target.rateLimit.delay);
        } catch (error) {
          errors.push(`Failed to discover from ${target.platform}: ${error}`);
        }
      }

      // Process and filter results
      const processedLeads = await this.processDiscoveredLeads(leads, icp);
      
      return {
        success: true,
        icpId: icp.id,
        leads: processedLeads,
        summary: {
          totalFound: leads.length,
          duplicatesRemoved: leads.length - processedLeads.length,
          highConfidence: processedLeads.filter(l => l.confidence > 0.8).length,
          platforms: platformCounts,
          avgMatchScore: processedLeads.reduce((sum, l) => sum + l.icpMatch, 0) / processedLeads.length || 0
        },
        processingTime: Date.now() - startTime,
        errors
      };
    } catch (error) {
      return {
        success: false,
        icpId: icp.id,
        leads: [],
        summary: {
          totalFound: 0,
          duplicatesRemoved: 0,
          highConfidence: 0,
          platforms: {},
          avgMatchScore: 0
        },
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Generate discovery targets from ICP
   */
  private generateDiscoveryTargets(icp: ICPProfile): DiscoveryTarget[] {
    const targets: DiscoveryTarget[] = [];

    // LinkedIn targets (professional profiles)
    if (icp.platforms.linkedin) {
      for (const city of icp.criteria.locations.cities) {
        for (const industry of icp.professional.industries) {
          targets.push({
            platform: 'linkedin',
            url: `https://www.linkedin.com/search/results/people/`,
            searchType: 'profile',
            query: `${industry} ${city}`,
            filters: {
                geoUrn: `urn:li:geo:${city}`,
                industry: industry,
                currentCompany: icp.professional.companySize
              },
            selectors: {
              container: '.search-result__item',
              title: '.entity-result__title-text',
              contact: '.entity-result__primary-subtitle',
              location: '.entity-result__secondary-subtitle',
              description: '.entity-result__summary'
            },
            rateLimit: { delay: 2000, maxRequests: 100 }
          });
        }
      }
    }

    // Zillow targets (property listings)
    if (icp.platforms.zillow) {
      for (const city of icp.criteria.locations.cities) {
        targets.push({
          platform: 'zillow',
          url: `https://www.zillow.com/${city.toLowerCase()}/`,
          searchType: 'listing',
          query: `${city} ${icp.investment.propertyTypes.join(' ')}`,
          filters: {
            price_min: icp.investment.priceRange.min,
            price_max: icp.investment.priceRange.max,
            home_type: icp.investment.propertyTypes
          },
          selectors: {
            container: 'article[data-test-id="property-card"]',
            title: 'address',
            contact: '.list-card-contact',
            location: '.list-card-location',
            description: '.list-card-details'
          },
          rateLimit: { delay: 1000, maxRequests: 200 }
        });
      }
    }

    // Realtor.com targets
    if (icp.platforms.realtor) {
      for (const city of icp.criteria.locations.cities) {
        targets.push({
          platform: 'realtor',
          url: `https://www.realtor.com/realestateandhomesearch/${city.toLowerCase()}`,
          searchType: 'listing',
          query: `${city} real estate`,
          filters: {
            price_min: icp.investment.priceRange.min,
            price_max: icp.investment.priceRange.max,
            property_type: icp.investment.propertyTypes
          },
          selectors: {
            container: '.component-property-card',
            title: '.property-address',
            contact: '.property-agent',
            location: '.property-location',
            description: '.property-description'
          },
          rateLimit: { delay: 1500, maxRequests: 150 }
        });
      }
    }

    // Craigslist targets
    if (icp.platforms.craigslist) {
      for (const city of icp.criteria.locations.cities) {
        targets.push({
          platform: 'craigslist',
          url: `https://www.craigslist.org/search/rea?query=${encodeURIComponent(city + ' ' + icp.investment.propertyTypes.join(' '))}`,
          searchType: 'listing',
          query: `${city} real estate`,
          filters: {
            min_price: icp.investment.priceRange.min,
            max_price: icp.investment.priceRange.max
          },
          selectors: {
            container: '.result-row',
            title: '.result-title',
            contact: '.result-contact',
            location: '.result-hood',
            description: '.result-info'
          },
          rateLimit: { delay: 500, maxRequests: 500 }
        });
      }
    }

    // Facebook Marketplace targets
    if (icp.platforms.facebook) {
      for (const city of icp.criteria.locations.cities) {
        targets.push({
          platform: 'facebook',
          url: `https://www.facebook.com/marketplace/search?query=${encodeURIComponent(city + ' ' + icp.investment.propertyTypes.join(' '))}`,
          searchType: 'listing',
          query: `${city} property`,
          filters: {
            min_price: icp.investment.priceRange.min,
            max_price: icp.investment.priceRange.max
          },
          selectors: {
            container: '[data-testid="marketplace-search-result"]',
            title: '[data-testid="marketplace-search-result__title"]',
            contact: '[data-testid="marketplace-search-result__seller"]',
            location: '[data-testid="marketplace-search-result__location"]',
            description: '[data-testid="marketplace-search-result__description"]'
          },
          rateLimit: { delay: 3000, maxRequests: 100 }
        });
      }
    }

    return targets;
  }

  /**
   * Discover leads from a specific target
   */
  private async discoverFromTarget(target: DiscoveryTarget, icp: ICPProfile): Promise<DiscoveredLead[]> {
    const leads: DiscoveredLead[] = [];

    try {
      // Use TinyFish API for simple scraping
      if (target.platform === 'craigslist' || target.platform === 'facebook') {
        const tinyfishLeads = await this.scrapeWithTinyfish(target, icp);
        leads.push(...tinyfishLeads);
      } 
      // Use Playwright for complex platforms (LinkedIn, etc.)
      else if (target.platform === 'linkedin') {
        const playwrightLeads = await this.scrapeWithPlaywright(target, icp);
        leads.push(...playwrightLeads);
      }
      // Use TinyFish for standard websites
      else {
        const standardLeads = await this.scrapeWithTinyfish(target, icp);
        leads.push(...standardLeads);
      }
    } catch (error) {
      console.error(`Error scraping ${target.platform}:`, error);
    }

    return leads;
  }

  /**
   * Scrape using TinyFish API
   */
  private async scrapeWithTinyfish(target: DiscoveryTarget, icp: ICPProfile): Promise<DiscoveredLead[]> {
    const leads: DiscoveredLead[] = [];

    try {
      const response = await fetch(this.tinyfishEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer demo-key` // Use real key in production
        },
        body: JSON.stringify({
          url: target.url,
          extract: 'text',
          selector: target.selectors.container,
          options: {
            wait: 2000,
            timeout: 10000,
            javascript: target.platform === 'facebook' // Enable JS for dynamic content
          }
        })
      });

      if (!response.ok) {
        throw new Error(`TinyFish API error: ${response.status}`);
      }

      const data = await response.json();
      const extractedData = this.parseTinyfishResults(data.content, target, icp);
      leads.push(...extractedData);
    } catch (error) {
      console.error('TinyFish scraping failed:', error);
    }

    return leads;
  }

  /**
   * Scrape using Playwright for complex platforms
   */
  private async scrapeWithPlaywright(target: DiscoveryTarget, icp: ICPProfile): Promise<DiscoveredLead[]> {
    const leads: DiscoveredLead[] = [];

    try {
      const response = await fetch(`${this.playwrightEndpoint}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target.url,
          platform: target.platform,
          selectors: target.selectors,
          waitTime: 3000,
          screenshot: false,
          extractData: true
        })
      });

      if (!response.ok) {
        throw new Error(`Playwright API error: ${response.status}`);
      }

      const data = await response.json();
      const extractedData = this.parsePlaywrightResults(data.data, target, icp);
      leads.push(...extractedData);
    } catch (error) {
      console.error('Playwright scraping failed:', error);
    }

    return leads;
  }

  /**
   * Parse TinyFish results into leads
   */
  private parseTinyfishResults(content: string, target: DiscoveryTarget, icp: ICPProfile): DiscoveredLead[] {
    const leads: DiscoveredLead[] = [];
    
    // Mock parsing - in production would parse actual HTML/text content
    const mockLeads = this.generateMockLeads(target, icp, 3);
    leads.push(...mockLeads);
    
    return leads;
  }

  /**
   * Parse Playwright results into leads
   */
  private parsePlaywrightResults(data: any, target: DiscoveryTarget, icp: ICPProfile): DiscoveredLead[] {
    const leads: DiscoveredLead[] = [];
    
    if (data && data.extracted) {
      for (const item of data.extracted) {
        const lead = this.createDiscoveredLead(item, target, icp);
        if (lead) leads.push(lead);
      }
    }
    
    return leads;
  }

  /**
   * Create discovered lead from scraped data
   */
  private createDiscoveredLead(data: any, target: DiscoveryTarget, icp: ICPProfile): DiscoveredLead | null {
    try {
      const lead: DiscoveredLead = {
        id: `icp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform: target.platform,
        url: target.url,
        profile: {
          name: data.name || 'Unknown',
          title: data.title || '',
          company: data.company || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          description: data.description || '',
          linkedinUrl: data.linkedinUrl || '',
          socialProfiles: data.socialProfiles || {}
        },
        metadata: {
          icpMatch: this.calculateICPMatch(data, icp),
          confidence: this.calculateConfidence(data),
          discoveryTime: new Date().toISOString(),
          duplicate: false
        }
      };

      // Add property data if available
      if (target.searchType === 'listing') {
        lead.property = {
          address: data.address || '',
          price: data.price || 0,
          type: data.type || '',
          beds: data.beds || 0,
          baths: data.baths || 0,
          sqft: data.sqft || 0,
          capRate: data.capRate || 0,
          cashFlow: data.cashFlow || 0
        };
      }

      return lead;
    } catch (error) {
      console.error('Error creating discovered lead:', error);
      return null;
    }
  }

  /**
   * Calculate ICP match score
   */
  private calculateICPMatch(data: any, icp: ICPProfile): number {
    let score = 0;
    let factors = 0;

    // Location match
    if (data.location) {
      factors++;
      const locationMatch = icp.criteria.locations.cities.some(city => 
        data.location.toLowerCase().includes(city.toLowerCase())
      );
      if (locationMatch) score += 0.3;
    }

    // Professional match
    if (data.title && icp.professional.jobTitles.length > 0) {
      factors++;
      const titleMatch = icp.professional.jobTitles.some(title =>
        data.title.toLowerCase().includes(title.toLowerCase())
      );
      if (titleMatch) score += 0.25;
    }

    // Investment match
    if (data.price && icp.investment.priceRange) {
      factors++;
      if (data.price >= icp.investment.priceRange.min && data.price <= icp.investment.priceRange.max) {
        score += 0.25;
      }
    }

    // Contact info quality
    if (data.email || data.phone) {
      factors++;
      score += 0.2;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate data confidence
   */
  private calculateConfidence(data: any): number {
    let confidence = 0.5; // Base confidence

    if (data.name) confidence += 0.1;
    if (data.email) confidence += 0.15;
    if (data.phone) confidence += 0.15;
    if (data.description && data.description.length > 50) confidence += 0.1;
    if (data.company) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Process discovered leads (deduplication, filtering, enrichment)
   */
  private async processDiscoveredLeads(leads: DiscoveredLead[], icp: ICPProfile): Promise<DiscoveredLead[]> {
    let processedLeads = leads;

    // Filter by confidence threshold
    processedLeads = processedLeads.filter(lead => 
      lead.confidence >= icp.settings.confidenceThreshold
    );

    // Filter by ICP match score
    processedLeads = processedLeads.filter(lead => 
      lead.icpMatch >= 0.3 // Minimum match score
    );

    // Remove duplicates
    if (icp.settings.excludeDuplicates) {
      processedLeads = await this.removeDuplicates(processedLeads);
    }

    // Sort by ICP match score and confidence
    processedLeads.sort((a, b) => {
      const scoreA = a.icpMatch * a.confidence;
      const scoreB = b.icpMatch * b.confidence;
      return scoreB - scoreA;
    });

    // Limit results
    processedLeads = processedLeads.slice(0, icp.settings.maxLeadsPerDay);

    // Enrich if enabled
    if (icp.settings.enrichmentEnabled) {
      processedLeads = await this.enrichLeads(processedLeads);
    }

    return processedLeads;
  }

  /**
   * Remove duplicate leads
   */
  private async removeDuplicates(leads: DiscoveredLead[]): Promise<DiscoveredLead[]> {
    const seen = new Set<string>();
    const uniqueLeads: DiscoveredLead[] = [];

    for (const lead of leads) {
      const key = `${lead.profile.email || lead.profile.phone || lead.profile.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLeads.push(lead);
      } else {
        lead.metadata.duplicate = true;
      }
    }

    return uniqueLeads;
  }

  /**
   * Enrich discovered leads with additional data
   */
  private async enrichLeads(leads: DiscoveredLead[]): Promise<DiscoveredLead[]> {
    for (const lead of leads) {
      try {
        // Add enrichment data
        lead.metadata.enrichmentData = {
          companyInfo: await this.getCompanyInfo(lead.profile.company),
          socialProfiles: await this.findSocialProfiles(lead.profile.name, lead.profile.location),
          propertyAnalysis: lead.property ? await this.analyzeProperty(lead.property) : null
        };
      } catch (error) {
        console.error(`Failed to enrich lead ${lead.id}:`, error);
      }
    }

    return leads;
  }

  /**
   * Get company information
   */
  private async getCompanyInfo(companyName: string): Promise<any> {
    // Mock implementation - would use real data sources
    return {
      industry: 'Real Estate',
      size: 'Medium',
      founded: '2010',
      description: 'Real estate investment company'
    };
  }

  /**
   * Find social profiles
   */
  private async findSocialProfiles(name: string, location: string): Promise<Record<string, string>> {
    // Mock implementation - would use real social search
    return {
      linkedin: `https://linkedin.com/in/${name.toLowerCase().replace(/\s/g, '')}`,
      twitter: `https://twitter.com/${name.toLowerCase().replace(/\s/g, '')}`
    };
  }

  /**
   * Analyze property
   */
  private async analyzeProperty(property: any): Promise<any> {
    // Mock implementation - would use real property analysis
    return {
      estimatedValue: property.price * 1.1,
      marketTrend: 'increasing',
      neighborhoodScore: 8.5,
      rentalYield: property.cashFlow ? (property.cashFlow / property.price) * 12 : 0
    };
  }

  /**
   * Generate mock leads for development
   */
  private generateMockLeads(target: DiscoveryTarget, icp: ICPProfile, count: number): DiscoveredLead[] {
    const leads: DiscoveredLead[] = [];
    
    for (let i = 0; i < count; i++) {
      const lead: DiscoveredLead = {
        id: `mock_${target.platform}_${Date.now()}_${i}`,
        platform: target.platform,
        url: target.url,
        profile: {
          name: `Mock Lead ${i + 1}`,
          title: icp.professional.jobTitles[0] || 'Real Estate Investor',
          company: `Mock Company ${i + 1}`,
          email: `mock${i + 1}@${target.platform}.com`,
          phone: `+1415555${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          location: icp.criteria.locations.cities[0] || 'San Francisco, CA',
          description: `Mock description for ${target.platform} lead matching ICP criteria`,
          linkedinUrl: `https://linkedin.com/in/mock${i + 1}`,
          socialProfiles: {
            linkedin: `https://linkedin.com/in/mock${i + 1}`,
            twitter: `https://twitter.com/mock${i + 1}`
          }
        },
        metadata: {
          icpMatch: 0.8 + Math.random() * 0.2,
          confidence: 0.7 + Math.random() * 0.3,
          discoveryTime: new Date().toISOString(),
          duplicate: false
        }
      };

      // Add property data for listing platforms
      if (target.searchType === 'listing') {
        lead.property = {
          address: `${Math.floor(Math.random() * 999) + 1} Main St, ${icp.criteria.locations.cities[0]}`,
          price: icp.investment.priceRange.min + Math.random() * (icp.investment.priceRange.max - icp.investment.priceRange.min),
          type: icp.investment.propertyTypes[0],
          beds: Math.floor(Math.random() * 4) + 1,
          baths: Math.floor(Math.random() * 3) + 1,
          sqft: Math.floor(Math.random() * 2000) + 1000,
          capRate: 0.05 + Math.random() * 0.1,
          cashFlow: Math.floor(Math.random() * 5000) + 1000
        };
      }

      leads.push(lead);
    }

    return leads;
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Import discovered leads into the system
   */
  async importLeads(leads: DiscoveredLead[]): Promise<number> {
    let imported = 0;

    for (const discoveredLead of leads) {
      try {
        const leadData: CreateLeadRequest = {
          first_name: discoveredLead.profile.name.split(' ')[0] || 'Unknown',
          last_name: discoveredLead.profile.name.split(' ').slice(1).join(' ') || 'Unknown',
          email: discoveredLead.profile.email,
          phone_e164: discoveredLead.profile.phone,
          city: discoveredLead.profile.location?.split(',')[0] || 'Unknown',
          province: discoveredLead.profile.location?.split(',')[1]?.trim() || 'CA',
          source: `icp_discovery_${discoveredLead.platform}`,
          tags: ['icp-discovered', discoveredLead.platform, 'auto-enriched'],
          status: 'new',
          metadata: {
            icpMatch: discoveredLead.metadata.icpMatch,
            confidence: discoveredLead.metadata.confidence,
            discoveryPlatform: discoveredLead.platform,
            discoveryUrl: discoveredLead.url,
            enrichmentData: discoveredLead.metadata.enrichmentData,
            discoveredAt: discoveredLead.metadata.discoveryTime
          }
        };

        await this.leadsRepo.create(leadData);
        imported++;
      } catch (error) {
        console.error(`Failed to import lead ${discoveredLead.id}:`, error);
      }
    }

    return imported;
  }
}
