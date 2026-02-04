#!/usr/bin/env node

/**
 * Hybrid AI Setup Script
 * 
 * This script helps configure and test the hybrid AI system
 * with both Ollama and Vertex AI models
 */

import { HybridAIManager } from '../engine/src/ai/hybrid-ai-manager.js';
import { logSystemEvent } from '../engine/src/observability/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupHybridAI() {
  console.log('🚀 Setting up Hybrid AI System...\n');

  try {
    // 1. Check environment configuration
    console.log('📋 Checking environment configuration...');
    await checkEnvironmentConfig();
    
    // 2. Initialize Hybrid AI Manager
    console.log('🔧 Initializing Hybrid AI Manager...');
    const hybridManager = new HybridAIManager();
    
    // 3. Health check all services
    console.log('🏥 Performing health checks...');
    const healthStatus = await hybridManager.healthCheck();
    console.log('Health Status:', healthStatus);
    
    // 4. Display available models
    console.log('📊 Available Models:');
    const models = hybridManager.getAvailableModels();
    models.forEach(model => {
      console.log(`  - ${model.provider}:${model.modelId}`);
      console.log(`    Capabilities: ${model.capabilities.join(', ')}`);
      console.log(`    Priority: ${model.priority}`);
      console.log(`    Reliability: ${(model.reliability * 100).toFixed(1)}%`);
      console.log(`    Cost per token: $${model.costPerToken}`);
      console.log('');
    });
    
    // 5. Run test scenarios
    console.log('🧪 Running test scenarios...');
    await runTestScenarios(hybridManager);
    
    // 6. Display performance metrics
    console.log('📈 Performance Metrics:');
    const metrics = hybridManager.getPerformanceMetrics();
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`  ${key}:`);
      console.log(`    Total Requests: ${value.totalRequests}`);
      console.log(`    Success Rate: ${(value.successRate * 100).toFixed(1)}%`);
      console.log(`    Average Latency: ${value.averageLatency.toFixed(0)}ms`);
      console.log(`    Total Cost: $${value.totalCost.toFixed(4)}`);
      console.log('');
    });
    
    console.log('✅ Hybrid AI System setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function checkEnvironmentConfig() {
  const requiredEnvVars = [
    'OLLAMA_BASE_URL',
    'OLLAMA_MODEL',
    'VERTEX_AI_PROJECT_ID',
    'VERTEX_AI_REGION'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Please set these in your .env file');
    console.log('   You can copy .env.example to .env and update the values\n');
  }
}

async function runTestScenarios(hybridManager) {
  const testScenarios = [
    {
      name: 'Single Model - Ollama',
      request: {
        prompt: 'What is real estate investing?',
        taskType: 'completion',
        strategy: 'single',
        preferredProvider: 'ollama'
      }
    },
    {
      name: 'Single Model - Vertex AI',
      request: {
        prompt: 'What is real estate investing?',
        taskType: 'completion',
        strategy: 'single',
        preferredProvider: 'vertex'
      }
    },
    {
      name: 'Ensemble - Multiple Models',
      request: {
        prompt: 'What is real estate investing?',
        taskType: 'completion',
        strategy: 'ensemble'
      }
    },
    {
      name: 'Fallback with Preference',
      request: {
        prompt: 'What is real estate investing?',
        taskType: 'completion',
        strategy: 'fallback',
        preferredProvider: 'vertex'
      }
    },
    {
      name: 'Load Balanced',
      request: {
        prompt: 'What is real estate investing?',
        taskType: 'completion',
        strategy: 'load-balance'
      }
    },
    {
      name: 'Embedding Generation',
      request: {
        prompt: 'Real estate investment opportunities',
        taskType: 'embedding',
        strategy: 'single'
      }
    }
  ];
  
  for (const scenario of testScenarios) {
    try {
      console.log(`\n🧪 Testing: ${scenario.name}`);
      const startTime = Date.now();
      
      const response = await hybridManager.processRequest(scenario.request);
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Success!`);
      console.log(`   Provider: ${response.provider}`);
      console.log(`   Model: ${response.modelId}`);
      console.log(`   Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      console.log(`   Latency: ${response.latency}ms`);
      console.log(`   Cost: $${response.cost.toFixed(4)}`);
      console.log(`   Strategy: ${response.metadata.strategy}`);
      
      if (typeof response.result === 'string') {
        console.log(`   Result: ${response.result.substring(0, 100)}...`);
      } else {
        console.log(`   Result: ${Array.isArray(response.result) ? `${response.result.length} dimensions` : 'Complex object'}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupHybridAI();
}

export { setupHybridAI };
