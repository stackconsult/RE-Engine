export interface CRMConfig {
    enabled: boolean;
    apiKey: string;
    webhookUrl?: string;
    syncInterval: number;
}

export interface ZillowConfig extends CRMConfig {
    // specific Zillow config
}

export interface RealtorConfig extends CRMConfig {
    // specific Realtor config
}

export interface MLSConfig extends CRMConfig {
    provider: 'rapido' | 'trestle' | 'spark';
    endpoint: string;
}

export interface CRMIntegrationConfig {
    zillow: ZillowConfig;
    realtor: RealtorConfig;
    mls: MLSConfig;
    rateLimiting: {
        requestsPerMinute: number;
        burstLimit: number;
    };
}

// Re-export PropertyData from database service to ensure consistency
// or define a common shape here if database model differs from API model for some reason
import { PropertyData as DBPropertyData, PropertySearchCriteria as DBSearchCriteria } from '../../database/property-database.service.js';

export type PropertyData = DBPropertyData;
export type PropertySearchCriteria = DBSearchCriteria;

export interface LeadMatch {
  leadId: string;
  propertyId: string;
  score: number;
  reasons: string[];
  property: PropertyData;
  recommendations: string[];
}

export interface CRMAdapter {
    name: string;

    initialize(): Promise<void>;

    /**
     * Search for properties based on criteria
     */
    searchProperties(tenantId: string, criteria: PropertySearchCriteria): Promise<PropertyData[]>;

    /**
     * Get specific property details
     */
    getPropertyDetails(tenantId: string, externalId: string): Promise<PropertyData | null>;

    /**
     * Validate API credentials
     */
    validateCredentials(tenantId: string): Promise<boolean>;
}
