import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { ServiceAuth } from './service-auth.js';

export class DatabaseAuthService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async getServiceAuth(serviceId: string): Promise<ServiceAuth | null> {
    const query = 'SELECT service_id, api_key_hash, permissions FROM service_auth WHERE service_id = $1 AND is_active = true';
    const result = await this.pool.query(query, [serviceId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      serviceId: row.service_id,
      apiKey: row.api_key_hash, // Store hash, validate with compare
      permissions: row.permissions
    };
  }

  async validateApiKey(serviceId: string, apiKey: string): Promise<boolean> {
    const service = await this.getServiceAuth(serviceId);
    if (!service || !service.apiKey) {
      return false;
    }

    // Compare with bcrypt hash
    try {
      return await bcrypt.compare(apiKey, service.apiKey);
    } catch (error) {
      console.error('Bcrypt comparison failed:', error);
      return false;
    }
  }

  async logAuthAttempt(serviceId: string, action: string, resource: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): Promise<void> {
    const query = `
      INSERT INTO auth_audit_log (service_id, action, resource, ip_address, user_agent, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await this.pool.query(query, [serviceId, action, resource, ipAddress, userAgent, success, errorMessage]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
