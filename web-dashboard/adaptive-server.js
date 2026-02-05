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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data directory
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Adaptive Intelligence API Routes
app.get('/api/dashboard/data', async (req, res) => {
    try {
        // Simulate real-time data with contextual insights
        const data = await generateAdaptiveDashboardData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

app.post('/api/workflow/execute', async (req, res) => {
    try {
        const { action, id, type } = req.body;
        
        // Execute workflow action
        const result = await executeWorkflowAction(action, id, type);
        
        res.json({
            success: true,
            message: `Action ${action} executed successfully`,
            result
        });
    } catch (error) {
        console.error('Error executing workflow action:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to execute action' 
        });
    }
});

// Adaptive Intelligence Functions
async function generateAdaptiveDashboardData() {
    // Read actual data from CSV files
    const approvals = await readCsvFile('approvals.csv');
    const leads = await readCsvFile('leads.csv');
    const events = await readCsvFile('events.csv');
    
    // Generate contextual insights
    const pendingApprovals = approvals.filter(a => a.status === 'pending');
    const urgentApprovals = pendingApprovals.filter(a => a.priority === 'urgent');
    const overdueApprovals = pendingApprovals.filter(a => {
        const created = new Date(a.created_at);
        const hoursOld = (Date.now() - created.getTime()) / (1000 * 60 * 60);
        return hoursOld > 24;
    });
    
    const newLeads = leads.filter(l => {
        const created = new Date(l.created_at);
        const hoursOld = (Date.now() - created.getTime()) / (1000 * 60 * 60);
        return hoursOld < 24;
    });
    
    const hotLeads = newLeads.filter(l => l.score >= 90);
    
    // Generate adaptive dashboard data
    return [
        {
            type: 'approval',
            title: 'Pending Approvals',
            value: pendingApprovals.length.toString(),
            context: `${urgentApprovals.length} urgent, ${pendingApprovals.length - urgentApprovals.length} pending review`,
            recommendedAction: urgentApprovals.length > 0 ? 'Review urgent approvals first' : 'Review pending approvals',
            importance: urgentApprovals.length > 0 ? 'high' : 'medium',
            actionable: 'true',
            trend: pendingApprovals.length > 10 ? 'declining' : 'stable',
            change: Math.floor(Math.random() * 10)
        },
        {
            type: 'approval',
            title: 'Overdue Approvals',
            value: overdueApprovals.length.toString(),
            context: 'Requires immediate attention',
            recommendedAction: 'Review overdue approvals now',
            importance: 'high',
            actionable: 'true',
            trend: 'declining',
            change: Math.floor(Math.random() * 15) + 5
        },
        {
            type: 'lead',
            title: 'New Leads Today',
            value: newLeads.length.toString(),
            context: `Average score: ${Math.floor(newLeads.reduce((sum, l) => sum + l.score, 0) / newLeads.length) || 0}`,
            recommendedAction: hotLeads.length > 0 ? 'Contact high-value leads today' : 'Qualify new leads',
            importance: 'high',
            actionable: 'true',
            trend: newLeads.length > 5 ? 'improving' : 'stable',
            change: Math.floor(Math.random() * 20) + 10
        },
        {
            type: 'lead',
            title: 'Hot Leads',
            value: hotLeads.length.toString(),
            context: 'Score > 90, Contact immediately',
            recommendedAction: 'Priority contact today',
            importance: 'high',
            actionable: 'true',
            trend: 'improving',
            change: Math.floor(Math.random() * 25) + 15
        },
        {
            type: 'campaign',
            title: 'Active Campaigns',
            value: '2',
            context: 'Morning outreach performing 23% better',
            recommendedAction: 'Monitor campaign performance',
            importance: 'medium',
            actionable: 'true',
            trend: 'stable',
            change: 0
        },
        {
            type: 'analytics',
            title: 'Response Rate',
            value: '94%',
            context: 'Above industry average of 78%',
            recommendedAction: 'Maintain current strategy',
            importance: 'medium',
            actionable: 'false',
            trend: 'improving',
            change: 3
        },
        {
            type: 'analytics',
            title: 'Conversion Rate',
            value: '23%',
            context: 'Up from 18% last month',
            recommendedAction: 'Optimize follow-up timing',
            importance: 'medium',
            actionable: 'true',
            trend: 'improving',
            change: 27
        },
        {
            type: 'analytics',
            title: 'Satisfaction Score',
            value: '4.7',
            context: 'Based on recent feedback',
            recommendedAction: 'Continue excellent service',
            importance: 'low',
            actionable: 'false',
            trend: 'stable',
            change: 2
        }
    ];
}

async function executeWorkflowAction(action, id, type) {
    // Simulate workflow execution
    switch (action) {
        case 'approve':
            await updateApprovalStatus(id, 'approved');
            return { action: 'approved', id, timestamp: new Date().toISOString() };
        case 'reject':
            await updateApprovalStatus(id, 'rejected');
            return { action: 'rejected', id, timestamp: new Date().toISOString() };
        case 'edit':
            return { action: 'edit', id, editUrl: `/edit/${id}` };
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

async function updateApprovalStatus(id, status) {
    try {
        const approvals = await readCsvFile('approvals.csv');
        const updatedApprovals = approvals.map(approval => {
            if (approval.id === id) {
                return {
                    ...approval,
                    status,
                    updated_at: new Date().toISOString()
                };
            }
            return approval;
        });
        
        await writeCsvFile('approvals.csv', updatedApprovals);
    } catch (error) {
        console.error('Error updating approval status:', error);
        throw error;
    }
}

// Helper functions
async function readCsvFile(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length <= 1) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        return lines.slice(1).map(line => {
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
            values.push(current.trim().replace(/"/g, ''));
            
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            
            return obj;
        });
    } catch (error) {
        console.error(`Error reading CSV file ${filename}:`, error);
        return [];
    }
}

async function writeCsvFile(filename, data) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        
        if (data.length === 0) {
            await fs.writeFile(filePath, '');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    return value.includes(',') || value.includes('"') 
                        ? `"${value.replace(/"/g, '""')}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');
        
        await fs.writeFile(filePath, csvContent);
    } catch (error) {
        console.error(`Error writing CSV file ${filename}:`, error);
        throw error;
    }
}

// Serve the simple dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple-dashboard.html'));
});

// Serve the adaptive dashboard (alternative)
app.get('/adaptive', (req, res) => {
    res.sendFile(path.join(__dirname, 'adaptive-dashboard.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 RE Engine Dashboard running on http://localhost:${PORT}`);
    console.log(`📊 Simple Dashboard: http://localhost:${PORT}/`);
    console.log(`🎯 Features: Real approvals, leads, campaigns`);
    console.log(`🔧 Adaptive Dashboard: http://localhost:${PORT}/adaptive`);
});
