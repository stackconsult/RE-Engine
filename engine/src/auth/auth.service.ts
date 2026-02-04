/**
 * Authentication and Security System
 * JWT-based authentication with role-based access control
 */

import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from '../database/index.js';

export interface User {
  user_id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
  created_at: string;
  last_login?: string;
  active: boolean;
}

export interface AuthToken {
  token: string;
  user: Omit<User, 'permissions'>;
  permissions: string[];
  expiresAt: Date;
}

export class AuthService {
  private db = getDatabase();
  private jwtSecret: string;
  private tokenExpiry: string = '24h';

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
    await this.createUsersTable();
    await this.createDefaultAdmin();
  }

  private async createUsersTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'viewer',
        permissions JSONB DEFAULT '[]',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `;
    
    await this.db.query(sql);
  }

  private async createDefaultAdmin(): Promise<void> {
    const existingAdmin = await this.db.query('SELECT * FROM users WHERE role = $1', ['admin']) as any[];
    
    if (existingAdmin.length === 0) {
      const defaultPassword = 'admin123'; // Should be changed on first login
      const passwordHash = await this.hashPassword(defaultPassword);
      
      await this.db.query(
        'INSERT INTO users (username, email, password_hash, role, permissions) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin@reengine.com', passwordHash, 'admin', JSON.stringify(['*'])]
      );
      
      console.log('Default admin user created. Username: admin, Password: admin123');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return `${salt}:${hash.toString('hex')}`;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return hashVerify.toString('hex') === hash;
  }

  async authenticate(username: string, password: string): Promise<AuthToken | null> {
    try {
      const users = await this.db.query(
        'SELECT * FROM users WHERE username = $1 AND active = TRUE',
        [username]
      ) as any[];
      
      if (users.length === 0) {
        return null;
      }
      
      const user = users[0];
      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        return null;
      }
      
      // Update last login
      await this.db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
        [user.user_id]
      );
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          user_id: user.user_id,
          username: user.username,
          role: user.role
        },
        this.jwtSecret as string,
        { expiresIn: this.tokenExpiry }
      );
      
      const decoded = jwt.decode(token) as any;
      
      return {
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          last_login: user.last_login,
          active: user.active
        },
        permissions: user.permissions,
        expiresAt: new Date(decoded.exp * 1000)
      };
      
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  async verifyToken(token: string): Promise<AuthToken | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      const users = await this.db.query(
        'SELECT * FROM users WHERE user_id = $1 AND active = TRUE',
        [decoded.user_id]
      ) as any[];
      
      if (users.length === 0) {
        return null;
      }
      
      const user = users[0];
      
      return {
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          last_login: user.last_login,
          active: user.active
        },
        permissions: user.permissions,
        expiresAt: new Date(decoded.exp * 1000)
      };
      
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'operator' | 'viewer';
    permissions?: string[];
  }): Promise<User | null> {
    try {
      const existingUser = await this.db.query(
        'SELECT user_id FROM users WHERE username = $1 OR email = $2',
        [userData.username, userData.email]
      ) as any[];
      
      if (existingUser.length > 0) {
        throw new Error('User with this username or email already exists');
      }
      
      const passwordHash = await this.hashPassword(userData.password);
      const permissions = userData.permissions || this.getDefaultPermissions(userData.role);
      
      const result = await this.db.query(
        'INSERT INTO users (username, email, password_hash, role, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userData.username, userData.email, passwordHash, userData.role, JSON.stringify(permissions)]
      ) as any[];
      
      return result[0];
      
    } catch (error) {
      console.error('User creation error:', error);
      return null;
    }
  }

  private getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'admin':
        return ['*'];
      case 'operator':
        return ['approvals.read', 'approvals.approve', 'approvals.reject', 'leads.read', 'leads.create'];
      case 'viewer':
        return ['approvals.read', 'leads.read'];
      default:
        return [];
    }
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const users = await this.db.query(
        'SELECT permissions FROM users WHERE user_id = $1 AND active = TRUE',
        [userId]
      ) as any[];
      
      if (users.length === 0) {
        return false;
      }
      
      const permissions = users[0].permissions;
      
      // Wildcard permission
      if (permissions.includes('*')) {
        return true;
      }
      
      // Exact match
      if (permissions.includes(permission)) {
        return true;
      }
      
      // Wildcard category (e.g., 'approvals.*')
      const [category] = permission.split('.');
      if (permissions.includes(`${category}.*`)) {
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const users = await this.db.query(
        'SELECT password_hash FROM users WHERE user_id = $1 AND active = TRUE',
        [userId]
      ) as any[];
      
      if (users.length === 0) {
        return false;
      }
      
      const isValidOldPassword = await this.verifyPassword(oldPassword, users[0].password_hash);
      
      if (!isValidOldPassword) {
        return false;
      }
      
      const newPasswordHash = await this.hashPassword(newPassword);
      
      await this.db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [newPasswordHash, userId]
      );
      
      return true;
      
    } catch (error) {
      console.error('Password change error:', error);
      return false;
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      await this.db.query(
        'UPDATE users SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('User deactivation error:', error);
      return false;
    }
  }

  generateApiKey(userId: string): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
