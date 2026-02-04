/**
 * Database Migration Runner
 * Handles PostgreSQL schema migrations
 */
import fs from 'fs/promises';
import path from 'path';
import { getDatabase } from '../index.js';
export class MigrationRunner {
    db = getDatabase();
    async runMigrations() {
        if (process.env.DB_TYPE !== 'postgresql') {
            console.log('Skipping migrations - not using PostgreSQL');
            return;
        }
        await this.db.initialize();
        try {
            // Create migrations table if it doesn't exist
            await this.createMigrationsTable();
            // Get migration files
            const migrations = await this.loadMigrations();
            // Get applied migrations
            const appliedMigrations = await this.getAppliedMigrations();
            // Run pending migrations
            for (const migration of migrations) {
                if (!appliedMigrations.includes(migration.id)) {
                    console.log(`Running migration: ${migration.name}`);
                    await this.runMigration(migration);
                    console.log(`Migration completed: ${migration.name}`);
                }
            }
            console.log('All migrations completed successfully');
        }
        catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
        finally {
            await this.db.close();
        }
    }
    async createMigrationsTable() {
        const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
        await this.db.query(sql);
    }
    async loadMigrations() {
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = await fs.readdir(migrationsDir);
        const migrations = [];
        for (const file of files.sort()) {
            if (file.endsWith('.sql')) {
                const filePath = path.join(migrationsDir, file);
                const sql = await fs.readFile(filePath, 'utf-8');
                const id = file.replace('.sql', '');
                const name = this.formatMigrationName(id);
                migrations.push({ id, name, sql });
            }
        }
        return migrations;
    }
    async getAppliedMigrations() {
        try {
            const result = await this.db.query('SELECT id FROM migrations ORDER BY id');
            return result.map(row => row.id);
        }
        catch (error) {
            // Table might not exist yet
            return [];
        }
    }
    async runMigration(migration) {
        await this.db.transaction(async (tx) => {
            // Run migration SQL
            await tx.query(migration.sql);
            // Record migration
            await tx.query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
        });
    }
    formatMigrationName(id) {
        return id
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    async rollbackMigration(id) {
        if (process.env.DB_TYPE !== 'postgresql') {
            throw new Error('Rollback only supported with PostgreSQL');
        }
        await this.db.initialize();
        try {
            // Remove migration record
            await this.db.query('DELETE FROM migrations WHERE id = $1', [id]);
            console.log(`Migration ${id} rolled back successfully`);
        }
        catch (error) {
            console.error('Rollback failed:', error);
            throw error;
        }
        finally {
            await this.db.close();
        }
    }
    async getMigrationStatus() {
        if (process.env.DB_TYPE !== 'postgresql') {
            return { applied: [], pending: [] };
        }
        await this.db.initialize();
        try {
            const migrations = await this.loadMigrations();
            const appliedMigrations = await this.getAppliedMigrations();
            const pending = migrations
                .map(m => m.id)
                .filter(id => !appliedMigrations.includes(id));
            return { applied: appliedMigrations, pending };
        }
        finally {
            await this.db.close();
        }
    }
}
//# sourceMappingURL=runner.js.map