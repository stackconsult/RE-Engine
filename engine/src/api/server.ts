/**
 * RE Engine API Server
 * Main API server with Express.ts
 */

import express, { Application, Request, Response, NextFunction, Router, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer as httpCreateServer, Server } from 'http';
import { EventEmitter } from 'events';
import { WorkflowService, WorkflowTemplateService, workflowTemplateService } from '../services/workflow-service';
import { MasterOrchestrator } from '../orchestration/master-orchestrator';
import { createWorkflowAPIRouter, createTemplateAPIRouter } from './workflow-api';
import { Logger } from '../utils/logger';

export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';
  enableCors: boolean;
  enableCompression: boolean;
  enableRateLimit: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  enableDetailedLogging: boolean;
}

/**
 * RE Engine API Server
 */
export class REEngineAPIServer extends EventEmitter {
  private app: Express;
  private server: Server | null = null;
  private orchestrator!: MasterOrchestrator;
  private workflowService!: WorkflowService;
  private config: ServerConfig;
  private logger: Logger;

  constructor(config?: Partial<ServerConfig>) {
    super();

    const defaultConfig = {
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: process.env.HOST || 'localhost',
      environment: (process.env.NODE_ENV as any) || 'development',
      enableCors: true,
      enableCompression: true,
      enableRateLimit: true,
      rateLimitWindow: 15 * 60 * 1000, // 15 minutes
      rateLimitMax: 100, // 100 requests per window
      enableDetailedLogging: process.env.NODE_ENV !== 'production',
      ...config
    };

    this.config = defaultConfig;
    this.logger = new Logger('REEngineAPIServer', this.config.enableDetailedLogging);
    this.app = express();

    this.orchestrator = new MasterOrchestrator({
      maxConcurrentWorkflows: 5,
      defaultTimeout: 300000,
      healthCheckInterval: 30000,
      enableAutoScaling: false,
      enableDetailedLogging: this.config.enableDetailedLogging
    });

    this.workflowService = new WorkflowService(this.orchestrator, {
      defaultTimeout: 300000,
      maxConcurrentWorkflows: 3,
      enableDetailedLogging: this.config.enableDetailedLogging,
      enableAutoRetry: true
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Initialize and start the server
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing RE Engine API Server...');

    try {
      // Initialize orchestrator
      await this.orchestrator.initialize();

      // Initialize workflow service
      this.workflowService = new WorkflowService(this.orchestrator, {
        defaultTimeout: 600000,
        maxConcurrentWorkflows: 5,
        enableDetailedLogging: this.config.enableDetailedLogging,
        enableAutoRetry: true
      });

      this.logger.info('✅ RE Engine API Server initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('❌ Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        this.logger.info(`🌐 RE Engine API Server started successfully!`);
        this.logger.info(`📍 Server running at http://${this.config.host}:${this.config.port}`);
        this.logger.info(`🌍 Environment: ${this.config.environment}`);
        this.emit('started');
        resolve();
      });

      this.server.on('error', (error: any) => {
        this.logger.error('❌ Server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping RE Engine API Server...');

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('✅ RE Engine API Server stopped successfully');
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Shutdown the server and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down RE Engine API Server...');

    try {
      // Stop accepting new requests
      await this.stop();

      // Shutdown workflow service
      if (this.workflowService) {
        await this.workflowService.shutdown();
      }

      // Shutdown orchestrator
      if (this.orchestrator) {
        await this.orchestrator.shutdown();
      }

      this.logger.info('✅ RE Engine API Server shutdown complete');
      this.emit('shutdown');

    } catch (error) {
      this.logger.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get Express app instance
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Get server configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config };
  }

  // Private Methods

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: this.getCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Permissions']
      }));
    }

    // Compression
    if (this.config.enableCompression) {
      this.app.use(compression());
    }

    // Rate limiting
    if (this.config.enableRateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimitWindow,
        max: this.config.rateLimitMax,
        message: {
          error: 'Too many requests from this IP, please try again later.',
          timestamp: new Date().toISOString()
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use('/api', limiter);
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.debug(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      });

      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: this.config.environment
      });
    });

    // API info
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'RE Engine API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Real Estate Automation API',
        endpoints: {
          workflows: '/api/workflows',
          templates: '/api/templates',
          health: '/health'
        },
        documentation: '/api/docs',
        timestamp: new Date().toISOString()
      });
    });

    // Workflow API routes
    const workflowRouter = createWorkflowAPIRouter(this.workflowService, this.orchestrator);
    this.app.use('/api/workflows', workflowRouter);

    // Template API routes
    const templateRouter = createTemplateAPIRouter();
    this.app.use('/api/templates', templateRouter);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error', {
        error: error.message,
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query
      });

      // Don't send error details in production
      const errorResponse = {
        error: this.config.environment === 'production' ? 'Internal Server Error' : error.message,
        timestamp: new Date().toISOString(),
        ...(this.config.environment !== 'production' && { stack: error.stack })
      };

      res.status(error.status || 500).json(errorResponse);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logger.error('Unhandled Rejection', { promise, reason });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      this.logger.info('📡 SIGTERM received, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      this.logger.info('📡 SIGINT received, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
  }

  private getCorsOrigins(): string[] {
    const origins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];

    if (this.config.environment === 'development') {
      origins.push('http://localhost:*');
    }

    // Add production origins from environment
    if (process.env.ALLOWED_ORIGINS) {
      origins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }

    return origins;
  }
}

/**
 * Create and configure the API server
 */
export function createAPIServer(config?: Partial<ServerConfig>): REEngineAPIServer {
  return new REEngineAPIServer(config);
}

/**
 * Default server factory
 */
export default function createServer(config?: Partial<ServerConfig>): REEngineAPIServer {
  return createAPIServer(config);
}
