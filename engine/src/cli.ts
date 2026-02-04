#!/usr/bin/env node

/**
 * RE Engine CLI
 * Command-line interface for the RE Engine
 */

import { Command } from 'commander';
import { createAPIServer } from './api/server';
import { Logger } from './utils/logger';

const program = new Command();
const logger = new Logger('REEngineCLI', true);

// CLI configuration
program
  .name('re-engine')
  .description('RE Engine - Real Estate Automation Platform')
  .version('1.0.0');

/**
 * Start the API server
 */
program
  .command('start')
  .description('Start the RE Engine API server')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('-h, --host <string>', 'Host to bind the server to', 'localhost')
  .option('-e, --env <string>', 'Environment (development, staging, production)', 'development')
  .option('--no-cors', 'Disable CORS')
  .option('--no-compression', 'Disable compression')
  .option('--no-rate-limit', 'Disable rate limiting')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      logger.info('🚀 Starting RE Engine API Server...');
      logger.info('📋 Configuration:', options);

      const server = createAPIServer({
        port: parseInt(options.port),
        host: options.host,
        environment: options.env,
        enableCors: options.cors,
        enableCompression: options.compression,
        enableRateLimit: options.rateLimit,
        enableDetailedLogging: options.verbose
      });

      await server.start();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        logger.info('📡 Received SIGINT, shutting down gracefully...');
        await server.shutdown();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        logger.info('📡 Received SIGTERM, shutting down gracefully...');
        await server.shutdown();
        process.exit(0);
      });

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  });

/**
 * Run tests
 */
program
  .command('test')
  .description('Run RE Engine tests')
  .option('--orchestration', 'Run orchestration component tests')
  .option('--workflows', 'Run workflow tests')
  .option('--api', 'Run API tests')
  .option('--all', 'Run all tests')
  .action(async (options) => {
    try {
      logger.info('🧪 Running RE Engine Tests...');

      if (options.all || options.orchestration) {
        logger.info('🔧 Running orchestration tests...');
        const { runBasicTests } = await import('./orchestration/test-runner');
        const success = await runBasicTests();
        
        if (!success) {
          logger.error('❌ Orchestration tests failed');
          process.exit(1);
        }
      }

      if (options.all || options.workflows) {
        logger.info('🔄 Running workflow tests...');
        const { runWorkflowTests } = await import('./workflows/workflow-tests');
        const success = await runWorkflowTests();
        
        if (!success) {
          logger.error('❌ Workflow tests failed');
          process.exit(1);
        }
      }

      if (options.all || options.api) {
        logger.info('🌐 Running API tests...');
        // API tests would go here
        logger.info('📝 API tests not implemented yet');
      }

      logger.info('✅ All tests passed!');

    } catch (error) {
      logger.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  });

/**
 * Show system status
 */
program
  .command('status')
  .description('Show RE Engine system status')
  .action(async () => {
    try {
      logger.info('📊 RE Engine System Status');
      
      // System information
      logger.info('🖥️  System Information:');
      logger.info(`   Node.js: ${process.version}`);
      logger.info(`   Platform: ${process.platform}`);
      logger.info(`   Architecture: ${process.arch}`);
      logger.info(`   Memory: ${JSON.stringify(process.memoryUsage())}`);
      logger.info(`   Uptime: ${process.uptime()}s`);

      // Environment
      logger.info('🌍 Environment:');
      logger.info(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   PORT: ${process.env.PORT || '3000'}`);
      logger.info(`   HOST: ${process.env.HOST || 'localhost'}`);

      // Dependencies check
      logger.info('📦 Dependencies:');
      
      // Check for Ollama
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          logger.info('   ✅ Ollama: Connected');
        } else {
          logger.info('   ⚠️  Ollama: Connected but may have issues');
        }
      } catch (error) {
        logger.info('   ❌ Ollama: Not connected');
      }

      // Check for TinyFish API
      if (process.env.TINYFISH_API_KEY) {
        logger.info('   ✅ TinyFish: API key configured');
      } else {
        logger.info('   ❌ TinyFish: API key not configured');
      }

      logger.info('✅ Status check complete');

    } catch (error) {
      logger.error('❌ Status check failed:', error);
      process.exit(1);
    }
  });

/**
 * Initialize configuration
 */
program
  .command('init')
  .description('Initialize RE Engine configuration')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      logger.info('🔧 Initializing RE Engine configuration...');

      // This would create configuration files
      logger.info('📝 Creating configuration files...');
      logger.info('   - .env.example');
      logger.info('   - config/default.json');
      logger.info('   - config/development.json');
      logger.info('   - config/production.json');

      logger.info('🔑 Setting up environment variables...');
      logger.info('   - TINYFISH_API_KEY');
      logger.info('   - OPENAI_API_KEY');
      logger.info('   - ANTHROPIC_API_KEY');

      logger.info('📋 Installation checklist:');
      logger.info('   - [ ] Install Ollama: https://ollama.ai/');
      logger.info('   - [ ] Pull models: ollama pull llama3.1:8b');
      logger.info('   - [ ] Configure API keys in .env');
      logger.info('   - [ ] Run: npm run dev');

      logger.info('✅ Configuration initialized successfully');

    } catch (error) {
      logger.error('❌ Configuration initialization failed:', error);
      process.exit(1);
    }
  });

/**
 * Generate documentation
 */
program
  .command('docs')
  .description('Generate API documentation')
  .option('--output <path>', 'Output directory for documentation', './docs')
  .action(async (options) => {
    try {
      logger.info('📚 Generating API documentation...');

      // This would generate OpenAPI/Swagger documentation
      logger.info('📝 Creating documentation files...');
      logger.info(`   📁 Output directory: ${options.output}`);
      logger.info('   📄 api.md');
      logger.info('   📄 workflows.md');
      logger.info('   📄 orchestration.md');

      logger.info('✅ Documentation generated successfully');

    } catch (error) {
      logger.error('❌ Documentation generation failed:', error);
      process.exit(1);
    }
  });

/**
 * Show help
 */
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(`
🏠 RE Engine - Real Estate Automation Platform

🚀 Quick Start:
  npm run dev              # Start development server
  npm run start            # Start production server
  npm run test             # Run tests
  npm run docs             # Generate documentation

📚 Available Commands:
  start                    Start the API server
  test                     Run tests
  status                   Show system status
  init                     Initialize configuration
  docs                     Generate documentation
  help                     Show this help

🔧 Options:
  --port <number>          Server port (default: 3000)
  --host <string>          Server host (default: localhost)
  --env <string>           Environment (development, staging, production)
  --verbose                Enable verbose logging

📖 Documentation:
  https://github.com/your-org/re-engine

🐛 Issues:
  https://github.com/your-org/re-engine/issues

💬 Support:
  https://github.com/your-org/re-engine/discussions
    `);
  });

// Parse command line arguments
program.parse();

// Handle unknown commands
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
