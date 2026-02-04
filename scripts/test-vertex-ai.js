#!/usr/bin/env node

/**
 * Vertex AI Integration Test Script
 * Quick test to verify Vertex AI configuration and connectivity
 */

import { config } from 'dotenv';
import { VertexAIService } from '../engine/dist/ai/vertex-ai.service.js';
import { AIServiceManager } from '../engine/dist/ai/ai-service-manager.js';

// Load environment variables from .env file
config();

async function testVertexAI() {
  console.log('🚀 Testing Vertex AI Integration...\n');

  try {
    // Test 1: Direct Vertex AI Service
    console.log('📋 Test 1: Direct Vertex AI Service');
    const vertexAI = new VertexAIService({
      projectId: process.env.VERTEX_AI_PROJECT_ID,
      region: process.env.VERTEX_AI_REGION,
      serviceAccountEmail: process.env.VERTEX_AI_SERVICE_ACCOUNT_EMAIL,
      apiKey: process.env.VERTEX_AI_API_KEY,
      modelId: process.env.VERTEX_AI_MODEL_ID || 'text-bison'
    });

    await vertexAI.initialize();
    console.log('✅ Vertex AI service initialized successfully');

    // Test health check
    const isHealthy = await vertexAI.healthCheck();
    console.log(`✅ Health check: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);

    // Test text generation
    console.log('\n📝 Test 2: Text Generation');
    const completionResponse = await vertexAI.generateCompletion({
      prompt: 'What is the future of real estate technology? Keep it under 100 words.',
      maxTokens: 150,
      temperature: 0.7
    });

    console.log('✅ Text generation successful:');
    console.log(`   Content: ${completionResponse.candidates[0].content.substring(0, 100)}...`);
    console.log(`   Tokens used: ${completionResponse.usage.totalTokens}`);

    // Test embeddings
    console.log('\n🔢 Test 3: Embeddings Generation');
    const embeddingResponse = await vertexAI.generateEmbedding({
      content: 'Real estate investment opportunities in Austin, Texas'
    });

    console.log('✅ Embeddings generation successful:');
    console.log(`   Embedding dimensions: ${embeddingResponse.embeddings.values.length}`);
    console.log(`   Token count: ${embeddingResponse.embeddings.statistics.tokenCount}`);

    // Test model listing
    console.log('\n📊 Test 4: Model Listing');
    const models = await vertexAI.listModels();
    console.log(`✅ Found ${models.length} available models`);
    console.log(`   Available models: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}`);

  } catch (error) {
    console.error('❌ Vertex AI test failed:', error.message);
    return false;
  }

  console.log('\n🎉 Vertex AI integration test completed successfully!');
  return true;
}

async function testAIServiceManager() {
  console.log('\n🔄 Testing AI Service Manager...\n');

  try {
    const aiManager = new AIServiceManager({
      primaryProvider: 'vertex-ai',
      fallbackProvider: 'ollama',
      enableFallback: true,
      fallbackThreshold: 0.1,
      vertexConfig: {
        projectId: process.env.VERTEX_AI_PROJECT_ID,
        region: process.env.VERTEX_AI_REGION,
        serviceAccountEmail: process.env.VERTEX_AI_SERVICE_ACCOUNT_EMAIL,
        apiKey: process.env.VERTEX_AI_API_KEY
      }
    });

    await aiManager.initialize();
    console.log('✅ AI Service Manager initialized successfully');

    // Test completion through manager
    const response = await aiManager.generateCompletion({
      prompt: 'Generate a short property description for a modern condo.',
      maxTokens: 100,
      temperature: 0.8
    });

    console.log('✅ AI Manager completion successful:');
    console.log(`   Current provider: ${aiManager.getCurrentProvider()}`);
    console.log(`   Content: ${response.candidates[0].content.substring(0, 100)}...`);

    // Test metrics
    const metrics = aiManager.getMetrics();
    console.log('✅ Metrics collection working:');
    metrics.forEach((metric, provider) => {
      console.log(`   ${provider}: ${metric.requestCount} requests, ${metric.successCount} successful`);
    });

  } catch (error) {
    console.error('❌ AI Service Manager test failed:', error.message);
    return false;
  }

  console.log('\n🎉 AI Service Manager test completed successfully!');
  return true;
}

async function testRealEstateUseCases() {
  console.log('\n🏠 Testing Real Estate Use Cases...\n');

  try {
    const vertexAI = new VertexAIService({
      projectId: process.env.VERTEX_AI_PROJECT_ID,
      region: process.env.VERTEX_AI_REGION,
      serviceAccountEmail: process.env.VERTEX_AI_SERVICE_ACCOUNT_EMAIL,
      apiKey: process.env.VERTEX_AI_API_KEY
    });

    await vertexAI.initialize();

    // Test property description generation
    console.log('📝 Test: Property Description Generation');
    const propertyResponse = await vertexAI.generateCompletion({
      prompt: `Generate a compelling property description for:
- 3 bedroom, 2 bathroom house
- 2,500 square feet
- Modern kitchen with granite countertops
- Backyard with pool
- Located in Austin, Texas

Focus on lifestyle benefits and keep it under 150 words.`,
      maxTokens: 200,
      temperature: 0.8
    });

    console.log('✅ Property description generated:');
    console.log(`   ${propertyResponse.candidates[0].content.substring(0, 200)}...`);

    // Test market analysis
    console.log('\n📊 Test: Market Analysis');
    const marketResponse = await vertexAI.generateCompletion({
      prompt: `Analyze the current real estate market trends for:
- Single-family homes in Austin, Texas
- Price range $400,000 - $600,000
- Focus on inventory levels and interest rates

Provide a concise analysis with key insights.`,
      maxTokens: 300,
      temperature: 0.3
    });

    console.log('✅ Market analysis generated:');
    console.log(`   ${marketResponse.candidates[0].content.substring(0, 200)}...`);

    // Test customer service response
    console.log('\n💬 Test: Customer Service Response');
    const serviceResponse = await vertexAI.generateCompletion({
      prompt: `Generate a professional email response to:
Customer inquiry: "I'm interested in the property at 123 Main St. Is it still available?"

Requirements:
- Professional and friendly tone
- Confirm availability
- Suggest next steps
- Keep it under 150 words`,
      maxTokens: 200,
      temperature: 0.5
    });

    console.log('✅ Customer service response generated:');
    console.log(`   ${serviceResponse.candidates[0].content.substring(0, 200)}...`);

  } catch (error) {
    console.error('❌ Real estate use cases test failed:', error.message);
    return false;
  }

  console.log('\n🎉 Real estate use cases test completed successfully!');
  return true;
}

async function main() {
  console.log('🤖 RE Engine Vertex AI Integration Test Suite');
  console.log('==========================================\n');

  // Check environment variables
  const requiredEnvVars = [
    'VERTEX_AI_PROJECT_ID',
    'VERTEX_AI_REGION',
    'VERTEX_AI_SERVICE_ACCOUNT_EMAIL',
    'VERTEX_AI_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }

  console.log('✅ All required environment variables found\n');

  // Run tests
  const tests = [
    { name: 'Vertex AI Service', fn: testVertexAI },
    { name: 'AI Service Manager', fn: testAIServiceManager },
    { name: 'Real Estate Use Cases', fn: testRealEstateUseCases }
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${test.name}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const success = await test.fn();
      if (success) passedTests++;
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(50)}`);
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Vertex AI integration is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the configuration and try again.');
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
