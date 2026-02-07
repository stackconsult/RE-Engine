/**
 * Structured logging for the RE Engine orchestration system
  */
import { ConfigService } from "../config/config.service.js";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  traceId?: string;
  userId?: string;
  workflowId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableStructured: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

export class Logger {
  private serviceName: string;
  private config: LoggerConfig;
  private logLevel: LogLevel;

  constructor(serviceName: string, enableDetailedLogging: boolean = true, config?: Partial<LoggerConfig>) {
    this.serviceName = serviceName;
    this.config = {
      level: enableDetailedLogging ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableStructured: true,
      ...config
    };
    this.logLevel = this.config.level;
  }

  debug(message: string, data?: any): void;
  debug(data: any, message?: string): void;
  debug(arg1: any, arg2?: any): void {
    this.handleLog(LogLevel.DEBUG, arg1, arg2);
  }

  info(message: string, data?: any): void;
  info(data: any, message?: string): void;
  info(arg1: any, arg2?: any): void {
    this.handleLog(LogLevel.INFO, arg1, arg2);
  }

  warn(message: string, data?: any): void;
  warn(data: any, message?: string): void;
  warn(arg1: any, arg2?: any): void {
    this.handleLog(LogLevel.WARN, arg1, arg2);
  }

  error(message: string, data?: any): void;
  error(data: any, message?: string | Error): void;
  error(arg1: any, arg2?: any): void {
    this.handleLog(LogLevel.ERROR, arg1, arg2);
  }

  fatal(message: string, data?: any): void;
  fatal(data: any, message?: string): void;
  fatal(arg1: any, arg2?: any): void {
    this.handleLog(LogLevel.FATAL, arg1, arg2);
  }

  private handleLog(level: LogLevel, arg1: any, arg2?: any): void {
    let msg: string;
    let data: any;

    if (typeof arg1 === 'string') {
      msg = arg1;
      data = arg2;
    } else {
      data = arg1;
      msg = typeof arg2 === 'string' ? arg2 : 'Log message omitted';
    }

    this.log(level, msg, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      data
    };

    // Add trace ID if available
    if (data?.traceId) {
      logEntry.traceId = data.traceId;
    }

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // File logging (if enabled)
    if (this.config.enableFile) {
      this.logToFile(logEntry);
    }

    // Structured logging (for external systems)
    if (this.config.enableStructured) {
      this.logStructured(logEntry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const service = entry.service;
    const message = entry.message;

    let logMessage = `[${timestamp}] ${levelName} ${service}: ${message}`;

    if (entry.data) {
      logMessage += ` ${JSON.stringify(entry.data)}`;
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.FATAL:
        console.error(`🔴 FATAL: ${logMessage}`);
        break;
    }
  }

  private logToFile(entry: LogEntry): void {
    // File logging implementation would go here
    // For now, we'll use console as fallback
    this.logToConsole(entry);
  }

  private logStructured(entry: LogEntry): void {
    // Structured logging for external systems
    // This could send to ELK, Splunk, CloudWatch, etc.
    if (ConfigService.getInstance().get('NODE_ENV') === 'production') {
      // Send to external logging service
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // Implementation for external logging service
    // This would integrate with your logging infrastructure
  }

  // Static factory methods
  static create(serviceName: string, config?: Partial<LoggerConfig>): Logger {
    return new Logger(serviceName, true, config);
  }

  static createMinimal(serviceName: string): Logger {
    return new Logger(serviceName, false, { level: LogLevel.INFO });
  }
}

// Default logger instance
export const defaultLogger = new Logger('RE-Engine', true);
