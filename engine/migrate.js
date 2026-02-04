#!/usr/bin/env node

/**
 * Database Migration CLI
 * Usage: node migrate.js [command]
 * Commands: up, down, status
 */

import { MigrationRunner } from '../src/database/migrations/runner.js';

const command = process.argv[2] || 'up';

async function main() {
  const runner = new MigrationRunner();
  
  try {
    switch (command) {
      case 'up':
        await runner.runMigrations();
        break;
        
      case 'down':
        const migrationId = process.argv[3];
        if (!migrationId) {
          console.error('Usage: node migrate.js down <migration-id>');
          process.exit(1);
        }
        await runner.rollbackMigration(migrationId);
        break;
        
      case 'status':
        const status = await runner.getMigrationStatus();
        console.log('Applied migrations:', status.applied);
        console.log('Pending migrations:', status.pending);
        break;
        
      default:
        console.error('Unknown command:', command);
        console.log('Usage: node migrate.js [up|down|status]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

main();
