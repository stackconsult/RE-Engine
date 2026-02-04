/**
 * PostgreSQL Database Connection
 * Production-ready PostgreSQL implementation
 */
import pg from 'pg';
export class PostgreSQLConnection {
    pool;
    config;
    constructor(config) {
        this.config = config;
        this.pool = new pg.Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    async connect() {
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('PostgreSQL connected successfully');
    }
    async disconnect() {
        await this.pool.end();
        console.log('PostgreSQL disconnected');
    }
    async health() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        }
        catch (error) {
            console.error('PostgreSQL health check failed:', error);
            return false;
        }
    }
    async query(sql, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const txDb = {
                connect: () => Promise.resolve(),
                disconnect: () => Promise.resolve(),
                health: () => Promise.resolve(true),
                query: async (sql, params) => {
                    const result = await client.query(sql, params);
                    return result.rows;
                },
                transaction: async (cb) => cb(txDb)
            };
            const result = await callback(txDb);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
//# sourceMappingURL=postgresql.js.map