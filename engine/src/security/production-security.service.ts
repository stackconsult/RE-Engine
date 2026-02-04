/**
 * Production Security Service
 * Comprehensive security management for production deployment
 */

import { 
  SecurityFeature 
} from '../shared/types.js';
import { 
  JWTManager, 
  EncryptionManager, 
  AuditLogger, 
  ThreatDetector, 
  APIKeyManager, 
  RequestValidator, 
  DDoSProtection, 
  IPWhitelist 
} from '../production/types.js';

export interface ProductionSecurityDependencies {
  jwtManager: JWTManager;
  encryptionManager: EncryptionManager;
  auditLogger: AuditLogger;
  threatDetector: ThreatDetector;
  apiKeyManager: APIKeyManager;
  requestValidator: RequestValidator;
  ddosProtection: DDoSProtection;
  ipWhitelist: IPWhitelist;
}

export interface SecurityResult {
  status: 'secured' | 'failed';
  features: SecurityFeature[];
  configuration: SecurityConfiguration;
}

export class ProductionSecurityService {
  private jwtManager: JWTManager;
  private encryptionManager: EncryptionManager;
  private auditLogger: AuditLogger;
  private threatDetector: ThreatDetector;
  private apiKeyManager: APIKeyManager;
  private requestValidator: RequestValidator;
  private ddosProtection: DDoSProtection;
  private ipWhitelist: IPWhitelist;
  
  constructor(dependencies: ProductionSecurityDependencies) {
    this.jwtManager = dependencies.jwtManager;
    this.encryptionManager = dependencies.encryptionManager;
    this.auditLogger = dependencies.auditLogger;
    this.threatDetector = dependencies.threatDetector;
    this.apiKeyManager = dependencies.apiKeyManager;
    this.requestValidator = dependencies.requestValidator;
    this.ddosProtection = dependencies.ddosProtection;
    this.ipWhitelist = dependencies.ipWhitelist;
  }
  
  async initializeProductionSecurity(): Promise<SecurityResult> {
    try {
      // STEP 2.1.1: JWT Security
      await this.configureJWTSecurity();
      
      // STEP 2.1.2: Data Encryption
      await this.configureDataEncryption();
      
      // STEP 2.1.3: API Security
      await this.configureAPISecurity();
      
      // STEP 2.1.4: Network Security
      await this.configureNetworkSecurity();
      
      // STEP 2.1.5: Threat Detection
      await this.configureThreatDetection();
      
      return { 
        status: 'secured', 
        features: this.getSecurityFeatures(),
        configuration: this.getSecurityConfiguration()
      };
      
    } catch (error) {
      await this.handleSecurityInitializationError(error);
      throw error;
    }
  }
  
  private async configureJWTSecurity(): Promise<void> {
    await this.jwtManager.configure({
      secret: process.env.JWT_SECRET,
      algorithm: 'HS256',
      expiresIn: '24h',
      issuer: 'reengine-production',
      audience: 'reengine-users',
      clockTolerance: 60
    });
    
    // JWT Refresh Token Strategy
    await this.jwtManager.configureRefreshTokens({
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
      rotation: true
    });
  }
  
  private async configureDataEncryption(): Promise<void> {
    await this.encryptionManager.configure({
      algorithm: 'aes-256-gcm',
      key: process.env.ENCRYPTION_KEY,
      ivLength: 16,
      tagLength: 16
    });
    
    // Field-level encryption
    await this.encryptionManager.configureFieldEncryption({
      fields: ['email', 'phone', 'ssn', 'creditCard'],
      algorithm: 'aes-256-cbc',
      keyRotation: true,
      rotationInterval: 86400000 // 24 hours
    });
  }
  
  private async configureAPISecurity(): Promise<void> {
    // API Key Management
    await this.apiKeyManager.configure({
      algorithm: 'HS256',
      expiresIn: '1h',
      rateLimit: 1000,
      ipWhitelist: process.env.API_IP_WHITELIST?.split(',') || []
    });
    
    // Request Validation
    await this.requestValidator.configure({
      maxPayloadSize: '10mb',
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      sanitizeInput: true
    });
  }
  
  private async configureNetworkSecurity(): Promise<void> {
    // DDoS Protection
    await this.ddosProtection.configure({
      enabled: true,
      threshold: 1000,
      windowMs: 900000, // 15 minutes
      blockDuration: 3600000 // 1 hour
    });
    
    // IP Whitelisting
    await this.ipWhitelist.configure({
      enabled: true,
      allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
      defaultAction: 'deny'
    });
  }
  
  private async configureThreatDetection(): Promise<void> {
    await this.threatDetector.configure({
      enabled: true,
      rules: [
        'sql-injection',
        'xss-attack',
        'csrf-attack',
        'brute-force',
        'anomalous-access'
      ],
      alertThreshold: 0.7,
      autoBlock: true,
      blockDuration: 3600000 // 1 hour
    });
  }
  
  private getSecurityFeatures(): SecurityFeature[] {
    return [
      {
        name: 'JWT Authentication',
        enabled: true,
        status: 'active',
        lastChecked: Date.now()
      },
      {
        name: 'Data Encryption',
        enabled: true,
        status: 'active',
        lastChecked: Date.now()
      },
      {
        name: 'API Key Management',
        enabled: true,
        status: 'active',
        lastChecked: Date.now()
      },
      {
        name: 'DDoS Protection',
        enabled: true,
        status: 'active',
        lastChecked: Date.now()
      },
      {
        name: 'Threat Detection',
        enabled: true,
        status: 'active',
        lastChecked: Date.now()
      }
    ];
  }
  
  private getSecurityConfiguration(): SecurityConfiguration {
    return {
      jwt: {
        algorithm: 'HS256',
        expiresIn: '24h',
        refreshEnabled: true
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        fieldLevelEncryption: true,
        keyRotation: true
      },
      api: {
        rateLimit: 1000,
        maxPayloadSize: '10mb',
        validationEnabled: true
      },
      network: {
        ddosProtection: true,
        ipWhitelisting: true,
        threatDetection: true
      }
    };
  }
  
  private async handleSecurityInitializationError(error: Error): Promise<void> {
    console.error('Security initialization failed:', error);
    await this.auditLogger.logSecurityEvent({
      type: 'security_init_failure',
      severity: 'critical',
      message: error.message,
      timestamp: Date.now()
    });
  }
}

interface SecurityConfiguration {
  jwt: {
    algorithm: string;
    expiresIn: string;
    refreshEnabled: boolean;
  };
  encryption: {
    algorithm: string;
    fieldLevelEncryption: boolean;
    keyRotation: boolean;
  };
  api: {
    rateLimit: number;
    maxPayloadSize: string;
    validationEnabled: boolean;
  };
  network: {
    ddosProtection: boolean;
    ipWhitelisting: boolean;
    threatDetection: boolean;
  };
}
