// RE Engine - Integrated OpenCLAW Skills Platform
class REEngine {
    constructor() {
        this.currentSection = 'overview';
        this.icps = [];
        this.leads = [];
        this.approvals = [];
        this.discoveryResults = [];
        this.activeSkills = new Map();
        this.mcpServers = new Map();
        this.runningJobs = new Map();
        
        // Define all OpenCLAW skills
        this.skills = [
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
        
        // Define MCP servers
        this.mcpServerDefinitions = [
            {
                id: 'reengine-core',
                name: 'RE Engine Core',
                status: 'connected',
                tools: ['approvals_list', 'approvals_approve', 'approvals_reject', 'leads_import_csv', 'events_query']
            },
            {
                id: 'reengine-browser',
                name: 'Browser Automation',
                status: 'connected',
                tools: ['browser_automate', 'browser_screenshot', 'browser_extract']
            },
            {
                id: 'reengine-tinyfish',
                name: 'TinyFish Scraper',
                status: 'connected',
                tools: ['scrape_url', 'extract_links', 'extract_images']
            },
            {
                id: 'reengine-integrations',
                name: 'External Integrations',
                status: 'connected',
                tools: ['linkedin_connect', 'email_send', 'whatsapp_send', 'telegram_send']
            }
        ];
        
        this.init();
    }

    init() {
        // Initialize skills and MCP servers
        this.initializeSkills();
        this.initializeMCPServers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        this.loadData();
        
        // Start real-time updates
        this.startRealTimeUpdates();
    }

    initializeSkills() {
        this.skills.forEach(skill => {
            this.activeSkills.set(skill.id, {
                ...skill,
                active: false,
                lastUsed: null,
                jobCount: 0
            });
        });
    }

    initializeMCPServers() {
        this.mcpServerDefinitions.forEach(server => {
            this.mcpServers.set(server.id, {
                ...server,
                connected: true,
                lastPing: new Date(),
                toolCount: server.tools.length
            });
        });
    }

    setupEventListeners() {
        // Real-time updates
        setInterval(() => this.updateTime(), 1000);
        setInterval(() => this.refreshData(), 30000);
        setInterval(() => this.checkSkillHealth(), 10000);
    }

    startRealTimeUpdates() {
        // Update MCP server status
        setInterval(() => {
            this.updateMCPStatus();
        }, 5000);
        
        // Update running jobs
        setInterval(() => {
            this.updateRunningJobs();
        }, 2000);
    }

    async loadData() {
        try {
            // Load all data in parallel
            const [icps, leads, approvals] = await Promise.all([
                this.fetchData('/api/icp'),
                this.fetchData('/api/leads'),
                this.fetchData('/api/approvals')
            ]);

            this.icps = icps.success ? icps.icps || [] : [];
            this.leads = leads.success ? leads || [] : [];
            this.approvals = approvals.success ? approvals || [];

            // Update current section
            this.loadSectionData(this.currentSection);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Failed to load data', 'error');
        }
    }

    async fetchData(endpoint) {
        try {
            const response = await fetch(endpoint);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return { success: false };
        }
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('section[id$="-section"]');
        sections.forEach(section => section.classList.add('hidden'));
        
        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        // Update sidebar
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => item.classList.remove('active'));
        
        const activeItem = document.querySelector(`.sidebar-item[onclick="showSection('${sectionName}')"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        this.currentSection = sectionName;
        
        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    loadSectionData(sectionName) {
        switch(sectionName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'icp':
                this.loadICPData();
                break;
            case 'discovery':
                this.loadDiscoveryData();
                break;
            case 'leads':
                this.loadLeadsData();
                break;
            case 'approvals':
                this.loadApprovalsData();
                break;
            case 'channels':
                this.loadChannelsData();
                break;
            case 'automation':
                this.loadAutomationData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
        }
    }

    loadOverviewData() {
        // Update stats
        document.getElementById('total-leads').textContent = this.leads.length;
        document.getElementById('active-icps').textContent = this.icps.length;
        document.getElementById('discovered-today').textContent = this.leads.filter(l => 
            new Date(l.created_at).toDateString() === new Date().toDateString()
        ).length;
        document.getElementById('pending-approvals').textContent = this.approvals.filter(a => 
            a.status === 'pending'
        ).length;

        // Load recent activity
        this.loadRecentActivity();
    }

    loadRecentActivity() {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;

        const activities = [
            {
                type: 'skill',
                message: 'Playwright Agent completed LinkedIn scraping',
                time: '2 minutes ago',
                icon: 'fas fa-browser',
                color: 'text-blue-600'
            },
            {
                type: 'discovery',
                message: 'ICP Discovery completed for "San Francisco Residential Investors"',
                time: '1 hour ago',
                icon: 'fas fa-search',
                color: 'text-green-600'
            },
            {
                type: 'approval',
                message: 'Operator approved 3 leads for outreach',
                time: '3 hours ago',
                icon: 'fas fa-check',
                color: 'text-purple-600'
            },
            {
                type: 'mcp',
                message: 'TinyFish MCP server connected and ready',
                time: '5 hours ago',
                icon: 'fas fa-server',
                color: 'text-orange-600'
            }
        ];

        activityContainer.innerHTML = activities.map(activity => `
            <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <i class="fas ${activity.icon} ${activity.color}"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${activity.message}</p>
                    <p class="text-xs text-gray-500">${activity.time}</p>
                </div>
            </div>
        `).join('');
    }

    loadICPData() {
        const icpList = document.getElementById('icp-list');
        if (!icpList) return;

        icpList.innerHTML = this.icps.map(icp => `
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">${icp.name}</h3>
                    <div class="flex space-x-2">
                        <button onclick="editICP('${icp.id}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteICP('${icp.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mb-4">${icp.description}</p>
                
                <div class="space-y-2">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">Locations:</span>
                        <span class="font-medium">${icp.criteria?.locations?.cities?.join(', ') || 'N/A'}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">Price Range:</span>
                        <span class="font-medium">$${(icp.criteria?.investment?.priceRange?.min || 0).toLocaleString()} - $${(icp.criteria?.investment?.priceRange?.max || 0).toLocaleString()}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">Platforms:</span>
                        <div class="flex space-x-1">
                            ${Object.entries(icp.criteria?.platforms || {}).map(([platform, enabled]) => 
                                enabled ? `<span class="platform-badge platform-${platform}">${platform}</span>` : ''
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <button onclick="runICPDiscovery('${icp.id}')" class="modern-button modern-button-primary w-full">
                        <i class="fas fa-search mr-2"></i>Run Discovery
                    </button>
                </div>
            </div>
        `).join('');
    }

    loadDiscoveryData() {
        // Update ICP select
        const icpSelect = document.getElementById('discovery-icp-select');
        if (icpSelect) {
            icpSelect.innerHTML = '<option value="">Choose an ICP profile...</option>' +
                this.icps.map(icp => `<option value="${icp.id}">${icp.name}</option>`).join('');
        }

        // Load discovery results
        this.loadDiscoveryResults();
    }

    loadDiscoveryResults() {
        const resultsContainer = document.getElementById('discovery-results');
        if (!resultsContainer) return;

        if (this.discoveryResults.length === 0) {
            resultsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No discovery results yet. Run a discovery to see results.</p>';
            return;
        }

        resultsContainer.innerHTML = this.discoveryResults.map(result => `
            <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 rounded-full ${result.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}"></div>
                        <span class="font-medium">${result.icpName}</span>
                    </div>
                    <span class="text-sm text-gray-500">${result.time}</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span class="text-gray-600">Leads Found:</span>
                        <span class="font-medium ml-2">${result.leadsFound}</span>
                    </div>
                    <div>
                        <span class="text-gray-600">High Quality:</span>
                        <span class="font-medium text-green-600 ml-2">${result.highQuality}</span>
                    </div>
                    <div>
                        <span class="text-gray-600">Avg Match:</span>
                        <span class="font-medium ml-2">${result.avgMatch}%</span>
                    </div>
                    <div>
                        <span class="text-gray-600">Duration:</span>
                        <span class="font-medium ml-2">${result.duration}s</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    loadLeadsData() {
        const leadsTable = document.getElementById('leads-table');
        if (!leadsTable) return;

        leadsTable.innerHTML = this.leads.map(lead => `
            <tr class="border-b border-gray-100">
                <td class="py-3 px-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-blue-600 text-sm"></i>
                        </div>
                        <div>
                            <div class="font-medium">${lead.first_name} ${lead.last_name}</div>
                            <div class="text-sm text-gray-500">${lead.status}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-sm">
                        <div>${lead.email || 'N/A'}</div>
                        <div class="text-gray-500">${lead.phone_e164 || 'N/A'}</div>
                    </div>
                </td>
                <td class="py-3 px-4">${lead.city}, ${lead.province}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center space-x-2">
                        <div class="w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-green-500 h-2 rounded-full" style="width: ${Math.random() * 100}%"></div>
                        </div>
                        <span class="text-sm font-medium">${Math.floor(Math.random() * 30 + 70)}%</span>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="platform-badge platform-${lead.source}">${lead.source}</span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex space-x-2">
                        <button onclick="viewLead('${lead.lead_id}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editLead('${lead.lead_id}')" class="text-gray-600 hover:text-gray-800">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    loadApprovalsData() {
        const approvalsList = document.getElementById('approvals-list');
        if (!approvalsList) return;

        // Update stats
        const pendingCount = this.approvals.filter(a => a.status === 'pending').length;
        const approvedCount = this.approvals.filter(a => a.status === 'approved').length;
        const rejectedCount = this.approvals.filter(a => a.status === 'rejected').length;
        
        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('approved-count').textContent = approvedCount;
        document.getElementById('rejected-count').textContent = rejectedCount;
        document.getElementById('total-count').textContent = this.approvals.length;

        // Render approval cards
        approvalsList.innerHTML = this.approvals.map(approval => `
            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-4 flex-1">
                        <input type="checkbox" class="approval-checkbox mt-1" value="${approval.approval_id}" 
                               onchange="updateSelectedCount()">
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-2">
                                <div>
                                    <div class="font-semibold text-gray-900">${approval.draft_to}</div>
                                    <div class="text-sm text-gray-500">Lead: ${approval.lead_id}</div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                        approval.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                        approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }">
                                        ${approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                    </span>
                                    <span class="text-xs text-gray-500">
                                        ${new Date(approval.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div class="text-sm text-gray-600 mb-2">
                                <strong>Subject:</strong> ${approval.draft_subject}
                            </div>
                            <div class="text-sm text-gray-600 mb-4 line-clamp-2">
                                ${approval.draft_content}
                            </div>
                            ${approval.rejection_reason ? `
                                <div class="bg-red-50 border border-red-200 rounded p-2 mb-2">
                                    <div class="text-sm text-red-800">
                                        <strong>Rejection Reason:</strong> ${approval.rejection_reason}
                                    </div>
                                </div>
                            ` : ''}
                            <div class="flex items-center justify-between">
                                <div class="text-xs text-gray-500">
                                    ${approval.approved_by ? `Approved by: ${approval.approved_by}` : ''}
                                </div>
                                <div class="flex space-x-2">
                                    ${approval.status === 'pending' ? `
                                        <button onclick="approveLead('${approval.approval_id}')" 
                                                class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                                            <i class="fas fa-check mr-1"></i>Approve
                                        </button>
                                        <button onclick="rejectLead('${approval.approval_id}')" 
                                                class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
                                            <i class="fas fa-times mr-1"></i>Reject
                                        </button>
                                    ` : ''}
                                    ${approval.status === 'approved' ? `
                                        <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
                                            <i class="fas fa-check mr-1"></i>Approved
                                        </span>
                                    ` : ''}
                                    ${approval.status === 'rejected' ? `
                                        <span class="px-3 py-1 bg-red-100 text-red-800 text-sm rounded">
                                            <i class="fas fa-times mr-1"></i>Rejected
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        `).join('');
        
        this.updateSelectedCount();
    }

    loadAutomationData() {
        // Load active skills
        const activeSkillsContainer = document.getElementById('active-skills');
        if (activeSkillsContainer) {
            const activeSkills = Array.from(this.activeSkills.values()).filter(skill => skill.active);
            activeSkillsContainer.innerHTML = activeSkills.map(skill => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <i class="${skill.icon} text-gray-600"></i>
                        <div>
                            <div class="font-medium text-sm">${skill.name}</div>
                            <div class="text-xs text-gray-500">${skill.jobCount} jobs running</div>
                        </div>
                    </div>
                    <button onclick="toggleSkill('${skill.id}')" class="modern-button modern-button-secondary text-sm">
                        Stop
                    </button>
                </div>
            `).join('');
        }

        // Load running jobs
        const runningJobsContainer = document.getElementById('running-jobs');
        if (runningJobsContainer) {
            runningJobsContainer.innerHTML = Array.from(this.runningJobs.values()).map(job => `
                <div class="border border-gray-200 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-medium text-sm">${job.name}</span>
                        <span class="text-xs text-gray-500">${job.progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${job.progress}%"></div>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-xs text-gray-500">${job.skill}</span>
                        <button onclick="stopJob('${job.id}')" class="text-red-600 hover:text-red-800 text-xs">
                            Stop
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    loadAnalyticsData() {
        // Update analytics stats
        const totalDiscovered = this.leads.length;
        const highQuality = this.leads.filter(l => l.grade === 'A' || l.grade === 'B').length;
        const avgMatch = Math.floor(Math.random() * 20 + 75);

        document.getElementById('analytics-total-discovered').textContent = totalDiscovered;
        document.getElementById('analytics-high-quality').textContent = highQuality;
        document.getElementById('analytics-avg-match').textContent = avgMatch + '%';

        // Platform performance
        const platformPerformance = document.getElementById('platform-performance');
        if (platformPerformance) {
            const platforms = ['linkedin', 'zillow', 'realtor', 'facebook'];
            platformPerformance.innerHTML = platforms.map(platform => {
                const count = this.leads.filter(l => l.source === platform).length;
                return `
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600 capitalize">${platform}</span>
                        <span class="text-sm font-medium">${count} leads</span>
                    </div>
                `;
            }).join('');
        }
    }

    loadChannelsData() {
        // Load recent messages
        this.loadRecentMessages();
    }

    loadRecentMessages() {
        const messagesContainer = document.getElementById('recent-messages');
        if (!messagesContainer) return;

        const recentMessages = [
            {
                platform: 'whatsapp',
                icon: 'fab fa-whatsapp text-green-600',
                recipient: '+1234567890',
                message: 'Hi! I\'m interested in learning more about your real estate services.',
                time: '2 minutes ago',
                status: 'sent'
            },
            {
                platform: 'linkedin',
                icon: 'fab fa-linkedin text-blue-600',
                recipient: 'John Smith',
                message: 'Thank you for connecting! I\'d love to discuss potential investment opportunities.',
                time: '1 hour ago',
                status: 'sent'
            },
            {
                platform: 'telegram',
                icon: 'fab fa-telegram text-blue-500',
                recipient: '@realestate_channel',
                message: 'New property listing available in downtown area.',
                time: '3 hours ago',
                status: 'sent'
            },
            {
                platform: 'facebook',
                icon: 'fab fa-facebook text-blue-700',
                recipient: 'Sarah Johnson',
                message: 'Thanks for reaching out! When would be a good time to schedule a call?',
                time: '5 hours ago',
                status: 'received'
            }
        ];

        messagesContainer.innerHTML = recentMessages.map(msg => `
            <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <i class="${msg.icon}"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-gray-900">${msg.recipient}</p>
                        <span class="text-xs text-gray-500">${msg.time}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">${msg.message}</p>
                </div>
                <div class="w-2 h-2 rounded-full ${msg.status === 'sent' ? 'bg-green-500' : 'bg-blue-500'}"></div>
            </div>
        `).join('');
    }

    // Platform Integration Functions
    showWhatsAppModal() {
        document.getElementById('whatsapp-modal').classList.remove('hidden');
    }

    hideWhatsAppModal() {
        document.getElementById('whatsapp-modal').classList.add('hidden');
        this.clearWhatsAppForm();
    }

    clearWhatsAppForm() {
        document.getElementById('whatsapp-to').value = '';
        document.getElementById('whatsapp-type').value = 'text';
        document.getElementById('whatsapp-media-url').value = '';
        document.getElementById('whatsapp-message').value = '';
        document.getElementById('whatsapp-media-section').classList.add('hidden');
    }

    async sendWhatsAppMessage() {
        const to = document.getElementById('whatsapp-to').value;
        const type = document.getElementById('whatsapp-type').value;
        const message = document.getElementById('whatsapp-message').value;
        const mediaUrl = document.getElementById('whatsapp-media-url').value;

        if (!to || !message) {
            this.showNotification('Phone number and message are required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/integrations/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, message, type, mediaUrl })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('WhatsApp message sent successfully!', 'success');
                this.hideWhatsAppModal();
                this.loadRecentMessages();
            } else {
                this.showNotification('Failed to send WhatsApp message: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Error sending WhatsApp message: ' + error.message, 'error');
        }
    }

    async testWhatsAppConnection() {
        try {
            const response = await fetch('/api/integrations/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    to: '+1234567890', 
                    message: 'Test connection from RE Engine',
                    type: 'text'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('WhatsApp connection test successful!', 'success');
            } else {
                this.showNotification('WhatsApp connection test failed: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('WhatsApp connection test error: ' + error.message, 'error');
        }
    }

    showLinkedInModal() {
        document.getElementById('linkedin-modal').classList.remove('hidden');
    }

    hideLinkedInModal() {
        document.getElementById('linkedin-modal').classList.add('hidden');
        document.getElementById('linkedin-profile-id').value = '';
        document.getElementById('linkedin-message').value = '';
    }

    async sendLinkedInMessage() {
        const profileId = document.getElementById('linkedin-profile-id').value;
        const message = document.getElementById('linkedin-message').value;

        if (!profileId || !message) {
            this.showNotification('Profile ID and message are required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/integrations/linkedin/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId, message })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('LinkedIn message sent successfully!', 'success');
                this.hideLinkedInModal();
                this.loadRecentMessages();
            } else {
                this.showNotification('Failed to send LinkedIn message: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Error sending LinkedIn message: ' + error.message, 'error');
        }
    }

    showLinkedInSearch() {
        document.getElementById('linkedin-search-modal').classList.remove('hidden');
    }

    hideLinkedInSearch() {
        document.getElementById('linkedin-search-modal').classList.add('hidden');
        document.getElementById('linkedin-search-query').value = '';
    }

    async searchLinkedInPeople() {
        const searchQuery = document.getElementById('linkedin-search-query').value;

        if (!searchQuery) {
            this.showNotification('Search query is required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/integrations/linkedin/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchQuery })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('LinkedIn search completed!', 'success');
                this.hideLinkedInSearch();
                // TODO: Display search results in a modal
            } else {
                this.showNotification('LinkedIn search failed: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Error searching LinkedIn: ' + error.message, 'error');
        }
    }

    showFacebookModal() {
        document.getElementById('facebook-modal').classList.remove('hidden');
    }

    hideFacebookModal() {
        document.getElementById('facebook-modal').classList.add('hidden');
        document.getElementById('facebook-page-id').value = '';
        document.getElementById('facebook-user-id').value = '';
        document.getElementById('facebook-message').value = '';
    }

    async sendFacebookMessage() {
        const pageId = document.getElementById('facebook-page-id').value;
        const userId = document.getElementById('facebook-user-id').value;
        const message = document.getElementById('facebook-message').value;

        if (!pageId || !userId || !message) {
            this.showNotification('Page ID, User ID, and message are required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/integrations/facebook/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId, userId, message })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Facebook message sent successfully!', 'success');
                this.hideFacebookModal();
                this.loadRecentMessages();
            } else {
                this.showNotification('Failed to send Facebook message: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Error sending Facebook message: ' + error.message, 'error');
        }
    }

    showFacebookPost() {
        document.getElementById('facebook-post-modal').classList.remove('hidden');
    }

    hideFacebookPost() {
        document.getElementById('facebook-post-modal').classList.add('hidden');
        document.getElementById('facebook-post-page-id').value = '';
        document.getElementById('facebook-post-content').value = '';
    }

    async createFacebookPost() {
        const pageId = document.getElementById('facebook-post-page-id').value;
        const postContent = document.getElementById('facebook-post-content').value;

        if (!pageId || !postContent) {
            this.showNotification('Page ID and post content are required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/integrations/facebook/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId, postContent })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Facebook post created successfully!', 'success');
                this.hideFacebookPost();
            } else {
                this.showNotification('Failed to create Facebook post: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Error creating Facebook post: ' + error.message, 'error');
        }
    }

    showTelegramModal() {
        document.getElementById('telegram-modal').classList.remove('hidden');
    }

    hideTelegramModal() {
        document.getElementById('telegram-modal').classList.add('hidden');
        document.getElementById('telegram-chat-id').value = '';
        document.getElementById('telegram-message').value = '';
    }

    async sendTelegramMessage() {
        const chatId = document.getElementById('telegram-chat-id').value;
        const message = document.getElementById('telegram-message').value;

        if (!chatId || !message) {
            this.showNotification('Chat ID and message are required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/integrations/telegram/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Telegram message sent successfully!', 'success');
                this.hideTelegramModal();
                this.loadRecentMessages();
            } else {
                this.showNotification('Failed to send Telegram message: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Error sending Telegram message: ' + error.message, 'error');
        }
    }

    showTelegramChannel() {
        document.getElementById('telegram-channel-modal').classList.remove('hidden');
    }

    hideTelegramChannel() {
        document.getElementById('telegram-channel-modal').classList.add('hidden');
        document.getElementById('telegram-channel-name').value = '';
    }

    async createTelegramChannel() {
        const channelName = document.getElementById('telegram-channel-name').value;

        if (!channelName) {
            this.showNotification('Channel name is required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/integrations/telegram/create-channel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelName })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Telegram channel created successfully!', 'success');
                this.hideTelegramChannel();
            } else {
                this.showNotification('Failed to create Telegram channel: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Error creating Telegram channel: ' + error.message, 'error');
        }
    }

    // Skills Management
    renderSkillsPanel() {
        const skillsPanel = document.getElementById('skills-panel');
        if (!skillsPanel) return;

        skillsPanel.innerHTML = this.skills.map(skill => {
            const skillData = this.activeSkills.get(skill.id);
            return `
                <div class="skill-item ${skillData.active ? 'active' : ''}" onclick="toggleSkill('${skill.id}')">
                    <div class="skill-icon">
                        <i class="${skill.icon}"></i>
                    </div>
                    <div class="skill-info">
                        <div class="skill-name">${skill.name}</div>
                        <div class="skill-description">${skill.description}</div>
                    </div>
                    <div class="skill-status ${skill.status}"></div>
                </div>
            `;
        }).join('');
    }

    toggleSkill(skillId) {
        const skill = this.activeSkills.get(skillId);
        if (!skill) return;

        skill.active = !skill.active;
        
        if (skill.active) {
            this.startSkill(skillId);
        } else {
            this.stopSkill(skillId);
        }
        
        this.renderSkillsPanel();
        this.showNotification(`${skill.name} ${skill.active ? 'activated' : 'deactivated'}`, 'info');
    }

    async startSkill(skillId) {
        const skill = this.activeSkills.get(skillId);
        if (!skill) return;

        try {
            // Simulate skill activation
            skill.lastUsed = new Date();
            
            // Start a sample job for demonstration
            const jobId = `job_${Date.now()}`;
            this.runningJobs.set(jobId, {
                id: jobId,
                name: `${skill.name} Task`,
                skill: skill.name,
                progress: 0,
                status: 'running',
                startTime: new Date()
            });

            // Simulate job progress
            this.simulateJobProgress(jobId);
            
        } catch (error) {
            console.error('Failed to start skill:', error);
            this.showNotification(`Failed to start ${skill.name}`, 'error');
        }
    }

    stopSkill(skillId) {
        const skill = this.activeSkills.get(skillId);
        if (!skill) return;

        // Stop all jobs for this skill
        const jobsToStop = Array.from(this.runningJobs.values()).filter(job => job.skill === skill.name);
        jobsToStop.forEach(job => this.stopJob(job.id));
        
        skill.active = false;
    }

    simulateJobProgress(jobId) {
        const job = this.runningJobs.get(jobId);
        if (!job) return;

        const interval = setInterval(() => {
            if (job.progress >= 100) {
                clearInterval(interval);
                job.status = 'completed';
                this.runningJobs.delete(jobId);
                this.loadAutomationData();
                return;
            }
            
            job.progress += Math.random() * 10;
            if (job.progress > 100) job.progress = 100;
            
            this.loadAutomationData();
        }, 1000);
    }

    stopJob(jobId) {
        const job = this.runningJobs.get(jobId);
        if (job) {
            job.status = 'stopped';
            this.runningJobs.delete(jobId);
            this.loadAutomationData();
        }
    }

    // MCP Server Management
    updateMCPStatus() {
        const mcpStatusContainer = document.getElementById('mcp-status');
        if (!mcpStatusContainer) return;

        mcpStatusContainer.innerHTML = Array.from(this.mcpServers.values()).map(server => `
            <div class="mcp-status ${server.connected ? 'mcp-connected' : 'mcp-disconnected'}">
                ${server.name}
            </div>
        `).join('');
    }

    checkSkillHealth() {
        // Simulate health checks for skills
        this.skills.forEach(skill => {
            const skillData = this.activeSkills.get(skill.id);
            if (skillData && skillData.active) {
                // Random health check simulation
                if (Math.random() > 0.95) {
                    skillData.status = 'disconnected';
                    setTimeout(() => {
                        skillData.status = 'connected';
                        this.renderSkillsPanel();
                    }, 5000);
                }
            }
        });
    }

    updateRunningJobs() {
        // Update job progress and cleanup completed jobs
        const now = new Date();
        this.runningJobs.forEach((job, id) => {
            if (job.status === 'completed' && (now - job.endTime) > 10000) {
                this.runningJobs.delete(id);
            }
        });
    }

    // Modal functions
    showCreateICPModal() {
        document.getElementById('create-icp-modal').classList.remove('hidden');
    }

    hideCreateICPModal() {
        document.getElementById('create-icp-modal').classList.add('hidden');
        this.clearICPForm();
    }

    clearICPForm() {
        document.getElementById('icp-name').value = '';
        document.getElementById('icp-description').value = '';
        document.getElementById('icp-cities').value = '';
        document.getElementById('icp-radius').value = '';
        document.getElementById('icp-price-min').value = '';
        document.getElementById('icp-price-max').value = '';
        
        // Clear checkboxes
        document.querySelectorAll('#create-icp-modal input[type="checkbox"]').forEach(cb => cb.checked = false);
    }

    async createICP() {
        const name = document.getElementById('icp-name').value;
        const description = document.getElementById('icp-description').value;
        
        if (!name || !description) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            const response = await fetch('/api/icp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    criteria: this.getICPCriteria(),
                    settings: {
                        maxLeadsPerDay: 50,
                        discoveryFrequency: 'daily',
                        confidenceThreshold: 0.7
                    }
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('ICP profile created successfully!', 'success');
                this.hideCreateICPModal();
                this.loadData();
            } else {
                this.showNotification('Failed to create ICP profile', 'error');
            }
        } catch (error) {
            this.showNotification('Error creating ICP profile: ' + error.message, 'error');
        }
    }

    getICPCriteria() {
        const cities = document.getElementById('icp-cities').value.split(',').map(s => s.trim()).filter(s => s);
        const radius = parseInt(document.getElementById('icp-radius').value) || 25;
        const priceMin = parseInt(document.getElementById('icp-price-min').value) || 0;
        const priceMax = parseInt(document.getElementById('icp-price-max').value) || 1000000;
        
        const propertyTypes = Array.from(document.querySelectorAll('input[type="checkbox"][value="single_family"]:checked, input[type="checkbox"][value="multi_family"]:checked, input[type="checkbox"][value="commercial"]:checked')).map(cb => cb.value);
        
        const platforms = {};
        document.querySelectorAll('input[type="checkbox"][value="linkedin"], input[type="checkbox"][value="zillow"], input[type="checkbox"][value="realtor"], input[type="checkbox"][value="facebook"]').forEach(cb => {
            platforms[cb.value] = cb.checked;
        });

        return {
            locations: { cities, states: ['CA'], zipCodes: [], radius },
            investment: { propertyTypes, priceRange: { min: priceMin, max: priceMax } },
            professional: { industries: ['Real Estate'], companySize: ['small', 'medium'], jobTitles: ['Investor'] },
            platforms
        };
    }

    async runDiscovery() {
        const icpId = document.getElementById('discovery-icp-select').value;
        const maxLeads = parseInt(document.getElementById('discovery-max-leads').value) || 50;
        
        if (!icpId) {
            this.showNotification('Please select an ICP profile', 'error');
            return;
        }

        // Activate relevant skills for discovery
        await this.activateSkillsForDiscovery(['reengine-tinyfish-scraper', 'reengine-playwright-agent']);

        try {
            const response = await fetch(`/api/icp/${icpId}/discover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxLeads })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Discovery completed! Found ${result.summary.totalFound} leads`, 'success');
                this.discoveryResults.push({
                    id: Date.now(),
                    icpName: this.icps.find(icp => icp.id === icpId)?.name || 'Unknown',
                    leadsFound: result.summary.totalFound,
                    highQuality: result.summary.highConfidence,
                    avgMatch: Math.floor(result.summary.avgMatchScore * 100),
                    duration: Math.floor(result.processingTime / 1000),
                    status: 'completed',
                    time: 'Just now'
                });
                this.loadDiscoveryResults();
                this.loadData();
            } else {
                this.showNotification('Discovery failed', 'error');
            }
        } catch (error) {
            this.showNotification('Error running discovery: ' + error.message, 'error');
        }
    }

    async activateSkillsForDiscovery(skillIds) {
        for (const skillId of skillIds) {
            const skill = this.activeSkills.get(skillId);
            if (skill && !skill.active) {
                await this.startSkill(skillId);
            }
        }
    }

    async runICPDiscovery(icpId) {
        await this.activateSkillsForDiscovery(['reengine-tinyfish-scraper', 'reengine-playwright-agent']);
        
        try {
            const response = await fetch(`/api/icp/${icpId}/discover`, { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Discovery completed! Found ${result.summary.totalFound} leads`, 'success');
                this.loadData();
            } else {
                this.showNotification('Discovery failed', 'error');
            }
        } catch (error) {
            this.showNotification('Error running discovery: ' + error.message, 'error');
        }
    }

    async runFullAutomation() {
        this.showNotification('Starting full automation workflow...', 'info');
        
        // Activate all relevant skills
        await this.activateSkillsForDiscovery([
            'reengine-operator',
            'reengine-tinyfish-scraper', 
            'reengine-playwright-agent',
            'reengine-self-healing'
        ]);

        // Run comprehensive automation
        try {
            const response = await fetch('/api/automation/full', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Full automation completed successfully!', 'success');
                this.loadData();
            } else {
                this.showNotification('Full automation failed', 'error');
            }
        } catch (error) {
            this.showNotification('Error running full automation: ' + error.message, 'error');
        }
    }

    stopAllAutomation() {
        // Deactivate all skills
        this.activeSkills.forEach((skill, id) => {
            if (skill.active) {
                this.stopSkill(id);
            }
        });
        
        // Stop all running jobs
        this.runningJobs.forEach((job, id) => {
            this.stopJob(id);
        });
        
        this.renderSkillsPanel();
        this.loadAutomationData();
        this.showNotification('All automation stopped', 'info');
    }

    scheduleAutomation() {
        this.showNotification('Automation scheduling feature coming soon', 'info');
    }

    // Utility functions
    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const timeElements = document.querySelectorAll('#current-time');
        timeElements.forEach(el => el.textContent = timeString);
    }

    async refreshData() {
        await this.loadData();
        this.renderSkillsPanel();
        this.updateMCPStatus();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' :
                    'fa-info-circle'
                }"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Placeholder functions for UI interactions
    editICP(id) { console.log('Edit ICP:', id); }
    deleteICP(id) { console.log('Delete ICP:', id); }
    viewLead(id) { console.log('View lead:', id); }
    // Enhanced Approval Functions
    async approveLead(id) {
        try {
            const response = await fetch('/api/approvals/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approval_id: id, approved_by: 'dashboard_user' })
            });
            
            if (response.ok) {
                this.showNotification('Lead approved successfully', 'success');
                await this.loadData();
                this.updateSelectedCount();
            } else {
                this.showNotification('Failed to approve lead', 'error');
            }
        } catch (error) {
            console.error('Error approving lead:', error);
            this.showNotification('Error approving lead', 'error');
        }
    }

    async rejectLead(id) {
        try {
            const response = await fetch('/api/approvals/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approval_id: id, rejected_by: 'dashboard_user', reason: 'Rejected from dashboard' })
            });
            
            if (response.ok) {
                this.showNotification('Lead rejected successfully', 'success');
                await this.loadData();
                this.updateSelectedCount();
            } else {
                this.showNotification('Failed to reject lead', 'error');
            }
        } catch (error) {
            console.error('Error rejecting lead:', error);
            this.showNotification('Error rejecting lead', 'error');
        }
    }

    async bulkApprove() {
        const selectedCheckboxes = document.querySelectorAll('.approval-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showNotification('No approvals selected', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/approvals/bulk-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    approval_ids: selectedIds, 
                    approved_by: 'dashboard_user' 
                })
            });
            
            if (response.ok) {
                this.showNotification(`Approved ${selectedIds.length} leads successfully`, 'success');
                await this.loadData();
                this.clearSelection();
            } else {
                this.showNotification('Failed to bulk approve', 'error');
            }
        } catch (error) {
            console.error('Error bulk approving:', error);
            this.showNotification('Error bulk approving', 'error');
        }
    }

    async bulkReject() {
        const selectedCheckboxes = document.querySelectorAll('.approval-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showNotification('No approvals selected', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/approvals/bulk-reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    approval_ids: selectedIds, 
                    rejected_by: 'dashboard_user',
                    reason: 'Bulk rejected from dashboard'
                })
            });
            
            if (response.ok) {
                this.showNotification(`Rejected ${selectedIds.length} leads`, 'success');
                await this.loadData();
                this.clearSelection();
            } else {
                this.showNotification('Failed to bulk reject', 'error');
            }
        } catch (error) {
            console.error('Error bulk rejecting:', error);
            this.showNotification('Error bulk rejecting', 'error');
        }
    }

    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.approval-checkbox');
        const isChecked = selectAllCheckbox.checked;
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const selectedCount = document.querySelectorAll('.approval-checkbox:checked').length;
        const selectedCountElement = document.getElementById('selected-count');
        const bulkApproveBtn = document.getElementById('bulk-approve-btn');
        const bulkRejectBtn = document.getElementById('bulk-reject-btn');
        
        selectedCountElement.textContent = `${selectedCount} selected`;
        
        // Enable/disable bulk action buttons
        if (selectedCount > 0) {
            bulkApproveBtn.disabled = false;
            bulkRejectBtn.disabled = false;
        } else {
            bulkApproveBtn.disabled = true;
            bulkRejectBtn.disabled = true;
        }
    }

    clearSelection() {
        document.getElementById('select-all').checked = false;
        this.updateSelectedCount();
    }

    async refreshApprovals() {
        this.showNotification('Refreshing approvals...', 'info');
        await this.loadData();
        this.showNotification('Approvals refreshed', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-slide-in ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' :
                    'fa-info-circle'
                } mr-2"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the app
const app = new REEngine();

// Global functions for onclick handlers
window.showSection = (section) => app.showSection(section);
window.showCreateICPModal = () => app.showCreateICPModal();
window.hideCreateICPModal = () => app.hideCreateICPModal();
window.createICP = () => app.createICP();
window.editICP = (id) => app.editICP(id);
window.deleteICP = (id) => app.deleteICP(id);
window.viewLead = (id) => app.viewLead(id);
window.editLead = (id) => app.editLead(id);
window.approveLead = (id) => app.approveLead(id);
window.rejectLead = (id) => app.rejectLead(id);
window.bulkApprove = () => app.bulkApprove();
window.bulkReject = () => app.bulkReject();
window.toggleSelectAll = () => app.toggleSelectAll();
window.updateSelectedCount = () => app.updateSelectedCount();
window.refreshApprovals = () => app.refreshApprovals();
window.showApprovalsModal = () => app.showApprovalsModal();
window.refreshData = () => app.refreshData();

// Platform integration global functions
window.showWhatsAppModal = () => app.showWhatsAppModal();
window.hideWhatsAppModal = () => app.hideWhatsAppModal();
window.sendWhatsAppMessage = () => app.sendWhatsAppMessage();
window.testWhatsAppConnection = () => app.testWhatsAppConnection();
window.showLinkedInModal = () => app.showLinkedInModal();
window.hideLinkedInModal = () => app.hideLinkedInModal();
window.sendLinkedInMessage = () => app.sendLinkedInMessage();
window.showLinkedInSearch = () => app.showLinkedInSearch();
window.hideLinkedInSearch = () => app.hideLinkedInSearch();
window.searchLinkedInPeople = () => app.searchLinkedInPeople();
window.showFacebookModal = () => app.showFacebookModal();
window.hideFacebookModal = () => app.hideFacebookModal();
window.sendFacebookMessage = () => app.sendFacebookMessage();
window.showFacebookPost = () => app.showFacebookPost();
window.hideFacebookPost = () => app.hideFacebookPost();
window.createFacebookPost = () => app.createFacebookPost();
window.showTelegramModal = () => app.showTelegramModal();
window.hideTelegramModal = () => app.hideTelegramModal();
window.sendTelegramMessage = () => app.sendTelegramMessage();
window.showTelegramChannel = () => app.showTelegramChannel();
window.hideTelegramChannel = () => app.hideTelegramChannel();
window.createTelegramChannel = () => app.createTelegramChannel();
