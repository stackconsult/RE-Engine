/**
 * Google Vertex AI Service
 * Integration with Google Vertex AI for AI/LLM completion services
 */

import { logger, logSystemEvent, logError } from '../observability/logger.js';

export interface VertexAIConfig {
  projectId: string;
  region: string;
  serviceAccountEmail?: string;
  apiKey?: string;
  modelId?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRedirectUri?: string;
}

export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  candidateCount?: number;
  modelId?: string;
}

export interface CompletionResponse {
  candidates: Array<{
    content: string;
    score?: number;
    safetyRatings?: Array<{
      category: string;
      blocked: boolean;
      probability: string;
    }>;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelVersion: string;
  requestId: string;
}

export interface EmbeddingRequest {
  content: string;
  modelId?: string;
}

export interface EmbeddingResponse {
  embeddings: {
    values: number[];
    statistics: {
      tokenCount: number;
      truncated: boolean;
    };
  };
  modelVersion: string;
  requestId: string;
}

export class VertexAIService {
  private config: VertexAIConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.baseUrl = `https://${config.region}-aiplatform.googleapis.com/v1`;
    
    // Validate configuration
    if (!config.projectId || !config.region) {
      throw new Error('Missing required Vertex AI configuration: projectId and region are required');
    }
    
    // Check for authentication method
    if (!config.oauthClientId && !config.apiKey) {
      throw new Error('Missing authentication: either OAuth credentials or API key required');
    }
  }

