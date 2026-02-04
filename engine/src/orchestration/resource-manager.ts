/**
 * Resource Manager
 * Manages system resources with auto-scaling and load balancing
 */

import { EventEmitter } from 'events';
import { ResourceRequirements, ResourceAllocation, AllocatedResource } from '../types/orchestration.types';
import { Logger } from '../utils/logger';

export interface ResourceManagerConfig {
  enableAutoScaling: boolean;
  maxResources: ResourceLimits;
  scalingThresholds: ScalingThresholds;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'weighted';
}

export interface ResourceLimits {
  maxCPU: number;
  maxMemory: number;
  maxStorage: number;
  maxNetwork: number;
  maxGPU: number;
}

export interface ScalingThresholds {
  cpuThreshold: number;
  memoryThreshold: number;
  scaleUpDelay: number;
  scaleDownDelay: number;
}

export interface SystemResources {
  cpu: {
    total: number;
    used: number;
    available: number;
    utilization: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    utilization: number;
  };
  storage: {
    total: number;
    used: number;
    available: number;
    utilization: number;
  };
  network: {
    total: number;
    used: number;
    available: number;
    utilization: number;
  };
  gpu: {
    total: number;
    used: number;
    available: number;
    utilization: number;
  };
}

export class ResourceManager extends EventEmitter {
  private config: ResourceManagerConfig;
  private logger: Logger;
  private currentResources: SystemResources;
  private allocatedResources: Map<string, ResourceAllocation> = new Map();
  private scalingTimer: NodeJS.Timeout | null = null;
  private loadBalancer: LoadBalancer;

  constructor(config?: Partial<ResourceManagerConfig>) {
    this.config = {
      enableAutoScaling: true,
      maxResources: {
        maxCPU: 100,
        maxMemory: 16384, // 16GB in MB
        maxStorage: 1024000, // 1TB in MB
        maxNetwork: 10000, // 10Gbps
        maxGPU: 8
      },
      scalingThresholds: {
        cpuThreshold: 80,
        memoryThreshold: 85,
        scaleUpDelay: 30000, // 30 seconds
        scaleDownDelay: 120000 // 2 minutes
      },
      loadBalancingStrategy: 'least-connections',
      ...config
    };
    
    this.logger = new Logger('ResourceManager', true);
    this.currentResources = this.initializeResources();
    this.loadBalancer = new LoadBalancer(this.config.loadBalancingStrategy);
    
    this.startResourceMonitoring();
  }

  /**
   * Allocate resources for a request
   */
  async allocateResources(requirements: ResourceRequirements): Promise<ResourceAllocation> {
    this.logger.info('🔧 Allocating resources:', requirements);

    // Check if resources are available
    const available = this.getAvailableResources();
    
    // Calculate needed resources
    const needed = this.calculateNeededResources(requirements);
    
    this.logger.debug('Resource check:', { available, needed });

    if (this.canSatisfy(available, needed)) {
      // Allocate existing resources
      return await this.allocateExistingResources(needed);
    } else {
      // Scale up and allocate
      return await this.scaleAndAllocate(needed);
    }
  }

  /**
   * Release allocated resources
   */
  async releaseResources(allocation: ResourceAllocation): Promise<void> {
    this.logger.info('🔧 Releasing resources:', allocation);

    // Release allocated resources
    for (const resource of allocation.resources) {
      await this.releaseResource(resource);
    }

    // Update current resources
    this.updateCurrentResources();

    // Check if we can scale down
    if (this.config.enableAutoScaling) {
      await this.checkScaleDown();
    }

    // Remove from tracking
    this.allocatedResources.delete(allocation.resources[0]?.id || 'unknown');

    this.logger.info('✅ Resources released successfully');
  }

  /**
   * Get current system resources
   */
  getSystemResources(): SystemResources {
    return { ...this.currentResources };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    const utilization = this.calculateOverallUtilization();
    
    return {
      status: utilization < 80 ? 'healthy' : utilization < 95 ? 'degraded' : 'unhealthy',
      utilization,
      allocatedResources: this.allocatedResources.size,
      maxResources: this.config.maxResources,
      autoScaling: this.config.enableAutoScaling
    };
  }

