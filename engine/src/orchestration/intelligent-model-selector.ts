/**
 * Intelligent Model Selector
 * Selects optimal AI models based on task requirements, performance, and availability
 */

import { EventEmitter } from 'events';
import { AIModel, ModelRequirements, ModelPerformance, TaskType } from '../types/orchestration.types';
import { Logger } from '../utils/logger';

export interface ModelSelectorConfig {
  enablePerformanceTracking: boolean;
  enableCostOptimization: boolean;
  enableLocalPreference: boolean;
  performanceHistorySize: number;
  fallbackChainDepth: number;
}

export class IntelligentModelSelector extends EventEmitter {
  private models: Map<string, AIModel> = new Map();
  private performanceTracker: ModelPerformanceTracker;
  private fallbackChain: FallbackChain;
  private config: ModelSelectorConfig;
  private logger: Logger;

  constructor(config?: Partial<ModelSelectorConfig>) {
    super();
    this.config = {
      enablePerformanceTracking: true,
      enableCostOptimization: true,
      enableLocalPreference: true,
      performanceHistorySize: 1000,
      fallbackChainDepth: 5,
      ...config
    };
    this.logger = new Logger('IntelligentModelSelector', true);

    this.performanceTracker = new ModelPerformanceTracker(this.config.performanceHistorySize);
    this.fallbackChain = new FallbackChain(this.config.fallbackChainDepth);
  }

