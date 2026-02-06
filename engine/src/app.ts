import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { serviceAuthMiddleware, generateServiceToken, ServiceAuth } from './middleware/service-auth.js';
import { logger } from './observability/logger.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow API responses
  hsts: false // Disable for local development
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded'
  }
});
app.use(limiter);

// Body parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  }, "Incoming request");
  next();
});

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  });
});

// JWT Token Generation Endpoint
app.post('/auth/token', async (req, res) => {
  try {
    const { serviceId } = req.body;
    const apiKey = req.headers['x-api-key'] as string;

    if (!serviceId || !apiKey) {
      return res.status(400).json({ error: 'Missing serviceId or apiKey' });
    }

    // Validate API key using service auth middleware logic
    const authResult = await validateServiceApiKey(serviceId, apiKey);

    if (!authResult.valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateServiceToken(serviceId);

    logger.info({
      serviceId: serviceId
    }, "Service token generated");

    res.json({
      token,
      expiresIn: 3600, // 1 hour
      service: {
        serviceId: serviceId,
        permissions: authResult.permissions
      }
    });
  } catch (error) {
    console.error('Auth endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Service API Key Validation Function
async function validateServiceApiKey(serviceId: string, apiKey: string): Promise<{ valid: boolean, permissions?: any }> {
  try {
    // For now, use fallback registry (can be enhanced with database later)
    const fallbackService = {
      'reengine-engine': { apiKey: process.env.ENGINE_API_KEY || 'dev-key', permissions: { read: true, write: true, admin: true } },
      'reengine-browser': { apiKey: process.env.BROWSER_API_KEY || 'dev-key', permissions: { read: true, write: true, execute: true } },
      'reengine-tinyfish': { apiKey: process.env.TINYFISH_API_KEY || 'dev-key', permissions: { read: true, write: true, scrape: true } },
      'reengine-llama': { apiKey: process.env.LLAMA_API_KEY || 'dev-key', permissions: { read: true, write: true, model: true } },
      'reengine-core': { apiKey: process.env.CORE_API_KEY || 'dev-key', permissions: { read: true, write: true, orchestrate: true } },
      'reengine-outreach': { apiKey: process.env.OUTREACH_API_KEY || 'dev-key', permissions: { read: true, write: true, outreach: true } }
    };

    const service = fallbackService[serviceId as keyof typeof fallbackService];
    if (service && service.apiKey === apiKey) {
      return { valid: true, permissions: service.permissions };
    }

    return { valid: false };
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false };
  }
}

// Protected API routes
app.use('/api', serviceAuthMiddleware());

// Example protected endpoint
app.get('/api/protected', (req: express.Request, res) => {
  const service = req.service!;

  res.json({
    message: 'Access granted',
    service: {
      serviceId: service.serviceId,
      permissions: service.permissions
    },
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  }, "API error");

  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

export default app;
