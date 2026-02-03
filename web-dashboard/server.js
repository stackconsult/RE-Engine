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
        
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
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

// Settings endpoints
app.get('/api/settings', async (req, res) => {
    try {
        // Mock settings - in real system, this would come from config files
        const settings = {
            rate_limits: {
                email: { per_hour: 50, per_day: 500, min_delay_seconds: 30 },
                whatsapp: { per_hour: 20, per_day: 150, min_delay_seconds: 180 },
                telegram: { per_hour: 30, per_day: 200, min_delay_seconds: 120 },
                linkedin: { per_hour: 5, per_day: 25, min_delay_seconds: 600 },
                facebook: { per_hour: 5, per_day: 25, min_delay_seconds: 600 }
            },
            channels: {
                email: { enabled: true, smtp_host: 'mail.spacemail.com' },
                whatsapp: { enabled: true, pairing_mode: 'pairing' },
                telegram: { enabled: true, bot_token_configured: true },
                linkedin: { enabled: true, browser_automation: true },
                facebook: { enabled: true, browser_automation: true }
            },
            automation: {
                daily_draft_limit: 150,
                approval_processing_interval: 300, // seconds
                imap_poll_interval: 900, // seconds
                social_ingest_times: ['08:30', '16:30']
            }
        };
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

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
