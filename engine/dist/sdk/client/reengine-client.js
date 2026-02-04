/**
 * RE Engine Client SDK - Main client interface
 * Follows RE Engine safety invariants and production rules
 */
import { ApprovalsRepository } from '../../a2d/repositories/approvals.repository';
import { LeadsRepository } from '../../a2d/repositories/leads.repository';
import { createOllamaService } from '../../services/ollama-unified.service.js';
import { logSystemEvent } from '../../observability/logger.js';
/**
 * Main RE Engine Client
 * Provides a high-level interface for interacting with the RE Engine
 */
export class REEngineClient {
    approvals;
    leads;
    options;
    ollama;
    constructor(options) {
        this.options = {
            environment: 'development',
            timeout: 30000,
            apiKey: '',
            ollama: {
                baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                apiKey: process.env.OLLAMA_API_KEY,
                defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'qwen:7b',
                timeout: 30000
            },
            ...options
        };
        // Initialize Ollama service if configured
        if (this.options.ollama) {
            this.ollama = createOllamaService({
                baseUrl: this.options.ollama.baseUrl,
                apiKey: this.options.ollama.apiKey,
                defaultModel: this.options.ollama.defaultModel,
                timeout: this.options.timeout
            });
        }
        this.approvals = new ApprovalsRepository({ dataDir: options.dataDir });
        this.leads = new LeadsRepository({ dataDir: options.dataDir });
    }
    /**
     * Initialize the client and data stores
     */
    async initialize() {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            // Initialize repositories
            const approvalsInit = await this.approvals.initialize();
            const leadsInit = await this.leads.initialize();
            if (!approvalsInit.success) {
                return this.createResponse(requestId, startTime, false, undefined, approvalsInit.error);
            }
            if (!leadsInit.success) {
                return this.createResponse(requestId, startTime, false, undefined, leadsInit.error);
            }
            return this.createResponse(requestId, startTime, true, true);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    // ===== APPROVALS =====
    /**
     * Create a new approval
     */
    async createApproval(data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.create(data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Query approvals
     */
    async queryApprovals(filter = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.query(filter);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            const response = this.createResponse(requestId, startTime, true, result.data);
            if (result.total !== undefined) {
                response.pagination = {
                    total: result.total,
                    offset: filter.offset || 0,
                    limit: filter.limit || 100,
                    hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
                };
            }
            return response;
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Get approval by ID
     */
    async getApproval(approvalId) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.getById(approvalId);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Update approval
     */
    async updateApproval(approvalId, data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.approvals.update(approvalId, data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Approve an approval
     */
    async approveApproval(approvalId, approvedBy) {
        return this.updateApproval(approvalId, {
            status: 'approved',
            approved_by: approvedBy
        });
    }
    /**
     * Reject an approval
     */
    async rejectApproval(approvalId, reason, rejectedBy) {
        return this.updateApproval(approvalId, {
            status: 'rejected',
            notes: reason,
            approved_by: rejectedBy
        });
    }
    /**
     * Get pending approvals
     */
    async getPendingApprovals() {
        return this.queryApprovals({ status: 'pending' });
    }
    /**
     * Get approvals ready to send
     */
    async getReadyToSendApprovals() {
        return this.queryApprovals({ status: 'approved' });
    }
    // ===== LEADS =====
    /**
     * Create a new lead
     */
    async createLead(data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.create(data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Query leads
     */
    async queryLeads(filter = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.query(filter);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            const response = this.createResponse(requestId, startTime, true, result.data);
            if (result.total !== undefined) {
                response.pagination = {
                    total: result.total,
                    offset: filter.offset || 0,
                    limit: filter.limit || 100,
                    hasMore: (filter.offset || 0) + (filter.limit || 100) < result.total
                };
            }
            return response;
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Get lead by ID
     */
    async getLead(leadId) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.getById(leadId);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Update lead
     */
    async updateLead(leadId, data) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const result = await this.leads.update(leadId, data);
            if (!result.success) {
                return this.createResponse(requestId, startTime, false, undefined, result.error);
            }
            return this.createResponse(requestId, startTime, true, result.data);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    // ===== AI CAPABILITIES =====
    /**
     * Generate AI-powered outreach message
     */
    async generateOutreachMessage(lead, template, options) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const systemPrompt = this.buildOutreachSystemPrompt(options);
            const userPrompt = this.buildOutreachUserPrompt(lead, template);
            const request = {
                model: this.options.ollama.defaultModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                options: {
                    temperature: 0.7,
                    num_predict: 500
                }
            };
            const response = await this.ollama.chat(request);
            if (!response.done) {
                throw new Error('Incomplete AI response');
            }
            const message = response.message.content;
            const confidence = this.calculateMessageConfidence(message, lead);
            logSystemEvent('Outreach message generated', 'info', {
                requestId,
                leadId: lead.lead_id,
                model: response.model,
                confidence
            });
            return this.createResponse(requestId, startTime, true, { message, confidence });
        }
        catch (error) {
            logSystemEvent('Failed to generate outreach message', 'error', {
                requestId,
                leadId: lead.lead_id,
                error: error instanceof Error ? error.message : String(error)
            });
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Analyze lead with AI for scoring and insights
     */
    async analyzeLead(lead) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const systemPrompt = `You are a real estate expert AI assistant. Analyze leads and provide:
1. A lead score from 0-100
2. Key insights about the lead
3. Actionable recommendations
4. Confidence in your analysis

Respond in JSON format with keys: score, insights (array), recommendations (array), confidence (0-1)`;
            const userPrompt = this.buildLeadAnalysisPrompt(lead);
            const request = {
                model: this.options.ollama.defaultModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                format: { type: 'object' },
                options: {
                    temperature: 0.3,
                    num_predict: 800
                }
            };
            const response = await this.ollama.chat(request);
            if (!response.done) {
                throw new Error('Incomplete AI response');
            }
            let analysis;
            try {
                analysis = JSON.parse(response.message.content);
            }
            catch (parseError) {
                // Fallback: extract structured data from text
                console.warn('Failed to parse AI response as JSON:', parseError);
                analysis = this.extractAnalysisFromText(response.message.content);
            }
            // Validate and sanitize analysis
            analysis = this.validateAnalysis(analysis);
            logSystemEvent('Lead analysis completed', 'info', {
                requestId,
                leadId: lead.lead_id,
                score: analysis.score,
                confidence: analysis.confidence
            });
            return this.createResponse(requestId, startTime, true, analysis);
        }
        catch (error) {
            logSystemEvent('Failed to analyze lead', 'error', {
                requestId,
                leadId: lead.lead_id,
                error: error instanceof Error ? error.message : String(error)
            });
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Generate AI-powered response to lead communication
     */
    async generateResponse(lead, conversationHistory, newMessage, options) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const systemPrompt = this.buildResponseSystemPrompt(lead, options);
            const messages = this.buildConversationMessages(conversationHistory, newMessage);
            messages.unshift({ role: 'system', content: systemPrompt });
            const request = {
                model: this.options.ollama.defaultModel,
                messages,
                options: {
                    temperature: 0.8,
                    num_predict: 600
                }
            };
            const response = await this.ollama.chat(request);
            if (!response.done) {
                throw new Error('Incomplete AI response');
            }
            const aiResponse = response.message.content;
            const suggestedActions = this.extractSuggestedActions(aiResponse);
            logSystemEvent('AI response generated', 'info', {
                requestId,
                leadId: lead.lead_id,
                messageCount: messages.length,
                responseLength: aiResponse.length
            });
            return this.createResponse(requestId, startTime, true, {
                response: aiResponse,
                suggestedActions
            });
        }
        catch (error) {
            logSystemEvent('Failed to generate AI response', 'error', {
                requestId,
                leadId: lead.lead_id,
                error: error instanceof Error ? error.message : String(error)
            });
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Get AI service health and status
     */
    async getAIStatus() {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const health = await this.ollama.healthCheck();
            const models = await this.ollama.listModels();
            const status = {
                connected: health.details.connected,
                modelCount: models.length,
                availableModels: models.map(m => m.name),
                defaultModel: this.options.ollama.defaultModel,
                health: health.status
            };
            return this.createResponse(requestId, startTime, true, status);
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    // ===== HELPER METHODS FOR AI FUNCTIONS =====
    buildOutreachSystemPrompt(options) {
        let prompt = `You are a professional real estate assistant crafting personalized outreach messages. `;
        if (options?.tone) {
            prompt += `Use a ${options.tone} tone. `;
        }
        if (options?.length) {
            const lengthGuides = {
                short: 'Keep the message under 100 words.',
                medium: 'Keep the message between 100-200 words.',
                long: 'Write a comprehensive message of 200-300 words.'
            };
            prompt += `${lengthGuides[options.length]} `;
        }
        if (options?.customInstructions) {
            prompt += `Additional instructions: ${options.customInstructions}. `;
        }
        prompt += `Be genuine, mention specific details about the property or their needs, and include a clear call to action.`;
        return prompt;
    }
    buildOutreachUserPrompt(lead, template) {
        let prompt = `Generate an outreach message for this lead:\n\n`;
        prompt += `Lead Details:\n`;
        prompt += `- Name: ${lead.first_name} ${lead.last_name}\n`;
        prompt += `- Email: ${lead.email}\n`;
        prompt += `- Phone: ${lead.phone_e164}\n`;
        if (lead.metadata?.property_preferences) {
            prompt += `- Property Preferences: ${lead.metadata.property_preferences}\n`;
        }
        if (lead.metadata?.budget_range) {
            prompt += `- Budget Range: ${lead.metadata.budget_range}\n`;
        }
        if (lead.metadata?.location_preferences) {
            prompt += `- Location Preferences: ${lead.metadata.location_preferences}\n`;
        }
        prompt += `- Lead Source: ${lead.source}\n`;
        if (template) {
            prompt += `\nTemplate to follow:\n${template}\n`;
        }
        prompt += `\nGenerate a personalized message that will resonate with this lead.`;
        return prompt;
    }
    buildLeadAnalysisPrompt(lead) {
        let prompt = `Analyze this real estate lead:\n\n`;
        prompt += `Name: ${lead.first_name} ${lead.last_name}\n`;
        prompt += `Email: ${lead.email}\n`;
        prompt += `Phone: ${lead.phone_e164}\n`;
        if (lead.metadata?.property_preferences) {
            prompt += `Property Preferences: ${lead.metadata.property_preferences}\n`;
        }
        if (lead.metadata?.budget_range) {
            prompt += `Budget Range: ${lead.metadata.budget_range}\n`;
        }
        if (lead.metadata?.location_preferences) {
            prompt += `Location Preferences: ${lead.metadata.location_preferences}\n`;
        }
        prompt += `Lead Source: ${lead.source}\n`;
        if (lead.created_at) {
            prompt += `Created: ${lead.created_at}\n`;
        }
        prompt += `\nProvide comprehensive analysis and recommendations.`;
        return prompt;
    }
    buildResponseSystemPrompt(lead, options) {
        let prompt = `You are a professional real estate assistant responding to a lead. `;
        prompt += `Lead context: ${lead.first_name} ${lead.last_name}, `;
        if (lead.metadata?.property_preferences) {
            prompt += `interested in ${lead.metadata.property_preferences}. `;
        }
        if (options?.purpose) {
            const purposeGuides = {
                answer_question: 'Focus on answering their question clearly and helpfully.',
                schedule_viewing: 'Focus on scheduling a property viewing.',
                negotiate: 'Focus on negotiation points and finding common ground.',
                follow_up: 'Focus on following up and maintaining engagement.'
            };
            prompt += `${purposeGuides[options.purpose]} `;
        }
        if (options?.tone) {
            prompt += `Use a ${options.tone} tone. `;
        }
        prompt += `Be helpful, professional, and include specific next steps or suggested actions when appropriate.`;
        return prompt;
    }
    buildConversationMessages(history, newMessage) {
        const messages = [];
        // Add conversation history (limit to last 10 messages for context)
        history.slice(-10).forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });
        // Add new message
        messages.push({
            role: 'user',
            content: newMessage
        });
        return messages;
    }
    calculateMessageConfidence(message, lead) {
        // Simple confidence calculation based on message quality
        let confidence = 0.5; // Base confidence
        // Increase confidence for longer, more detailed messages
        if (message.length > 100)
            confidence += 0.1;
        if (message.length > 200)
            confidence += 0.1;
        // Increase confidence for personalization
        if (message.toLowerCase().includes(lead.first_name.toLowerCase()))
            confidence += 0.1;
        if (message.toLowerCase().includes(lead.last_name.toLowerCase()))
            confidence += 0.1;
        // Increase confidence for call to action
        if (message.toLowerCase().includes('call') ||
            message.toLowerCase().includes('email') ||
            message.toLowerCase().includes('schedule') ||
            message.toLowerCase().includes('contact')) {
            confidence += 0.1;
        }
        return Math.min(confidence, 1.0);
    }
    extractAnalysisFromText(text) {
        // Fallback extraction if JSON parsing fails
        const analysis = {
            score: 50,
            insights: [],
            recommendations: [],
            confidence: 0.5
        };
        // Extract score (look for numbers 0-100)
        const scoreMatch = text.match(/(?:score|rating)[^\d]*(\d+)/i);
        if (scoreMatch) {
            analysis.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
        }
        // Extract insights (look for sentences with "insight" or key observations)
        const sentences = text.split(/[.!?]+/);
        analysis.insights = sentences
            .filter(s => s.trim().length > 20)
            .slice(0, 3)
            .map(s => s.trim());
        // Extract recommendations (look for action items)
        analysis.recommendations = sentences
            .filter(s => s.toLowerCase().includes('recommend') ||
            s.toLowerCase().includes('suggest') ||
            s.toLowerCase().includes('should'))
            .slice(0, 3)
            .map(s => s.trim());
        return analysis;
    }
    validateAnalysis(analysis) {
        return {
            score: Math.min(100, Math.max(0, analysis.score || 50)),
            insights: Array.isArray(analysis.insights) ? analysis.insights.slice(0, 5) : [],
            recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations.slice(0, 5) : [],
            confidence: Math.min(1, Math.max(0, analysis.confidence || 0.5))
        };
    }
    extractSuggestedActions(response) {
        const actions = [];
        // Look for action-oriented phrases
        const actionPatterns = [
            /(?:should|recommend|suggest)[^.]*([^.]*\b(call|email|schedule|contact|meet|visit|follow)[^.]*\.)/gi,
            /(?:next step|action)[^.]*([^.]*\b(call|email|schedule|contact|meet|visit|follow)[^.]*\.)/gi
        ];
        actionPatterns.forEach(pattern => {
            const matches = response.match(pattern);
            if (matches) {
                actions.push(...matches.map(m => m.trim()));
            }
        });
        return actions.slice(0, 3); // Limit to 3 actions
    }
    /**
     * Get client status and health
     */
    async getStatus() {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            const approvalsStats = this.approvals.getStats('approvals.csv');
            const leadsStats = this.leads.getStats('leads.csv');
            return this.createResponse(requestId, startTime, true, {
                environment: this.options.environment,
                dataDir: this.options.dataDir,
                repositories: {
                    approvals: approvalsStats?.exists || false,
                    leads: leadsStats?.exists || false
                }
            });
        }
        catch (error) {
            return this.createResponse(requestId, startTime, false, undefined, error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Generate a unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create a standardized response
     */
    createResponse(requestId, startTime, success, data, error) {
        const duration = Date.now() - startTime;
        const response = {
            success,
            metadata: {
                requestId,
                timestamp: new Date().toISOString(),
                duration
            }
        };
        if (data !== undefined) {
            response.data = data;
        }
        if (error) {
            response.error = error;
        }
        return response;
    }
}
/**
 * Factory function to create RE Engine client
 */
export function createREEngineClient(options) {
    return new REEngineClient(options);
}
//# sourceMappingURL=reengine-client.js.map