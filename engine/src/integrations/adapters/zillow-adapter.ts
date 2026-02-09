import { Logger } from '../../utils/logger.js';
import { CRMAdapter, PropertyData, PropertySearchCriteria, ZillowConfig } from '../interfaces/crm-definitions.js';
import axios, { AxiosInstance } from 'axios';

export class ZillowAdapter implements CRMAdapter {
    name = 'zillow';
    private logger: Logger;
    private client: AxiosInstance;
    private config: ZillowConfig;

    constructor(config: ZillowConfig) {
        this.config = config;
        this.logger = new Logger('ZillowAdapter', true);
        this.client = axios.create({
            baseURL: 'https://api.zillow.com/v2', // Hypothetical API endpoint
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing Zillow Adapter');
    }

    async validateCredentials(tenantId: string): Promise<boolean> {
        try {
            await this.client.get('/status');
            return true;
        } catch (error) {
            this.logger.error(`Zillow credential validation failed for tenant ${tenantId}`, error);
            return false;
        }
    }

    async searchProperties(tenantId: string, criteria: PropertySearchCriteria): Promise<PropertyData[]> {
        try {
            const params: any = {
                location: criteria.city ? `${criteria.city}, ${criteria.state || ''}` : undefined,
                status: criteria.listing_status || 'forSale',
                price_min: criteria.price_min,
                price_max: criteria.price_max,
                beds_min: criteria.beds_min,
                baths_min: criteria.baths_min,
            };

            if (this.config.apiKey === 'mock-key' || !this.config.apiKey) {
                return this.getMockProperties(tenantId, criteria);
            }

            const response = await this.client.get('/properties', { params });
            return response.data.results.map((item: any) => this.mapResponseToProperty(item, tenantId));
        } catch (error) {
            this.logger.error('Zillow search failed', error);
            return this.getMockProperties(tenantId, criteria);
        }
    }

    async getPropertyDetails(tenantId: string, externalId: string): Promise<PropertyData | null> {
        try {
            if (this.config.apiKey === 'mock-key' || !this.config.apiKey) {
                const mocks = await this.getMockProperties(tenantId, {});
                return mocks.find(p => p.external_id === externalId) || null;
            }

            const response = await this.client.get(`/properties/${externalId}`);
            return this.mapResponseToProperty(response.data, tenantId);
        } catch (error) {
            this.logger.error(`Zillow getPropertyDetails failed for ${externalId}`, error);
            return null;
        }
    }

    async mapWebhookPayload(tenantId: string, payload: any): Promise<PropertyData | null> {
        return {
            tenant_id: tenantId,
            external_id: payload.zpid || payload.id,
            source: 'zillow',
            address: payload.address || 'Unknown Address',
            city: payload.city,
            state: payload.state,
            zip_code: payload.zip,
            price: payload.price,
            beds: payload.beds,
            baths: payload.baths,
            listing_status: payload.status === 'sold' ? 'sold' : 'active',
            raw_data: payload,
            last_synced: new Date()
        };
    }

    private mapResponseToProperty(data: any, tenantId: string): PropertyData {
        return {
            tenant_id: tenantId,
            external_id: data.zpid || data.id,
            source: 'zillow',
            address: data.address?.streetAddress || 'Unknown Address',
            city: data.address?.city,
            state: data.address?.state,
            zip_code: data.address?.zipcode,
            price: data.price,
            beds: data.bedrooms,
            baths: data.bathrooms,
            sqft: data.livingArea,
            lot_size: data.lotSize,
            year_built: data.yearBuilt,
            property_type: data.homeType,
            listing_status: this.mapStatus(data.status),
            days_on_market: data.daysOnZillow,
            description: data.description,
            images: data.photos || [],
            features: data.features || [],
            agent_info: {
                name: data.listingAgent?.name,
                email: data.listingAgent?.email,
                phone: data.listingAgent?.phone,
                brokerage: data.brokerageName,
            },
            raw_data: data,
            last_synced: new Date(),
        };
    }

    private mapStatus(status: string): 'active' | 'pending' | 'sold' | 'off_market' {
        const map: Record<string, any> = {
            'forSale': 'active',
            'pending': 'pending',
            'sold': 'sold',
            'offMarket': 'off_market'
        };
        return map[status] || 'active';
    }

    private async getMockProperties(tenantId: string, criteria: PropertySearchCriteria): Promise<PropertyData[]> {
        return [
            {
                tenant_id: tenantId,
                external_id: 'zillow_mock_1',
                source: 'zillow',
                address: '123 Mockingbird Lane',
                city: criteria.city || 'Toronto',
                state: criteria.state || 'ON',
                zip_code: 'M1A 1A1',
                price: 850000,
                beds: 3,
                baths: 2,
                sqft: 1500,
                lot_size: 4000,
                year_built: 1990,
                property_type: 'Single Family',
                listing_status: 'active',
                days_on_market: 12,
                description: 'A beautiful mock property for testing purposes.',
                images: ['https://example.com/mock1.jpg'],
                features: ['Garage', 'Fireplace'],
                last_synced: new Date(),
            },
            {
                tenant_id: tenantId,
                external_id: 'zillow_mock_2',
                source: 'zillow',
                address: '456 Test Ave',
                city: criteria.city || 'Toronto',
                state: criteria.state || 'ON',
                zip_code: 'M1A 1A2',
                price: 650000,
                beds: 2,
                baths: 2,
                sqft: 1100,
                lot_size: 0,
                year_built: 2015,
                property_type: 'Condo',
                listing_status: 'active',
                days_on_market: 5,
                description: 'Modern condo unit.',
                images: ['https://example.com/mock2.jpg'],
                features: ['Gym', 'Pool'],
                last_synced: new Date(),
            }
        ];
    }
}
