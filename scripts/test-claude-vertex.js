#!/usr/bin/env node

/**
 * Claude on Vertex AI Integration Test
 * Tests the Claude Vertex AI service with OAuth 2.0 authentication
 */

import dotenv from 'dotenv';
import { ClaudeVertexService } from '../engine/dist/ai/claude-vertex.service.js';

// Load environment variables
dotenv.config();

async function testClaudeVertexService() {
  console.log('🤖 RE Engine Claude on Vertex AI Test Suite');
  console.log('=============================================\n');

  try {
    // Test 1: Direct Claude Vertex AI Service
    console.log('📋 Test 1: Direct Claude Vertex AI Service');
    const claudeVertex = new ClaudeVertexService({
      projectId: process.env.CLAUDE_VERTEX_PROJECT_ID,
      region: process.env.CLAUDE_VERTEX_REGION,
      oauthClientId: process.env.CLAUDE_VERTEX_OAUTH_CLIENT_ID,
      oauthClientSecret: process.env.CLAUDE_VERTEX_OAUTH_CLIENT_SECRET,
      oauthRedirectUri: process.env.CLAUDE_VERTEX_OAUTH_REDIRECT_URI,
      modelId: process.env.CLAUDE_VERTEX_MODEL_ID || 'claude-sonnet-4-5@20250929',
      maxTokens: parseInt(process.env.CLAUDE_VERTEX_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.CLAUDE_VERTEX_TEMPERATURE || '0.7')
    });

    await claudeVertex.initialize();
    console.log('✅ Claude Vertex AI service initialized successfully');

    // Test health check
    const isHealthy = await claudeVertex.healthCheck();
    console.log(`✅ Health check: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);

    // Test text generation
    console.log('\n📝 Test: Basic Text Generation');
    const response = await claudeVertex.generateCompletion({
      messages: [
        { role: 'user', content: 'Hello! Can you introduce yourself briefly?' }
      ],
      maxTokens: 100
    });
    
    console.log('✅ Text generation successful');
    console.log(`   Model: ${response.model}`);
    console.log(`   Response: ${response.content[0].text.substring(0, 100)}...`);
    console.log(`   Tokens: ${response.usage.inputTokens} input, ${response.usage.outputTokens} output`);

    // Test token counting
    console.log('\n🔢 Test: Token Counting');
    const tokenCount = await claudeVertex.countTokens({
      messages: [
        { role: 'user', content: 'This is a test message for token counting.' }
      ]
    });
    
    console.log(`✅ Token count: ${tokenCount.inputTokens} input tokens`);

    // Test model listing
    console.log('\n📋 Test: Available Models');
    const models = await claudeVertex.listAvailableModels();
    console.log(`✅ Available models: ${models.length} models`);
    console.log(`   Latest: ${models[0]}`);
    console.log(`   All: ${models.slice(0, 3).join(', ')}...`);

  } catch (error) {
    console.error('❌ Claude Vertex AI service test failed:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

async function testRealEstateUseCases() {
  console.log('\n🏠 Testing Real Estate Use Cases...\n');

  try {
    const claudeVertex = new ClaudeVertexService({
      projectId: process.env.CLAUDE_VERTEX_PROJECT_ID,
      region: process.env.CLAUDE_VERTEX_REGION,
      oauthClientId: process.env.CLAUDE_VERTEX_OAUTH_CLIENT_ID,
      oauthClientSecret: process.env.CLAUDE_VERTEX_OAUTH_CLIENT_SECRET,
      modelId: process.env.CLAUDE_VERTEX_MODEL_ID || 'claude-sonnet-4-5@20250929'
    });

    await claudeVertex.initialize();

    // Test property description generation
    console.log('📝 Test: Property Description Generation');
    const propertyResponse = await claudeVertex.generateCompletion({
      messages: [
        {
          role: 'user',
          content: `Generate a compelling property description for:
- 3 bedroom, 2 bathroom house
- 2,500 square feet
- Modern kitchen with granite countertops
- Backyard with garden
- Located in quiet neighborhood
- Price: $450,000

Make it engaging and professional.`
        }
      ],
      maxTokens: 200,
      temperature: 0.8
    });

    console.log('✅ Property description generated successfully');
    console.log(`   Length: ${propertyResponse.content[0].text.length} characters`);
    console.log(`   Preview: ${propertyResponse.content[0].text.substring(0, 150)}...`);

    // Test market analysis
    console.log('\n📊 Test: Market Analysis');
    const marketResponse = await claudeVertex.generateCompletion({
      messages: [
        {
          role: 'user',
          content: `Provide a brief market analysis for a residential property in Austin, Texas. Consider:
- Current market trends
- Price per square foot
- Neighborhood amenities
- Investment potential
- Buyer demographics

Keep it concise and data-driven.`
        }
      ],
      maxTokens: 250,
      temperature: 0.6
    });

    console.log('✅ Market analysis generated successfully');
    console.log(`   Length: ${marketResponse.content[0].text.length} characters`);
    console.log(`   Preview: ${marketResponse.content[0].text.substring(0, 150)}...`);

    // Test customer service response
    console.log('\n💬 Test: Customer Service Response');
    const serviceResponse = await claudeVertex.generateCompletion({
      messages: [
        {
          role: 'user',
          content: `A potential buyer asks: "I'm concerned about the foundation of the house. Are there any known issues?"

Generate a professional, reassuring response that:
- Addresses their concern directly
- Shows transparency
- Offers solutions
- Maintains positive relationship`
        }
      ],
      maxTokens: 150,
      temperature: 0.7
    });

    console.log('✅ Customer service response generated successfully');
    console.log(`   Length: ${serviceResponse.content[0].text.length} characters`);
    console.log(`   Preview: ${serviceResponse.content[0].text.substring(0, 150)}...`);

  } catch (error) {
    console.error('❌ Real estate use cases test failed:', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log('🤖 RE Engine Claude on Vertex AI Integration Test Suite');
  console.log('====================================================\n');

  // Check environment variables
  const requiredEnvVars = [
    'CLAUDE_VERTEX_PROJECT_ID',
    'CLAUDE_VERTEX_REGION',
    'CLAUDE_VERTEX_OAUTH_CLIENT_ID',
    'CLAUDE_VERTEX_OAUTH_CLIENT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }

  const tests = [
    { name: 'Claude Vertex AI Service', fn: testClaudeVertexService },
    { name: 'Real Estate Use Cases', fn: testRealEstateUseCases }
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Running: ${test.name}`);
      console.log('='.repeat(50));
      
      await test.fn();
      passedTests++;
      console.log(`✅ ${test.name} test passed\n`);
    } catch (error) {
      console.error(`❌ ${test.name} test failed:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Claude on Vertex AI integration is working perfectly.');
  } else {
    console.log('❌ Some tests failed. Please check the configuration and try again.');
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error('💥 Test suite failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
