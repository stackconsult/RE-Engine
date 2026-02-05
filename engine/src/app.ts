import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { serviceAuthMiddleware, AuthenticatedRequest, generateServiceToken } from './middleware/service-auth.js';
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
  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });
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

// Service authentication endpoint
app.post('/auth/token', serviceAuthMiddleware('admin'), (req: AuthenticatedRequest, res) => {
  const service = req.service!;
  
  const token = generateServiceToken(service);
  
  logger.info("Service token generated", { 
    serviceId: service.serviceId 
  });
  
  res.json({
    token,
    expiresIn: 3600, // 1 hour
    service: {
      serviceId: service.serviceId,
      permissions: service.permissions
    }
  });
});

// Protected API routes
app.use('/api', serviceAuthMiddleware());

// Example protected endpoint
app.get('/api/protected', (req: AuthenticatedRequest, res) => {
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
  logger.error("API error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

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
