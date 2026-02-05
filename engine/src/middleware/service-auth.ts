import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'service-auth' });

export interface ServiceAuth {
  serviceId: string;
  apiKey: string | null;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  service?: ServiceAuth;
}

// Service registry (move to database in production)
const SERVICE_REGISTRY: Record<string, ServiceAuth> = {
  'reengine-engine': {
    serviceId: 'reengine-engine',
    apiKey: process.env.ENGINE_API_KEY || null,
    permissions: ['read', 'write', 'admin']
  },
  'reengine-browser': {
    serviceId: 'reengine-browser',
    apiKey: process.env.BROWSER_API_KEY || null,
    permissions: ['read', 'write']
  },
  'reengine-tinyfish': {
    serviceId: 'reengine-tinyfish',
    apiKey: process.env.TINYFISH_API_KEY || null,
    permissions: ['read', 'write']
  },
  'reengine-llama': {
    serviceId: 'reengine-llama',
    apiKey: process.env.LLAMA_API_KEY || null,
    permissions: ['read', 'write']
  },
  'reengine-core': {
    serviceId: 'reengine-core',
    apiKey: process.env.CORE_API_KEY || null,
    permissions: ['read', 'write', 'admin']
  },
  'reengine-outreach': {
    serviceId: 'reengine-outreach',
    apiKey: process.env.OUTREACH_API_KEY || null,
    permissions: ['read', 'write']
  }
};

export function generateServiceToken(service: ServiceAuth): string {
  return jwt.sign(
    {
      serviceId: service.serviceId,
      permissions: service.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    process.env.JWT_SECRET || 'dev-secret'
  );
}

export function validateServiceToken(token: string): ServiceAuth | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    
    const service = SERVICE_REGISTRY[decoded.serviceId];
    if (!service) {
      logger.warn('Unknown service in token', { serviceId: decoded.serviceId });
      return null;
    }
    
    return service;
  } catch (error) {
    logger.error('Token validation failed', { error: error.message });
    return null;
  }
}

export function serviceAuthMiddleware(requiredPermission?: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;
    
    // Try JWT token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const service = validateServiceToken(token);
      
      if (service) {
        if (requiredPermission && !service.permissions.includes(requiredPermission)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions'
          });
        }
        
        req.service = service;
        logger.info('Service authenticated via JWT', { 
          serviceId: service.serviceId,
          permission: requiredPermission 
        });
        return next();
      }
    }
    
    // Fallback to API key
    if (apiKey) {
      const service = Object.values(SERVICE_REGISTRY).find(s => s.apiKey === apiKey);
      
      if (service) {
        if (requiredPermission && !service.permissions.includes(requiredPermission)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions'
          });
        }
        
        req.service = service;
        logger.info('Service authenticated via API key', { 
          serviceId: service.serviceId,
          permission: requiredPermission 
        });
        return next();
      }
    }
    
    logger.warn('Authentication failed', { 
      hasToken: !!authHeader,
      hasApiKey: !!apiKey 
    });
    
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key or JWT token required'
    });
  };
}

export function getCurrentService(req: AuthenticatedRequest): ServiceAuth | null {
  return req.service || null;
}
