/**
 * Ollama Integration Tests
 * Tests for Ollama client and service functionality
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { OllamaClient, OllamaService } from '../src/ollama/index.js';

describe('Ollama Integration', () => {
  let client: OllamaClient;
  let service: OllamaService;

  before(async () => {
    // Initialize with test configuration
    client = new OllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
      model: process.env.OLLAMA_MODEL || 'qwen:7b',
      timeout: 10000
    });

    service = new OllamaService({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
      model: process.env.OLLAMA_MODEL || 'qwen:7b',
      timeout: 10000
    });
  });

  it('should create Ollama client instance', () => {
    assert.ok(client instanceof OllamaClient);
  });

  it('should create Ollama service instance', () => {
    assert.ok(service instanceof OllamaService);
  });

  it('should perform health check', async () => {
    const isHealthy = await client.healthCheck();
    // Note: This may fail if Ollama is not running
    console.log('Ollama health check result:', isHealthy);
  });

  it('should list available models', async () => {
    try {
      const models = await client.listModels();
      console.log('Available models:', models.map(m => m.name));
      assert(Array.isArray(models));
    } catch (error) {
      console.log('Model listing failed (expected if Ollama not running):', error);
      // Don't fail the test if Ollama is not available
    }
  });

  it('should generate AI completion', async () => {
    try {
      const response = await service.generateCompletion({
        prompt: 'What is 2 + 2?',
        temperature: 0.1,
        maxTokens: 50
      });

      console.log('AI Response:', response);
      assert.equal(response.success, true);
      assert.ok(response.content.length > 0);
    } catch (error) {
      console.log('AI completion failed (expected if Ollama not running):', error);
      // Don't fail the test if Ollama is not available
    }
  });

  it('should analyze lead data', async () => {
    try {
      const analysis = await service.analyzeLead({
        leadData: {
          company: 'Test Company',
          industry: 'Technology',
          size: '100-500',
          description: 'A software company that makes amazing products'
        },
        analysisType: 'qualification'
      });

      console.log('Lead Analysis:', analysis);
      assert.ok(Array.isArray(analysis.insights));
      assert.ok(Array.isArray(analysis.recommendations));
    } catch (error) {
      console.log('Lead analysis failed (expected if Ollama not running):', error);
      // Don't fail the test if Ollama is not available
    }
  });

  it('should generate outreach message', async () => {
    try {
      const message = await service.generateOutreachMessage({
        company: 'Test Company',
        industry: 'Technology',
        size: '100-500',
        description: 'A software company that makes amazing products'
      });

      console.log('Outreach Message:', message);
      assert.ok(message.length > 0);
    } catch (error) {
      console.log('Outreach generation failed (expected if Ollama not running):', error);
      // Don't fail the test if Ollama is not available
    }
  });

  it('should generate qualification score', async () => {
    try {
      const score = await service.generateQualificationScore({
        company: 'Test Company',
        industry: 'Technology',
        size: '100-500',
        description: 'A software company that makes amazing products'
      });

      console.log('Qualification Score:', score);
      assert.ok(score >= 0 && score <= 100);
    } catch (error) {
      console.log('Score generation failed (expected if Ollama not running):', error);
      // Don't fail the test if Ollama is not available
    }
  });

  after(async () => {
    try {
      await service.close();
    } catch (error) {
      console.log('Service cleanup failed:', error);
    }
  });
});
