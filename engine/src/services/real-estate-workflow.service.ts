/**
 * Real Estate Workflow Automation Service
 * Orchestrates complete real estate automation workflows
 */

import { realEstateDataIngestion } from './real-estate-data-ingestion.service.js';
import { realEstateContentGenerator } from './real-estate-content-generation.service.js';
import { Property, MarketData, ROIAnalysis, MarketScore, InvestmentRecommendation } from '../domain/real-estate-calculator.service.js';
import { PropertyAnalysis, OutreachMessage, MarketReport, Lead } from './real-estate-content-generation.service.js';

export interface WorkflowConfig {
  location: string;
  includeMarketData: boolean;
  includeAgents: boolean;
  propertyFilters?: {
    propertyType?: 'single-family' | 'multi-family' | 'condo' | 'townhouse' | 'land';
    priceRange?: { min?: number; max?: number };
    beds?: number;
    baths?: number;
    limit?: number;
  };
  leadFilters?: {
    budget?: number;
    propertyType?: string;
    timeline?: string;
  };
  outreachSettings?: {
    tone: 'professional' | 'friendly' | 'urgent' | 'casual';
    batchSize: number;
    confidenceThreshold: number;
  };
}

export interface WorkflowResult {
  workflowId: string;
  location: string;
  startTime: string;
  endTime: string;
  status: 'running' | 'completed' | 'failed';
  results: {
    listings: Property[];
    marketData?: MarketData;
    analyses: PropertyAnalysis[];
    outreachMessages: OutreachMessage[];
    marketReport?: MarketReport;
  };
  metrics: {
    totalListings: number;
    totalAnalyses: number;
    totalOutreach: number;
    averageConfidence: number;
    processingTime: number;
  };
  errors?: string[];
}

export class RealEstateWorkflowService {
  
  /**
   * Execute complete real estate workflow
   */
  async executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    const workflowId = this.generateWorkflowId();
    const startTime = new Date().toISOString();
    
    console.log(`🚀 Starting Real Estate Workflow ${workflowId} for ${config.location}`);
    
