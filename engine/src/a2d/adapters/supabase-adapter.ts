/**
 * Supabase Adapter - Production-ready Supabase operations
 * Follows RE Engine safety invariants and production rules
 * Replaces CSVAdapter with cloud-native database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../database/supabase.types.js';
import { logSystemEvent, logError } from '../../observability/logger.js';

export interface SupabaseAdapterOptions {
  client: SupabaseClient<Database, 'public'>;
}

export interface WriteResult {
  success: boolean;
  recordsWritten: number;
  error?: string;
}

export interface ReadResult<T> {
  success: boolean;
  records: T[];
  error?: string;
}

export interface QueryResult<T> {
  success: boolean;
  data: T[];
  total?: number;
  error?: string;
}

export interface FilterOptions {
  eq?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  gt?: Record<string, unknown>;
  gte?: Record<string, unknown>;
  lt?: Record<string, unknown>;
  lte?: Record<string, unknown>;
  like?: Record<string, unknown>;
  ilike?: Record<string, unknown>;
  is?: Record<string, unknown>;
}

export class SupabaseAdapter {
  private client: SupabaseClient<Database, 'public'>;

  constructor(options: SupabaseAdapterOptions) {
    this.client = options.client;
    logSystemEvent('supabase-adapter-initialized', 'info');
  }

  async read<T>(
    table: keyof Database['public']['Tables'],
    filters?: FilterOptions,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: {
        column: string;
        ascending?: boolean;
      }[];
      select?: string;
    }
  ): Promise<ReadResult<T>> {
    try {
      let query = this.client.from(table).select(options?.select || '*');

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Apply ordering
      if (options?.orderBy) {
        options.orderBy.forEach(order => {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        });
      }

      // Apply pagination
      if (options?.limit) {
        if (options?.offset !== undefined) {
          query = query.range(options.offset, options.offset + options.limit - 1);
        } else {
          query = query.limit(options.limit);
        }
      }

      const result = await query;

      if (result.error) {
        logError(result.error as Error, 'supabase-adapter-read-failed', { table });
        return { success: false, records: [], error: result.error.message };
      }

      logSystemEvent('supabase-adapter-read-success', 'info', {
        table,
        count: result.data?.length || 0
      });

      return { success: true, records: (result.data || []) as T[] };
    } catch (error) {
      logError(error as Error, 'supabase-adapter-read-error', { table });
      return {
        success: false,
        records: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async write<T>(
    table: keyof Database['public']['Tables'],
    records: Partial<T>[]
  ): Promise<WriteResult> {
    try {
      const { data, error } = await this.client
        .from(table)
        .insert(records as any)
        .select();

      if (error) {
        logError(error as any as Error, 'supabase-adapter-write-failed', { table });
        return { success: false, recordsWritten: 0, error: error.message };
      }

      logSystemEvent('supabase-adapter-write-success', 'info', {
        table,
        count: records.length
      });

      return { success: true, recordsWritten: (data as any[])?.length || records.length };
    } catch (error) {
      logError(error as Error, 'supabase-adapter-write-error', { table });
      return {
        success: false,
        recordsWritten: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async update<T>(
    table: keyof Database['public']['Tables'],
    filters: FilterOptions,
    updates: Partial<T>
  ): Promise<WriteResult> {
    try {
      let query = (this.client.from(table) as any).update(updates);

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { data, error } = await (query as any).select();

      if (error) {
        logError(error as any as Error, 'supabase-adapter-update-failed', { table });
        return { success: false, recordsWritten: 0, error: error.message };
      }

      logSystemEvent('supabase-adapter-update-success', 'info', {
        table,
        count: (data as any[])?.length || 0
      });

      return { success: true, recordsWritten: (data as any[])?.length || 0 };
    } catch (error) {
      logError(error as Error, 'supabase-adapter-update-error', { table });
      return {
        success: false,
        recordsWritten: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async delete(
    table: keyof Database['public']['Tables'],
    filters: FilterOptions
  ): Promise<WriteResult> {
    try {
      let query = this.client.from(table).delete();

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { data, error } = await (query as any).select();

      if (error) {
        logError(error as any as Error, 'supabase-adapter-delete-failed', { table });
        return { success: false, recordsWritten: 0, error: error.message };
      }

      logSystemEvent('supabase-adapter-delete-success', 'info', {
        table,
        count: (data as any[])?.length || 0
      });

      return { success: true, recordsWritten: (data as any[])?.length || 0 };
    } catch (error) {
      logError(error as Error, 'supabase-adapter-delete-error', { table });
      return {
        success: false,
        recordsWritten: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async upsert<T>(
    table: keyof Database['public']['Tables'],
    records: Partial<T>[],
    onConflict?: string
  ): Promise<WriteResult> {
    try {
      let query = this.client.from(table).upsert(records as any);

      if (onConflict) {
        query = (query as any).onConflict(onConflict);
      }

      const { data, error } = await (query as any).select();

      if (error) {
        logError(error as any as Error, 'supabase-adapter-upsert-failed', { table });
        return { success: false, recordsWritten: 0, error: error.message };
      }

      logSystemEvent('supabase-adapter-upsert-success', 'info', {
        table,
        count: records.length
      });

      return { success: true, recordsWritten: (data as any[])?.length || records.length };
    } catch (error) {
      logError(error as Error, 'supabase-adapter-upsert-error', { table });
      return {
        success: false,
        recordsWritten: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async count(
    table: keyof Database['public']['Tables'],
    filters?: FilterOptions
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      let query = this.client.from(table).select('*', { count: 'exact', head: true });

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { data, error, count } = await query;

      if (error) {
        logError(error as Error, 'supabase-adapter-count-failed', { table });
        return { success: false, count: 0, error: error.message };
      }

      return { success: true, count: count || 0 };
    } catch (error) {
      logError(error as Error, 'supabase-adapter-count-error', { table });
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async exists(
    table: keyof Database['public']['Tables'],
    filters: FilterOptions
  ): Promise<boolean> {
    try {
      const result = await this.count(table, filters);
      return result.success && result.count > 0;
    } catch (error) {
      logError(error as Error, 'supabase-adapter-exists-error', { table });
      return false;
    }
  }

  // Real-time subscription support
  subscribeToChanges(
    table: keyof Database['public']['Tables'],
    callback: (payload: {
      event: 'INSERT' | 'UPDATE' | 'DELETE';
      schema: string;
      table: string;
      new?: Record<string, unknown>;
      old?: Record<string, unknown>;
    }) => void
  ) {
    const subscription = this.client
      .channel(`${table}-changes`)
      .on('postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: table as string
        } as any,
        callback as any
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          logSystemEvent('supabase-adapter-subscription-active', 'info', { table });
        } else if (status === 'CHANNEL_ERROR') {
          logError(new Error(`Subscription error for table ${table}`), 'supabase-adapter-subscription-error');
        }
      });

    return subscription;
  }

  // Transaction support
  async transaction<T>(
    operations: Array<() => Promise<unknown>>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      // Supabase handles transactions automatically for single operations
      // For complex transactions, we'll execute operations sequentially
      const results: unknown[] = [];

      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }

      logSystemEvent('supabase-adapter-transaction-success', 'info', {
        operationCount: operations.length
      });

      return { success: true, data: results as T };
    } catch (error) {
      logError(error as Error, 'supabase-adapter-transaction-failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private applyFilters(
    query: any,
    filters: FilterOptions
  ): any {
    // Equality filters
    if (filters.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // IN filters
    if (filters.in) {
      Object.entries(filters.in).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          query = query.in(key, value);
        }
      });
    }

    // Greater than filters
    if (filters.gt) {
      Object.entries(filters.gt).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.gt(key, value);
        }
      });
    }

    // Greater than or equal filters
    if (filters.gte) {
      Object.entries(filters.gte).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.gte(key, value);
        }
      });
    }

    // Less than filters
    if (filters.lt) {
      Object.entries(filters.lt).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.lt(key, value);
        }
      });
    }

    // Less than or equal filters
    if (filters.lte) {
      Object.entries(filters.lte).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.lte(key, value);
        }
      });
    }

    // LIKE filters
    if (filters.like) {
      Object.entries(filters.like).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.like(key, value);
        }
      });
    }

    // ILIKE filters (case-insensitive)
    if (filters.ilike) {
      Object.entries(filters.ilike).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.ilike(key, value);
        }
      });
    }

    // IS filters (for NULL checks)
    if (filters.is) {
      Object.entries(filters.is).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.is(key, value);
        }
      });
    }

    return query;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('leads')
        .select('lead_id')
        .limit(1);

      return !error;
    } catch (error) {
      logError(error as Error, 'supabase-adapter-health-check-failed');
      return false;
    }
  }
}
