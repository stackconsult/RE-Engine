import { Logger } from '../../utils/logger.js';
import { CRMAdapter, PropertyData, PropertySearchCriteria, MLSConfig } from '../interfaces/crm-definitions.js';
import axios, { AxiosInstance } from 'axios';

export class MLSAdapter implements CRMAdapter {
    name = 'mls';
    private logger: Logger;
    private client: AxiosInstance;
    private config: MLSConfig;

    constructor(config: MLSConfig) {
        this.config = config;
        this.logger = new Logger('MLSAdapter', true);

        // Abstracting different MLS providers (Rapido, Trestle, etc.)
        // For now, base implementation assumes RESO Web API standard
        this.client = axios.create({
            baseURL: this.config.endpoint || 'https://api.bridgeinteractive.com/v1',
            timeout: 15000,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Accept': 'application/json',
            },
        });
    }

    async initialize(): Promise<void> {
        this.logger.info(`Initializing MLS Adapter (${this.config.provider})`);
    }

    async validateCredentials(tenantId: string): Promise<boolean> {
        try {
            // OData $metadata check or similar
            await this.client.get('/$metadata');
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

            // Build OData filter string based on RESO standard
            const filters = [];
            if (criteria.price_min) filters.push(`ListPrice ge ${criteria.price_min}`);
            if (criteria.price_max) filters.push(`ListPrice le ${criteria.price_max}`);
            if (criteria.beds_min) filters.push(`BedroomsTotal ge ${criteria.beds_min}`);
            if (criteria.city) filters.push(`City eq '${criteria.city}'`);

            const params = {
                '$filter': filters.join(' and '),
                '$top': criteria.limit || 20,
                '$skip': criteria.offset || 0,
                '$orderby': 'ModificationTimestamp desc'
            };

            const response = await this.client.get('/Property', { params });

            return response.data.value.map((item: any) => this.mapResponseToProperty(item, tenantId));
        } catch (error) {
            this.logger.error('MLS search failed', error);
            return this.getMockProperties(tenantId, criteria);
        }
    }

    async getPropertyDetails(tenantId: string, externalId: string): Promise<PropertyData | null> {
        try {
            if (!this.config.apiKey || this.config.apiKey === 'mock-key') {
                const mocks = await this.getMockProperties(tenantId, {});
                return mocks.find(p => p.external_id === externalId) || null;
            }

            // OData lookup by primary key
            const response = await this.client.get(`/Property('${externalId}')`);
            return this.mapResponseToProperty(response.data, tenantId);
        } catch (error) {
            this.logger.error(`MLS get property failed: ${externalId}`, error);
            return null;
        }
    }

    private mapResponseToProperty(data: any, tenantId: string): PropertyData {
        // Mapping RESO Dictionary items to our internal model
        return {
            tenant_id: tenantId,
            external_id: data.ListingKey,
            source: 'mls',
            address: data.UnparsedAddress,
            city: data.City,
            state: data.StateOrProvince,
            zip_code: data.PostalCode,
            price: data.ListPrice,
            beds: data.BedroomsTotal,
            baths: data.BathroomsTotalInteger,
            sqft: data.LivingArea,
            lot_size: data.LotSizeArea,
            year_built: data.YearBuilt,
            property_type: data.PropertyType,
            listing_status: data.StandardStatus === 'Active' ? 'active' : 'sold',
            days_on_market: data.DaysOnMarket,
            description: data.PublicRemarks,
            images: data.Media ? data.Media.map((m: any) => m.MediaURL) : [],
            features: [], // Needs complex parsing usually
            agent_info: {
                name: data.ListAgentFullName,
                email: data.ListAgentEmail,
                phone: data.ListAgentPreferredPhone,
                brokerage: data.ListOfficeName,
            },
            raw_data: data,
            last_synced: new Date(),
        };
    }

    private async getMockProperties(tenantId: string, criteria: PropertySearchCriteria): Promise<PropertyData[]> {
        return [
            {
                tenant_id: tenantId,
                external_id: 'mls_mock_1',
                source: 'mls',
                address: '101 MLS Blvd',
                city: criteria.city || 'Toronto',
                state: criteria.state || 'ON',
                zip_code: 'M5V 2H1',
                price: 1200000,
                beds: 5,
                baths: 4,
                sqft: 3000,
                lot_size: 6000,
                year_built: 2010,
                property_type: 'Residential',
                listing_status: 'active',
                days_on_market: 2,
                description: 'Luxury estate.',
                images: ['https://example.com/mls_mock1.jpg'],
                features: ['Pool', 'Sauna'],
                last_synced: new Date(),
            }
        ];
    }
}