    try {
      // Step 1: Ingest Real Estate Data
      console.log('📊 Step 1: Ingesting real estate data...');
      const ingestionResult = await realEstateDataIngestion.ingestRealEstateData(config.location, {
        includeMarketData: config.includeMarketData,
        includeAgents: config.includeAgents,
        listingParams: config.propertyFilters
      });
      
      // Step 2: Analyze Properties
      console.log('🔍 Step 2: Analyzing properties...');
      const analyses: PropertyAnalysis[] = [];
      
      for (const property of ingestionResult.listings) {
        if (config.propertyFilters && !this.matchesFilters(property, config.propertyFilters)) {
          continue;
        }
        
        try {
          const analysis = await realEstateContentGenerator.generatePropertyAnalysis(
            property, 
            ingestionResult.marketData!
          );
          analyses.push(analysis);
        } catch (error) {
          console.error(`Failed to analyze property ${property.id}:`, error);
        }
      }
      
      // Step 3: Generate Market Report
      console.log('📈 Step 3: Generating market report...');
      let marketReport: MarketReport | undefined;
      
      if (config.includeMarketData && ingestionResult.marketData) {
        try {
          marketReport = await realEstateContentGenerator.generateMarketReport(
            config.location,
            ingestionResult.marketData,
            ingestionResult.listings
          );
        } catch (error) {
          console.error('Failed to generate market report:', error);
        }
      }
      
      // Step 4: Generate Outreach Messages
      console.log('📧 Step 4: Generating outreach messages...');
      const outreachMessages: OutreachMessage[] = [];
      
      // Mock leads for demonstration (in production, these would come from CRM)
      const mockLeads = this.generateMockLeads(config.location, analyses.length);
      
      for (const lead of mockLeads) {
        // Find best matching properties for this lead
        const matchingAnalyses = this.findMatchingProperties(lead, analyses);
        
        for (const analysis of matchingAnalyses.slice(0, 3)) { // Top 3 matches
          try {
            const outreach = await realEstateContentGenerator.generateOutreachMessage(
              lead,
              analysis,
              config.outreachSettings?.tone || 'professional'
            );
            
            // Filter by confidence threshold
            if (outreach.confidence >= (config.outreachSettings?.confidenceThreshold || 70)) {
              outreachMessages.push(outreach);
            }
          } catch (error) {
            console.error(`Failed to generate outreach for lead ${lead.id}:`, error);
          }
        }
      }
      
      const endTime = new Date().toISOString();
      const processingTime = new Date(endTime).getTime() - new Date(startTime).getTime();
      
      const result: WorkflowResult = {
        workflowId,
        location: config.location,
        startTime,
        endTime,
        status: 'completed',
        results: {
          listings: ingestionResult.listings,
          marketData: ingestionResult.marketData,
          analyses,
          outreachMessages,
          marketReport
        },
        metrics: {
          totalListings: ingestionResult.listings.length,
          totalAnalyses: analyses.length,
          totalOutreach: outreachMessages.length,
          averageConfidence: outreachMessages.length > 0 
            ? outreachMessages.reduce((sum, msg) => sum + msg.confidence, 0) / outreachMessages.length
            : 0,
          processingTime
        }
      };
      
      console.log(`✅ Workflow ${workflowId} completed successfully`);
      this.logWorkflowSummary(result);
      
      return result;
      
    } catch (error) {
      const endTime = new Date().toISOString();
      const processingTime = new Date(endTime).getTime() - new Date(startTime).getTime();
      
      const result: WorkflowResult = {
        workflowId,
        location: config.location,
        startTime,
        endTime,
        status: 'failed',
        results: {
          listings: [],
          analyses: [],
          outreachMessages: []
        },
        metrics: {
          totalListings: 0,
          totalAnalyses: 0,
          totalOutreach: 0,
          averageConfidence: 0,
          processingTime
        },
        errors: [error instanceof Error ? error.message : String(error)]
      };
      
      console.error(`❌ Workflow ${workflowId} failed:`, error);
      return result;
    }
  }
  
  /**
   * Execute property analysis workflow
   */
  async executePropertyAnalysisWorkflow(properties: Property[], marketData: MarketData): Promise<PropertyAnalysis[]> {
    console.log(`🔍 Analyzing ${properties.length} properties...`);
    
    const analyses: PropertyAnalysis[] = [];
    
    for (const property of properties) {
      try {
        const analysis = await realEstateContentGenerator.generatePropertyAnalysis(property, marketData);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze property ${property.id}:`, error);
      }
    }
    
    console.log(`✅ Analyzed ${analyses.length} properties successfully`);
    return analyses;
  }
  
  /**
   * Execute outreach campaign workflow
   */
  async executeOutreachCampaign(leads: Lead[], analyses: PropertyAnalysis[], tone: 'professional' | 'friendly' | 'urgent' | 'casual' = 'professional'): Promise<OutreachMessage[]> {
    console.log(`📧 Generating outreach for ${leads.length} leads and ${analyses.length} properties...`);
    
    const outreachMessages: OutreachMessage[] = [];
    
    for (const lead of leads) {
      const matchingAnalyses = this.findMatchingProperties(lead, analyses);
      
      for (const analysis of matchingAnalyses.slice(0, 3)) {
        try {
          const outreach = await realEstateContentGenerator.generateOutreachMessage(lead, analysis, tone);
          outreachMessages.push(outreach);
        } catch (error) {
          console.error(`Failed to generate outreach for lead ${lead.id}:`, error);
        }
      }
    }
    
    console.log(`✅ Generated ${outreachMessages.length} outreach messages`);
    return outreachMessages;
  }
  
  /**
   * Generate workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Check if property matches filters
   */
  private matchesFilters(property: Property, filters: WorkflowConfig['propertyFilters']): boolean {
    if (!filters) return true;
    
    if (filters.propertyType && property.propertyType !== filters.propertyType) {
      return false;
    }
    
    if (filters.priceRange) {
      if (filters.priceRange.min && property.price < filters.priceRange.min) {
        return false;
      }
      if (filters.priceRange.max && property.price > filters.priceRange.max) {
        return false;
      }
    }
    
    if (filters.beds && property.beds < filters.beds) {
      return false;
    }
    
    if (filters.baths && property.baths < filters.baths) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate mock leads for demonstration
   */
  private generateMockLeads(location: string, count: number): Lead[] {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    const leads: Lead[] = [];
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      leads.push({
        id: `lead_${i + 1}`,
        name: `${firstName} ${lastName}`,
        phone: `(512) 555-${String(1000 + i).padStart(4, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        budget: 300000 + Math.floor(Math.random() * 500000),
        propertyType: ['single-family', 'condo', 'townhouse'][Math.floor(Math.random() * 3)],
        timeline: ['1-2 months', '3-6 months', '6-12 months'][Math.floor(Math.random() * 3)],
        location,
        beds: 2 + Math.floor(Math.random() * 3),
        baths: 1 + Math.floor(Math.random() * 3),
        notes: `Generated lead for ${location}`,
        createdAt: new Date().toISOString()
      });
    }
    
    return leads;
  }
  
  /**
   * Find matching properties for a lead
   */
  private findMatchingProperties(lead: Lead, analyses: PropertyAnalysis[]): PropertyAnalysis[] {
    return analyses
      .filter(analysis => {
        const property = analysis.property;
        
        // Budget match
        if (lead.budget && property.price > lead.budget * 1.1) {
          return false;
        }
        
        // Property type match
        if (lead.propertyType && property.propertyType !== lead.propertyType) {
          return false;
        }
        
        // Beds match
        if (lead.beds && property.beds < lead.beds) {
          return false;
        }
        
        // Baths match
        if (lead.baths && property.baths < lead.baths) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by recommendation confidence
        return b.recommendation.confidence - a.recommendation.confidence;
      });
  }
  
  /**
   * Log workflow summary
   */
  private logWorkflowSummary(result: WorkflowResult): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 WORKFLOW EXECUTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`📍 Location: ${result.location}`);
    console.log(`⏱️  Processing Time: ${(result.metrics.processingTime / 1000).toFixed(2)}s`);
    console.log(`📈 Status: ${result.status.toUpperCase()}`);
    
    console.log('\n📋 RESULTS:');
    console.log(`  • Properties Scanned: ${result.metrics.totalListings}`);
    console.log(`  • Properties Analyzed: ${result.metrics.totalAnalyses}`);
    console.log(`  • Outreach Messages: ${result.metrics.totalOutreach}`);
    console.log(`  • Average Confidence: ${result.metrics.averageConfidence.toFixed(1)}%`);
    
    if (result.results.marketReport) {
      console.log(`  • Market Report: Generated`);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log(`  • Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
    
    console.log('\n🎯 WORKFLOW COMPLETED SUCCESSFULLY!');
  }
}

// Export singleton instance
export const realEstateWorkflow = new RealEstateWorkflowService();
