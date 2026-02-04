/**
 * Event Bus Service
 * Event-driven communication with publishing, subscribing, routing, and persistence
 */

import { EventEmitter } from 'events';
import { 
  DomainEvent, EventHandler, EventFilter, EventAggregation
} from '../shared/types.js';

export interface EventBusConfig {
  maxEventHistory: number;
  persistenceEnabled: boolean;
  aggregationWindowMs: number;
  enableMetrics: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface EventStore {
  saveEvent(event: DomainEvent): Promise<void>;
  getEvents(filter: EventFilter): Promise<DomainEvent[]>;
  getEventById(eventId: string): Promise<DomainEvent | null>;
  deleteEvents(olderThan: number): Promise<number>;
}

export interface EventRouter {
  routeEvent(event: DomainEvent): string[];
  addRoutingRule(rule: RoutingRule): void;
  removeRoutingRule(ruleId: string): void;
}

export interface RoutingRule {
  id: string;
  eventType: string;
  condition: (event: DomainEvent) => boolean;
  targets: string[];
  priority: number;
}

export interface EventBusMetrics {
  totalEvents: number;
  eventsByType: Map<string, number>;
  eventsByAggregate: Map<string, number>;
  averageProcessingTime: number;
  failedEvents: number;
  retryCount: number;
}

export class EventBusService extends EventEmitter {
  private config: EventBusConfig;
  private eventStore: EventStore;
  private eventRouter: EventRouter;
  private subscribers: Map<string, EventHandler[]> = new Map();
  private eventHistory: DomainEvent[] = [];
  private metrics: EventBusMetrics;
  private isRunning = false;

  constructor(config: EventBusConfig) {
    super();
    this.config = config;
    this.eventStore = new InMemoryEventStore();
    this.eventRouter = new EventRouterImpl();
    this.metrics = new EventBusMetricsImpl();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Event Bus started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('Event Bus stopped');
  }

  // Event Publishing & Subscribing
  async publishEvent(event: DomainEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Validate event
      this.validateEvent(event);

      // Add to history
      this.addToHistory(event);

      // Persist if enabled
      if (this.config.persistenceEnabled) {
        await this.eventStore.saveEvent(event);
      }

      // Route event
      const targets = this.eventRouter.routeEvent(event);

      // Publish to subscribers
      await this.publishToTargets(event, targets);

      // Update metrics
      this.updateMetrics(event, Date.now() - startTime, true);

      console.log(`Event published: ${event.type} (${event.id})`);

    } catch (error) {
      this.updateMetrics(event, Date.now() - startTime, false);
      throw error;
    }
  }

  async subscribeToEvent(eventType: string, handler: EventHandler): Promise<string> {
    const handlers = this.subscribers.get(eventType) || [];
    handlers.push(handler);
    this.subscribers.set(eventType, handlers);

    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Subscribed to ${eventType}: ${subscriptionId}`);

    return subscriptionId;
  }

  async unsubscribeFromEvent(eventType: string, handler: EventHandler): Promise<void> {
    const handlers = this.subscribers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.subscribers.set(eventType, handlers);
    }
  }

  // Event Routing & Filtering
  async routeEvent(event: DomainEvent): Promise<string[]> {
    return this.eventRouter.routeEvent(event);
  }

  async filterEvents(criteria: EventFilter): Promise<DomainEvent[]> {
    let events = this.eventHistory;

    // Apply filters
    if (criteria.eventType) {
      events = events.filter(e => e.type === criteria.eventType);
    }

    if (criteria.aggregateType) {
      events = events.filter(e => e.aggregateType === criteria.aggregateType);
    }

    if (criteria.timeRange) {
      events = events.filter(e => 
        e.occurredAt >= criteria.timeRange!.start && 
        e.occurredAt <= criteria.timeRange!.end
      );
    }

    if (criteria.userId) {
      events = events.filter(e => e.metadata.userId === criteria.userId);
    }

    return events;
  }

  // Event Persistence & Replay
  async persistEvent(event: DomainEvent): Promise<void> {
    if (this.config.persistenceEnabled) {
      await this.eventStore.saveEvent(event);
    }
  }

  async replayEvents(fromTimestamp: number): Promise<DomainEvent[]> {
    const filter: EventFilter = {
      timeRange: { start: fromTimestamp, end: Date.now() }
    };
    
    return this.eventStore.getEvents(filter);
  }

  // Event Aggregation & Analytics
  async aggregateEvents(eventType: string, timeWindow: number): Promise<EventAggregation> {
    const now = Date.now();
    const windowStart = now - timeWindow;

    const events = this.eventHistory.filter(e => 
      e.type === eventType && e.occurredAt >= windowStart
    );

    const count = events.length;
    let value: number | undefined;

    // Calculate aggregation based on event data
    if (events.length > 0 && typeof events[0].data === 'object' && 'value' in events[0].data) {
      const values = events
        .map(e => e.data.value as number)
        .filter(v => typeof v === 'number');
      
      if (values.length > 0) {
        value = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }

    return {
      eventType,
      count,
      timeWindow,
      aggregationType: value !== undefined ? 'avg' : 'count',
      value
    };
  }

  // Configuration & Management
  addRoutingRule(rule: RoutingRule): void {
    this.eventRouter.addRoutingRule(rule);
  }

  removeRoutingRule(ruleId: string): void {
    this.eventRouter.removeRoutingRule(ruleId);
  }

  // Metrics & Monitoring
  getMetrics(): EventBusMetrics {
    return { ...this.metrics };
  }

  getEventHistory(limit?: number): DomainEvent[] {
    return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
  }

  getSubscribers(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [eventType, handlers] of this.subscribers) {
      result.set(eventType, handlers.length);
    }
    return result;
  }

  // Private Methods
  private validateEvent(event: DomainEvent): void {
    if (!event.id || !event.type || !event.aggregateId || !event.occurredAt) {
      throw new Error('Invalid event: missing required fields');
    }

    if (typeof event.occurredAt !== 'number' || event.occurredAt <= 0) {
      throw new Error('Invalid event: occurredAt must be a positive number');
    }
  }

  private addToHistory(event: DomainEvent): void {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory.shift();
    }
  }

  private async publishToTargets(event: DomainEvent, targets: string[]): Promise<void> {
    const handlers = this.subscribers.get(event.type) || [];
    
    // Publish to all handlers
    const publishPromises = handlers.map(async (handler, index) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Event handler error for ${event.type}:`, error);
        
