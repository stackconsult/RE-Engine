#!/usr/bin/env node

/**
 * LiteLLM Setup Script
 * Automated installation and configuration for LiteLLM proxy with Ollama
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n🔧 ${step}`, colors.cyan);
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

async function runCommand(command, description) {
  logStep(description);
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('warning')) {
      logWarning(`Command output: ${stderr}`);
    }
    logSuccess(`${description} completed successfully`);
    return stdout;
  } catch (error) {
    logError(`${description} failed: ${error.message}`);
    throw error;
  }
}

async function checkPrerequisites() {
  logStep('Checking prerequisites...');
  
  // Check Python
  try {
    await execAsync('python3 --version');
    logSuccess('Python 3 is installed');
  } catch (error) {
    logError('Python 3 is required but not found');
    throw error;
  }
  
  // Check pip
  try {
    await execAsync('pip3 --version');
    logSuccess('pip3 is available');
  } catch (error) {
    logError('pip3 is required but not found');
    throw error;
  }
  
  // Check Node.js
  try {
    await execAsync('node --version');
    logSuccess('Node.js is installed');
  } catch (error) {
    logError('Node.js is required but not found');
    throw error;
  }
  
  // Check if Ollama is running
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      logSuccess('Ollama is running and accessible');
    } else {
      logWarning('Ollama may not be running properly');
    }
  } catch (error) {
    logWarning('Ollama is not accessible - please ensure it\'s running on localhost:11434');
  }
}

async function installLiteLLM() {
  logStep('Installing LiteLLM...');
  
  try {
    await runCommand('pip3 install litellm[proxy]', 'LiteLLM installation');
    await runCommand('pip3 install js-yaml', 'js-yaml for configuration');
    logSuccess('LiteLLM and dependencies installed');
  } catch (error) {
    logError('Failed to install LiteLLM');
    throw error;
  }
}

async function generateMasterKey() {
  logStep('Generating secure master key...');
  
  try {
    const { stdout } = await execAsync('openssl rand -hex 32');
    const masterKey = stdout.trim();
    logSuccess('Master key generated');
    return masterKey;
  } catch (error) {
    // Fallback to Node.js crypto
    const crypto = await import('crypto');
    const masterKey = crypto.randomBytes(32).toString('hex');
    logSuccess('Master key generated (fallback)');
    return masterKey;
  }
}

async function updateEnvironment(masterKey) {
  logStep('Updating environment configuration...');
  
  const envPath = join(__dirname, '..', '.env');
  const envExamplePath = join(__dirname, '..', '.env.example');
  
  // Read existing .env or create from .env.example
  let envContent = '';
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  } else if (existsSync(envExamplePath)) {
    envContent = readFileSync(envExamplePath, 'utf8');
  } else {
    envContent = '# RE Engine Environment Configuration\n';
  }
  
  // Add or update LiteLLM configuration
  const liteLLMConfig = `
# LiteLLM Proxy Configuration
LITELLM_ENABLED=true
LITELLM_PROXY_URL=http://localhost:4000
LITELLM_MASTER_KEY=${masterKey}
LITELLM_CONFIG_PATH=./config/litellm-config.yaml
LITELLM_AUTO_START=true

# Ollama Model Mappings for Claude Compatibility
OLLAMA_CLAUDE_SONNET_MODEL=deepseek-coder-v2
OLLAMA_CLAUDE_OPUS_MODEL=qwen:7b
OLLAMA_CLAUDE_HAIKU_MODEL=llama3.1:8b
`;
  
  // Remove existing LiteLLM config if present
  const lines = envContent.split('\n');
  const filteredLines = lines.filter(line => 
    !line.startsWith('LITELLM_') && 
    !line.startsWith('OLLAMA_CLAUDE_')
  );
  
  // Add new configuration
  const newEnvContent = filteredLines.join('\n') + liteLLMConfig;
  
  writeFileSync(envPath, newEnvContent);
  logSuccess('Environment configuration updated');
}

async function createConfigFile() {
  logStep('Creating LiteLLM configuration...');
  
  const configDir = join(__dirname, '..', 'config');
  const configPath = join(configDir, 'litellm-config.yaml');
  
  // Create config directory if it doesn't exist
  if (!existsSync(configDir)) {
    await execAsync(`mkdir -p ${configDir}`);
  }
  
  // Configuration template
  const config = `model_list:
  - model_name: claude-sonnet-4-5
    litellm_params:
      model: ollama/deepseek-coder-v2
      api_base: "http://localhost:11434"
  - model_name: claude-opus-4-5
    litellm_params:
      model: ollama/qwen:7b
      api_base: "http://localhost:11434"
  - model_name: claude-haiku-4-5
    litellm_params:
      model: ollama/llama3.1:8b
      api_base: "http://localhost:11434"

litellm_settings:
  master_key: ${process.env.LITELLM_MASTER_KEY || 'your-super-secret-key'}
  drop_params: true
  set_verbose: false
  success_callback: ["http://localhost:4000/callbacks"]
`;
  
  writeFileSync(configPath, config);
  logSuccess('LiteLLM configuration created');
}

async function testLiteLLM() {
  logStep('Testing LiteLLM proxy...');
  
  try {
    // Start LiteLLM in background
    const configPath = join(__dirname, '..', 'config', 'litellm-config.yaml');
    const liteLLMProcess = spawn('litellm', ['--config', configPath, '--port', '4000'], {
      stdio: 'pipe',
      env: { ...process.env, LITELLM_MASTER_KEY: process.env.LITELLM_MASTER_KEY }
    });
    
    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test health endpoint
    const response = await fetch('http://localhost:4000/health');
    if (response.ok) {
      logSuccess('LiteLLM proxy is running and healthy');
    } else {
      logWarning('LiteLLM proxy responded with status: ' + response.status);
    }
    
    // Clean up
    liteLLMProcess.kill();
    
  } catch (error) {
    logWarning('LiteLLM test failed: ' + error.message);
    logInfo('You may need to start LiteLLM manually with: litellm --config config/litellm-config.yaml');
  }
}

async function setupClaudeCode() {
  logStep('Setting up Claude Code environment...');
  
  const setupCommands = [
    '# Set up Claude Code to use LiteLLM proxy',
    'export ANTHROPIC_BASE_URL="http://localhost:4000"',
    'export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"',
    '',
    '# Or add to your shell profile (~/.bashrc, ~/.zshrc, etc.)',
    'echo \'export ANTHROPIC_BASE_URL="http://localhost:4000"\' >> ~/.bashrc',
    'echo \'export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"\' >> ~/.bashrc',
    '',
    '# Test with Claude Code',
    'claude --model claude-sonnet-4-5 "Hello, can you introduce yourself?"'
  ];
  
  logInfo('Claude Code setup commands:');
  setupCommands.forEach(command => console.log(`  ${command}`));
  
  logSuccess('Claude Code environment setup instructions provided');
}

async function main() {
  log('🚀 RE Engine LiteLLM Setup Script', colors.cyan);
  log('=====================================', colors.cyan);
  
  try {
    await checkPrerequisites();
    await installLiteLLM();
    
    const masterKey = await generateMasterKey();
    process.env.LITELLM_MASTER_KEY = masterKey;
    
    await updateEnvironment(masterKey);
    await createConfigFile();
    await testLiteLLM();
    await setupClaudeCode();
    
    log('\n🎉 LiteLLM setup completed successfully!', colors.green);
    log('\nNext steps:', colors.cyan);
    log('1. Start the LiteLLM proxy:', colors.blue);
    log('   litellm --config config/litellm-config.yaml', colors.reset);
    log('');
    log('2. Set up Claude Code environment:', colors.blue);
    log('   export ANTHROPIC_BASE_URL="http://localhost:4000"', colors.reset);
    log('   export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"', colors.reset);
    log('');
    log('3. Test with Claude Code:', colors.blue);
    log('   claude --model claude-sonnet-4-5 "Hello!"', colors.reset);
    log('');
    log('4. Or use the RE Engine Ollama service with proxy enabled', colors.blue);
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the setup
main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
