import { Logger } from '../../utils/logger.js';
import { CRMAdapter, PropertyData, PropertySearchCriteria, RealtorConfig } from '../interfaces/crm-definitions.js';
import axios, { AxiosInstance } from 'axios';

export class RealtorAdapter implements CRMAdapter {
    name = 'realtor';
    private logger: Logger;
    private client: AxiosInstance;
    private config: RealtorConfig;

    constructor(config: RealtorConfig) {
        this.config = config;
        this.logger = new Logger('RealtorAdapter', true);
        this.client = axios.create({
            baseURL: 'https://realtor.p.rapidapi.com',
            timeout: 10000,
            headers: {
                'X-RapidAPI-Key': this.config.apiKey,
                'X-RapidAPI-Host': 'realtor.p.rapidapi.com',
            },
        });
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing Realtor.com Adapter');
    }

    async validateCredentials(tenantId: string): Promise<boolean> {
        try {
            await this.client.get('/properties/list-for-sale', { params: { limit: 1 } });
            return true;
        } catch (error) {
            return false;
        }
    }

    async searchProperties(tenantId: string, criteria: PropertySearchCriteria): Promise<PropertyData[]> {
        try {
            if (!this.config.apiKey || this.config.apiKey === 'mock-key') {
                return this.getMockProperties(tenantId, criteria);
            }

            const params: any = {
                city: criteria.city,
                state_code: criteria.state,
                price_min: criteria.price_min,
                price_max: criteria.price_max,
                beds_min: criteria.beds_min,
                baths_min: criteria.baths_min,
                limit: criteria.limit || 20,
                offset: criteria.offset || 0,
                sort: 'relevance'
            };

            const response = await this.client.get('/properties/list-for-sale', { params });

            return response.data.listings.map((item: any) => this.mapResponseToProperty(item, tenantId));
        } catch (error) {
            this.logger.error('Realtor search failed', error);
            return this.getMockProperties(tenantId, criteria);
        }
    }

    async getPropertyDetails(tenantId: string, externalId: string): Promise<PropertyData | null> {
        try {
            if (!this.config.apiKey || this.config.apiKey === 'mock-key') {
                const mocks = await this.getMockProperties(tenantId, {});
                return mocks.find(p => p.external_id === externalId) || null;
            }

            const response = await this.client.get('/properties/detail', { params: { property_id: externalId } });
            return this.mapResponseToProperty(response.data.property, tenantId);
        } catch (error) {
            this.logger.error(`Realtor get details failed for ${externalId}`, error);
            return null;
        }
    }

    private mapResponseToProperty(data: any, tenantId: string): PropertyData {
        return {
            tenant_id: tenantId,
            external_id: data.property_id,
            source: 'realtor',
            address: data.address?.line || 'Unknown',
            city: data.address?.city,
            state: data.address?.state_code,
            zip_code: data.address?.postal_code,
            price: data.price,
            beds: data.beds,
            baths: data.baths,
            sqft: data.sqft,
            lot_size: data.lot_size,
            year_built: data.year_built,
            property_type: data.prop_type,
            listing_status: data.status === 'for_sale' ? 'active' : 'off_market', // simplified mapping
            days_on_market: data.days_on_market,
            description: data.description,
            images: data.photos?.map((p: any) => p.href) || [],
            features: data.features || [],
            agent_info: {
                name: data.agent?.name,
                email: data.agent?.email,
                phone: data.agent?.phone,
                brokerage: data.brokerage?.name,
            },
            raw_data: data,
            last_synced: new Date(),
        };
    }

    private async getMockProperties(tenantId: string, criteria: PropertySearchCriteria): Promise<PropertyData[]> {
        return [
            {
                tenant_id: tenantId,
                external_id: 'realtor_mock_1',
                source: 'realtor',
                address: '789 Realtor Way',
                city: criteria.city || 'Toronto',
                state: criteria.state || 'ON',
                zip_code: 'M2B 2B2',
                price: 950000,
                beds: 4,
                baths: 3,
                sqft: 2200,
                lot_size: 5000,
                year_built: 2005,
                property_type: 'Single Family',
                listing_status: 'active',
                days_on_market: 30,
                description: 'Spacious family home.',
                images: ['https://example.com/realtor_mock1.jpg'],
                features: ['Large Yard', 'Renovated'],
                last_synced: new Date(),
            }
        ];
    }
}