  /**
   * Shutdown resource manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down resource manager...');

    // Stop monitoring
    if (this.scalingTimer) {
      clearInterval(this.scalingTimer);
      this.scalingTimer = null;
    }

    // Release all allocated resources
    const releasePromises = Array.from(this.allocatedResources.values()).map(
      allocation => this.releaseResources(allocation)
    );

    await Promise.all(releasePromises);

    this.logger.info('✅ Resource manager shutdown complete');
  }

  // Private Methods

  private initializeResources(): SystemResources {
    return {
      cpu: {
        total: this.config.maxResources.maxCPU,
        used: 0,
        available: this.config.maxResources.maxCPU,
        utilization: 0
      },
      memory: {
        total: this.config.maxResources.maxMemory,
        used: 0,
        available: this.config.maxResources.maxMemory,
        utilization: 0
      },
      storage: {
        total: this.config.maxResources.maxStorage,
        used: 0,
        available: this.config.maxResources.maxStorage,
        utilization: 0
      },
      network: {
        total: this.config.maxResources.maxNetwork,
        used: 0,
        available: this.config.maxResources.maxNetwork,
        utilization: 0
      },
      gpu: {
        total: this.config.maxResources.maxGPU,
        used: 0,
        available: this.config.maxResources.maxGPU,
        utilization: 0
      }
    };
  }

  private getAvailableResources(): ResourceRequirements {
    return {
      cpu: this.currentResources.cpu.available,
      memory: this.currentResources.memory.available,
      storage: this.currentResources.storage.available,
      network: this.currentResources.network.available,
      gpu: this.currentResources.gpu.available
    };
  }

  private calculateNeededResources(requirements: ResourceRequirements): ResourceRequirements {
    // Add buffer for overhead
    const buffer = 1.1; // 10% buffer
    
    return {
      cpu: Math.ceil(requirements.cpu * buffer),
      memory: Math.ceil(requirements.memory * buffer),
      storage: Math.ceil(requirements.storage * buffer),
      network: Math.ceil(requirements.network * buffer),
      gpu: Math.ceil(requirements.gpu || 0)
    };
  }

  private canSatisfy(available: ResourceRequirements, needed: ResourceRequirements): boolean {
    return (
      available.cpu >= needed.cpu &&
      available.memory >= needed.memory &&
      available.storage >= needed.storage &&
      available.network >= needed.network &&
      available.gpu >= (needed.gpu || 0)
    );
  }

  private async allocateExistingResources(needed: ResourceRequirements): Promise<ResourceAllocation> {
    const allocationId = this.generateId();
    const resources: AllocatedResource[] = [];
    let totalCost = 0;

    // Allocate CPU
    if (needed.cpu > 0) {
      const cpuResource: AllocatedResource = {
        id: `${allocationId}-cpu`,
        type: 'cpu',
        amount: needed.cpu,
        unit: 'cores',
        cost: this.calculateResourceCost('cpu', needed.cpu),
        duration: 0
      };
      resources.push(cpuResource);
      totalCost += cpuResource.cost;
      this.currentResources.cpu.used += needed.cpu;
      this.currentResources.cpu.available -= needed.cpu;
    }

    // Allocate Memory
    if (needed.memory > 0) {
      const memoryResource: AllocatedResource = {
        id: `${allocationId}-memory`,
        type: 'memory',
        amount: needed.memory,
        unit: 'MB',
        cost: this.calculateResourceCost('memory', needed.memory),
        duration: 0
      };
      resources.push(memoryResource);
      totalCost += memoryResource.cost;
      this.currentResources.memory.used += needed.memory;
      this.currentResources.memory.available -= needed.memory;
    }

    // Allocate Storage
    if (needed.storage > 0) {
      const storageResource: AllocatedResource = {
        id: `${allocationId}-storage`,
        type: 'storage',
        amount: needed.storage,
        unit: 'MB',
        cost: this.calculateResourceCost('storage', needed.storage),
        duration: 0
      };
      resources.push(storageResource);
      totalCost += storageResource.cost;
      this.currentResources.storage.used += needed.storage;
      this.currentResources.storage.available -= needed.storage;
    }

    // Allocate Network
    if (needed.network > 0) {
      const networkResource: AllocatedResource = {
        id: `${allocationId}-network`,
        type: 'network',
        amount: needed.network,
        unit: 'Mbps',
        cost: this.calculateResourceCost('network', needed.network),
        duration: 0
      };
      resources.push(networkResource);
      totalCost += networkResource.cost;
      this.currentResources.network.used += needed.network;
      this.currentResources.network.available -= needed.network;
    }

    // Allocate GPU
    if (needed.gpu && needed.gpu > 0) {
      const gpuResource: AllocatedResource = {
        id: `${allocationId}-gpu`,
        type: 'gpu',
        amount: needed.gpu,
        unit: 'units',
        cost: this.calculateResourceCost('gpu', needed.gpu),
        duration: 0
      };
      resources.push(gpuResource);
      totalCost += gpuResource.cost;
      this.currentResources.gpu.used += needed.gpu;
      this.currentResources.gpu.available -= needed.gpu;
    }

    // Update utilization
    this.updateUtilization();

    const allocation: ResourceAllocation = {
      resources,
      totalCost,
      duration: 0,
      timestamp: Date.now()
    };

    this.allocatedResources.set(allocationId, allocation);
    
    this.logger.info(`✅ Resources allocated: ${JSON.stringify(allocation)}`);
    return allocation;
  }

  private async scaleAndAllocate(needed: ResourceRequirements): Promise<ResourceAllocation> {
    this.logger.info('📈 Scaling up resources to meet demand');

    // Simulate scaling up
    await this.scaleUpResources(needed);

    // Wait for resources to be ready
    await this.waitForResources(needed);

    // Allocate resources
    return await this.allocateExistingResources(needed);
  }

  private async scaleUpResources(needed: ResourceRequirements): Promise<void> {
    this.logger.info('📈 Scaling up system resources...');

    // Simulate scaling process
    const scalingSteps = [
      () => this.scaleCPU(needed.cpu),
      () => this.scaleMemory(needed.memory),
      () => this.scaleStorage(needed.storage),
      () => this.scaleNetwork(needed.network),
      () => needed.gpu ? this.scaleGPU(needed.gpu) : Promise.resolve()
    ];

    for (const step of scalingSteps) {
      await step();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate scaling delay
    }

    this.logger.info('✅ Resource scaling complete');
  }

  private async scaleCPU(needed: number): Promise<void> {
    const additionalCPU = Math.max(0, needed - this.currentResources.cpu.available);
    if (additionalCPU > 0) {
      this.currentResources.cpu.total += additionalCPU;
      this.currentResources.cpu.available += additionalCPU;
      this.logger.info(`📈 Scaled CPU by ${additionalCPU} cores`);
    }
  }

  private async scaleMemory(needed: number): Promise<void> {
    const additionalMemory = Math.max(0, needed - this.currentResources.memory.available);
    if (additionalMemory > 0) {
      this.currentResources.memory.total += additionalMemory;
      this.currentResources.memory.available += additionalMemory;
      this.logger.info(`📈 Scaled Memory by ${additionalMemory} MB`);
    }
  }

  private async scaleStorage(needed: number): Promise<void> {
    const additionalStorage = Math.max(0, needed - this.currentResources.storage.available);
    if (additionalStorage > 0) {
      this.currentResources.storage.total += additionalStorage;
      this.currentResources.storage.available += additionalStorage;
      this.logger.info(`📈 Scaled Storage by ${additionalStorage} MB`);
    }
  }

  private async scaleNetwork(needed: number): Promise<void> {
    const additionalNetwork = Math.max(0, needed - this.currentResources.network.available);
    if (additionalNetwork > 0) {
      this.currentResources.network.total += additionalNetwork;
      this.currentResources.network.available += additionalNetwork;
      this.logger.info(`📈 Scaled Network by ${additionalNetwork} Mbps`);
    }
  }

  private async scaleGPU(needed: number): Promise<void> {
    const additionalGPU = Math.max(0, needed - this.currentResources.gpu.available);
    if (additionalGPU > 0) {
      this.currentResources.gpu.total += additionalGPU;
      this.currentResources.gpu.available += additionalGPU;
      this.logger.info(`📈 Scaled GPU by ${additionalGPU} units`);
    }
  }

  private async waitForResources(needed: ResourceRequirements): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let waitedTime = 0;

    while (waitedTime < maxWaitTime) {
      const available = this.getAvailableResources();
      
      if (this.canSatisfy(available, needed)) {
        this.logger.info('✅ Resources are ready for allocation');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitedTime += checkInterval;
    }

    throw new Error('Resources not ready after scaling timeout');
  }

  private async releaseResource(resource: AllocatedResource): Promise<void> {
    switch (resource.type) {
      case 'cpu':
        this.currentResources.cpu.used -= resource.amount;
        this.currentResources.cpu.available += resource.amount;
        break;
      case 'memory':
        this.currentResources.memory.used -= resource.amount;
        this.currentResources.memory.available += resource.amount;
        break;
      case 'storage':
        this.currentResources.storage.used -= resource.amount;
        this.currentResources.storage.available += resource.amount;
        break;
      case 'network':
        this.currentResources.network.used -= resource.amount;
        this.currentResources.network.available += resource.amount;
        break;
      case 'gpu':
        this.currentResources.gpu.used -= resource.amount;
        this.currentResources.gpu.available += resource.amount;
        break;
    }

    this.updateUtilization();
  }

  private updateUtilization(): void {
    this.currentResources.cpu.utilization = (this.currentResources.cpu.used / this.currentResources.cpu.total) * 100;
    this.currentResources.memory.utilization = (this.currentResources.memory.used / this.currentResources.memory.total) * 100;
    this.currentResources.storage.utilization = (this.currentResources.storage.used / this.currentResources.storage.total) * 100;
    this.currentResources.network.utilization = (this.currentResources.network.used / this.currentResources.network.total) * 100;
    this.currentResources.gpu.utilization = (this.currentResources.gpu.used / this.currentResources.gpu.total) * 100;
  }

  private updateCurrentResources(): void {
    this.updateUtilization();
  }

  private calculateOverallUtilization(): number {
    const utilizations = [
      this.currentResources.cpu.utilization,
      this.currentResources.memory.utilization,
      this.currentResources.storage.utilization,
      this.currentResources.network.utilization,
      this.currentResources.gpu.utilization
    ];

    return utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length;
  }

  private async checkScaleDown(): Promise<void> {
    const utilization = this.calculateOverallUtilization();
    
    if (utilization < 30) { // Scale down if utilization is below 30%
      this.logger.info('📉 Scaling down resources due to low utilization');
      await this.scaleDownResources();
    }
  }

  private async scaleDownResources(): Promise<void> {
    // Scale down CPU
    if (this.currentResources.cpu.utilization < 30) {
      const scaleDownAmount = Math.floor(this.currentResources.cpu.total * 0.25);
      this.currentResources.cpu.total -= scaleDownAmount;
      this.currentResources.cpu.available -= scaleDownAmount;
      this.logger.info(`📉 Scaled down CPU by ${scaleDownAmount} cores`);
    }

    // Scale down Memory
    if (this.currentResources.memory.utilization < 30) {
      const scaleDownAmount = Math.floor(this.currentResources.memory.total * 0.25);
      this.currentResources.memory.total -= scaleDownAmount;
      this.currentResources.memory.available -= scaleDownAmount;
      this.logger.info(`📉 Scaled down Memory by ${scaleDownAmount} MB`);
    }

    // Scale down Storage
    if (this.currentResources.storage.utilization < 30) {
      const scaleDownAmount = Math.floor(this.currentResources.storage.total * 0.25);
      this.currentResources.storage.total -= scaleDownAmount;
      this.currentResources.storage.available -= scaleDownAmount;
      this.logger.info(`📉 Scaled down Storage by ${scaleDownAmount} MB`);
    }

    // Scale down Network
    if (this.currentResources.network.utilization < 30) {
      const scaleDownAmount = Math.floor(this.currentResources.network.total * 0.25);
      this.currentResources.network.total -= scaleDownAmount;
      this.currentResources.network.available -= scaleDownAmount;
      this.logger.info(`📉 Scaled down Network by ${scaleDownAmount} Mbps`);
    }

    // Scale down GPU
    if (this.currentResources.gpu.utilization < 30 && this.currentResources.gpu.total > 0) {
      const scaleDownAmount = Math.floor(this.currentResources.gpu.total * 0.25);
      this.currentResources.gpu.total -= scaleDownAmount;
      this.currentResources.gpu.available -= scaleDownAmount;
      this.logger.info(`📉 Scaled down GPU by ${scaleDownAmount} units`);
    }

    this.updateUtilization();
  }

  private startResourceMonitoring(): void {
    if (this.config.enableAutoScaling) {
      this.scalingTimer = setInterval(async () => {
        await this.performHealthCheck();
      }, this.config.scalingThresholds.scaleUpDelay);
    }
  }

  private async performHealthCheck(): Promise<void> {
    this.updateCurrentResources();
    
    const utilization = this.calculateOverallUtilization();
    
    // Check if scaling is needed
    if (utilization > this.config.scalingThresholds.cpuThreshold) {
      this.logger.warn(`⚠️ High resource utilization: ${utilization.toFixed(2)}%`);
      this.emit('resource:high-utilization', { utilization });
    }

    // Emit resource status
    this.emit('resource:status', {
      resources: this.currentResources,
      utilization,
      allocatedResources: this.allocatedResources.size
    });
  }

  private calculateResourceCost(type: string, amount: number): number {
    const costPerUnit: Record<string, number> = {
      cpu: 0.01, // $0.01 per core per hour
      memory: 0.00001, // $0.00001 per MB per hour
      storage: 0.000001, // $0.000001 per MB per hour
      network: 0.0001, // $0.0001 per Mbps per hour
      gpu: 0.1 // $0.1 per GPU unit per hour
    };

    return (costPerUnit[type] || 0) * amount;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

/**
 * Load Balancer for resource distribution
 */
class LoadBalancer {
  private strategy: 'round-robin' | 'least-connections' | 'weighted';
  private roundRobinIndex = 0;

  constructor(strategy: 'round-robin' | 'least-connections' | 'weighted') {
    this.strategy = strategy;
  }

  selectNode(nodes: any[]): any {
    switch (this.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(nodes);
      case 'least-connections':
        return this.selectLeastConnections(nodes);
      case 'weighted':
        return this.selectWeighted(nodes);
      default:
        return nodes[0];
    }
  }

  private selectRoundRobin(nodes: any[]): any {
    if (nodes.length === 0) return null;
    
    const node = nodes[this.roundRobinIndex];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % nodes.length;
    return node;
  }

  private selectLeastConnections(nodes: any[]): any {
    if (nodes.length === 0) return null;
    
    return nodes.reduce((least, current) => {
      return (current.connections || 0) < (least.connections || 0) ? current : least;
    });
  }

  private selectWeighted(nodes: any[]): any {
    if (nodes.length === 0) return null;
    
    // Calculate total weight
    const totalWeight = nodes.reduce((sum, node) => sum + (node.weight || 1), 0);
    
    // Select based on weight
    let random = Math.random() * totalWeight;
    
    for (const node of nodes) {
      random -= (node.weight || 1);
      if (random <= 0) {
        return node;
      }
    }
    
    return nodes[nodes.length - 1];
  }
}
