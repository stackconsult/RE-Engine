#!/usr/bin/env node

/**
 * Simple Ollama Integration Test
 * Validates basic Ollama connectivity and RE Engine client functionality
 */

import { createREEngineClient } from './engine/dist/sdk/client/reengine-client.js';

async function testOllamaIntegration() {
  console.log('🦞 Testing Ollama Integration...');
  
  try {
    // Create client with Ollama configuration
    const client = createREEngineClient({
      dataDir: './test-data',
      ollama: {
        baseUrl: 'http://localhost:11434',
        defaultModel: 'qwen:7b',
        timeout: 30000
      }
    });

    console.log('✅ Client created successfully');

    // Initialize client
    const initResult = await client.initialize();
    if (!initResult.success) {
      throw new Error(`Client initialization failed: ${initResult.error}`);
    }
    console.log('✅ Client initialized successfully');

    // Test AI service status
    const aiStatus = await client.getAIStatus();
    if (!aiStatus.success) {
      throw new Error(`AI status check failed: ${aiStatus.error}`);
    }
    console.log('✅ AI service connected');
    console.log(`   - Models available: ${aiStatus.data?.modelCount}`);
    console.log(`   - Default model: ${aiStatus.data?.defaultModel}`);
    console.log(`   - Available models: ${aiStatus.data?.availableModels?.join(', ')}`);

    // Create test lead
    const testLead = {
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

    console.log('✅ Test lead created');

    // Test outreach message generation
    console.log('📝 Generating outreach message...');
    const messageResult = await client.generateOutreachMessage(testLead, undefined, {
      tone: 'professional',
      length: 'medium'
    });

    if (!messageResult.success) {
      throw new Error(`Message generation failed: ${messageResult.error}`);
    }
    console.log('✅ Outreach message generated successfully');
    console.log(`   - Message length: ${messageResult.data?.message?.length} chars`);
    console.log(`   - Confidence: ${messageResult.data?.confidence}`);
    console.log(`   - Preview: ${messageResult.data?.message?.substring(0, 100)}...`);

    // Test lead analysis
    console.log('🔍 Analyzing lead...');
    const analysisResult = await client.analyzeLead(testLead);

    if (!analysisResult.success) {
      throw new Error(`Lead analysis failed: ${analysisResult.error}`);
    }
    console.log('✅ Lead analysis completed successfully');
    console.log(`   - Lead score: ${analysisResult.data?.score}/100`);
    console.log(`   - Insights: ${analysisResult.data?.insights?.length} found`);
    console.log(`   - Recommendations: ${analysisResult.data?.recommendations?.length} found`);
    console.log(`   - Confidence: ${analysisResult.data?.confidence}`);

    // Test conversation response
    console.log('💬 Generating conversation response...');
    const conversationHistory = [
      {
        role: 'user',
        content: 'Hi, I\'m interested in your properties',
        timestamp: new Date().toISOString()
      }
    ];

    const responseResult = await client.generateResponse(
      testLead,
      conversationHistory,
      'What 3-bedroom houses do you have available?',
      {
        tone: 'friendly',
        purpose: 'answer_question'
      }
    );

    if (!responseResult.success) {
      throw new Error(`Response generation failed: ${responseResult.error}`);
    }
    console.log('✅ Conversation response generated successfully');
    console.log(`   - Response length: ${responseResult.data?.response?.length} chars`);
    console.log(`   - Suggested actions: ${responseResult.data?.suggestedActions?.length}`);
    console.log(`   - Preview: ${responseResult.data?.response?.substring(0, 100)}...`);

    console.log('🎉 All Ollama integration tests passed!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   ✅ Ollama service connectivity');
    console.log('   ✅ AI model availability');
    console.log('   ✅ Outreach message generation');
    console.log('   ✅ Lead analysis');
    console.log('   ✅ Conversation response generation');
    console.log('');
    console.log('🚀 RE Engine with Ollama is ready for production!');

  } catch (error) {
    console.error('❌ Ollama integration test failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Make sure Ollama is running: ollama serve');
    console.error('   2. Check Ollama models: ollama list');
    console.error('   3. Verify qwen:7b model is available');
    console.error('   4. Check Ollama API: curl http://localhost:11434/api/tags');
    process.exit(1);
  }
}

// Run the test
testOllamaIntegration();
