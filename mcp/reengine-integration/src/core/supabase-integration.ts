/**
 * SuperBase Integration
 * Handles authentication, real-time collaboration, and storage for the enhanced system
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import pino from 'pino';
import { defaultIntegrationConfig, realtimeChannels } from '../config/neon-supabase-config.js';

const logger = pino({ level: 'info' });

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'developer';
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  preferences: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationSession {
  id: string;
  workflowId: string;
  userId: string;
  channel: RealtimeChannel;
  activeUsers: Map<string, any>;
  sharedData: Record<string, any>;
  createdAt: Date;
}

export interface StorageFile {
  id: string;
  name: string;
  bucket: string;
  size: number;
  contentType: string;
  publicUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export class SuperBaseIntegration {
  private client: SupabaseClient;
  private realtimeUrl: string;
  private activeChannels = new Map<string, RealtimeChannel>();
  private collaborationSessions = new Map<string, CollaborationSession>();

  constructor() {
    this.client = createClient(
      defaultIntegrationConfig.supabase.url,
      defaultIntegrationConfig.supabase.anonKey
    );
    this.realtimeUrl = defaultIntegrationConfig.supabase.realtimeUrl;
  }

  // Authentication methods
  async authenticateUser(token: string): Promise<{ user: UserProfile; session: any }> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser(token);
      
      if (error) {
        throw new Error(`Authentication failed: ${error.message}`);
      }

      // Get user profile
      const { data: profile } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const userProfile: UserProfile = profile || {
        id: user.id,
        email: user.email!,
        role: 'user',
        subscriptionTier: 'free',
        preferences: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        user: userProfile,
        session: { user, token }
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<{ user: UserProfile; session: any }> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        throw new Error(`Sign up failed: ${error.message}`);
      }

      // Create user profile
      const profile: UserProfile = {
        id: data.user!.id,
        email: data.user!.email!,
        name: metadata?.name,
        role: 'user',
        subscriptionTier: 'free',
        preferences: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.client
        .from('user_profiles')
        .insert({
          user_id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          subscription_tier: profile.subscription_tier,
          preferences: profile.preferences,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt
        });

      return {
        user: profile,
        session: data
      };
    } catch (error) {
      logger.error('Sign up error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.avatar) updateData.avatar = updates.avatar;
      if (updates.preferences) updateData.preferences = updates.preferences;
      if (updates.subscriptionTier) updateData.subscription_tier = updates.subscriptionTier;
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await this.client
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }

      return this.mapRowToUserProfile(data);
    } catch (error) {
      logger.error('Profile update error:', error);
      throw error;
    }
  }

  // Real-time collaboration methods
  async setupRealTimeSession(workflowId: string, userId: string): Promise<CollaborationSession> {
    try {
      const channelName = `workflow:${workflowId}`;
      
      // Check if user has access to this workflow
      const { data: workflow } = await this.client
        .from('user_workflows')
        .select('*')
        .eq('id', workflowId)
        .or(`user_id.eq.${userId},shared_with.cs.{${userId}}`)
        .single();

      if (!workflow) {
        throw new Error('Access denied: Workflow not found or no permission');
      }

      // Create or get existing channel
      let channel = this.activeChannels.get(channelName);
      
      if (!channel) {
        channel = this.client.channel(channelName);
        
        // Set up real-time event handlers
        channel
          .on('broadcast', { event: 'progress_update' }, (payload) => {
            this.handleProgressUpdate(workflowId, payload);
          })
          .on('broadcast', { event: 'insight_generated' }, (payload) => {
            this.handleInsightGenerated(workflowId, payload);
          })
          .on('broadcast', { event: 'user_joined' }, (payload) => {
            this.handleUserJoined(workflowId, payload);
          })
          .on('broadcast', { event: 'user_left' }, (payload) => {
            this.handleUserLeft(workflowId, payload);
          })
          .on('broadcast', { event: 'cursor_move' }, (payload) => {
            this.handleCursorMove(workflowId, payload);
          });

        this.activeChannels.set(channelName, channel);
      }

      // Create collaboration session
      const session: CollaborationSession = {
        id: `${workflowId}-${userId}`,
        workflowId,
        userId,
        channel,
        activeUsers: new Map(),
        sharedData: {},
        createdAt: new Date()
      };

      this.collaborationSessions.set(session.id, session);

      // Notify other users that this user joined
      await channel.send({
        type: 'broadcast',
        event: 'user_joined',
        data: {
          userId,
          userName: await this.getUserName(userId),
          timestamp: new Date().toISOString()
        }
      });

      return session;
    } catch (error) {
      logger.error('Real-time session setup error:', error);
      throw error;
    }
  }

  async broadcastProgress(workflowId: string, progress: number, stage: string, details?: any) {
    try {
      const channelName = `workflow:${workflowId}`;
      const channel = this.activeChannels.get(channelName);
      
      if (!channel) {
        logger.warn(`No active channel for workflow ${workflowId}`);
        return;
      }

      await channel.send({
        type: 'broadcast',
        event: 'progress_update',
        data: {
          progress,
          stage,
          details,
          timestamp: new Date().toISOString()
        }
      });

      // Update database
      await this.client
        .from('user_workflows')
        .update({
          status: stage === 'completed' ? 'completed' : 'running',
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

    } catch (error) {
      logger.error('Broadcast progress error:', error);
      throw error;
    }
  }

  async broadcastInsight(workflowId: string, insight: any) {
    try {
      const channelName = `workflow:${workflowId}`;
      const channel = this.activeChannels.get(channelName);
      
      if (!channel) {
        logger.warn(`No active channel for workflow ${workflowId}`);
        return;
      }

      await channel.send({
        type: 'broadcast',
        event: 'insight_generated',
        data: {
          insight,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Broadcast insight error:', error);
      throw error;
    }
  }

  // Storage methods
  async uploadFile(bucket: string, filePath: string, file: Buffer, metadata?: Record<string, any>): Promise<StorageFile> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: metadata?.contentType || 'application/octet-stream',
          upsert: true
        });

      if (error) {
        throw new Error(`File upload failed: ${error.message}`);
      }

      // Get public URL if bucket is public
      const { data: { publicUrl } } = this.client.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const storageFile: StorageFile = {
        id: data.id,
        name: filePath.split('/').pop() || filePath,
        bucket,
        size: file.length,
        contentType: metadata?.contentType || 'application/octet-stream',
        publicUrl,
        metadata,
        createdAt: new Date().toISOString()
      };

      return storageFile;
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  async uploadListingImages(listingId: string, images: Buffer[]): Promise<StorageFile[]> {
    const uploadedFiles: StorageFile[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const fileName = `listings/${listingId}/image_${i}.jpg`;
      
      try {
        const file = await this.uploadFile('listing-images', fileName, images[i], {
          contentType: 'image/jpeg'
        });
        uploadedFiles.push(file);
      } catch (error) {
        logger.error(`Failed to upload image ${i}:`, error);
        // Continue with other images
      }
    }
    
    return uploadedFiles;
  }

  async getFileUrl(bucket: string, filePath: string): Promise<string> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        throw new Error(`Failed to get file URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Get file URL error:', error);
      throw error;
    }
  }

  // Market alerts and watches
  async createMarketWatch(userId: string, name: string, criteria: Record<string, any>): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('market_watches')
        .insert({
          user_id: userId,
          name,
          criteria,
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Market watch creation failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Create market watch error:', error);
      throw error;
    }
  }

  async createMarketAlert(userId: string, watchId: string, listingId: string, alertType: string, message: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('market_alerts')
        .insert({
          user_id: userId,
          watch_id: watchId,
          listing_id: listingId,
          alert_type: alertType,
          message,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Market alert creation failed: ${error.message}`);
      }

      // Send real-time notification
      await this.client.channel(`user:${userId}`).send({
        type: 'broadcast',
        event: 'new_alert',
        data: {
          alertId: data.id,
          watchId,
          listingId,
          alertType,
          message,
          timestamp: new Date().toISOString()
        }
      });

      return data;
    } catch (error) {
      logger.error('Create market alert error:', error);
      throw error;
    }
  }

  // Utility methods
  private async getUserName(userId: string): Promise<string> {
    try {
      const { data } = await this.client
        .from('user_profiles')
        .select('name, email')
        .eq('user_id', userId)
        .single();

      return data?.name || data?.email || 'Anonymous User';
    } catch (error) {
      return 'Unknown User';
    }
  }

  private mapRowToUserProfile(row: any): UserProfile {
    return {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar: row.avatar,
      role: row.role,
      subscriptionTier: row.subscription_tier,
      preferences: row.preferences,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private handleProgressUpdate(workflowId: string, payload: any): void {
    // Handle progress update event
    logger.info(`Progress update for workflow ${workflowId}:`, payload);
  }

  private handleInsightGenerated(workflowId: string, payload: any): void {
    // Handle insight generation event
    logger.info(`Insight generated for workflow ${workflowId}:`, payload);
  }

  private handleUserJoined(workflowId: string, payload: any): void {
    // Handle user joined event
    logger.info(`User joined workflow ${workflowId}:`, payload);
  }

  private handleUserLeft(workflowId: string, payload: any): void {
    // Handle user left event
    logger.info(`User left workflow ${workflowId}:`, payload);
  }

  private handleCursorMove(workflowId: string, payload: any): void {
    // Handle cursor move event
    logger.debug(`Cursor move in workflow ${workflowId}:`, payload);
  }

  // Cleanup methods
  async cleanupSession(sessionId: string): Promise<void> {
    try {
      const session = this.collaborationSessions.get(sessionId);
      if (session) {
        // Notify other users that this user is leaving
        await session.channel.send({
          type: 'broadcast',
          event: 'user_left',
          data: {
            userId: session.userId,
            timestamp: new Date().toISOString()
          }
        });

        // Unsubscribe from channel
        await session.channel.unsubscribe();
        
        // Clean up
        this.activeChannels.delete(`workflow:${session.workflowId}`);
        this.collaborationSessions.delete(sessionId);
      }
    } catch (error) {
      logger.error('Session cleanup error:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up all active channels
      for (const [name, channel] of this.activeChannels) {
        await channel.unsubscribe();
      }
      
      this.activeChannels.clear();
      this.collaborationSessions.clear();
      
      logger.info('SuperBase integration cleaned up');
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; services: any }> {
    try {
      // Test database connection
      const { data, error } = await this.client
        .from('user_profiles')
        .select('count')
        .limit(1);

      // Test storage
      const { data: storageData, error: storageError } = await this.client.storage
        .from('listing-images')
        .list('', { limit: 1 });

      const services = {
        database: error ? 'unhealthy' : 'healthy',
        storage: storageError ? 'unhealthy' : 'healthy',
        realtime: this.activeChannels.size > 0 ? 'active' : 'idle',
        activeChannels: this.activeChannels.size,
        collaborationSessions: this.collaborationSessions.size
      };

      return {
        status: error || storageError ? 'degraded' : 'healthy',
        timestamp: new Date().toISOString(),
        services
      };
    } catch (error) {
      logger.error('SuperBase health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: { error: error.message }
      };
    }
  }
}