  /**
   * Initialize a local model
   */
  async initializeLocalModel(modelName: string): Promise<AIModel> {
    this.logger.info(`🤖 Initializing local model: ${modelName}`);

    const model: AIModel = {
      id: `local-${modelName}`,
      name: modelName,
      type: 'local',
      provider: 'ollama',
      contextWindow: this.getModelContextWindow(modelName),
      costPerToken: 0, // Local models are free
      isLocal: true,
      capabilities: this.getModelCapabilities(modelName),
      specialties: this.getModelSpecialties(modelName),
      performance: {
        latency: 0,
        accuracy: 0,
        reliability: 0,
        errorRate: 0,
        lastUpdated: Date.now()
      }
    };

    // Test model availability
    try {
      await this.testModelAvailability(model);
      this.models.set(model.id, model);
      this.logger.info(`✅ Local model ${modelName} initialized successfully`);
      return model;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to initialize local model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Initialize a cloud model
   */
  async initializeCloudModel(modelName: string): Promise<AIModel> {
    this.logger.info(`☁️ Initializing cloud model: ${modelName}`);

    const model: AIModel = {
      id: `cloud-${modelName}`,
      name: modelName,
      type: 'cloud',
      provider: this.getModelProvider(modelName),
      contextWindow: this.getModelContextWindow(modelName),
      costPerToken: this.getModelCostPerToken(modelName),
      isLocal: false,
      capabilities: this.getModelCapabilities(modelName),
      specialties: this.getModelSpecialties(modelName),
      performance: {
        latency: 0,
        accuracy: 0,
        reliability: 0,
        errorRate: 0,
        lastUpdated: Date.now()
      }
    };

    // Test model availability
    try {
      await this.testModelAvailability(model);
      this.models.set(model.id, model);
      this.logger.info(`✅ Cloud model ${modelName} initialized successfully`);
      return model;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to initialize cloud model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Select optimal model for a task
   */
  async selectOptimalModel(taskType: string, requirements: ModelRequirements): Promise<AIModel> {
    this.logger.info(`🎯 Selecting optimal model for task: ${taskType}`);

    // Get available models
    const availableModels = this.getAvailableModels(taskType);

    if (availableModels.length === 0) {
      throw new Error(`No available models for task type: ${taskType}`);
    }

    // Rank models by suitability
    const rankedModels = await this.rankModels(availableModels, taskType, requirements);

    this.logger.debug(`Model ranking for ${taskType}:`, rankedModels.map(m => ({ id: m.id, score: m._rankingScore })));

    // Try models in order of preference
    for (const model of rankedModels) {
      if (await this.isModelAvailable(model)) {
        this.logger.info(`✅ Selected model: ${model.id} for task: ${taskType}`);
        this.emit('model:selected', { model, taskType, requirements });
        return model;
      }
    }

    // If no model is available, use cloud fallback
    return await this.getCloudFallback(taskType, requirements);
  }

  /**
   * Update model performance metrics
   */
  async updateModelPerformance(modelId: string, metrics: Partial<ModelPerformance>): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      this.logger.warn(`Model ${modelId} not found for performance update`);
      return;
    }

    // Update performance data
    model.performance = {
      ...model.performance,
      ...metrics,
      lastUpdated: Date.now()
    };

    // Track performance history
    if (this.config.enablePerformanceTracking) {
      await this.performanceTracker.recordPerformance(modelId, metrics);
    }

    this.logger.debug(`Updated performance for model ${modelId}:`, metrics);
    this.emit('performance:updated', { modelId, metrics });
  }

  /**
   * Get model performance history
   */
  getModelPerformanceHistory(modelId: string): ModelPerformance[] {
    return this.performanceTracker.getHistory(modelId);
  }

  /**
   * Get all available models
   */
  getAvailableModels(taskType?: string): AIModel[] {
    const models = Array.from(this.models.values());

    if (taskType) {
      return models.filter(model => this.isModelSuitableForTask(model, taskType));
    }

    return models;
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): AIModel | undefined {
    return this.models.get(modelId);
  }

  // Private Methods

  private async rankModels(models: AIModel[], taskType: string, requirements: ModelRequirements): Promise<AIModel[]> {
    const rankings = await Promise.all(models.map(async model => ({
      model,
      score: await this.calculateModelScore(model, taskType, requirements)
    })));

    // Add ranking score to models for debugging
    rankings.forEach(ranking => {
      ranking.model._rankingScore = ranking.score;
    });

    return rankings
      .sort((a, b) => b.score - a.score)
      .map(ranking => ranking.model);
  }

  private async calculateModelScore(model: AIModel, taskType: string, requirements: ModelRequirements): Promise<number> {
    let score = 0;

    // Task type suitability (30% weight)
    const taskSuitability = this.getTaskSuitability(model, taskType);
    score += taskSuitability * 0.3;

    // Performance metrics (25% weight)
    const performance = this.performanceTracker.getAveragePerformance(model.id);
    score += (1 - performance.errorRate) * 0.15; // Reliability
    score += (1 / Math.max(performance.latency, 1)) * 0.1; // Speed
    score += performance.accuracy * 0.0; // Accuracy (not implemented yet)

    // Resource requirements (20% weight)
    if (model.contextWindow >= requirements.minContextWindow) {
      score += 0.1;
    }
    if (model.costPerToken <= requirements.maxCostPerToken) {
      score += 0.1;
    }

    // Local preference (15% weight)
    if (this.config.enableLocalPreference && model.isLocal) {
      score += 0.15;
    }

    // Specialization match (10% weight)
    const specializationMatch = this.getSpecializationMatch(model, taskType);
    score += specializationMatch * 0.1;

    // Availability (5% weight)
    const availability = await this.getModelAvailability(model);
    score += availability * 0.05;

    return Math.min(score, 1.0);
  }

  private getTaskSuitability(model: AIModel, taskType: string): number {
    const taskSuitabilityMap: Record<string, Record<string, number>> = {
      'lead_analysis': {
        'deepseek-r1:32b': 0.9,
        'qwen2.5:32b': 0.85,
        'phi4-reasoning:14b': 0.8,
        'llama3.1:8b': 0.7,
        'gpt-4': 0.95,
        'claude-3-sonnet': 0.9,
        'gemini-pro': 0.85
      },
      'property_description': {
        'llama3.1:8b': 0.85,
        'mistral-small3.2': 0.8,
        'gpt-4': 0.9,
        'claude-3-sonnet': 0.95,
        'gemini-pro': 0.85
      },
      'code_generation': {
        'qwen3-coder:30b': 0.9,
        'deepseek-coder:33b': 0.85,
        'gpt-4': 0.95,
        'claude-3-sonnet': 0.9,
        'gemini-pro': 0.8
      },
      'document_analysis': {
        'phi4-reasoning:14b': 0.9,
        'llama3.1:8b': 0.8,
        'gpt-4': 0.85,
        'claude-3-sonnet': 0.9,
        'gemini-pro': 0.85
      },
      'market_analysis': {
        'qwen2.5:32b': 0.9,
        'deepseek-r1:32b': 0.85,
        'gpt-4': 0.9,
        'claude-3-sonnet': 0.85,
        'gemini-pro': 0.9
      }
    };

    const taskScores = taskSuitabilityMap[taskType];
    if (!taskScores) {
      return 0.5; // Default score for unknown task types
    }

    return taskScores[model.name] || 0.5;
  }

  private getSpecializationMatch(model: AIModel, taskType: string): number {
    if (!model.specialties) {
      return 0.5;
    }

    const taskSpecialtyMap: Record<string, string[]> = {
      'lead_analysis': ['reasoning', 'analysis', 'business'],
      'property_description': ['writing', 'creativity', 'description'],
      'code_generation': ['coding', 'programming', 'development'],
      'document_analysis': ['reasoning', 'analysis', 'extraction'],
      'market_analysis': ['analysis', 'reasoning', 'data']
    };

    const requiredSpecialties = taskSpecialtyMap[taskType] || [];
    const matchingSpecialties = model.specialties.filter(s => requiredSpecialties.includes(s));

    if (matchingSpecialties.length === 0) {
      return 0.3;
    }

    return matchingSpecialties.length / requiredSpecialties.length;
  }

  private async isModelAvailable(model: AIModel): Promise<boolean> {
    try {
      const availability = await this.getModelAvailability(model);
      return availability > 0.5; // 50% availability threshold
    } catch (error) {
      this.logger.warn(`Failed to check availability for model ${model.id}:`, error);
      return false;
    }
  }

  private async getModelAvailability(model: AIModel): Promise<number> {
    if (model.isLocal) {
      // Check if local model is running
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          const isRunning = data.models.some((m: any) => m.name === model.name);
          return isRunning ? 1.0 : 0.0;
        }
      } catch (error) {
        return 0.0;
      }
    } else {
      // Check cloud model availability (simple health check)
      try {
        const startTime = Date.now();
        await this.testModelAvailability(model);
        const latency = Date.now() - startTime;

        // Update performance metrics
        await this.updateModelPerformance(model.id, { latency });

        return 1.0;
      } catch (error) {
        // Update error rate
        await this.updateModelPerformance(model.id, { errorRate: 1.0 });
        return 0.0;
      }
    }
  }