        // Retry logic
        if (this.config.retryAttempts > 0) {
          await this.retryEventHandler(event, handler, index);
        }
      }
    });

    await Promise.allSettled(publishPromises);
  }

  private async retryEventHandler(event: DomainEvent, handler: EventHandler, handlerIndex: number): Promise<void> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs * attempt));
        await handler(event);
        this.metrics.retryCount++;
        return;
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          console.error(`Event handler failed after ${attempt} attempts:`, error);
          this.metrics.failedEvents++;
        }
      }
    }
  }

  private updateMetrics(event: DomainEvent, processingTime: number, success: boolean): void {
    this.metrics.totalEvents++;
    
    // Update events by type
    const typeCount = this.metrics.eventsByType.get(event.type) || 0;
    this.metrics.eventsByType.set(event.type, typeCount + 1);
    
    // Update events by aggregate
    const aggregateCount = this.metrics.eventsByAggregate.get(event.aggregateType) || 0;
    this.metrics.eventsByAggregate.set(event.aggregateType, aggregateCount + 1);
    
    // Update processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalEvents - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalEvents;
    
    // Update failed events
    if (!success) {
      this.metrics.failedEvents++;
    }
  }
}

// In-Memory Event Store Implementation
class InMemoryEventStore implements EventStore {
  private events: Map<string, DomainEvent> = new Map();

  async saveEvent(event: DomainEvent): Promise<void> {
    this.events.set(event.id, event);
  }

  async getEvents(filter: EventFilter): Promise<DomainEvent[]> {
    let events = Array.from(this.events.values());

    if (filter.eventType) {
      events = events.filter(e => e.type === filter.eventType);
    }

    if (filter.aggregateType) {
      events = events.filter(e => e.aggregateType === filter.aggregateType);
    }

    if (filter.timeRange) {
      events = events.filter(e => 
        e.occurredAt >= filter.timeRange!.start && 
        e.occurredAt <= filter.timeRange!.end
      );
    }

    if (filter.userId) {
      events = events.filter(e => e.metadata.userId === filter.userId);
    }

    return events.sort((a, b) => b.occurredAt - a.occurredAt);
  }

  async getEventById(eventId: string): Promise<DomainEvent | null> {
    return this.events.get(eventId) || null;
  }

  async deleteEvents(olderThan: number): Promise<number> {
    let deleted = 0;
    for (const [eventId, event] of this.events) {
      if (event.occurredAt < olderThan) {
        this.events.delete(eventId);
        deleted++;
      }
    }
    return deleted;
  }
}

// Event Router Implementation
class EventRouterImpl implements EventRouter {
  private routingRules: Map<string, RoutingRule> = new Map();

  routeEvent(event: DomainEvent): string[] {
    const targets: string[] = [];

    // Find matching routing rules
    for (const rule of this.routingRules.values()) {
      if (rule.eventType === event.type || rule.eventType === '*') {
        try {
          if (rule.condition(event)) {
            targets.push(...rule.targets);
          }
        } catch (error) {
          console.error(`Routing rule error for ${rule.id}:`, error);
        }
      }
    }

    return [...new Set(targets)]; // Remove duplicates
  }

  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.set(rule.id, rule);
  }

  removeRoutingRule(ruleId: string): void {
    this.routingRules.delete(ruleId);
  }
}

// Event Metrics Implementation
class EventBusMetricsImpl implements EventBusMetrics {
  totalEvents = 0;
  eventsByType = new Map<string, number>();
  eventsByAggregate = new Map<string, number>();
  averageProcessingTime = 0;
  failedEvents = 0;
  retryCount = 0;
}

export { EventBusService as default };
