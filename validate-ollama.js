#!/usr/bin/env node

/**
 * Simple Ollama Validation Test
 * Tests Ollama connectivity without requiring full RE Engine build
 */

import { getOllamaService } from './engine/src/services/ollama.service.js';

async function validateOllama() {
  console.log('🦞 Validating Ollama Integration...');
  
  try {
    // Create Ollama service
    const ollama = getOllamaService({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'qwen:7b',
      timeout: 30000
    });

    console.log('✅ Ollama service created');

    // Test connection
    console.log('🔗 Testing connection...');
    const connected = await ollama.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Ollama');
    }
    console.log('✅ Connected to Ollama successfully');

    // List models
    console.log('📋 Listing available models...');
    const models = await ollama.listModels();
    console.log(`✅ Found ${models.length} models:`);
    models.forEach(model => {
      console.log(`   - ${model.name} (${model.size} bytes)`);
    });

    // Check for qwen:7b model
    const hasQwen = await ollama.hasModel('qwen:7b');
    if (!hasQwen) {
      console.warn('⚠️  qwen:7b model not found, but other models are available');
    } else {
      console.log('✅ qwen:7b model is available');
    }

    // Test chat completion
    console.log('💬 Testing chat completion...');
    const chatResponse = await ollama.chat({
      model: 'qwen:7b',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in exactly 5 words.' }
      ],
      options: {
        temperature: 0.7,
        num_predict: 10
      }
    });

    if (!chatResponse.done) {
      throw new Error('Chat completion incomplete');
    }
    console.log('✅ Chat completion successful');
    console.log(`   - Response: "${chatResponse.message.content}"`);
    console.log(`   - Model: ${chatResponse.model}`);
    console.log(`   - Duration: ${chatResponse.total_duration}ms`);

    // Test embeddings
    console.log('🔢 Testing embeddings...');
    const embeddings = await ollama.embed('qwen:7b', 'test embedding');
    if (!embeddings || embeddings.length === 0) {
      throw new Error('Embeddings generation failed');
    }
    console.log(`✅ Embeddings generated (${embeddings.length} dimensions)`);

    // Health check
    console.log('🏥 Performing health check...');
    const health = await ollama.healthCheck();
    console.log(`✅ Health status: ${health.status}`);
    console.log(`   - Connected: ${health.details.connected}`);
    console.log(`   - Models: ${health.details.modelCount}`);
    console.log(`   - Available: ${health.details.availableModels.join(', ')}`);

    console.log('');
    console.log('🎉 Ollama validation completed successfully!');
    console.log('');
    console.log('📊 Validation Results:');
    console.log('   ✅ Ollama service connectivity');
    console.log('   ✅ Model listing');
    console.log('   ✅ Chat completions');
    console.log('   ✅ Embeddings generation');
    console.log('   ✅ Health monitoring');
    console.log('');
    console.log('🚀 Ollama is ready for RE Engine integration!');

  } catch (error) {
    console.error('❌ Ollama validation failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Make sure Ollama is running: ollama serve');
    console.error('   2. Check Ollama models: ollama list');
    console.error('   3. Verify qwen:7b model: ollama pull qwen:7b');
    console.error('   4. Test API directly: curl http://localhost:11434/api/tags');
    console.error('   5. Check Ollama logs for errors');
    process.exit(1);
  }
}

// Run validation
validateOllama();
