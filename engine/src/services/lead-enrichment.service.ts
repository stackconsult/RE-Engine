/**
 * Lead Enrichment Service - Data enrichment and grading for leads
 * Follows RE Engine safety invariants and production rules
 */

import { Lead } from '../a2d/models/lead.model';
import { CSVAdapter } from '../a2d/adapters/csv-adapter';

export interface EnrichmentConfig {
  dataDir: string;
  enableExternalAPIs?: boolean;
  enrichmentProviders?: {
    clearbit?: boolean;
    hunter?: boolean;
    linkedin?: boolean;
    crunchbase?: boolean;
  };
}

export interface EnrichmentData {
  company?: {
    name: string;
    domain: string;
    industry: string;
    size: string;
    revenue?: string;
    description?: string;
    founded?: string;
    location?: string;
  };
  professional?: {
    title: string;
    seniority: string;
    department: string;
    company_size?: string;
    linkedin_url?: string;
    experience_years?: number;
  };
  contact?: {
    email_verified: boolean;
    phone_verified: boolean;
    social_profiles?: Record<string, string>;
    alternative_emails?: string[];
  };
  intent?: {
    buying_signals: string[];
    timeline: string;
    budget_range?: string;
    decision_maker: boolean;
    tech_stack?: string[];
  };
  metadata?: {
    enrichment_sources: string[];
    confidence_score: number;
    last_enriched: string;
    data_freshness: string;
  };
}

export interface LeadGrade {
  overall_score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    contact_quality: number;
    data_completeness: number;
    intent_signals: number;
    market_fit: number;
    engagement_potential: number;
  };
  reasoning: string[];
  recommendations: string[];
  next_actions: string[];
}

export interface EnrichmentResult {
  success: boolean;
  lead_id: string;
  enrichment_data?: EnrichmentData;
  grade?: LeadGrade;
  error?: string;
  processing_time: number;
}

/**
 * Lead Enrichment Service
 * Handles data enrichment, grading, and lead scoring
 */
export class LeadEnrichmentService {
  private csv: CSVAdapter;
  private config: EnrichmentConfig;

  constructor(config: EnrichmentConfig) {
    this.config = config;
    this.csv = new CSVAdapter({
      dataDir: config.dataDir,
      encoding: 'utf8'
    });
  }

