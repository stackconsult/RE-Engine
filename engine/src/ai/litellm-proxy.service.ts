/**
 * LiteLLM Proxy Service
 * Manages LiteLLM proxy for Ollama integration with Claude Code compatibility
 */

import { spawn, ChildProcess } from 'child_process';
import { logger, logSystemEvent, logError } from '../observability/logger.js';
import { existsSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';

export interface LiteLLMModelMapping {
  claudeModelName: string;
  ollamaModelName: string;
  apiBase: string;
}

export interface LiteLLMConfig {
  enabled: boolean;
  proxyUrl: string;
  masterKey: string;
  configPath: string;
  modelMappings: LiteLLMModelMapping[];
  healthCheckUrl: string;
  autoStart: boolean;
  port: number;
}

export interface ProxyStatus {
  running: boolean;
  pid?: number;
  port: number;
  uptime?: number;
  lastHealthCheck?: Date;
  error?: string;
  modelCount: number;
}

export class LiteLLMProxyService {
  private config: LiteLLMConfig;
  private proxyProcess?: ChildProcess;
  private status: ProxyStatus;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: LiteLLMConfig) {
    this.config = config;
    this.status = {
      running: false,
      port: config.port,
      modelCount: 0
    };
  }

  async initialize(): Promise<void> {
    try {
      logSystemEvent('litellm-proxy-init', 'info', {
        enabled: this.config.enabled,
        proxyUrl: this.config.proxyUrl,
        autoStart: this.config.autoStart
      });

      if (this.config.enabled) {
        await this.generateConfigFile();
        
        if (this.config.autoStart) {
          await this.startProxy();
        }
        
        this.startHealthCheck();
      }

      logSystemEvent('litellm-proxy-init-success', 'info');

    } catch (error) {
      logError(error as Error, 'litellm-proxy-init-failed');
      throw error;
    }
  }

  async startProxy(): Promise<void> {
    try {
      if (this.status.running) {
        logger.warn('LiteLLM proxy is already running');
        return;
      }

      logSystemEvent('litellm-proxy-start', 'info', {
        configPath: this.config.configPath,
        port: this.config.port
      });

      // Set environment variables
      process.env.LITELLM_MASTER_KEY = this.config.masterKey;

      // Start LiteLLM proxy
      this.proxyProcess = spawn('litellm', [
        '--config', this.config.configPath,
        '--port', this.config.port.toString()
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, LITELLM_MASTER_KEY: this.config.masterKey }
      });

      this.proxyProcess.on('error', (error) => {
        logError(error, 'litellm-proxy-process-error');
        this.status.running = false;
        this.status.error = error.message;
      });

      this.proxyProcess.on('exit', (code, signal) => {
        logSystemEvent('litellm-proxy-exit', 'info', { code, signal });
        this.status.running = false;
      });

      // Wait for proxy to start
      await this.waitForProxy();

      this.status.running = true;
      this.status.pid = this.proxyProcess.pid;
      this.status.error = undefined;

      logSystemEvent('litellm-proxy-start-success', 'info', {
        pid: this.status.pid,
        port: this.status.port
      });

    } catch (error) {
      logError(error as Error, 'litellm-proxy-start-failed');
      throw error;
    }
  }

  async stopProxy(): Promise<void> {
    try {
      if (!this.status.running || !this.proxyProcess) {
        logger.warn('LiteLLM proxy is not running');
        return;
      }

      logSystemEvent('litellm-proxy-stop', 'info', {
        pid: this.status.pid
      });

      this.proxyProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        if (this.proxyProcess) {
          this.proxyProcess.on('exit', () => resolve());
          setTimeout(() => {
            if (this.proxyProcess && !this.proxyProcess.killed) {
              this.proxyProcess.kill('SIGKILL');
              resolve();
            }
          }, 5000);
        } else {
          resolve();
        }
      });

      this.status.running = false;
      this.status.pid = undefined;

      logSystemEvent('litellm-proxy-stop-success', 'info');

    } catch (error) {
      logError(error as Error, 'litellm-proxy-stop-failed');
      throw error;
    }
  }

  async restartProxy(): Promise<void> {
    logSystemEvent('litellm-proxy-restart', 'info');
    await this.stopProxy();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.startProxy();
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.status.running) {
        return false;
      }

      const response = await fetch(`${this.config.proxyUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const isHealthy = response.ok;
      this.status.lastHealthCheck = new Date();
      
      if (!isHealthy) {
        this.status.error = `Health check failed: ${response.status}`;
      }

      return isHealthy;

    } catch (error) {
      logError(error as Error, 'litellm-proxy-health-check-failed');
      this.status.error = (error as Error).message;
      return false;
    }
  }

  async getModelMapping(claudeModelName: string): Promise<string> {
    const mapping = this.config.modelMappings.find(
      m => m.claudeModelName === claudeModelName
    );

    if (!mapping) {
      throw new Error(`No model mapping found for Claude model: ${claudeModelName}`);
    }

    return mapping.ollamaModelName;
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.proxyUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.masterKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      const models = data.data?.map((model: any) => model.id) || [];
      this.status.modelCount = models.length;

      return models;

    } catch (error) {
      logError(error as Error, 'litellm-proxy-list-models-failed');
      return [];
    }
  }

  getStatus(): ProxyStatus {
    return { ...this.status };
  }

  private async generateConfigFile(): Promise<void> {
    try {
      const config = {
        model_list: this.config.modelMappings.map(mapping => ({
          model_name: mapping.claudeModelName,
          litellm_params: {
            model: mapping.ollamaModelName,
            api_base: mapping.apiBase
          }
        })),
        litellm_settings: {
          master_key: this.config.masterKey,
          drop_params: true,
          set_verbose: false,
          success_callback: ["http://localhost:4000/callbacks"]
        }
      };

      // Use dynamic import for yaml
      const yaml = await import('js-yaml');
      const configYaml = yaml.dump(config, { indent: 2 });
      
      // Ensure config directory exists
      const configDir = this.config.configPath.substring(0, this.config.configPath.lastIndexOf('/'));
      if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
      }

      writeFileSync(this.config.configPath, configYaml);
      
      logSystemEvent('litellm-proxy-config-generated', 'info', {
        configPath: this.config.configPath,
        modelCount: this.config.modelMappings.length
      });

    } catch (error) {
      logError(error as Error, 'litellm-proxy-config-failed');
      throw error;
    }
  }

  private async waitForProxy(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${this.config.proxyUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });

        if (response.ok) {
          return;
        }
      } catch (error) {
        // Proxy not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('LiteLLM proxy failed to start within timeout period');
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.healthCheck();
    }, 30000); // Check every 30 seconds
  }

  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.status.running) {
      await this.stopProxy();
    }
  }
}