  async initialize(): Promise<void> {
    try {
      logSystemEvent('vertex-ai-init', 'info', { 
        projectId: this.config.projectId,
        region: this.config.region,
        serviceAccountEmail: this.config.serviceAccountEmail
      });

      // Authenticate using service account
      await this.authenticate();

      logSystemEvent('vertex-ai-init-success', 'info');
    } catch (error) {
      logError(error as Error, 'vertex-ai-init-failed');
      throw error;
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.authenticate();
    }

    try {
      const modelId = request.modelId || this.config.modelId || 'gemini-1.0-pro';
      const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models/${modelId}:predict`;

      const requestBody = {
        instances: [
          {
            content: request.prompt
          }
        ],
        parameters: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 1024,
          topP: request.topP || 0.9,
          topK: request.topK || 40,
          stopSequences: request.stopSequences || [],
          candidateCount: request.candidateCount || 1
        }
      };

      const response = await this.makeRequest(endpoint, requestBody);
      
      logSystemEvent('vertex-ai-completion', 'info', {
        modelId,
        promptLength: request.prompt.length,
        responseCandidates: response.predictions?.length || 0
      });

      return this.formatCompletionResponse(response, modelId);

    } catch (error) {
      logError(error as Error, 'vertex-ai-completion-failed', { 
        promptLength: request.prompt.length 
      });
      throw error;
    }
  }

  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.authenticate();
    }

    try {
      const modelId = request.modelId || 'textembedding-gecko';
      const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models/${modelId}:predict`;

      const requestBody = {
        instances: [
          {
            content: request.content
          }
        ]
      };

      const response = await this.makeRequest(endpoint, requestBody);
      
      logSystemEvent('vertex-ai-embedding', 'info', {
        modelId,
        contentLength: request.content.length
      });

      return this.formatEmbeddingResponse(response, modelId);

    } catch (error) {
      logError(error as Error, 'vertex-ai-embedding-failed', { 
        contentLength: request.content.length 
      });
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.authenticate();
    }

    try {
      const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models`;
      
      const response = await this.makeRequest(endpoint, {}, 'GET');
      
      const models = response.models || [];
      const modelIds = models
        .filter((model: any) => model.supportedGenerationMethods?.includes('generateText'))
        .map((model: any) => model.name.split('/').pop());

      logSystemEvent('vertex-ai-list-models', 'info', { 
        modelCount: modelIds.length 
      });

      return modelIds;

    } catch (error) {
      logError(error as Error, 'vertex-ai-list-models-failed');
      throw error;
    }
  }

  async getModelInfo(modelId: string): Promise<any> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.authenticate();
    }

    try {
      const endpoint = `${this.baseUrl}/projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models/${modelId}`;
      
      const response = await this.makeRequest(endpoint, {}, 'GET');
      
      logSystemEvent('vertex-ai-model-info', 'info', { modelId });

      return response;

    } catch (error) {
      logError(error as Error, 'vertex-ai-model-info-failed', { modelId });
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    try {
      // For now, prioritize API key authentication since it's working
      // OAuth setup for server-to-server requires service account keys, not OAuth clients
      if (this.config.apiKey) {
        await this.authenticateWithApiKey();
      } else if (this.config.oauthClientId && this.config.oauthClientSecret) {
        // OAuth authentication would require service account JSON keys
        // For now, throw an error to guide user to use API key
        throw new Error('OAuth authentication requires service account JSON keys. Please use API key authentication for now.');
      } else {
        throw new Error('No authentication method available');
      }

      logSystemEvent('vertex-ai-auth-success', 'info');

    } catch (error) {
      logError(error as Error, 'vertex-ai-auth-failed');
      throw new Error('Failed to authenticate with Vertex AI');
    }
  }

  private async authenticateWithOAuth(): Promise<void> {
    try {
      // For Vertex AI, we need to use JWT assertion with service account
      // The OAuth client credentials flow may not work for server-to-server applications
      // Let's try a different approach using the service account email and OAuth client
      
      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      
      // First try to get a token using the OAuth client
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: await this.createJWTAssertion()
        })
      });

      if (!response.ok) {
        // If OAuth fails, fallback to API key authentication
        console.log('OAuth authentication failed, falling back to API key');
        await this.authenticateWithApiKey();
        return;
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

      logSystemEvent('vertex-ai-oauth-auth-success', 'info', {
        expiresIn: tokenData.expires_in
      });

    } catch (error) {
      logError(error as Error, 'vertex-ai-oauth-auth-failed');
      // Fallback to API key authentication
      console.log('OAuth authentication failed, falling back to API key');
      await this.authenticateWithApiKey();
    }
  }

  private async createJWTAssertion(): Promise<string> {
    // For server-to-server authentication, we need to create a JWT assertion
    // This is a simplified version - in production, you'd use proper JWT libraries
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.oauthClientId,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // This would require proper JWT signing with the client secret
    // For now, let's fallback to a simpler approach
    throw new Error('JWT assertion creation not implemented - using API key fallback');
  }

  private async authenticateWithApiKey(): Promise<void> {
    try {
      // Fallback to API key authentication
      this.accessToken = this.config.apiKey || null;
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour expiry

      logSystemEvent('vertex-ai-apikey-auth-success', 'info');

    } catch (error) {
      logError(error as Error, 'vertex-ai-apikey-auth-failed');
      throw error;
    }
  }

  private async makeRequest(endpoint: string, body: any = {}, method: string = 'POST'): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Use OAuth Bearer token if available, otherwise fallback to API key
    if (this.accessToken) {
      if (this.config.oauthClientId) {
        // OAuth authentication uses Bearer token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else {
        // API key authentication uses x-goog-api-key header
        headers['x-goog-api-key'] = this.accessToken;
      }
    }

    const options: RequestInit = {
      method,
      headers
    };

    if (method === 'POST' && Object.keys(body).length > 0) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private formatCompletionResponse(response: any, modelId: string): CompletionResponse {
    const predictions = response.predictions || [];
    
    return {
      candidates: predictions.map((prediction: any) => ({
        content: prediction.content || prediction.text || '',
        score: prediction.score,
        safetyRatings: prediction.safetyRatings || []
      })),
      usage: {
        promptTokens: response.metadata?.tokenUsage?.promptTokens || 0,
        completionTokens: response.metadata?.tokenUsage?.completionTokens || 0,
        totalTokens: response.metadata?.tokenUsage?.totalTokens || 0
      },
      modelVersion: modelId,
      requestId: response.id || `req_${Date.now()}`
    };
  }

  private formatEmbeddingResponse(response: any, modelId: string): EmbeddingResponse {
    const predictions = response.predictions || [];
    const firstPrediction = predictions[0] || {};

    return {
      embeddings: {
        values: firstPrediction.embeddings?.values || [],
        statistics: {
          tokenCount: firstPrediction.embeddings?.statistics?.tokenCount || 0,
          truncated: firstPrediction.embeddings?.statistics?.truncated || false
        }
      },
      modelVersion: modelId,
      requestId: response.id || `req_${Date.now()}`
    };
  }

  private isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiry;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch (error) {
      logError(error as Error, 'vertex-ai-health-check-failed');
      return false;
    }
  }
}

export default VertexAIService;
