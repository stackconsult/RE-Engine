#!/usr/bin/env node

/**
 * LiteLLM Integration Test Suite
 * Tests the complete LiteLLM + Ollama + Claude Code integration
 */

import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(test) {
  log(`\n🧪 ${test}`, colors.cyan);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logResult(message) {
  log(`📊 ${message}`, colors.magenta);
}

let liteLLMProcess: ChildProcess | null = null;

async function cleanup() {
  if (liteLLMProcess) {
    logInfo('Cleaning up LiteLLM process...');
    liteLLMProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (liteLLMProcess && !liteLLMProcess.killed) {
      liteLLMProcess.kill('SIGKILL');
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  log('\n🛑 Shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

async function waitForService(url, maxWaitTime = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function testPrerequisites() {
  logTest('Testing Prerequisites');
  
  const tests = [
    {
      name: 'Environment Variables',
      test: () => {
        const required = ['LITELLM_MASTER_KEY', 'LITELLM_CONFIG_PATH'];
        const missing = required.filter(env => !process.env[env]);
        if (missing.length > 0) {
          throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
        return true;
      }
    },
    {
      name: 'LiteLLM Installation',
      test: async () => {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
          await execAsync('litellm --version');
          return true;
        } catch (error) {
          throw new Error('LiteLLM is not installed or not in PATH');
        }
      }
    },
    {
      name: 'Configuration File',
      test: () => {
        const configPath = process.env.LITELLM_CONFIG_PATH || './config/litellm-config.yaml';
        if (!existsSync(configPath)) {
          throw new Error(`Configuration file not found: ${configPath}`);
        }
        return true;
      }
    },
    {
      name: 'Ollama Service',
      test: async () => {
        try {
          const response = await fetch('http://localhost:11434/api/tags');
          if (!response.ok) {
            throw new Error('Ollama service not responding correctly');
          }
          const data = await response.json();
          if (!data.models || data.models.length === 0) {
            throw new Error('No models available in Ollama');
          }
          return true;
        } catch (error) {
          throw new Error('Ollama service is not accessible at localhost:11434');
        }
      }
    }
  ];
  
  let passed = 0;
  for (const test of tests) {
    try {
      await test.test();
      logSuccess(`${test.name} - PASSED`);
      passed++;
    } catch (error) {
      logError(`${test.name} - FAILED: ${error.message}`);
    }
  }
  
  logResult(`Prerequisites: ${passed}/${tests.length} tests passed`);
  return passed === tests.length;
}

async function startLiteLLM() {
  logTest('Starting LiteLLM Proxy');
  
  return new Promise((resolve, reject) => {
    const configPath = process.env.LITELLM_CONFIG_PATH || './config/litellm-config.yaml';
    
    liteLLMProcess = spawn('litellm', ['--config', configPath, '--port', '4000'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    liteLLMProcess.stdout?.on('data', (data) => {
      logInfo(`LiteLLM: ${data.toString().trim()}`);
    });
    
    liteLLMProcess.stderr?.on('data', (data) => {
      logWarning(`LiteLLM Error: ${data.toString().trim()}`);
    });
    
    liteLLMProcess.on('error', (error) => {
      logError(`LiteLLM process error: ${error.message}`);
      reject(error);
    });
    
    liteLLMProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        logError(`LiteLLM exited with code ${code}`);
      }
    });
    
    // Wait for service to be ready
    setTimeout(async () => {
      const isReady = await waitForService('http://localhost:4000/health');
      if (isReady) {
        logSuccess('LiteLLM proxy started successfully');
        resolve(true);
      } else {
        logError('LiteLLM proxy failed to start within timeout');
        reject(new Error('LiteLLM startup timeout'));
      }
    }, 5000);
  });
}

async function testLiteLLMProxy() {
  logTest('Testing LiteLLM Proxy Health');
  
  try {
    const response = await fetch('http://localhost:4000/health');
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    logSuccess('LiteLLM proxy health check passed');
    logInfo(`Health response: ${JSON.stringify(data, null, 2)}`);
    return true;
  } catch (error) {
    logError(`LiteLLM proxy health check failed: ${error.message}`);
    return false;
  }
}

async function testModelListing() {
  logTest('Testing Model Listing');
  
  try {
    const response = await fetch('http://localhost:4000/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Model listing failed: ${response.status}`);
    }
    
    const data = await response.json();
    logSuccess('Model listing successful');
    logResult(`Available models: ${data.data?.length || 0} models`);
    
    if (data.data && data.data.length > 0) {
      data.data.forEach((model, index) => {
        logInfo(`  ${index + 1}. ${model.id}`);
      });
    }
    
    return true;
  } catch (error) {
    logError(`Model listing failed: ${error.message}`);
    return false;
  }
}

async function testClaudeCompatibility() {
  logTest('Testing Claude API Compatibility');
  
  try {
    const requestBody = {
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with a brief introduction.'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    };
    
    const response = await fetch('http://localhost:4000/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API test failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    logSuccess('Claude API compatibility test passed');
    
    if (data.content && data.content.length > 0) {
      logResult(`Response: ${data.content[0].text.substring(0, 100)}...`);
    }
    
    if (data.usage) {
      logResult(`Token usage: ${data.usage.input_tokens} input, ${data.usage.output_tokens} output`);
    }
    
    return true;
  } catch (error) {
    logError(`Claude API compatibility test failed: ${error.message}`);
    return false;
  }
}

async function testMultipleModels() {
  logTest('Testing Multiple Model Mappings');
  
  const models = ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5'];
  let passed = 0;
  
  for (const model of models) {
    try {
      const requestBody = {
        model,
        messages: [
          {
            role: 'user',
            content: `Brief response as ${model}.`
          }
        ],
        max_tokens: 50,
        temperature: 0.5
      };
      
      const response = await fetch('http://localhost:4000/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        logSuccess(`${model} - PASSED`);
        if (data.content && data.content.length > 0) {
          logInfo(`  Response: ${data.content[0].text.substring(0, 50)}...`);
        }
        passed++;
      } else {
        logError(`${model} - FAILED: ${response.status}`);
      }
    } catch (error) {
      logError(`${model} - FAILED: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  logResult(`Multiple models test: ${passed}/${models.length} tests passed`);
  return passed === models.length;
}

async function testPerformance() {
  logTest('Testing Performance');
  
  try {
    const startTime = Date.now();
    const requestBody = {
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: 'Generate a short poem about technology.'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    };
    
    const response = await fetch('http://localhost:4000/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Performance test failed: ${response.status}`);
    }
    
    const data = await response.json();
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    logSuccess('Performance test completed');
    logResult(`Response time: ${responseTime}ms`);
    
    if (data.usage) {
      logResult(`Tokens per second: ${((data.usage.input_tokens + data.usage.output_tokens) / (responseTime / 1000)).toFixed(2)}`);
    }
    
    return responseTime < 10000; // Should complete within 10 seconds
  } catch (error) {
    logError(`Performance test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  log('🚀 RE Engine LiteLLM Integration Test Suite', colors.cyan);
  log('==========================================', colors.cyan);
  
  const tests = [
    { name: 'Prerequisites', fn: testPrerequisites },
    { name: 'Start LiteLLM', fn: startLiteLLM },
    { name: 'LiteLLM Proxy Health', fn: testLiteLLMProxy },
    { name: 'Model Listing', fn: testModelListing },
    { name: 'Claude API Compatibility', fn: testClaudeCompatibility },
    { name: 'Multiple Models', fn: testMultipleModels },
    { name: 'Performance', fn: testPerformance }
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      logError(`${test.name} test crashed: ${error.message}`);
    }
  }
  
  log('\n' + '='.repeat(50), colors.cyan);
  log('📊 TEST SUMMARY', colors.cyan);
  log('='.repeat(50), colors.cyan);
  logResult(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! LiteLLM integration is working perfectly.', colors.green);
    log('\nYou can now use Claude Code with:', colors.cyan);
    log('  export ANTHROPIC_BASE_URL="http://localhost:4000"', colors.blue);
    log('  export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"', colors.blue);
    log('  claude --model claude-sonnet-4-5 "Hello!"', colors.blue);
  } else {
    log('\n❌ Some tests failed. Please check the configuration and try again.', colors.red);
    process.exit(1);
  }
  
  await cleanup();
}

// Run the test suite
main().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  cleanup();
  process.exit(1);
});