  private async testModelAvailability(model: AIModel): Promise<void> {
    if (model.isLocal) {
      // Test local model with Ollama
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.name,
          prompt: 'test',
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Local model ${model.name} not responding`);
      }
    } else {
      // Test cloud model with provider-specific API
      await this.testCloudModel(model);
    }
  }

  private async testCloudModel(model: AIModel): Promise<void> {
    // This would implement provider-specific health checks
    // For now, we'll simulate a basic test
    switch (model.provider) {
      case 'openai':
        await this.testOpenAIModel(model);
        break;
      case 'anthropic':
        await this.testAnthropicModel(model);
        break;
      case 'google':
        await this.testGoogleModel(model);
        break;
      default:
        throw new Error(`Unknown cloud provider: ${model.provider}`);
    }
  }

  private async testOpenAIModel(model: AIModel): Promise<void> {
    // Implement OpenAI health check
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.name,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI model ${model.name} not available`);
    }
  }

  private async testAnthropicModel(model: AIModel): Promise<void> {
    // Implement Anthropic health check
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not found');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model.name,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic model ${model.name} not available`);
    }
  }

  private async testGoogleModel(model: AIModel): Promise<void> {
    // Implement Google health check
    // This would use the Google AI API
    throw new Error('Google model testing not implemented yet');
  }

  private async getCloudFallback(taskType: string, requirements: ModelRequirements): Promise<AIModel> {
    this.logger.warn(`🔄 Using cloud fallback for task: ${taskType}`);

    const cloudModels = Array.from(this.models.values()).filter(m => !m.isLocal);

    for (const model of cloudModels) {
      if (await this.isModelAvailable(model)) {
        this.logger.info(`✅ Using cloud fallback model: ${model.id}`);
        return model;
      }
    }

    throw new Error('No suitable cloud model available for fallback');
  }

  private isModelSuitableForTask(model: AIModel, taskType: string): boolean {
    return this.getTaskSuitability(model, taskType) > 0.3;
  }

  private getModelContextWindow(modelName: string): number {
    const contextWindows: Record<string, number> = {
      'llama3.1:8b': 128000,
      'qwen2.5:32b': 32768,
      'deepseek-r1:32b': 32768,
      'phi4-reasoning:14b': 128000,
      'qwen3-coder:30b': 32768,
      'deepseek-coder:33b': 16384,
      'gpt-4': 128000,
      'claude-3-sonnet': 200000,
      'gemini-pro': 32768
    };

    return contextWindows[modelName] || 4096;
  }

  private getModelCostPerToken(modelName: string): number {
    const costs: Record<string, number> = {
      'gpt-4': 0.00003,
      'claude-3-sonnet': 0.000015,
      'gemini-pro': 0.000001
    };

    return costs[modelName] || 0.00001;
  }

  private getModelProvider(modelName: string): string {
    const providers: Record<string, string> = {
      'gpt-4': 'openai',
      'claude-3-sonnet': 'anthropic',
      'gemini-pro': 'google'
    };

    return providers[modelName] || 'unknown';
  }

  private getModelCapabilities(modelName: string): string[] {
    const capabilities: Record<string, string[]> = {
      'llama3.1:8b': ['text', 'reasoning', 'analysis', 'long-context'],
      'qwen2.5:32b': ['text', 'reasoning', 'analysis', 'multilingual'],
      'deepseek-r1:32b': ['text', 'reasoning', 'analysis', 'coding'],
      'phi4-reasoning:14b': ['text', 'reasoning', 'analysis', 'math'],
      'qwen3-coder:30b': ['text', 'coding', 'reasoning', 'analysis'],
      'deepseek-coder:33b': ['text', 'coding', 'reasoning'],
      'gpt-4': ['text', 'coding', 'reasoning', 'analysis', 'vision'],
      'claude-3-sonnet': ['text', 'reasoning', 'analysis', 'long-context'],
      'gemini-pro': ['text', 'reasoning', 'analysis', 'vision', 'multilingual']
    };

    return capabilities[modelName] || ['text'];
  }

  private getModelSpecialties(modelName: string): string[] {
    const specialties: Record<string, string[]> = {
      'llama3.1:8b': ['general', 'conversation'],
      'qwen2.5:32b': ['analysis', 'reasoning', 'multilingual'],
      'deepseek-r1:32b': ['reasoning', 'analysis', 'coding'],
      'phi4-reasoning:14b': ['reasoning', 'math', 'analysis'],
      'qwen3-coder:30b': ['coding', 'programming', 'development'],
      'deepseek-coder:33b': ['coding', 'programming'],
      'gpt-4': ['general', 'coding', 'reasoning', 'analysis'],
      'claude-3-sonnet': ['writing', 'analysis', 'reasoning'],
      'gemini-pro': ['analysis', 'reasoning', 'multilingual']
    };

    return specialties[modelName] || ['general'];
  }
}

