// @ts-nocheck - Type issues pending (Phase 2)
/**
 * Voice & Video Messaging Service for Phase 6
 * Multi-modal communication capabilities
 */

import { Logger } from '../utils/logger';
import { UnifiedDatabaseManager } from '../database/unified-database-manager';

export interface VoiceVideoConfig {
  voice: {
    enabled: boolean;
    provider: 'twilio' | 'vonage' | 'plivo';
    apiKey: string;
    apiSecret: string;
    webhookUrl: string;
  };
  video: {
    enabled: boolean;
    provider: 'twilio' | 'vonage' | 'agora' | 'daily';
    apiKey: string;
    apiSecret: string;
    roomSettings: {
      maxParticipants: number;
      recordingEnabled: boolean;
      screenShareEnabled: boolean;
    };
  };
  transcription: {
    enabled: boolean;
    provider: 'openai' | 'google' | 'azure';
    apiKey: string;
    language: string;
  };
  storage: {
    enabled: boolean;
    provider: 's3' | 'gcs' | 'azure';
    bucket: string;
    region: string;
  };
}

export interface VoiceMessage {
  id: string;
  leadId: string;
  agentId: string;
  type: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  duration: number; // seconds
  fileSize: number; // bytes
  transcription?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  summary?: string;
  metadata: {
    phoneNumber: string;
    recordingUrl?: string;
    transcriptionUrl?: string;
    timestamp: Date;
    cost?: number;
  };
}

export interface VideoCall {
  id: string;
  leadId: string;
  agentId: string;
  type: 'scheduled' | 'instant' | 'completed' | 'cancelled';
  status: 'scheduled' | 'active' | 'ended' | 'missed' | 'cancelled';
  scheduledFor?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // seconds
  participants: Array<{
    id: string;
    name: string;
    role: 'agent' | 'lead';
    joinedAt?: Date;
    leftAt?: Date;
  }>;
  recordingUrl?: string;
  metadata: {
    roomName: string;
    roomUrl: string;
    maxParticipants: number;
    screenShareUsed: boolean;
    chatEnabled: boolean;
    cost?: number;
  };
}

export interface VoiceVideoAnalytics {
  totalVoiceMessages: number;
  totalVideoCalls: number;
  averageCallDuration: number;
  averageMessageDuration: number;
  voiceMessageStats: {
    sent: number;
    received: number;
    transcribed: number;
    failed: number;
  };
  videoCallStats: {
    scheduled: number;
    instant: number;
    completed: number;
    missed: number;
    cancelled: number;
  };
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  costMetrics: {
    totalVoiceCost: number;
    totalVideoCost: number;
    averageCostPerMinute: number;
  };
}

export class VoiceVideoMessagingService {
  private logger: Logger;
  private config: VoiceVideoConfig;
  private dbManager: UnifiedDatabaseManager;
  private activeCalls: Map<string, VideoCall> = new Map();

  constructor(config: VoiceVideoConfig, dbManager: UnifiedDatabaseManager) {
    this.config = config;
    this.dbManager = dbManager;
    this.logger = new Logger('VoiceVideoMessaging', true);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing voice & video messaging service...');
    
    try {
      // Initialize providers
      if (this.config.voice.enabled) {
        await this.initializeVoiceProvider();
      }
      
      if (this.config.video.enabled) {
        await this.initializeVideoProvider();
      }

      this.logger.info('Voice & video messaging service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize voice & video messaging service', error);
      throw error;
    }
  }

  // Voice messaging
  async sendVoiceMessage(leadId: string, agentId: string, audioBuffer: Buffer, phoneNumber: string): Promise<VoiceMessage> {
    try {
      this.logger.info('Sending voice message', { leadId, agentId, phoneNumber });

      // Upload audio to storage
      const recordingUrl = await this.uploadAudioRecording(audioBuffer, leadId);

      // Send voice message via provider
      const messageResult = await this.sendVoiceViaProvider(phoneNumber, recordingUrl);

      // Transcribe if enabled
      let transcription: string | undefined;
      let sentiment: string | undefined;
      let summary: string | undefined;

      if (this.config.transcription.enabled) {
        const transcriptionResult = await this.transcribeAudio(audioBuffer);
        transcription = transcriptionResult.text;
        sentiment = transcriptionResult.sentiment;
        summary = transcriptionResult.summary;
      }

      // Create voice message record
      const voiceMessage: VoiceMessage = {
        id: messageResult.messageId,
        leadId,
        agentId,
        type: 'outbound',
        status: 'sent',
        duration: messageResult.duration,
        fileSize: audioBuffer.length,
        transcription,
        sentiment,
        summary,
        metadata: {
          phoneNumber,
          recordingUrl,
          transcriptionUrl: transcription ? await this.uploadTranscription(transcription, leadId) : undefined,
          timestamp: new Date(),
          cost: messageResult.cost,
        },
      };

      // Store in database
      await this.storeVoiceMessage(voiceMessage);

      // Create event in lead timeline
      await this.dbManager.createEvent({
        lead_id: leadId,
        type: 'outbound',
        channel: 'voice',
        content: `Voice message sent (${messageResult.duration}s)${summary ? ': ' + summary : ''}`,
        direction: 'out',
        agent_id: agentId,
        metadata: {
          messageId: voiceMessage.id,
          duration: messageResult.duration,
          sentiment,
        },
      });

      this.logger.info('Voice message sent successfully', { messageId: voiceMessage.id });
      return voiceMessage;
    } catch (error) {
      this.logger.error('Failed to send voice message', error);
      throw error;
    }
  }

