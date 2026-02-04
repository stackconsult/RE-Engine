/**
 * ICP Management Service - Manage Ideal Client Profiles
 * Create, update, and manage ICP profiles for automated discovery
 */
import { CSVAdapter } from '../a2d/adapters/csv-adapter';
/**
 * ICP Management Service
 * Manages Ideal Client Profiles for automated discovery
 */
export class ICPManagementService {
    csv;
    constructor(dataDir) {
        this.csv = new CSVAdapter({
            dataDir: dataDir,
            encoding: 'utf8'
        });
    }
    /**
     * Create new ICP profile
     */
    async createICP(request) {
        try {
            const icp = {
                id: `icp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: request.name,
                description: request.description,
                criteria: request.criteria,
                settings: request.settings
            };
            await this.saveICP(icp);
            return { success: true, icp };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Update existing ICP profile
     */
    async updateICP(icpId, request) {
        try {
            const existingICP = await this.getICP(icpId);
            if (!existingICP.success) {
                return { success: false, error: 'ICP not found' };
            }
            const updatedICP = {
                ...existingICP.icp,
                ...request,
                criteria: {
                    ...existingICP.icp.criteria,
                    ...request.criteria
                },
                settings: {
                    ...existingICP.icp.settings,
                    ...request.settings
                }
            };
            await this.saveICP(updatedICP);
            return { success: true, icp: updatedICP };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Get ICP profile by ID
     */
    async getICP(icpId) {
        try {
            const result = await this.csv.read('icp_profiles.csv');
            if (!result.success) {
                return { success: false, error: 'Failed to read ICP profiles' };
            }
            const icp = result.records.find((record) => record.id === icpId);
            if (!icp) {
                return { success: false, error: 'ICP not found' };
            }
            return { success: true, icp: this.parseICPRecord(icp) };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * List all ICP profiles
     */
    async listICPs() {
        try {
            const result = await this.csv.read('icp_profiles.csv');
            if (!result.success) {
                return { success: false, error: 'Failed to read ICP profiles' };
            }
            const icps = result.records.map((record) => this.parseICPRecord(record));
            return { success: true, icp: undefined, error: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Delete ICP profile
     */
    async deleteICP(icpId) {
        try {
            const result = await this.csv.read('icp_profiles.csv');
            if (!result.success) {
                return { success: false, error: 'Failed to read ICP profiles' };
            }
            const filteredRecords = result.records.filter((record) => record.id !== icpId);
            await this.csv.write('icp_profiles.csv', filteredRecords);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Get ICP templates
     */
    async getICPTemplates() {
        return [
            {
                id: 'template_residential_investor',
                name: 'Residential Investor Template',
                description: 'Ideal client profile for residential real estate investors',
                criteria: {
                    locations: {
                        cities: ['San Francisco', 'Los Angeles', 'San Diego', 'Sacramento'],
                        states: ['CA'],
                        zipCodes: [],
                        radius: 25
                    },
                    investment: {
                        propertyTypes: ['single_family', 'multi_family', 'condo'],
                        priceRange: { min: 200000, max: 2000000 },
                        capRate: { min: 0.05, max: 0.15 },
                        cashFlow: { min: 500, max: 5000 },
                        roi: { min: 0.10, max: 0.25 }
                    },
                    professional: {
                        industries: ['Real Estate', 'Finance', 'Technology'],
                        companySize: ['small', 'medium'],
                        revenueRange: { min: 100000, max: 10000000 },
                        jobTitles: ['Investor', 'CEO', 'Founder', 'Manager', 'Director'],
                        seniority: ['c_level', 'director', 'manager']
                    },
                    behavior: {
                        buyingSignals: ['property_search', 'investment_interest', 'market_research'],
                        timeline: ['1-3_months', '3-6_months'],
                        budgetRange: { min: 50000, max: 1000000 },
                        decisionMaker: true,
                        experience: ['intermediate', 'advanced', 'expert']
                    },
                    platforms: {
                        linkedin: true,
                        zillow: true,
                        realtor: true,
                        craigslist: false,
                        facebook: true,
                        instagram: false,
                        twitter: false,
                        customSites: []
                    }
                },
                settings: {
                    maxLeadsPerDay: 50,
                    discoveryFrequency: 'daily',
                    confidenceThreshold: 0.7,
                    excludeDuplicates: true,
                    enrichmentEnabled: true
                }
            },
            {
                id: 'template_commercial_investor',
                name: 'Commercial Investor Template',
                description: 'Ideal client profile for commercial real estate investors',
                criteria: {
                    locations: {
                        cities: ['New York', 'Chicago', 'Boston', 'Miami'],
                        states: ['NY', 'IL', 'MA', 'FL'],
                        zipCodes: [],
                        radius: 50
                    },
                    investment: {
                        propertyTypes: ['commercial', 'office', 'retail', 'industrial'],
                        priceRange: { min: 1000000, max: 10000000 },
                        capRate: { min: 0.06, max: 0.12 },
                        cashFlow: { min: 5000, max: 50000 },
                        roi: { min: 0.08, max: 0.20 }
                    },
                    professional: {
                        industries: ['Real Estate', 'Finance', 'Insurance', 'Law'],
                        companySize: ['medium', 'large', 'enterprise'],
                        revenueRange: { min: 1000000, max: 100000000 },
                        jobTitles: ['CEO', 'CFO', 'Partner', 'Principal', 'Director'],
                        seniority: ['c_level', 'director', 'partner']
                    },
                    behavior: {
                        buyingSignals: ['portfolio_expansion', 'market_analysis', 'investment_opportunity'],
                        timeline: ['3-6_months', '6-12_months'],
                        budgetRange: { min: 100000, max: 5000000 },
                        decisionMaker: true,
                        experience: ['advanced', 'expert']
                    },
                    platforms: {
                        linkedin: true,
                        zillow: false,
                        realtor: false,
                        craigslist: false,
                        facebook: false,
                        instagram: false,
                        twitter: true,
                        customSites: ['loopnet.com', 'crexi.com']
                    }
                },
                settings: {
                    maxLeadsPerDay: 25,
                    discoveryFrequency: 'weekly',
                    confidenceThreshold: 0.8,
                    excludeDuplicates: true,
                    enrichmentEnabled: true
                }
            },
            {
                id: 'template_fix_and_flip',
                name: 'Fix and Flip Investor Template',
                description: 'Ideal client profile for fix and flip real estate investors',
                criteria: {
                    locations: {
                        cities: ['Phoenix', 'Dallas', 'Houston', 'Atlanta'],
                        states: ['AZ', 'TX', 'GA'],
                        zipCodes: [],
                        radius: 30
                    },
                    investment: {
                        propertyTypes: ['single_family', 'multi_family'],
                        priceRange: { min: 150000, max: 800000 },
                        capRate: { min: 0.08, max: 0.20 },
                        cashFlow: { min: 1000, max: 10000 },
                        roi: { min: 0.15, max: 0.30 }
                    },
                    professional: {
                        industries: ['Construction', 'Real Estate', 'Home Improvement'],
                        companySize: ['small', 'medium'],
                        revenueRange: { min: 50000, max: 5000000 },
                        jobTitles: ['Contractor', 'Investor', 'Flipping Specialist', 'Realtor'],
                        seniority: ['individual', 'manager', 'owner']
                    },
                    behavior: {
                        buyingSignals: ['renovation_project', 'property_flip', 'distressed_property'],
                        timeline: ['immediate', '1-3_months'],
                        budgetRange: { min: 25000, max: 500000 },
                        decisionMaker: true,
                        experience: ['intermediate', 'advanced']
                    },
                    platforms: {
                        linkedin: true,
                        zillow: true,
                        realtor: true,
                        craigslist: true,
                        facebook: true,
                        instagram: false,
                        twitter: false,
                        customSites: ['biggerpockets.com']
                    }
                },
                settings: {
                    maxLeadsPerDay: 75,
                    discoveryFrequency: 'daily',
                    confidenceThreshold: 0.6,
                    excludeDuplicates: true,
                    enrichmentEnabled: true
                }
            }
        ];
    }
    /**
     * Clone ICP from template
     */
    async cloneFromTemplate(templateId, name, description) {
        try {
            const templates = await this.getICPTemplates();
            const template = templates.find(t => t.id === templateId);
            if (!template) {
                return { success: false, error: 'Template not found' };
            }
            const newICP = {
                ...template,
                id: `icp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name,
                description
            };
            await this.saveICP(newICP);
            return { success: true, icp: newICP };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Validate ICP profile
     */
    validateICP(icp) {
        const errors = [];
        // Validate name
        if (!icp.name || icp.name.trim().length === 0) {
            errors.push('Name is required');
        }
        // Validate locations
        if (!icp.criteria.locations.cities || icp.criteria.locations.cities.length === 0) {
            errors.push('At least one city is required');
        }
        // Validate investment criteria
        if (!icp.criteria.investment.propertyTypes || icp.criteria.investment.propertyTypes.length === 0) {
            errors.push('At least one property type is required');
        }
        if (!icp.criteria.investment.priceRange) {
            errors.push('Price range is required');
        }
        else {
            if (icp.criteria.investment.priceRange.min >= icp.criteria.investment.priceRange.max) {
                errors.push('Minimum price must be less than maximum price');
            }
        }
        // Validate professional criteria
        if (!icp.criteria.professional.industries || icp.criteria.professional.industries.length === 0) {
            errors.push('At least one industry is required');
        }
        // Validate settings
        if (!icp.settings.maxLeadsPerDay || icp.settings.maxLeadsPerDay <= 0) {
            errors.push('Max leads per day must be greater than 0');
        }
        if (!icp.settings.confidenceThreshold || icp.settings.confidenceThreshold < 0 || icp.settings.confidenceThreshold > 1) {
            errors.push('Confidence threshold must be between 0 and 1');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Save ICP to CSV
     */
    async saveICP(icp) {
        // Initialize file if it doesn't exist
        const exists = this.csv.exists('icp_profiles.csv');
        if (!exists) {
            await this.csv.write('icp_profiles.csv', [], [
                'id', 'name', 'description', 'criteria', 'settings', 'created_at', 'updated_at'
            ]);
        }
        // Read existing records
        const existing = await this.csv.read('icp_profiles.csv');
        if (!existing.success) {
            throw new Error('Failed to read ICP profiles');
        }
        // Update or add record
        const records = existing.records.filter((record) => record.id !== icp.id);
        records.push(this.icpToRecord(icp));
        await this.csv.write('icp_profiles.csv', records);
    }
    /**
     * Convert ICP to CSV record
     */
    icpToRecord(icp) {
        return {
            id: icp.id,
            name: icp.name,
            description: icp.description,
            criteria: JSON.stringify(icp.criteria),
            settings: JSON.stringify(icp.settings),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    /**
     * Parse CSV record to ICP
     */
    parseICPRecord(record) {
        return {
            id: record.id,
            name: record.name,
            description: record.description,
            criteria: JSON.parse(record.criteria),
            settings: JSON.parse(record.settings)
        };
    }
}
//# sourceMappingURL=icp-management.service.js.map