/**
 * Model performance tracker
 */
class ModelPerformanceTracker {
  private history: Map<string, ModelPerformance[]> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async recordPerformance(modelId: string, metrics: Partial<ModelPerformance>): Promise<void> {
    if (!this.history.has(modelId)) {
      this.history.set(modelId, []);
    }

    const modelHistory = this.history.get(modelId)!;
    const performance: ModelPerformance = {
      latency: metrics.latency || 0,
      accuracy: metrics.accuracy || 0,
      reliability: metrics.reliability || 0,
      errorRate: metrics.errorRate || 0,
      lastUpdated: Date.now()
    };

    modelHistory.push(performance);

    // Keep history size limited
    if (modelHistory.length > this.maxSize) {
      modelHistory.shift();
    }
  }

  getHistory(modelId: string): ModelPerformance[] {
    return this.history.get(modelId) || [];
  }

  getAveragePerformance(modelId: string): ModelPerformance {
    const history = this.getHistory(modelId);

    if (history.length === 0) {
      return {
        latency: 0,
        accuracy: 0,
        reliability: 0,
        errorRate: 0,
        lastUpdated: Date.now()
      };
    }

    const sum = history.reduce((acc, perf) => ({
      latency: acc.latency + perf.latency,
      accuracy: acc.accuracy + perf.accuracy,
      reliability: acc.reliability + perf.reliability,
      errorRate: acc.errorRate + perf.errorRate
    }), { latency: 0, accuracy: 0, reliability: 0, errorRate: 0 });

    const count = history.length;

    return {
      latency: sum.latency / count,
      accuracy: sum.accuracy / count,
      reliability: sum.reliability / count,
      errorRate: sum.errorRate / count,
      lastUpdated: Date.now()
    };
  }
}

/**
 * Fallback chain manager
 */
class FallbackChain {
  private depth: number;

  constructor(depth: number = 5) {
    this.depth = depth;
  }

  async getFallbackChain(primaryModel: AIModel, availableModels: AIModel[]): Promise<AIModel[]> {
    const chain: AIModel[] = [primaryModel];

    // Add similar models first
    const similarModels = availableModels
      .filter(m => m.id !== primaryModel.id && this.areModelsSimilar(primaryModel, m))
      .sort((a, b) => this.calculateSimilarity(primaryModel, b) - this.calculateSimilarity(primaryModel, a));

    chain.push(...similarModels);

    // Add remaining models
    const remainingModels = availableModels
      .filter(m => !chain.includes(m))
      .sort((a, b) => (b.isLocal ? 1 : 0) - (a.isLocal ? 1 : 0)); // Prefer local models

    chain.push(...remainingModels);

    // Limit chain depth
    return chain.slice(0, this.depth);
  }

  private areModelsSimilar(model1: AIModel, model2: AIModel): boolean {
    return this.calculateSimilarity(model1, model2) > 0.7;
  }

  private calculateSimilarity(model1: AIModel, model2: AIModel): number {
    let similarity = 0;

    // Same type (local/cloud)
    if (model1.isLocal === model2.isLocal) {
      similarity += 0.3;
    }

    // Similar capabilities
    const commonCapabilities = model1.capabilities.filter(c => model2.capabilities.includes(c));
    similarity += (commonCapabilities.length / Math.max(model1.capabilities.length, model2.capabilities.length)) * 0.4;

    // Similar specialties
    const commonSpecialties = model1.specialties?.filter(s => model2.specialties?.includes(s)) || [];
    similarity += (commonSpecialties.length / Math.max(model1.specialties?.length || 0, model2.specialties?.length || 0)) * 0.3;

    return similarity;
  }
}