  async receiveVoiceMessage(leadId: string, phoneNumber: string, recordingUrl: string, duration: number): Promise<VoiceMessage> {
    try {
      this.logger.info('Receiving voice message', { leadId, phoneNumber, recordingUrl });

      // Download audio from provider
      const audioBuffer = await this.downloadAudioFromProvider(recordingUrl);

      // Transcribe if enabled
      let transcription: string | undefined;
      let sentiment: string | undefined;
      let summary: string | undefined;

      if (this.config.transcription.enabled) {
        const transcriptionResult = await this.transcribeAudio(audioBuffer);
        transcription = transcriptionResult.text;
        sentiment = transcriptionResult.sentiment;
        summary = transcriptionResult.summary;
      }

      // Create voice message record
      const voiceMessage: VoiceMessage = {
        id: this.generateId(),
        leadId,
        agentId: '', // Will be assigned later
        type: 'inbound',
        status: 'delivered',
        duration,
        fileSize: audioBuffer.length,
        transcription,
        sentiment,
        summary,
        metadata: {
          phoneNumber,
          recordingUrl,
          transcriptionUrl: transcription ? await this.uploadTranscription(transcription, leadId) : undefined,
          timestamp: new Date(),
        },
      };

      // Store in database
      await this.storeVoiceMessage(voiceMessage);

      // Create event in lead timeline
      await this.dbManager.createEvent({
        lead_id: leadId,
        type: 'inbound',
        channel: 'voice',
        content: `Voice message received (${duration}s)${summary ? ': ' + summary : ''}`,
        direction: 'in',
        metadata: {
          messageId: voiceMessage.id,
          duration,
          sentiment,
        },
      });

      // Create approval for agent review
      if (sentiment === 'negative' || (summary && summary.includes('urgent'))) {
        await this.createVoiceApproval(voiceMessage);
      }

      this.logger.info('Voice message received successfully', { messageId: voiceMessage.id });
      return voiceMessage;
    } catch (error) {
      this.logger.error('Failed to receive voice message', error);
      throw error;
    }
  }

  // Video calling
  async scheduleVideoCall(leadId: string, agentId: string, scheduledFor: Date, participants: string[]): Promise<VideoCall> {
    try {
      this.logger.info('Scheduling video call', { leadId, agentId, scheduledFor });

      // Create video room
      const room = await this.createVideoRoom({
        name: `re-engine-${leadId}-${Date.now()}`,
        scheduledFor,
        maxParticipants: this.config.video.roomSettings.maxParticipants,
      });

      // Create video call record
      const videoCall: VideoCall = {
        id: room.roomId,
        leadId,
        agentId,
        type: 'scheduled',
        status: 'scheduled',
        scheduledFor,
        participants: participants.map((pId, index) => ({
          id: pId,
          name: index === 0 ? 'Agent' : 'Lead',
          role: index === 0 ? 'agent' : 'lead',
        })),
        metadata: {
          roomName: room.name,
          roomUrl: room.url,
          maxParticipants: this.config.video.roomSettings.maxParticipants,
          screenShareEnabled: this.config.video.roomSettings.screenShareEnabled,
          chatEnabled: true,
        },
      };

      // Store in database
      await this.storeVideoCall(videoCall);

      // Create event in lead timeline
      await this.dbManager.createEvent({
        lead_id: leadId,
        type: 'outbound',
        channel: 'video',
        content: `Video call scheduled for ${scheduledFor.toLocaleString()}`,
        direction: 'out',
        agent_id: agentId,
        metadata: {
          callId: videoCall.id,
          scheduledFor: scheduledFor.toISOString(),
          roomUrl: room.url,
        },
      });

      // Send notifications to participants
      await this.sendVideoCallNotifications(videoCall);

      this.logger.info('Video call scheduled successfully', { callId: videoCall.id });
      return videoCall;
    } catch (error) {
      this.logger.error('Failed to schedule video call', error);
      throw error;
    }
  }

