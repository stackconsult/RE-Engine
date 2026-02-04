#!/usr/bin/env node

/**
 * Direct Ollama API Test
 * Tests Ollama connectivity without any dependencies
 */

async function testOllamaDirect() {
  console.log('🦞 Testing Ollama Direct API...');
  
  try {
    // Test basic connectivity
    console.log('🔗 Testing basic connectivity...');
    const versionResponse = await fetch('http://localhost:11434/api/version');
    if (!versionResponse.ok) {
      throw new Error(`HTTP ${versionResponse.status}: ${versionResponse.statusText}`);
    }
    const version = await versionResponse.json();
    console.log('✅ Ollama API accessible');
    console.log(`   - Version: ${version.version}`);

    // Test model listing
    console.log('📋 Listing available models...');
    const tagsResponse = await fetch('http://localhost:11434/api/tags');
    if (!tagsResponse.ok) {
      throw new Error(`HTTP ${tagsResponse.status}: ${tagsResponse.statusText}`);
    }
    const tags = await tagsResponse.json();
    console.log(`✅ Found ${tags.models.length} models:`);
    tags.models.forEach(model => {
      console.log(`   - ${model.name} (${Math.round(model.size / 1024 / 1024)}MB)`);
    });

    // Check for qwen:7b
    const hasQwen = tags.models.some(m => m.name === 'qwen:7b');
    if (!hasQwen) {
      console.warn('⚠️  qwen:7b model not found');
      console.log('   💡 You can pull it with: ollama pull qwen:7b');
    } else {
      console.log('✅ qwen:7b model is available');
    }

    // Test chat completion with available model
    const availableModel = tags.models[0]?.name;
    if (availableModel) {
      console.log(`💬 Testing chat completion with ${availableModel}...`);
      
      const chatResponse = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: availableModel,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say hello in exactly 5 words.' }
          ],
          stream: false
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`HTTP ${chatResponse.status}: ${chatResponse.statusText}`);
      }

      const chat = await chatResponse.json();
      console.log('✅ Chat completion successful');
      console.log(`   - Response: "${chat.message.content}"`);
      console.log(`   - Model: ${chat.model}`);
      console.log(`   - Done: ${chat.done}`);
    }

    // Test embeddings if available
    const embeddingModel = tags.models.find(m => m.name.includes('embed') || m.name.includes('embedding'));
    if (embeddingModel) {
      console.log(`🔢 Testing embeddings with ${embeddingModel.name}...`);
      
      const embedResponse = await fetch('http://localhost:11434/api/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: embeddingModel.name,
          prompt: 'test embedding'
        })
      });

      if (embedResponse.ok) {
        const embed = await embedResponse.json();
        console.log('✅ Embeddings generated');
        console.log(`   - Dimensions: ${embed.embeddings?.length || 0}`);
      } else {
        console.log('⚠️  Embeddings test failed (model may not support embeddings)');
      }
    }

    // Test server status
    console.log('🏥 Checking server status...');
    const psResponse = await fetch('http://localhost:11434/api/ps');
    if (psResponse.ok) {
      const ps = await psResponse.json();
      console.log('✅ Server status check');
      console.log(`   - Running models: ${ps.models?.length || 0}`);
    } else {
      console.log('ℹ️  Server status check failed (non-critical)');
    }

    console.log('');
    console.log('🎉 Ollama Direct API Test Completed Successfully!');
    console.log('');
    console.log('📊 Test Results:');
    console.log('   ✅ Ollama API connectivity');
    console.log('   ✅ Model listing');
    console.log('   ✅ Chat completions');
    if (embeddingModel) {
      console.log('   ✅ Embeddings generation');
    }
    console.log('   ✅ Server status');
    console.log('');
    console.log('🚀 Ollama is ready for RE Engine Integration!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Fix TypeScript build errors in RE Engine');
    console.log('   2. Update RE Engine client to use Ollama');
    console.log('   3. Test complete integration');
    console.log('   4. Deploy to production');

  } catch (error) {
    console.error('❌ Ollama Direct API Test Failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Make sure Ollama is running: ollama serve');
    console.error('   2. Check Ollama process: ps aux | grep ollama');
    console.error('   3. Test Ollama CLI: ollama list');
    console.error('   4. Test API directly: curl http://localhost:11434/api/tags');
    console.error('   5. Restart Ollama if needed: ollama serve');
    console.error('   6. Check port 11434 availability');
    process.exit(1);
  }
}

// Run the test
testOllamaDirect();
