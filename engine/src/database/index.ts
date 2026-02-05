/**
 * Database Configuration and Connection Management
 * Supports both PostgreSQL (production) and CSV (development) storage
 */

import { DatabaseConnection } from './csv.js';

export interface DatabaseConfig {
  type: 'postgresql' | 'csv';
  postgresql?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  csv?: {
    dataDir: string;
  };
}

export class DatabaseManager {
  private config: DatabaseConfig;
  private connection: DatabaseConnection | null = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.config.type === 'postgresql') {
      const { PostgreSQLConnection } = await import('./postgresql.js');
      this.connection = new PostgreSQLConnection(this.config.postgresql!);
    } else {
      const { CSVConnection } = await import('./csv.js');
      this.connection = new CSVConnection(this.config.csv!);
    }

    await this.connection.connect();
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }

  async health(): Promise<boolean> {
    return this.connection ? await this.connection.health() : false;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }
    return this.connection.query(sql, params);
  }

  async transaction<T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }
    return this.connection.transaction(callback);
  }

  getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }
    return this.connection;
  }
}

// Singleton instance for the application
let dbManager: DatabaseManager | null = null;

export function getDatabase(): DatabaseManager {
  if (!dbManager) {
    const config: DatabaseConfig = {
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