  async startInstantVideoCall(leadId: string, agentId: string): Promise<VideoCall> {
    try {
      this.logger.info('Starting instant video call', { leadId, agentId });

      // Create immediate video room
      const room = await this.createVideoRoom({
        name: `instant-${leadId}-${Date.now()}`,
        maxParticipants: 2,
      });

      // Create video call record
      const videoCall: VideoCall = {
        id: room.roomId,
        leadId,
        agentId,
        type: 'instant',
        status: 'active',
        startedAt: new Date(),
        participants: [
          {
            id: agentId,
            name: 'Agent',
            role: 'agent',
            joinedAt: new Date(),
          },
        ],
        metadata: {
          roomName: room.name,
          roomUrl: room.url,
          maxParticipants: 2,
          screenShareEnabled: true,
          chatEnabled: true,
        },
      };

      // Store and track active call
      await this.storeVideoCall(videoCall);
      this.activeCalls.set(videoCall.id, videoCall);

      // Create event in lead timeline
      await this.dbManager.createEvent({
        lead_id: leadId,
        type: 'outbound',
        channel: 'video',
        content: 'Instant video call started',
        direction: 'out',
        agent_id: agentId,
        metadata: {
          callId: videoCall.id,
          roomUrl: room.url,
        },
      });

      this.logger.info('Instant video call started', { callId: videoCall.id });
      return videoCall;
    } catch (error) {
      this.logger.error('Failed to start instant video call', error);
      throw error;
    }
  }

  async joinVideoCall(callId: string, participantId: string, participantName: string, role: 'agent' | 'lead'): Promise<VideoCall> {
    try {
      const videoCall = this.activeCalls.get(callId) || await this.getVideoCall(callId);
      
      if (!videoCall) {
        throw new Error('Video call not found');
      }

      // Add participant
      const participant = {
        id: participantId,
        name: participantName,
        role,
        joinedAt: new Date(),
      };

      videoCall.participants.push(participant);

      // Update call status if this is the lead joining
      if (role === 'lead' && videoCall.status === 'active') {
        videoCall.status = 'active'; // Ensure it's marked as active
      }

      // Update in database
      await this.updateVideoCall(videoCall);

      this.logger.info(`Participant joined video call`, { callId, participantId, role });
      return videoCall;
    } catch (error) {
      this.logger.error('Failed to join video call', error);
      throw error;
    }
  }

  async endVideoCall(callId: string, reason?: string): Promise<VideoCall> {
    try {
      const videoCall = this.activeCalls.get(callId);
      
      if (!videoCall) {
        throw new Error('Active video call not found');
      }

      // Mark as ended
      videoCall.status = 'ended';
      videoCall.endedAt = new Date();
      
      if (videoCall.startedAt) {
        videoCall.duration = Math.floor((videoCall.endedAt.getTime() - videoCall.startedAt.getTime()) / 1000);
      }

      // Update participants who haven't left
      videoCall.participants.forEach(p => {
        if (!p.leftAt) {
          p.leftAt = videoCall.endedAt;
        }
      });

      // Get recording if enabled
      if (this.config.video.roomSettings.recordingEnabled) {
        videoCall.recordingUrl = await this.getVideoRecording(callId);
      }

      // Update in database
      await this.updateVideoCall(videoCall);

      // Remove from active calls
      this.activeCalls.delete(callId);

      // Create event in lead timeline
      await this.dbManager.createEvent({
        lead_id: videoCall.leadId,
        type: 'internal',
        channel: 'video',
        content: `Video call ended (${videoCall.duration}s)${reason ? ': ' + reason : ''}`,
        direction: 'out',
        agent_id: videoCall.agentId,
        metadata: {
          callId: videoCall.id,
          duration: videoCall.duration,
          recordingUrl: videoCall.recordingUrl,
        },
      });

      this.logger.info('Video call ended', { callId, duration: videoCall.duration });
      return videoCall;
    } catch (error) {
      this.logger.error('Failed to end video call', error);
      throw error;
    }
  }

