/**
 * PostgreSQL Migration Script
 * Migrates data from local CSV files to Neon PostgreSQL and Supabase
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { UnifiedDatabaseManager } from '../database/unified-database-manager.js';
import { ConfigService } from '../config/config.service.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = new Logger('MigrationScript', true);

async function parseCSV(filePath: string): Promise<any[]> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length <= 1) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const records: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const record: any = {};

            headers.forEach((header, index) => {
                let value: any = values[index] || '';

                // Basic type conversion
                if (header.includes('metadata') || header.includes('criteria') || header.includes('settings') || header.includes('data') || header.includes('cookies') || header.includes('credentials')) {
                    try {
                        value = value ? JSON.parse(value) : {};
                    } catch {
                        value = {};
                    }
                } else if (header.includes('verified') || header.includes('exclude') || header.includes('enabled')) {
                    value = value.toLowerCase() === 'true';
                } else if (header.includes('ConfidenceThreshold') || header.includes('ai_score')) {
                    value = parseFloat(value) || 0;
                } else if (header.includes('maxLeadsPerDay')) {
                    value = parseInt(value) || 0;
                } else if (header.includes('locations') || header.includes('platforms') || header.includes('tags') || header.includes('specialties')) {
                    value = value ? value.split(';').map((s: string) => s.trim()) : [];
                }

                record[header] = value;
            });

            records.push(record);
        }

        return records;
    } catch (error) {
        logger.warn(`Could not read CSV file: ${filePath}`);
        return [];
    }
}

async function runMigration() {
    logger.info('Starting Phase 6.1 Migration: CSV to PostgreSQL...');

    const config = ConfigService.getInstance();
    const dataDir = path.resolve(__dirname, '../../../data');

    const unifiedDb = new UnifiedDatabaseManager({
        dbType: (config.get('DB_TYPE') as 'postgresql' | 'csv' | 'supabase') || 'postgresql',
        neon: {
            connectionString: (config.get('DATABASE_URL') as string) || '',
            pooledConnectionString: (config.get('DATABASE_POOLED_URL') as string) || (config.get('DATABASE_URL') as string) || '',
            maxConnections: (config.get('DATABASE_POOL_SIZE') as number) || 20,
        },
        csv: {
            dataDir: path.resolve(__dirname, '../../../data'),
        },
        supabase: {
            url: (config.get('SUPABASE_URL') as string) || '',
            anonKey: (config.get('SUPABASE_ANON_KEY') as string) || '',
            serviceRoleKey: (config.get('SUPABASE_SERVICE_KEY') as string) || '',
        },
        features: {
            realtimeEnabled: true,
            storageEnabled: true,
            analyticsEnabled: true,
            migrationEnabled: true,
        }
    });

    try {
        await unifiedDb.initialize();
        logger.info('Connected to Neon and Supabase');

        const csvData = {
            leads: await parseCSV(path.join(dataDir, 'leads.csv')),
            approvals: await parseCSV(path.join(dataDir, 'approvals.csv')),
            events: await parseCSV(path.join(dataDir, 'events.csv')),
            contacts: await parseCSV(path.join(dataDir, 'contacts.csv')),
            icp_profiles: await parseCSV(path.join(dataDir, 'icp_profiles.csv')),
            identities: await parseCSV(path.join(dataDir, 'identities.csv')),
        };

        logger.info('CSV Files loaded:', {
            leads: csvData.leads.length,
            approvals: csvData.approvals.length,
            events: csvData.events.length,
            contacts: csvData.contacts.length,
            icp_profiles: csvData.icp_profiles.length,
            identities: csvData.identities.length,
        });

        const result = await unifiedDb.migrateFromCSV(csvData);

        logger.info('Migration result:', {
            migratedCount: result.migrated,
            errorCount: result.errors.length,
        });

        if (result.errors.length > 0) {
            logger.error('Migration errors encountered:');
            result.errors.forEach(err => logger.error(`  - ${err}`));
        }

        logger.info('Ensuring database schema is initialized for all tables...');
        // This is implicitly handled by initializing NeonIntegrationService which calls createSchema

        logger.info('Migration process finished.');

    } catch (error) {
        logger.error('Critical migration error:', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    } finally {
        await unifiedDb.cleanup();
    }
}

runMigration();
