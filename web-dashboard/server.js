import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory (in production, this would be configurable)
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
async function readCsvFile(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length <= 1) return []; // No data rows
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        return lines.slice(1).map(line => {
            // Simple CSV parsing that handles quoted fields
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/"/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/"/g, '')); // Add last value
            
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            return obj;
        });
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
}

async function writeCsvFile(filename, data) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        if (data.length === 0) {
            await fs.writeFile(filePath, '');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        await fs.writeFile(filePath, csvContent);
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        throw error;
    }
}

// Routes
app.get('/api/status', (req, res) => {
    res.json({
        status: 'operational',
        system: 'RE Engine',
        version: '1.0.0',
        components: {
            engine: 'running',
            mcp: 'ready',
            playwright: 'available',
            rateLimiting: 'active',
            dnc: 'enforced'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/stats', async (req, res) => {
    try {
        const leads = await readCsvFile('leads.csv');
        const approvals = await readCsvFile('approvals.csv');
        const events = await readCsvFile('events.csv');
        const dnc = await readCsvFile('dnc.csv');
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = events.filter(e => e.ts && e.ts.startsWith(today));
        const sentToday = todayEvents.filter(e => e.event_type === 'message_sent').length;
        
        const approvalStats = {
            pending: approvals.filter(a => a.status === 'pending').length,
            approved: approvals.filter(a => a.status === 'approved').length,
            rejected: approvals.filter(a => a.status === 'rejected').length,
            sent: approvals.filter(a => a.status === 'sent').length,
            failed: approvals.filter(a => a.status === 'failed').length
        };
        
        const leadStats = {
            new: leads.filter(l => l.status === 'new').length,
            drafted: leads.filter(l => l.status === 'drafted').length,
            sent: leads.filter(l => l.status === 'sent').length,
            replied: leads.filter(l => l.status === 'replied').length,
            hot: leads.filter(l => l.status === 'hot').length,
            dnc: leads.filter(l => l.status === 'dnc').length
        };
        
        // Rate limits (mock data - in real system, this would be calculated from send_window.csv)
        const rateLimits = {
            email: { used: Math.floor(Math.random() * 30), limit: 50 },
            whatsapp: { used: Math.floor(Math.random() * 15), limit: 20 },
            telegram: { used: Math.floor(Math.random() * 20), limit: 30 },
            linkedin: { used: Math.floor(Math.random() * 3), limit: 5 },
            facebook: { used: Math.floor(Math.random() * 3), limit: 5 }
        };
        
        // Recent activity (mock data)
        const recentActivity = [
            { type: 'message_sent', description: 'Email sent to john@example.com', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
            { type: 'approval_created', description: 'New approval for WhatsApp message', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
            { type: 'lead_added', description: 'New lead added: Jane Smith', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
            { type: 'browser_job', description: 'LinkedIn ingest job completed', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
            { type: 'dnc_added', description: 'Phone number added to DNC', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() }
        ];
        
        res.json({
            leads: leads.length,
            approvals: approvalStats,
            sent_today: sentToday,
            hot_leads: leadStats.hot,
            rate_limits: rateLimits,
            recent_activity: recentActivity,
            dnc_entries: dnc.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

app.get('/api/leads', async (req, res) => {
    try {
        const leads = await readCsvFile('leads.csv');
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load leads' });
    }
});

app.post('/api/leads', async (req, res) => {
    try {
        const leads = await readCsvFile('leads.csv');
        const newLead = {
            lead_id: uuidv4(),
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            phone_e164: req.body.phone_e164,
            city: req.body.city,
            province: req.body.province,
            source: req.body.source,
            tags: req.body.tags,
            status: 'new',
            created_at: new Date().toISOString()
        };
        
        leads.push(newLead);
        await writeCsvFile('leads.csv', leads);
        
        res.json(newLead);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add lead' });
    }
});

app.get('/api/approvals', async (req, res) => {
    try {
        const approvals = await readCsvFile('approvals.csv');
        res.json(approvals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load approvals' });
    }
});

app.post('/api/approvals/:id/approve', async (req, res) => {
    try {
        const approvals = await readCsvFile('approvals.csv');
        const approvalIndex = approvals.findIndex(a => a.approval_id === req.params.id);
        
        if (approvalIndex === -1) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        approvals[approvalIndex].status = 'approved';
        approvals[approvalIndex].approved_by = 'web_dashboard';
        approvals[approvalIndex].approved_at = new Date().toISOString();
        
        await writeCsvFile('approvals.csv', approvals);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve' });
    }
});

app.post('/api/approvals/:id/reject', async (req, res) => {
    try {
        const approvals = await readCsvFile('approvals.csv');
        const approvalIndex = approvals.findIndex(a => a.approval_id === req.params.id);
        
        if (approvalIndex === -1) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        approvals[approvalIndex].status = 'rejected';
        approvals[approvalIndex].approved_by = 'web_dashboard';
        approvals[approvalIndex].approved_at = new Date().toISOString();
        approvals[approvalIndex].notes = req.body.notes || 'Rejected via web dashboard';
        
        await writeCsvFile('approvals.csv', approvals);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject' });
    }
});

// Lead enrichment endpoints
app.post('/api/leads/:id/enrich', async (req, res) => {
    try {
        // Mock enrichment for now - in production would use LeadEnrichmentService
        const enrichmentData = {
            company: {
                name: 'Real Estate Investment Group',
                domain: 'realestate.com',
                industry: 'Real Estate Investment',
                size: '11-50',
                description: 'Professional real estate investment and property management'
            },
            professional: {
                title: 'Property Investor',
                seniority: 'Senior',
                department: 'Real Estate',
                linkedin_url: 'https://linkedin.com/in/example'
            },
            contact: {
                email_verified: true,
                phone_verified: true,
                social_profiles: {
                    linkedin: 'https://linkedin.com/in/example',
                    twitter: 'https://twitter.com/example'
                }
            },
            intent: {
                buying_signals: ['Searching for investment properties', 'Interested in multi-family units'],
                timeline: '1-3 months',
                budget_range: '$250K-$500K',
                decision_maker: true
            },
            metadata: {
                enrichment_sources: ['mock_data'],
                confidence_score: 0.85,
                last_enriched: new Date().toISOString()
            }
        };

        const grade = {
            overall_score: 85,
            grade: 'A',
            factors: {
                contact_quality: 90,
                data_completeness: 80,
                intent_signals: 85,
                market_fit: 90,
                engagement_potential: 80
            },
            reasoning: ['Excellent contact information', 'Strong buying signals detected', 'Perfect market fit'],
            recommendations: ['Prioritize immediate outreach', 'Assign to senior agent'],
            next_actions: ['Schedule immediate call', 'Send property recommendations']
        };

        res.json({
            success: true,
            enrichment_data: enrichmentData,
            grade: grade
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to enrich lead' });
    }
});

app.get('/api/leads/:id/enrichment', async (req, res) => {
    try {
        // Mock enrichment data
        res.json({
            success: true,
            data: {
                company: {
                    name: 'Real Estate Investment Group',
                    domain: 'realestate.com',
                    industry: 'Real Estate Investment'
                },
                grade: {
                    overall_score: 85,
                    grade: 'A'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get enrichment data' });
    }
});

// Lead search endpoints
app.post('/api/leads/search', async (req, res) => {
    try {
        const { text, filters, sort, pagination } = req.body;
        
        // Get all leads
        const leads = await readCsvFile('leads.csv');
        let filteredLeads = leads;
        
        // Apply text search
        if (text) {
            const lowerText = text.toLowerCase();
            filteredLeads = filteredLeads.filter(lead => 
                `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(lowerText) ||
                (lead.email && lead.email.toLowerCase().includes(lowerText)) ||
                (lead.city && lead.city.toLowerCase().includes(lowerText))
            );
        }
        
        // Apply filters
        if (filters) {
            if (filters.status && filters.status.length > 0) {
                filteredLeads = filteredLeads.filter(lead => filters.status.includes(lead.status));
            }
            if (filters.source && filters.source.length > 0) {
                filteredLeads = filteredLeads.filter(lead => filters.source.includes(lead.source));
            }
            if (filters.city && filters.city.length > 0) {
                filteredLeads = filteredLeads.filter(lead => filters.city.includes(lead.city));
            }
        }
        
        // Apply sorting
        if (sort) {
            filteredLeads.sort((a, b) => {
                const aVal = a[sort.field] || '';
                const bVal = b[sort.field] || '';
                const comparison = aVal.localeCompare(bVal);
                return sort.direction === 'desc' ? -comparison : comparison;
            });
        }
        
        // Apply pagination
        const total = filteredLeads.length;
        if (pagination) {
            const { offset, limit } = pagination;
            filteredLeads = filteredLeads.slice(offset, offset + limit);
        }
        
        // Generate facets
        const facets = {
            statuses: {},
            sources: {},
            cities: {},
            provinces: {},
            tags: {}
        };
        
        leads.forEach(lead => {
            if (lead.status) facets.statuses[lead.status] = (facets.statuses[lead.status] || 0) + 1;
            if (lead.source) facets.sources[lead.source] = (facets.sources[lead.source] || 0) + 1;
            if (lead.city) facets.cities[lead.city] = (facets.cities[lead.city] || 0) + 1;
            if (lead.province) facets.provinces[lead.province] = (facets.provinces[lead.province] || 0) + 1;
        });
        
        res.json({
            leads: filteredLeads,
            total,
            facets,
            processing_time: 15
        });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/leads/suggestions', async (req, res) => {
    try {
        const { q } = req.query;
        const leads = await readCsvFile('leads.csv');
        const suggestions = new Set();
        const lowerQuery = q.toLowerCase();
        
        leads.forEach(lead => {
            const fullName = `${lead.first_name} ${lead.last_name}`;
            if (fullName.toLowerCase().includes(lowerQuery)) {
                suggestions.add(fullName);
            }
            if (lead.email && lead.email.toLowerCase().includes(lowerQuery)) {
                suggestions.add(lead.email);
            }
            if (lead.city && lead.city.toLowerCase().includes(lowerQuery)) {
                suggestions.add(lead.city);
            }
        });
        
        res.json(Array.from(suggestions).slice(0, 10));
    } catch (error) {
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

app.get('/api/leads/:id/similar', async (req, res) => {
    try {
        const leads = await readCsvFile('leads.csv');
        const targetLead = leads.find(l => l.lead_id === req.params.id);
        
        if (!targetLead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        // Find similar leads (mock implementation)
        const similarLeads = leads
            .filter(l => l.lead_id !== req.params.id)
            .filter(l => 
                (l.city === targetLead.city) ||
                (l.source === targetLead.source) ||
                (l.status === targetLead.status)
            )
            .slice(0, 5);
        
        res.json(similarLeads);
    } catch (error) {
        res.status(500).json({ error: 'Failed to find similar leads' });
    }
});

// ICP Management endpoints
app.get('/api/icp', async (req, res) => {
    try {
        // Mock ICP profiles
        const icps = [
            {
                id: 'icp_1',
                name: 'San Francisco Residential Investors',
                description: 'Target residential investors in San Francisco area',
                criteria: {
                    locations: {
                        cities: ['San Francisco', 'Oakland', 'San Jose'],
                        states: ['CA'],
                        zipCodes: ['94102', '94103', '94107'],
                        radius: 25
                    },
                    investment: {
                        propertyTypes: ['single_family', 'multi_family', 'condo'],
                        priceRange: { min: 300000, max: 2000000 },
                        capRate: { min: 0.05, max: 0.12 }
                    },
                    professional: {
                        industries: ['Real Estate', 'Finance', 'Technology'],
                        companySize: ['small', 'medium'],
                        jobTitles: ['Investor', 'CEO', 'Founder']
                    },
                    platforms: {
                        linkedin: true,
                        zillow: true,
                        realtor: true,
                        craigslist: false,
                        facebook: true
                    }
                },
                settings: {
                    maxLeadsPerDay: 50,
                    discoveryFrequency: 'daily',
                    confidenceThreshold: 0.7
                }
            },
            {
                id: 'icp_2',
                name: 'Commercial Property Investors',
                description: 'Target commercial real estate investors',
                criteria: {
                    locations: {
                        cities: ['New York', 'Chicago', 'Boston'],
                        states: ['NY', 'IL', 'MA'],
                        zipCodes: [],
                        radius: 50
                    },
                    investment: {
                        propertyTypes: ['commercial', 'office', 'retail'],
                        priceRange: { min: 1000000, max: 10000000 },
                        capRate: { min: 0.06, max: 0.10 }
                    },
                    professional: {
                        industries: ['Real Estate', 'Finance', 'Law'],
                        companySize: ['large', 'enterprise'],
                        jobTitles: ['CEO', 'CFO', 'Partner']
                    },
                    platforms: {
                        linkedin: true,
                        zillow: false,
                        realtor: false,
                        craigslist: false,
                        facebook: false
                    }
                },
                settings: {
                    maxLeadsPerDay: 25,
                    discoveryFrequency: 'weekly',
                    confidenceThreshold: 0.8
                }
            }
        ];
        
        res.json({
            success: true,
            icps
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get ICP profiles' });
    }
});

app.post('/api/icp', async (req, res) => {
    try {
        const { name, description, criteria, settings } = req.body;
        
        // Create new ICP
        const newICP = {
            id: `icp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            criteria,
            settings: settings || {
                maxLeadsPerDay: 50,
                discoveryFrequency: 'daily',
                confidenceThreshold: 0.7
            }
        };
        
        res.json({
            success: true,
            icp: newICP
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create ICP profile' });
    }
});

app.put('/api/icp/:id', async (req, res) => {
    try {
        const { name, description, criteria, settings } = req.body;
        const icpId = req.params.id;
        
        // Update ICP (mock implementation)
        const updatedICP = {
            id: icpId,
            name: name || 'Updated ICP',
            description: description || 'Updated description',
            criteria: criteria || {},
            settings: settings || {}
        };
        
        res.json({
            success: true,
            icp: updatedICP
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update ICP profile' });
    }
});

app.delete('/api/icp/:id', async (req, res) => {
    try {
        const icpId = req.params.id;
        
        // Delete ICP (mock implementation)
        res.json({
            success: true,
            message: `ICP ${icpId} deleted successfully`
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete ICP profile' });
    }
});

app.get('/api/icp/templates', async (req, res) => {
    try {
        // Mock ICP templates
        const templates = [
            {
                id: 'template_residential',
                name: 'Residential Investor Template',
                description: 'Ideal client profile for residential real estate investors',
                criteria: {
                    locations: {
                        cities: ['San Francisco', 'Los Angeles', 'San Diego'],
                        states: ['CA'],
                        radius: 25
                    },
                    investment: {
                        propertyTypes: ['single_family', 'multi_family'],
                        priceRange: { min: 200000, max: 2000000 },
                        capRate: { min: 0.05, max: 0.12 }
                    },
                    platforms: {
                        linkedin: true,
                        zillow: true,
                        realtor: true
                    }
                }
            },
            {
                id: 'template_commercial',
                name: 'Commercial Investor Template',
                description: 'Ideal client profile for commercial real estate investors',
                criteria: {
                    locations: {
                        cities: ['New York', 'Chicago', 'Boston'],
                        states: ['NY', 'IL', 'MA'],
                        radius: 50
                    },
                    investment: {
                        propertyTypes: ['commercial', 'office'],
                        priceRange: { min: 1000000, max: 10000000 },
                        capRate: { min: 0.06, max: 0.10 }
                    },
                    platforms: {
                        linkedin: true,
                        zillow: false,
                        realtor: false
                    }
                }
            }
        ];
        
        res.json({
            success: true,
            templates
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get ICP templates' });
    }
});

app.post('/api/icp/:id/discover', async (req, res) => {
    try {
        const icpId = req.params.id;
        
        // Mock ICP discovery with real platform integration
        const discoveryResult = {
            success: true,
            icpId,
            leads: [
                {
                    id: `icp_${Date.now()}_1`,
                    platform: 'linkedin',
                    url: 'https://www.linkedin.com/in/investor-profile',
                    profile: {
                        name: 'John Investor',
                        title: 'Real Estate Investor',
                        company: 'Investment Properties LLC',
                        email: 'john@investmentproperties.com',
                        phone: '+14155551234',
                        location: 'San Francisco, CA',
                        description: 'Experienced real estate investor specializing in multi-family properties',
                        linkedinUrl: 'https://linkedin.com/in/johninvestor'
                    },
                    property: {
                        address: '123 Main St, San Francisco, CA',
                        price: 750000,
                        type: 'multi_family',
                        beds: 4,
                        baths: 2,
                        sqft: 2400,
                        capRate: 0.08,
                        cashFlow: 3000
                    },
                    metadata: {
                        icpMatch: 0.92,
                        confidence: 0.88,
                        discoveryTime: new Date().toISOString(),
                        duplicate: false
                    }
                },
                {
                    id: `icp_${Date.now()}_2`,
                    platform: 'zillow',
                    url: 'https://www.zillow.com/homedetails/123-main-st',
                    profile: {
                        name: 'Sarah Manager',
                        title: 'Property Manager',
                        company: 'Real Estate Management Co',
                        email: 'sarah@remco.com',
                        phone: '+14155556789',
                        location: 'San Francisco, CA',
                        description: 'Property manager looking for investment opportunities'
                    },
                    property: {
                        address: '456 Oak Ave, San Francisco, CA',
                        price: 850000,
                        type: 'single_family',
                        beds: 3,
                        baths: 2,
                        sqft: 1800,
                        capRate: 0.07,
                        cashFlow: 2500
                    },
                    metadata: {
                        icpMatch: 0.85,
                        confidence: 0.91,
                        discoveryTime: new Date().toISOString(),
                        duplicate: false
                    }
                }
            ],
            summary: {
                totalFound: 2,
                duplicatesRemoved: 0,
                highConfidence: 2,
                platforms: {
                    linkedin: 1,
                    zillow: 1
                },
                avgMatchScore: 0.885
            },
            processingTime: 3500,
            errors: []
        };
        
        res.json(discoveryResult);
    } catch (error) {
        res.status(500).json({ error: 'ICP discovery failed' });
    }
});

// Automation endpoints
app.post('/api/automation/discovery', async (req, res) => {
    try {
        // Mock discovery automation using TinyFish API
        const sources = [
            { name: 'Zillow', url: 'https://www.zillow.com', type: 'mls' },
            { name: 'Realtor.com', url: 'https://www.realtor.com', type: 'mls' },
            { name: 'Craigslist', url: 'https://www.craigslist.org', type: 'forum' }
        ];
        
        const results = [];
        
        for (const source of sources) {
            // Simulate scraping with TinyFish API
            const mockResults = {
                source: source.name,
                leads: [
                    {
                        lead_id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        first_name: 'Auto',
                        last_name: 'Discovered',
                        email: `auto${Math.floor(Math.random() * 1000)}@${source.name.toLowerCase()}.com`,
                        phone_e164: `+1415555${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                        city: 'San Francisco',
                        province: 'CA',
                        source: source.name.toLowerCase(),
                        tags: ['auto-discovered', 'web-scraped'],
                        status: 'new',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        metadata: JSON.stringify({
                            discovery_source: source.name,
                            discovery_url: source.url,
                            confidence: 0.85,
                            discovered_at: new Date().toISOString()
                        })
                    }
                ],
                imported: 1,
                errors: []
            };
            results.push(mockResults);
        }
        
        res.json({
            success: true,
            results,
            summary: {
                totalSources: sources.length,
                totalLeads: results.reduce((sum, r) => sum + r.leads.length, 0),
                imported: results.reduce((sum, r) => sum + r.imported, 0)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Discovery automation failed' });
    }
});

app.post('/api/automation/enrichment', async (req, res) => {
    try {
        // Get all leads
        const leads = await readCsvFile('leads.csv');
        let enrichedCount = 0;
        
        // Simulate enrichment process
        for (const lead of leads.slice(0, 5)) { // Limit to 5 for demo
            // Simulate enrichment delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Mock enrichment data
            const enrichmentData = {
                company: {
                    name: 'Real Estate Investment Group',
                    domain: 'realestate.com',
                    industry: 'Real Estate Investment'
                },
                professional: {
                    title: 'Property Investor',
                    seniority: 'Senior'
                },
                contact: {
                    email_verified: true,
                    phone_verified: true
                },
                intent: {
                    buying_signals: ['Searching for investment properties'],
                    timeline: '1-3 months',
                    decision_maker: true
                }
            };
            
            const grade = {
                overall_score: 85,
                grade: 'A',
                factors: {
                    contact_quality: 90,
                    data_completeness: 80,
                    intent_signals: 85,
                    market_fit: 90,
                    engagement_potential: 80
                }
            };
            
            enrichedCount++;
        }
        
        res.json({
            success: true,
            enrichedCount,
            totalLeads: leads.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Enrichment automation failed' });
    }
});

app.post('/api/automation/full', async (req, res) => {
    try {
        // Run full automation workflow
        const startTime = Date.now();
        
        // Step 1: Discovery
        const discoveryResponse = await fetch(`http://localhost:3000/api/automation/discovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const discoveryResult = await discoveryResponse.json();
        
        // Step 2: Enrichment
        const enrichmentResponse = await fetch(`http://localhost:3000/api/automation/enrichment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const enrichmentResult = await enrichmentResponse.json();
        
        const processingTime = Date.now() - startTime;
        
        res.json({
            success: true,
            jobs: [
                { type: 'discovery', status: 'completed', result: discoveryResult },
                { type: 'enrichment', status: 'completed', result: enrichmentResult }
            ],
            summary: {
                totalJobs: 2,
                completedJobs: 2,
                failedJobs: 0,
                leadsDiscovered: discoveryResult.summary?.totalLeads || 0,
                leadsEnriched: enrichmentResult.enrichedCount || 0,
                processingTime
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Full automation failed' });
    }
});

app.get('/api/automation/status', async (req, res) => {
    try {
        // Mock automation status
        res.json({
            activeJobs: 0,
            recentJobs: [
                {
                    id: 'job_demo_1',
                    type: 'discovery',
                    status: 'completed',
                    startTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                    endTime: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
                    result: { leadsDiscovered: 3 }
                },
                {
                    id: 'job_demo_2',
                    type: 'enrichment',
                    status: 'completed',
                    startTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
                    endTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
                    result: { leadsEnriched: 5 }
                }
            ],
            config: {
                enableAutoDiscovery: true,
                enableAutoEnrichment: true,
                discoverySchedule: {
                    enabled: true,
                    frequency: 'daily'
                }
            },
            nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get automation status' });
    }
});

// Browser job endpoints
app.get('/api/browser/jobs', async (req, res) => {
    try {
        // Mock browser jobs data
        const jobs = [
            {
                job_id: 'job_1',
                status: 'completed',
                platform: 'linkedin',
                url: 'https://www.linkedin.com/messaging/',
                created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                completed_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
                result: { messages_extracted: 5, hot_items: 2 }
            },
            {
                job_id: 'job_2',
                status: 'running',
                platform: 'facebook',
                url: 'https://www.facebook.com/messages',
                created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                result: null
            }
        ];
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load browser jobs' });
    }
});

app.post('/api/browser/jobs', async (req, res) => {
    try {
        const newJob = {
            job_id: uuidv4(),
            status: 'queued',
            platform: req.body.platform,
            url: req.body.url,
            task: req.body.task,
            created_at: new Date().toISOString(),
            result: null
        };
        
        // In a real implementation, this would queue the job
        res.json(newJob);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create browser job' });
    }
});

app.get('/api/browser/jobs/:id', async (req, res) => {
    try {
        // Mock job details
        const job = {
            job_id: req.params.id,
            status: 'completed',
            platform: 'linkedin',
            url: 'https://www.linkedin.com/messaging/',
            task: 'extract_messages',
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            completed_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            result: { messages_extracted: 5, hot_items: 2 },
            artifacts: {
                screenshot: `/artifacts/${req.params.id}/screenshot.png`,
                trace: `/artifacts/${req.params.id}/trace.zip`,
                har: `/artifacts/${req.params.id}/network.har`
            }
        };
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load job details' });
    }
});

// DNC endpoints
app.get('/api/dnc', async (req, res) => {
    try {
        const dnc = await readCsvFile('dnc.csv');
        res.json(dnc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load DNC list' });
    }
});

app.post('/api/dnc', async (req, res) => {
    try {
        const dnc = await readCsvFile('dnc.csv');
        const newEntry = {
            value: req.body.value,
            reason: req.body.reason,
            ts_added: new Date().toISOString()
        };
        
        dnc.push(newEntry);
        await writeCsvFile('dnc.csv', dnc);
        
        res.json(newEntry);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add DNC entry' });
    }
});

// Analytics endpoints
app.get('/api/analytics/performance', async (req, res) => {
    try {
        const events = await readCsvFile('events.csv');
        const approvals = await readCsvFile('approvals.csv');
        
        // Calculate performance metrics
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentEvents = events.filter(e => new Date(e.ts) > last30Days);
        
        const dailyStats = {};
        for (let i = 29; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dailyStats[date] = {
                sent: recentEvents.filter(e => e.ts.startsWith(date) && e.event_type === 'message_sent').length,
                replied: recentEvents.filter(e => e.ts.startsWith(date) && e.event_type === 'reply_received').length,
                failed: recentEvents.filter(e => e.ts.startsWith(date) && e.event_type === 'send_failed').length
            };
        }
        
        const channelPerformance = {};
        ['email', 'whatsapp', 'telegram', 'linkedin', 'facebook'].forEach(channel => {
            const channelEvents = recentEvents.filter(e => e.channel === channel);
            channelPerformance[channel] = {
                sent: channelEvents.filter(e => e.event_type === 'message_sent').length,
                failed: channelEvents.filter(e => e.event_type === 'send_failed').length,
                success_rate: channelEvents.length > 0 ? 
                    (channelEvents.filter(e => e.event_type === 'message_sent').length / channelEvents.length * 100).toFixed(1) : 0
            };
        });
        
        res.json({
            daily_stats: dailyStats,
            channel_performance: channelPerformance,
            total_sent: recentEvents.filter(e => e.event_type === 'message_sent').length,
            total_failed: recentEvents.filter(e => e.event_type === 'send_failed').length,
            overall_success_rate: recentEvents.length > 0 ? 
                (recentEvents.filter(e => e.event_type === 'message_sent').length / recentEvents.length * 100).toFixed(1) : 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

// MCP Server Integration
app.get('/api/mcp/servers', async (req, res) => {
    try {
        // Return MCP server status
        const servers = [
            {
                id: 'reengine-core',
                name: 'RE Engine Core',
                status: 'connected',
                tools: ['approvals_list', 'approvals_approve', 'approvals_reject', 'leads_import_csv', 'events_query'],
                lastPing: new Date()
            },
            {
                id: 'reengine-browser',
                name: 'Browser Automation',
                status: 'connected',
                tools: ['browser_automate', 'browser_screenshot', 'browser_extract'],
                lastPing: new Date()
            },
            {
                id: 'reengine-tinyfish',
                name: 'TinyFish Scraper',
                status: 'connected',
                tools: ['scrape_url', 'extract_links', 'extract_images'],
                lastPing: new Date()
            },
            {
                id: 'reengine-integrations',
                name: 'External Integrations',
                status: 'connected',
                tools: [
                    'whatsapp_send_message',
                    'linkedin_send_message', 
                    'linkedin_get_profile',
                    'linkedin_send_connection',
                    'linkedin_search_people',
                    'facebook_send_message',
                    'facebook_get_page_info',
                    'facebook_post_to_page',
                    'facebook_get_user_profile',
                    'telegram_send_message',
                    'telegram_get_chat_info',
                    'telegram_send_document',
                    'telegram_create_channel',
                    'send_email'
                ],
                lastPing: new Date()
            }
        ];
        
        res.json({ success: true, servers });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get MCP servers' });
    }
});

app.post('/api/mcp/:serverId/call', async (req, res) => {
    try {
        const { serverId } = req.params;
        const { tool, parameters } = req.body;
        
        // Simulate MCP tool call
        const result = {
            success: true,
            serverId,
            tool,
            result: `Mock result for ${tool} with parameters: ${JSON.stringify(parameters)}`,
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'MCP tool call failed' });
    }
});

// Skills Integration
app.get('/api/skills', async (req, res) => {
    try {
        const skills = [
            {
                id: 'reengine-builder',
                name: 'RE Engine Builder',
                description: 'Build and scaffold RE Engine modules',
                icon: 'fas fa-hammer',
                category: 'development',
                status: 'connected',
                tools: ['build_module', 'scaffold_component', 'run_tests']
            },
            {
                id: 'reengine-coding-agent',
                name: 'Coding Agent',
                description: 'Write and refactor RE Engine code',
                icon: 'fas fa-code',
                category: 'development',
                status: 'connected',
                tools: ['write_code', 'refactor', 'add_tests']
            },
            {
                id: 'reengine-operator',
                name: 'Operator',
                description: 'Monitor approvals and process sends',
                icon: 'fas fa-user-shield',
                category: 'operations',
                status: 'connected',
                tools: ['show_approvals', 'approve', 'reject', 'run_router']
            },
            {
                id: 'reengine-playwright-agent',
                name: 'Playwright Agent',
                description: 'Browser automation with human-in-the-loop',
                icon: 'fas fa-browser',
                category: 'automation',
                status: 'connected',
                tools: ['browser_automate', 'screenshot', 'extract_data']
            },
            {
                id: 'reengine-tinyfish-scraper',
                name: 'TinyFish Scraper',
                description: 'Scrape data from any website',
                icon: 'fas fa-fish',
                category: 'scraping',
                status: 'connected',
                tools: ['scrape_url', 'extract_links', 'extract_images']
            },
            {
                id: 'reengine-mcp-setup',
                name: 'MCP Setup',
                description: 'Configure MCP servers and tools',
                icon: 'fas fa-server',
                category: 'infrastructure',
                status: 'connected',
                tools: ['setup_mcp', 'configure_tools', 'validate_config']
            },
            {
                id: 'reengine-self-healing',
                name: 'Self Healing',
                description: 'Auto-repair system issues',
                icon: 'fas fa-heart-pulse',
                category: 'maintenance',
                status: 'connected',
                tools: ['diagnose', 'auto_repair', 'health_check']
            },
            {
                id: 'reengine-release-and-pr',
                name: 'Release & PR',
                description: 'Manage releases and pull requests',
                icon: 'fas fa-code-branch',
                category: 'deployment',
                status: 'connected',
                tools: ['create_pr', 'merge_release', 'deploy']
            }
        ];
        
        res.json({ success: true, skills });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get skills' });
    }
});

app.post('/api/skills/:skillId/activate', async (req, res) => {
    try {
        const { skillId } = req.params;
        
        // Simulate skill activation
        const result = {
            success: true,
            skillId,
            status: 'activated',
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Skill activation failed' });
    }
});

app.post('/api/skills/:skillId/deactivate', async (req, res) => {
    try {
        const { skillId } = req.params;
        
        // Simulate skill deactivation
        const result = {
            success: true,
            skillId,
            status: 'deactivated',
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Skill deactivation failed' });
    }
});

// Automation endpoints
app.post('/api/automation/full', async (req, res) => {
    try {
        // Simulate full automation workflow
        const result = {
            success: true,
            workflow: 'full_automation',
            steps: [
                { step: 'activate_skills', status: 'completed', duration: 2.1 },
                { step: 'run_discovery', status: 'completed', duration: 15.3 },
                { step: 'process_leads', status: 'completed', duration: 3.7 },
                { step: 'enrich_data', status: 'completed', duration: 8.2 },
                { step: 'generate_approvals', status: 'completed', duration: 1.5 }
            ],
            totalDuration: 30.8,
            leadsProcessed: 47,
            approvalsGenerated: 12,
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Full automation failed' });
    }
});

app.get('/api/automation/jobs', async (req, res) => {
    try {
        // Return running automation jobs
        const jobs = [
            {
                id: 'job_1',
                name: 'LinkedIn Profile Scraping',
                skill: 'Playwright Agent',
                progress: 75,
                status: 'running',
                startTime: new Date(Date.now() - 120000),
                estimatedCompletion: new Date(Date.now() + 40000)
            },
            {
                id: 'job_2',
                name: 'Zillow Data Extraction',
                skill: 'TinyFish Scraper',
                progress: 45,
                status: 'running',
                startTime: new Date(Date.now() - 180000),
                estimatedCompletion: new Date(Date.now() + 120000)
            }
        ];
        
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get jobs' });
    }
});

// Real Platform Integration Endpoints

// WhatsApp Integration
app.post('/api/integrations/whatsapp/send', async (req, res) => {
    try {
        const { to, message, type = 'text', mediaUrl } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({ error: 'Phone number and message are required' });
        }

        // Call MCP server for WhatsApp
        const mcpResult = await callMCPTool('reengine-integrations', 'whatsapp_send_message', {
            to,
            message,
            type,
            mediaUrl
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'WhatsApp send failed: ' + error.message });
    }
});

// LinkedIn Integration
app.post('/api/integrations/linkedin/send-message', async (req, res) => {
    try {
        const { profileId, message } = req.body;
        
        if (!profileId || !message) {
            return res.status(400).json({ error: 'Profile ID and message are required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'linkedin_send_message', {
            profileId,
            message
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'LinkedIn send failed: ' + error.message });
    }
});

app.get('/api/integrations/linkedin/profile/:profileId', async (req, res) => {
    try {
        const { profileId } = req.params;
        
        const mcpResult = await callMCPTool('reengine-integrations', 'linkedin_get_profile', {
            profileId
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'LinkedIn profile fetch failed: ' + error.message });
    }
});

app.post('/api/integrations/linkedin/connect', async (req, res) => {
    try {
        const { profileId, message } = req.body;
        
        if (!profileId || !message) {
            return res.status(400).json({ error: 'Profile ID and message are required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'linkedin_send_connection', {
            profileId,
            message
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'LinkedIn connection failed: ' + error.message });
    }
});

app.post('/api/integrations/linkedin/search', async (req, res) => {
    try {
        const { searchQuery } = req.body;
        
        if (!searchQuery) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'linkedin_search_people', {
            searchQuery
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'LinkedIn search failed: ' + error.message });
    }
});

// Facebook Integration
app.post('/api/integrations/facebook/send-message', async (req, res) => {
    try {
        const { pageId, userId, message } = req.body;
        
        if (!pageId || !userId || !message) {
            return res.status(400).json({ error: 'Page ID, User ID, and message are required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'facebook_send_message', {
            pageId,
            userId,
            message
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Facebook send failed: ' + error.message });
    }
});

app.get('/api/integrations/facebook/page/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        
        const mcpResult = await callMCPTool('reengine-integrations', 'facebook_get_page_info', {
            pageId
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Facebook page info fetch failed: ' + error.message });
    }
});

app.post('/api/integrations/facebook/post', async (req, res) => {
    try {
        const { pageId, postContent } = req.body;
        
        if (!pageId || !postContent) {
            return res.status(400).json({ error: 'Page ID and post content are required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'facebook_post_to_page', {
            pageId,
            postContent
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Facebook post failed: ' + error.message });
    }
});

app.get('/api/integrations/facebook/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const mcpResult = await callMCPTool('reengine-integrations', 'facebook_get_user_profile', {
            userId
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Facebook user profile fetch failed: ' + error.message });
    }
});

// Telegram Integration
app.post('/api/integrations/telegram/send-message', async (req, res) => {
    try {
        const { chatId, message } = req.body;
        
        if (!chatId || !message) {
            return res.status(400).json({ error: 'Chat ID and message are required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'telegram_send_message', {
            chatId,
            message
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Telegram send failed: ' + error.message });
    }
});

app.get('/api/integrations/telegram/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        
        const mcpResult = await callMCPTool('reengine-integrations', 'telegram_get_chat_info', {
            chatId
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Telegram chat info fetch failed: ' + error.message });
    }
});

app.post('/api/integrations/telegram/send-document', async (req, res) => {
    try {
        const { chatId, documentUrl } = req.body;
        
        if (!chatId || !documentUrl) {
            return res.status(400).json({ error: 'Chat ID and document URL are required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'telegram_send_document', {
            chatId,
            documentUrl
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Telegram document send failed: ' + error.message });
    }
});

app.post('/api/integrations/telegram/create-channel', async (req, res) => {
    try {
        const { channelName } = req.body;
        
        if (!channelName) {
            return res.status(400).json({ error: 'Channel name is required' });
        }

        const mcpResult = await callMCPTool('reengine-integrations', 'telegram_create_channel', {
            channelName
        });

        res.json(mcpResult);
    } catch (error) {
        res.status(500).json({ error: 'Telegram channel creation failed: ' + error.message });
    }
});

// MCP Tool Call Helper
async function callMCPTool(serverId, tool, parameters) {
    // In a real implementation, this would call the actual MCP server
    // For now, we'll simulate the call with environment variable checks
    const hasCredentials = checkPlatformCredentials(serverId, tool);
    
    if (!hasCredentials) {
        return {
            success: false,
            error: `Missing credentials for ${serverId}. Please set required environment variables.`
        };
    }

    // Simulate successful call
    return {
        success: true,
        serverId,
        tool,
        result: `Mock result for ${tool} with parameters: ${JSON.stringify(parameters)}`,
        timestamp: new Date().toISOString()
    };
}

function checkPlatformCredentials(serverId, tool) {
    // Check for required environment variables based on platform
    switch (serverId) {
        case 'reengine-integrations':
            if (tool.includes('whatsapp')) {
                return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
            }
            if (tool.includes('linkedin')) {
                return !!process.env.LINKEDIN_ACCESS_TOKEN;
            }
            if (tool.includes('facebook')) {
                return !!process.env.FACEBOOK_ACCESS_TOKEN;
            }
            if (tool.includes('telegram')) {
                return !!process.env.TELEGRAM_BOT_TOKEN;
            }
            if (tool.includes('email')) {
                return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
            }
            break;
    }
    return true;
}

// Serve the main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`RE Engine Dashboard running on http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
});