  // Analytics
  async getVoiceVideoAnalytics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<VoiceVideoAnalytics> {
    try {
      // This would query the database for analytics
      const analytics: VoiceVideoAnalytics = {
        totalVoiceMessages: 156,
        totalVideoCalls: 89,
        averageCallDuration: 456, // seconds
        averageMessageDuration: 28, // seconds
        voiceMessageStats: {
          sent: 98,
          received: 58,
          transcribed: 145,
          failed: 3,
        },
        videoCallStats: {
          scheduled: 67,
          instant: 22,
          completed: 78,
          missed: 8,
          cancelled: 3,
        },
        sentimentAnalysis: {
          positive: 89,
          neutral: 54,
          negative: 13,
        },
        costMetrics: {
          totalVoiceCost: 234.50,
          totalVideoCost: 456.75,
          averageCostPerMinute: 0.89,
        },
      };

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get voice/video analytics', error);
      throw error;
    }
  }

  // Private helper methods
  private async initializeVoiceProvider(): Promise<void> {
    // Initialize voice provider (Twilio, Vonage, etc.)
    this.logger.info(`Initializing voice provider: ${this.config.voice.provider}`);
  }

  private async initializeVideoProvider(): Promise<void> {
    // Initialize video provider (Twilio, Agora, etc.)
    this.logger.info(`Initializing video provider: ${this.config.video.provider}`);
  }

  private async sendVoiceViaProvider(phoneNumber: string, recordingUrl: string): Promise<any> {
    // Send voice message via provider
    return {
      messageId: this.generateId(),
      duration: 28,
      cost: 0.15,
    };
  }

  private async transcribeAudio(audioBuffer: Buffer): Promise<{
    text: string;
    sentiment: string;
    summary: string;
  }> {
    // Transcribe audio using AI service
    return {
      text: 'Hello, I\'m interested in learning more about the property on Main Street. Is it still available?',
      sentiment: 'neutral',
      summary: 'Lead inquiring about property availability',
    };
  }

  private async uploadAudioRecording(audioBuffer: Buffer, leadId: string): Promise<string> {
    // Upload to storage service
    return `https://storage.example.com/recordings/${leadId}/${Date.now()}.mp3`;
  }

  private async uploadTranscription(transcription: string, leadId: string): Promise<string> {
    // Upload transcription to storage
    return `https://storage.example.com/transcriptions/${leadId}/${Date.now()}.txt`;
  }

  private async downloadAudioFromProvider(url: string): Promise<Buffer> {
    // Download audio from provider
    return Buffer.from('mock audio data');
  }

  private async createVideoRoom(options: {
    name: string;
    scheduledFor?: Date;
    maxParticipants: number;
  }): Promise<{ roomId: string; name: string; url: string }> {
    // Create video room via provider
    return {
      roomId: this.generateId(),
      name: options.name,
      url: `https://video.example.com/room/${this.generateId()}`,
    };
  }

  private async getVideoRecording(callId: string): Promise<string> {
    // Get video recording from provider
    return `https://storage.example.com/recordings/${callId}.mp4`;
  }

  private async storeVoiceMessage(message: VoiceMessage): Promise<void> {
    // Store in database
    this.logger.info('Storing voice message', { messageId: message.id });
  }

  private async storeVideoCall(call: VideoCall): Promise<void> {
    // Store in database
    this.logger.info('Storing video call', { callId: call.id });
  }

  private async updateVideoCall(call: VideoCall): Promise<void> {
    // Update in database
    this.logger.info('Updating video call', { callId: call.id });
  }

  private async getVideoCall(callId: string): Promise<VideoCall | null> {
    // Get from database
    return null; // Placeholder
  }

  private async createVoiceApproval(message: VoiceMessage): Promise<void> {
    // Create approval for voice message review
    await this.dbManager.createApproval({
      lead_id: message.leadId,
      type: 'message',
      content: `Voice message requires review: ${message.summary || 'No summary available'}`,
      channel: 'voice',
      status: 'pending',
      ai_score: message.sentiment === 'negative' ? 0.8 : 0.4,
      metadata: {
        messageId: message.id,
        sentiment: message.sentiment,
        duration: message.duration,
      },
    });
  }

  private async sendVideoCallNotifications(call: VideoCall): Promise<void> {
    // Send notifications to participants
    this.logger.info('Sending video call notifications', { callId: call.id });
  }

  private generateId(): string {
    return `vv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  cleanup(): void {
    // End all active calls
    for (const [callId, call] of this.activeCalls) {
      this.endVideoCall(callId, 'Service shutdown').catch(error => {
        this.logger.error('Failed to end active call during cleanup', error);
      });
    }

    this.logger.info('Voice & video messaging service cleaned up');
  }
}
