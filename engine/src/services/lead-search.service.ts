/**
 * Lead Search Service - Advanced lead search and filtering
 * Follows RE Engine safety invariants and production rules
 */

import { Lead, LeadFilter } from '../a2d/models/lead.model';
import { CSVAdapter } from '../a2d/adapters/csv-adapter';

export interface SearchConfig {
  dataDir: string;
  enableFuzzySearch?: boolean;
  maxResults?: number;
}

export interface SearchQuery {
  text?: string;
  filters?: {
    status?: string[];
    source?: string[];
    city?: string[];
    province?: string[];
    tags?: string[];
    dateRange?: {
      from?: string;
      to?: string;
    };
    hasEmail?: boolean;
    hasPhone?: boolean;
    grade?: string[];
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    offset: number;
    limit: number;
  };
}

export interface SearchResult {
  leads: Lead[];
  total: number;
  facets: {
    statuses: Record<string, number>;
    sources: Record<string, number>;
    cities: Record<string, number>;
    provinces: Record<string, number>;
    tags: Record<string, number>;
  };
  suggestions?: string[];
  processing_time: number;
}

export interface LeadSearchResult extends Lead {
  score?: number;
  highlights?: Record<string, string[]>;
  grade?: string;
  enrichment_available?: boolean;
}

/**
 * Lead Search Service
 * Provides advanced search capabilities for leads
 */
export class LeadSearchService {
  private csv: CSVAdapter;
  private config: SearchConfig;

  constructor(config: SearchConfig) {
    this.config = config;
    this.csv = new CSVAdapter({
      dataDir: config.dataDir,
      encoding: 'utf8'
    });
  }

  /**
   * Search leads with advanced filtering
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      // Get all leads
      const leadsResult = await this.csv.read<any>('leads.csv');
      if (!leadsResult.success) {
        throw new Error('Failed to read leads data');
      }

      let leads = leadsResult.records.map(this.mapToLead);
      
      // Apply filters
      leads = this.applyFilters(leads, query.filters || {});
      
      // Apply text search
      if (query.text) {
        leads = this.applyTextSearch(leads, query.text);
      }
      
      // Apply sorting
      if (query.sort) {
        leads = this.applySorting(leads, query.sort);
      }
      
      // Apply pagination
      const total = leads.length;
      if (query.pagination) {
        const { offset, limit } = query.pagination;
        leads = leads.slice(offset, offset + limit);
      }
      
      // Limit results
      if (this.config.maxResults && leads.length > this.config.maxResults) {
        leads = leads.slice(0, this.config.maxResults);
      }
      
      // Generate facets
      const facets = await this.generateFacets(leadsResult.records);
      
      // Generate suggestions
      const suggestions = query.text ? this.generateSuggestions(query.text) : undefined;
      
      return {
        leads,
        total,
        facets,
        suggestions,
        processing_time: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Quick search by name, email, or phone
   */
  async quickSearch(searchTerm: string): Promise<LeadSearchResult[]> {
    const query: SearchQuery = {
      text: searchTerm,
      pagination: { offset: 0, limit: 20 }
    };
    
    const result = await this.search(query);
    
    return result.leads.map(lead => ({
      ...lead,
      score: this.calculateRelevanceScore(lead, searchTerm),
      highlights: this.generateHighlights(lead, searchTerm)
    }));
  }

  /**
   * Get similar leads based on a reference lead
   */
  async findSimilarLeads(leadId: string, limit: number = 10): Promise<LeadSearchResult[]> {
    // Get the reference lead
    const leadsResult = await this.csv.read<any>('leads.csv');
    if (!leadsResult.success) {
      throw new Error('Failed to read leads data');
    }

    const referenceLead = leadsResult.records.find(l => l.lead_id === leadId);
    if (!referenceLead) {
      throw new Error('Reference lead not found');
    }

    // Find similar leads based on various criteria
    const similarLeads: LeadSearchResult[] = [];
    
    for (const leadRecord of leadsResult.records) {
      if (leadRecord.lead_id === leadId) continue;
      
      const lead = this.mapToLead(leadRecord);
      const similarity = this.calculateSimilarity(referenceLead, leadRecord);
      
      if (similarity > 0.3) { // Similarity threshold
        similarLeads.push({
          ...lead,
          score: similarity * 100,
          highlights: this.generateSimilarityHighlights(referenceLead, leadRecord)
        });
      }
    }
    
    // Sort by similarity score and limit results
    return similarLeads
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }

  /**
   * Get lead suggestions for autocomplete
   */
  async getSuggestions(partial: string, limit: number = 10): Promise<string[]> {
    const leadsResult = await this.csv.read<any>('leads.csv');
    if (!leadsResult.success) {
      return [];
    }

    const suggestions = new Set<string>();
    const lowerPartial = partial.toLowerCase();
    
    for (const lead of leadsResult.records) {
      // Name suggestions
      const fullName = `${lead.first_name} ${lead.last_name}`;
      if (fullName.toLowerCase().includes(lowerPartial)) {
        suggestions.add(fullName);
      }
      
      // Email suggestions
      if (lead.email && lead.email.toLowerCase().includes(lowerPartial)) {
        suggestions.add(lead.email);
      }
      
      // City suggestions
      if (lead.city && lead.city.toLowerCase().includes(lowerPartial)) {
        suggestions.add(lead.city);
      }
      
      // Tag suggestions
      if (lead.tags) {
        const tags = lead.tags.split(',').map((tag: string) => tag.trim());
        for (const tag of tags) {
          if (tag.toLowerCase().includes(lowerPartial)) {
            suggestions.add(tag);
          }
        }
      }
    }
    
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Apply filters to leads
   */
  private applyFilters(leads: Lead[], filters: any): Lead[] {
    return leads.filter(lead => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(lead.status)) return false;
      }
      
      // Source filter
      if (filters.source && filters.source.length > 0) {
        if (!filters.source.includes(lead.source)) return false;
      }
      
      // City filter
      if (filters.city && filters.city.length > 0) {
        if (!lead.city || !filters.city.includes(lead.city)) return false;
      }
      
      // Province filter
      if (filters.province && filters.province.length > 0) {
        if (!lead.province || !filters.province.includes(lead.province)) return false;
      }
      
      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const leadTags = lead.tags || [];
        const hasMatchingTag = filters.tags.some((tag: string) => leadTags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      
      // Date range filter
      if (filters.dateRange) {
        const createdDate = new Date(lead.created_at);
        if (filters.dateRange.from && createdDate < new Date(filters.dateRange.from)) return false;
        if (filters.dateRange.to && createdDate > new Date(filters.dateRange.to)) return false;
      }
      
      // Email filter
      if (filters.hasEmail !== undefined) {
        if (filters.hasEmail && !lead.email) return false;
        if (!filters.hasEmail && lead.email) return false;
      }
      
      // Phone filter
      if (filters.hasPhone !== undefined) {
        if (filters.hasPhone && !lead.phone_e164) return false;
        if (!filters.hasPhone && lead.phone_e164) return false;
      }
      
      return true;
    });
  }

  /**
   * Apply text search to leads
   */
  private applyTextSearch(leads: Lead[], searchText: string): Lead[] {
    const lowerSearchText = searchText.toLowerCase();
    
    return leads
      .map(lead => ({
        lead,
        score: this.calculateRelevanceScore(lead, searchText)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.lead);
  }

  /**
   * Calculate relevance score for text search
   */
  private calculateRelevanceScore(lead: Lead, searchText: string): number {
    const lowerSearchText = searchText.toLowerCase();
    let score = 0;
    
    // Name matching (highest weight)
    const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
    if (fullName.includes(lowerSearchText)) {
      score += 100;
      if (fullName === lowerSearchText) score += 50; // Exact match bonus
    }
    
    // Email matching
    if (lead.email && lead.email.toLowerCase().includes(lowerSearchText)) {
      score += 80;
      if (lead.email.toLowerCase() === lowerSearchText) score += 30;
    }
    
    // Phone matching
    if (lead.phone_e164 && lead.phone_e164.includes(searchText)) {
      score += 70;
    }
    
    // City matching
    if (lead.city && lead.city.toLowerCase().includes(lowerSearchText)) {
      score += 40;
    }
    
    // Tags matching
    if (lead.tags) {
      for (const tag of lead.tags) {
        if (tag.toLowerCase().includes(lowerSearchText)) {
          score += 30;
        }
      }
    }
    
    return score;
  }

  /**
   * Apply sorting to leads
   */
  private applySorting(leads: Lead[], sort: { field: string; direction: 'asc' | 'desc' }): Lead[] {
    return leads.sort((a, b) => {
      const aValue = this.getFieldValue(a, sort.field);
      const bValue = this.getFieldValue(b, sort.field);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get field value for sorting
   */
  private getFieldValue(lead: Lead, field: string): string {
    switch (field) {
      case 'first_name': return lead.first_name;
      case 'last_name': return lead.last_name;
      case 'email': return lead.email || '';
      case 'city': return lead.city || '';
      case 'province': return lead.province || '';
      case 'source': return lead.source;
      case 'status': return lead.status;
      case 'created_at': return lead.created_at;
      case 'updated_at': return lead.updated_at;
      default: return '';
    }
  }

  /**
   * Generate search facets
   */
  private async generateFacets(leads: any[]): {
    statuses: Record<string, number>;
    sources: Record<string, number>;
    cities: Record<string, number>;
    provinces: Record<string, number>;
    tags: Record<string, number>;
  } {
    const facets = {
      statuses: {} as Record<string, number>,
      sources: {} as Record<string, number>,
      cities: {} as Record<string, number>,
      provinces: {} as Record<string, number>,
      tags: {} as Record<string, number>
    };
    
    for (const lead of leads) {
      // Status facets
      if (lead.status) {
        facets.statuses[lead.status] = (facets.statuses[lead.status] || 0) + 1;
      }
      
      // Source facets
      if (lead.source) {
        facets.sources[lead.source] = (facets.sources[lead.source] || 0) + 1;
      }
      
      // City facets
      if (lead.city) {
        facets.cities[lead.city] = (facets.cities[lead.city] || 0) + 1;
      }
      
      // Province facets
      if (lead.province) {
        facets.provinces[lead.province] = (facets.provinces[lead.province] || 0) + 1;
      }
      
      // Tag facets
      if (lead.tags) {
        const tags = lead.tags.split(',').map((tag: string) => tag.trim());
        for (const tag of tags) {
          if (tag) {
            facets.tags[tag] = (facets.tags[tag] || 0) + 1;
          }
        }
      }
    }
    
    return facets;
  }

  /**
   * Generate search suggestions
   */
  private generateSuggestions(searchText: string): string[] {
    // Simple suggestion generation - could be enhanced with more sophisticated algorithms
    const suggestions = [
      `Try searching for "${searchText}*"`,
      `Check for typos in "${searchText}"`,
      `Search by email: ${searchText}@`,
      `Search by name: ${searchText} `
    ];
    
    return suggestions.slice(0, 3);
  }

  /**
   * Generate highlights for search results
   */
  private generateHighlights(lead: Lead, searchText: string): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    const lowerSearchText = searchText.toLowerCase();
    
    // Name highlights
    const fullName = `${lead.first_name} ${lead.last_name}`;
    if (fullName.toLowerCase().includes(lowerSearchText)) {
      highlights.name = [this.highlightText(fullName, searchText)];
    }
    
    // Email highlights
    if (lead.email && lead.email.toLowerCase().includes(lowerSearchText)) {
      highlights.email = [this.highlightText(lead.email, searchText)];
    }
    
    return highlights;
  }

  /**
   * Highlight text matching search term
   */
  private highlightText(text: string, searchText: string): string {
    const regex = new RegExp(`(${searchText})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Calculate similarity between two leads
   */
  private calculateSimilarity(lead1: any, lead2: any): number {
    let similarity = 0;
    let factors = 0;
    
    // City similarity
    if (lead1.city && lead2.city && lead1.city === lead2.city) {
      similarity += 0.3;
    }
    factors++;
    
    // Province similarity
    if (lead1.province && lead2.province && lead1.province === lead2.province) {
      similarity += 0.2;
    }
    factors++;
    
    // Source similarity
    if (lead1.source && lead2.source && lead1.source === lead2.source) {
      similarity += 0.2;
    }
    factors++;
    
    // Status similarity
    if (lead1.status && lead2.status && lead1.status === lead2.status) {
      similarity += 0.15;
    }
    factors++;
    
    // Tag similarity
    if (lead1.tags && lead2.tags) {
      const tags1 = lead1.tags.split(',').map((tag: string) => tag.trim());
      const tags2 = lead2.tags.split(',').map((tag: string) => tag.trim());
      const commonTags = tags1.filter((tag: string) => tags2.includes(tag));
      if (commonTags.length > 0) {
        similarity += 0.15 * (commonTags.length / Math.max(tags1.length, tags2.length));
      }
    }
    factors++;
    
    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Generate similarity highlights
   */
  private generateSimilarityHighlights(lead1: any, lead2: any): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    
    if (lead1.city && lead2.city && lead1.city === lead2.city) {
      highlights.location = [`Same city: ${lead1.city}`];
    }
    
    if (lead1.source && lead2.source && lead1.source === lead2.source) {
      highlights.source = [`Same source: ${lead1.source}`];
    }
    
    return highlights;
  }

  /**
   * Map CSV record to Lead object
   */
  private mapToLead(record: any): Lead {
    return {
      lead_id: record.lead_id,
      first_name: record.first_name,
      last_name: record.last_name,
      email: record.email || undefined,
      phone_e164: record.phone_e164 || undefined,
      city: record.city || undefined,
      province: record.province || undefined,
      source: record.source,
      tags: record.tags ? record.tags.split(',').map((tag: string) => tag.trim()) : [],
      status: record.status as Lead['status'],
      created_at: record.created_at,
      updated_at: record.updated_at,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
      last_contacted_at: record.last_contacted_at || undefined,
      contact_count: record.contact_count ? parseInt(record.contact_count) : 0
    };
  }
}
