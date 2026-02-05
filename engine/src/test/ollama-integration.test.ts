/**
 * Ollama Integration Test
 * Validates the RE Engine client with Ollama AI capabilities
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createREEngineClient, REEngineClient } from '../../sdk/client/reengine-client.ts';
import { Lead } from '../../a2d/models/lead.model.ts';
import { getOllamaService } from '../../services/ollama.service.ts';

describe('Ollama Integration', () => {
  let client: REEngineClient;
  let testLead: Lead;

  beforeAll(async () => {
    // Initialize client with Ollama configuration
    client = createREEngineClient({
      dataDir: './test-data',
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        apiKey: process.env.OLLAMA_API_KEY,
        defaultModel: 'qwen:7b',
        timeout: 30000
      }
    });

    // Create test lead
    testLead = {
      lead_id: 'test-lead-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone_e164: '+1234567890',
      city: 'Test City',
      province: 'Test Province',
      source: 'website',
      tags: ['test', 'integration'],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        property_preferences: '3 bedroom house with garden',
        budget_range: '$500,000 - $700,000',
        location_preferences: 'Suburban area near schools'
      }
    };

    // Initialize client
    await client.initialize();
  });

  afterAll(async () => {
    // Cleanup
    // Note: In a real test, you'd clean up test data
  });

  it('should connect to Ollama service', async () => {
    const status = await client.getAIStatus();
    
    expect(status.success).toBe(true);
    expect(status.data).toBeDefined();
    expect(status.data?.connected).toBe(true);
    expect(status.data?.modelCount).toBeGreaterThan(0);
    expect(status.data?.availableModels).toContain('qwen:7b');
  });

  it('should generate outreach message', async () => {
    const response = await client.generateOutreachMessage(testLead, undefined, {
      tone: 'professional',
      length: 'medium'
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.message).toBeDefined();
    expect(response.data?.message.length).toBeGreaterThan(50);
    expect(response.data?.confidence).toBeGreaterThan(0);
    expect(response.data?.confidence).toBeLessThanOrEqual(1);

    // Check for personalization
    const message = response.data?.message || '';
    expect(message).toContain('John');
    expect(message).toContain('Doe');
  }, 10000);

  it('should analyze lead and provide insights', async () => {
    const response = await client.analyzeLead(testLead);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.score).toBeGreaterThanOrEqual(0);
    expect(response.data?.score).toBeLessThanOrEqual(100);
    expect(response.data?.insights).toBeInstanceOf(Array);
    expect(response.data?.recommendations).toBeInstanceOf(Array);
    expect(response.data?.confidence).toBeGreaterThan(0);
    expect(response.data?.confidence).toBeLessThanOrEqual(1);
  }, 10000);

  it('should generate AI response for conversation', async () => {
    const conversationHistory = [
      {
        role: 'user' as const,
        content: 'Hi, I\'m interested in your properties',
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant' as const,
        content: 'Hello! I\'d be happy to help you find your dream home.',
        timestamp: new Date().toISOString()
      }
    ];

    const response = await client.generateResponse(
      testLead,
      conversationHistory,
      'What 3-bedroom houses do you have available?',
      {
        tone: 'friendly',
        purpose: 'answer_question'
      }
    );

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.response).toBeDefined();
    expect(response.data?.response.length).toBeGreaterThan(20);
    expect(response.data?.suggestedActions).toBeInstanceOf(Array);
  }, 10000);

  it('should handle AI service errors gracefully', async () => {
    // Test with invalid model
    const invalidClient = createREEngineClient({
      dataDir: './test-data',
      ollama: {
        baseUrl: 'http://localhost:11434',
        defaultModel: 'nonexistent-model',
        timeout: 5000
      }
    });

    const response = await invalidClient.generateOutreachMessage(testLead);
    
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error).toContain('nonexistent-model');
  }, 5000);
});

describe('Ollama Service Direct Tests', () => {
  let ollama: any;

  beforeAll(() => {
    ollama = getOllamaService({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      defaultModel: 'qwen:7b'
    });
  });

  it('should test connection', async () => {
    const connected = await ollama.testConnection();
    expect(connected).toBe(true);
  });

  it('should list models', async () => {
    const models = await ollama.listModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('name');
    expect(models[0]).toHaveProperty('size');
  });

  it('should check model availability', async () => {
    const hasModel = await ollama.hasModel('qwen:7b');
    expect(hasModel).toBe(true);

    const hasNonexistentModel = await ollama.hasModel('nonexistent-model');
    expect(hasNonexistentModel).toBe(false);
  });

  it('should perform health check', async () => {
    const health = await ollama.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.details).toBeDefined();
    expect(health.details.connected).toBe(true);
  });
});