  /**
   * Enrich a single lead with additional data
   */
  async enrichLead(leadId: string): Promise<EnrichmentResult> {
    const startTime = Date.now();
    
    try {
      // Get lead data
      const leadResult = await this.csv.read<any>('leads.csv');
      if (!leadResult.success) {
        return {
          success: false,
          lead_id: leadId,
          error: 'Failed to read leads data',
          processing_time: Date.now() - startTime
        };
      }

      const lead = leadResult.records.find(l => l.lead_id === leadId);
      if (!lead) {
        return {
          success: false,
          lead_id: leadId,
          error: 'Lead not found',
          processing_time: Date.now() - startTime
        };
      }

      // Perform enrichment
      const enrichmentData = await this.performEnrichment(lead);
      
      // Grade the lead
      const grade = this.gradeLead(lead, enrichmentData);

      // Save enrichment data
      await this.saveEnrichmentData(leadId, enrichmentData, grade);

      return {
        success: true,
        lead_id: leadId,
        enrichment_data: enrichmentData,
        grade,
        processing_time: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        lead_id: leadId,
        error: error instanceof Error ? error.message : String(error),
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * Bulk enrich multiple leads
   */
  async enrichLeads(leadIds: string[]): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];
    
    for (const leadId of leadIds) {
      const result = await this.enrichLead(leadId);
      results.push(result);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * Get enrichment data for a lead
   */
  async getEnrichmentData(leadId: string): Promise<{
    success: boolean;
    data?: EnrichmentData;
    grade?: LeadGrade;
    error?: string;
  }> {
    try {
      const enrichmentResult = await this.csv.read<any>('lead_enrichment.csv');
      if (!enrichmentResult.success) {
        return { success: false, error: 'Failed to read enrichment data' };
      }

      const record = enrichmentResult.records.find(r => r.lead_id === leadId);
      if (!record) {
        return { success: false, error: 'No enrichment data found' };
      }

      return {
        success: true,
        data: JSON.parse(record.enrichment_data || '{}'),
        grade: JSON.parse(record.grade_data || '{}')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Perform actual enrichment (mock implementation)
   */
  private async performEnrichment(lead: any): Promise<EnrichmentData> {
    const enrichment: EnrichmentData = {
      metadata: {
        enrichment_sources: ['mock_data'],
        confidence_score: 0.85,
        last_enriched: new Date().toISOString(),
        data_freshness: 'recent'
      }
    };

    // Company enrichment based on email domain
    if (lead.email) {
      const domain = lead.email.split('@')[1];
      enrichment.company = {
        name: this.generateCompanyName(domain),
        domain: domain,
        industry: this.generateIndustry(domain),
        size: this.generateCompanySize(),
        description: 'Real estate investment and property management company',
        founded: '2010',
        location: `${lead.city || 'Unknown'}, ${lead.province || 'Unknown'}`
      };
    }

    // Professional enrichment
    enrichment.professional = {
      title: this.generateTitle(lead.source),
      seniority: this.generateSeniority(),
      department: 'Real Estate',
      linkedin_url: `https://linkedin.com/in/${lead.first_name.toLowerCase()}-${lead.last_name.toLowerCase()}`,
      experience_years: Math.floor(Math.random() * 15) + 5
    };

    // Contact verification
    enrichment.contact = {
      email_verified: Math.random() > 0.2,
      phone_verified: lead.phone_e164 ? Math.random() > 0.3 : false,
      social_profiles: {
        linkedin: `https://linkedin.com/in/${lead.first_name.toLowerCase()}-${lead.last_name.toLowerCase()}`,
        twitter: `https://twitter.com/${lead.first_name.toLowerCase()}${lead.last_name.toLowerCase()}`
      },
      alternative_emails: this.generateAlternativeEmails(lead.first_name, lead.last_name, lead.email)
    };

    // Intent signals
    enrichment.intent = {
      buying_signals: this.generateBuyingSignals(lead),
      timeline: this.generateTimeline(),
      budget_range: this.generateBudgetRange(),
      decision_maker: Math.random() > 0.4,
      tech_stack: ['CRM', 'Email Marketing', 'Property Management Software']
    };

    return enrichment;
  }

  /**
   * Grade lead based on enrichment data
   */
  private gradeLead(lead: any, enrichment: EnrichmentData): LeadGrade {
    const factors = {
      contact_quality: this.calculateContactQuality(lead, enrichment),
      data_completeness: this.calculateDataCompleteness(lead, enrichment),
      intent_signals: this.calculateIntentSignals(enrichment),
      market_fit: this.calculateMarketFit(enrichment),
      engagement_potential: this.calculateEngagementPotential(lead, enrichment)
    };

    const overall_score = Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;
    
    const grade = this.scoreToGrade(overall_score);
    const { reasoning, recommendations, next_actions } = this.generateGradeInsights(factors, grade, enrichment);

    return {
      overall_score: Math.round(overall_score),
      grade,
      factors,
      reasoning,
      recommendations,
      next_actions
    };
  }

  /**
   * Save enrichment data to CSV
   */
  private async saveEnrichmentData(leadId: string, enrichment: EnrichmentData, grade: LeadGrade): Promise<void> {
    // Initialize enrichment file if it doesn't exist
    const exists = this.csv.exists('lead_enrichment.csv');
    if (!exists) {
      await this.csv.write('lead_enrichment.csv', [], [
        'lead_id', 'enrichment_data', 'grade_data', 'created_at', 'updated_at'
      ]);
    }

    // Read existing data
    const existing = await this.csv.read<any>('lead_enrichment.csv');
    if (!existing.success) {
      throw new Error('Failed to read enrichment data');
    }

    // Update or add record
    const records = existing.records.filter(r => r.lead_id !== leadId);
    records.push({
      lead_id: leadId,
      enrichment_data: JSON.stringify(enrichment),
      grade_data: JSON.stringify(grade),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await this.csv.write('lead_enrichment.csv', records);
  }

  // Helper methods for generating mock data
  private generateCompanyName(domain: string): string {
    const companies: Record<string, string> = {
      'gmail.com': 'Individual Investor',
      'yahoo.com': 'Personal Real Estate',
      'outlook.com': 'Property Investment Group',
      'aol.com': 'Real Estate Ventures LLC'
    };
    return companies[domain] || `${domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)} Properties`;
  }

  private generateIndustry(domain: string): string {
    const industries = ['Real Estate Investment', 'Property Management', 'Real Estate Development', 'Construction'];
    return industries[Math.floor(Math.random() * industries.length)];
  }

  private generateCompanySize(): string {
    const sizes = ['1-10', '11-50', '51-200', '201-500', '500+'];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }

  private generateTitle(source: string): string {
    const titles: Record<string, string> = {
      'website': 'Property Investor',
      'referral': 'Real Estate Agent',
      'social': 'Home Buyer',
      'import': 'Property Developer',
      'manual': 'Real Estate Professional'
    };
    return titles[source] || 'Real Estate Professional';
  }

  private generateSeniority(): string {
    const seniorities = ['Entry Level', 'Mid Level', 'Senior', 'Executive', 'Owner'];
    return seniorities[Math.floor(Math.random() * seniorities.length)];
  }

  private generateAlternativeEmails(firstName: string, lastName: string, primaryEmail: string): string[] {
    const domain = primaryEmail.split('@')[1];
    const alternatives = [
      `${firstName}.${lastName}@${domain}`,
      `${firstName}${lastName}@${domain}`,
      `${firstName.charAt(0)}${lastName}@${domain}`,
      `${firstName}.${lastName.charAt(0)}@${domain}`
    ];
    return alternatives.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  private generateBuyingSignals(lead: any): string[] {
    const signals = [
      'Searching for investment properties',
      'Interested in multi-family units',
      'Looking for rental properties',
      'Exploring commercial real estate',
      'Seeking financing options',
      'Market research active',
      'Attending property viewings',
      'Comparing neighborhood options'
    ];
    return signals.slice(0, Math.floor(Math.random() * 4) + 2);
  }

  private generateTimeline(): string {
    const timelines = ['Immediate', '1-3 months', '3-6 months', '6-12 months', 'Just browsing'];
    return timelines[Math.floor(Math.random() * timelines.length)];
  }

  private generateBudgetRange(): string {
    const ranges = ['$100K-$250K', '$250K-$500K', '$500K-$1M', '$1M-$2M', '$2M+'];
    return ranges[Math.floor(Math.random() * ranges.length)];
  }

  private calculateContactQuality(lead: any, enrichment: EnrichmentData): number {
    let score = 50; // Base score
    
    if (lead.email) score += 15;
    if (lead.phone_e164) score += 15;
    if (enrichment.contact?.email_verified) score += 10;
    if (enrichment.contact?.phone_verified) score += 10;
    
    return Math.min(score, 100);
  }

  private calculateDataCompleteness(lead: any, enrichment: EnrichmentData): number {
    const fields = ['first_name', 'last_name', 'email', 'phone_e164', 'city', 'province'];
    const filledFields = fields.filter(field => lead[field]).length;
    return (filledFields / fields.length) * 100;
  }

  private calculateIntentSignals(enrichment: EnrichmentData): number {
    if (!enrichment.intent) return 50;
    
    let score = 50;
    if (enrichment.intent.buying_signals.length > 2) score += 20;
    if (enrichment.intent.timeline === 'Immediate') score += 15;
    if (enrichment.intent.decision_maker) score += 15;
    
    return Math.min(score, 100);
  }

  private calculateMarketFit(enrichment: EnrichmentData): number {
    let score = 60; // Base score
    
    if (enrichment.company?.industry === 'Real Estate Investment') score += 20;
    if (enrichment.professional?.department === 'Real Estate') score += 10;
    if (enrichment.professional?.seniority === 'Executive' || enrichment.professional?.seniority === 'Owner') score += 10;
    
    return Math.min(score, 100);
  }

  private calculateEngagementPotential(lead: any, enrichment: EnrichmentData): number {
    let score = 50;
    
    if (lead.source === 'referral') score += 20;
    if (lead.source === 'website') score += 15;
    if (enrichment.contact?.social_profiles && Object.keys(enrichment.contact.social_profiles).length > 0) score += 15;
    
    return Math.min(score, 100);
  }

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateGradeInsights(factors: any, grade: string, enrichment: EnrichmentData): {
    reasoning: string[];
    recommendations: string[];
    next_actions: string[];
  } {
    const reasoning: string[] = [];
    const recommendations: string[] = [];
    const next_actions: string[] = [];

    // Generate reasoning
    if (factors.contact_quality > 80) reasoning.push('Excellent contact information');
    if (factors.data_completeness > 80) reasoning.push('Complete profile data');
    if (factors.intent_signals > 80) reasoning.push('Strong buying signals detected');
    if (factors.market_fit > 80) reasoning.push('Perfect market fit');
    if (factors.engagement_potential > 80) reasoning.push('High engagement potential');

    // Generate recommendations
    if (grade === 'A') {
      recommendations.push('Prioritize immediate outreach');
      recommendations.push('Assign to senior agent');
    } else if (grade === 'B') {
      recommendations.push('Standard follow-up sequence');
      recommendations.push('Monitor for increased engagement');
    } else if (grade === 'C') {
      recommendations.push('Nurture with educational content');
      recommendations.push('Re-evaluate in 30 days');
    } else {
      recommendations.push('Low priority - minimal outreach');
      recommendations.push('Consider for long-term nurture');
    }

    // Generate next actions
    if (enrichment.intent?.timeline === 'Immediate') {
      next_actions.push('Schedule immediate call');
      next_actions.push('Send property recommendations');
    }
    next_actions.push('Connect on LinkedIn');
    next_actions.push('Add to email nurture sequence');

    return { reasoning, recommendations, next_actions };
  }
}
