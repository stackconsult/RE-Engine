/**
 * Database Configuration and Connection Management
 * Supports both PostgreSQL (production) and CSV (development) storage
 */
export class DatabaseManager {
    config;
    connection = null;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        if (this.config.type === 'postgresql') {
            const { PostgreSQLConnection } = await import('./postgresql.js');
            this.connection = new PostgreSQLConnection(this.config.postgresql);
        }
        else {
            const { CSVConnection } = await import('./csv.js');
            this.connection = new CSVConnection(this.config.csv);
        }
        await this.connection.connect();
    }
    async close() {
        if (this.connection) {
            await this.connection.disconnect();
            this.connection = null;
        }
    }
    async health() {
        return this.connection ? await this.connection.health() : false;
    }
    async query(sql, params) {
        if (!this.connection) {
            throw new Error('Database not initialized');
        }
        return this.connection.query(sql, params);
    }
    async transaction(callback) {
        if (!this.connection) {
            throw new Error('Database not initialized');
        }
        return this.connection.transaction(callback);
    }
    getConnection() {
        if (!this.connection) {
            throw new Error('Database not initialized');
        }
        return this.connection;
    }
}
// Singleton instance for the application
let dbManager = null;
export function getDatabase() {
    if (!dbManager) {
        const config = {
            type: process.env.DB_TYPE === 'postgresql' ? 'postgresql' : 'csv',
            ...(process.env.DB_TYPE === 'postgresql' && {
                postgresql: {
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || '5432'),
                    database: process.env.DB_NAME || 'reengine',
                    username: process.env.DB_USERNAME || 'postgres',
                    password: process.env.DB_PASSWORD || '',
                    ssl: process.env.DB_SSL === 'true'
                }
            }),
            ...(process.env.DB_TYPE !== 'postgresql' && {
                csv: {
                    dataDir: process.env.DATA_DIR || './data'
                }
            })
        };
        dbManager = new DatabaseManager(config);
    }
    return dbManager;
}
//# sourceMappingURL=index.js.map