/**
 * Voice & Video Webhook Router for Phase 6.5
 * Handles Twilio callbacks for call status, recordings, and video room events
 */

import { Router, Request, Response } from 'express';
import { VoiceVideoMessagingService } from '../communications/voice-video-messaging.service.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('VoiceVideoWebhooks', true);

export function createVoiceVideoWebhookRouter(voiceVideoService: VoiceVideoMessagingService): Router {
    const router = Router();

    /**
     * POST /api/webhooks/voice/status
     * Twilio voice call status callback
     */
    router.post('/voice/status', async (req: Request, res: Response) => {
        try {
            const {
                CallSid,
                CallStatus,
                CallDuration,
                From,
                To,
                Direction,
                RecordingUrl,
                RecordingSid
            } = req.body;

            logger.info('Voice status webhook received', { CallSid, CallStatus, CallDuration });

            // Handle different call statuses
            switch (CallStatus) {
                case 'completed':
                    logger.info(`Call ${CallSid} completed after ${CallDuration} seconds`);
                    // Update call record in database if needed
                    break;
                case 'busy':
                case 'no-answer':
                case 'failed':
                    logger.warn(`Call ${CallSid} ended with status: ${CallStatus}`);
                    break;
                case 'in-progress':
                    logger.info(`Call ${CallSid} is now in progress`);
                    break;
                default:
                    logger.info(`Call ${CallSid} status: ${CallStatus}`);
            }

            // Acknowledge webhook
            res.status(200).send('<Response></Response>');
        } catch (error) {
            logger.error('Voice status webhook error', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    });

    /**
     * POST /api/webhooks/voice/incoming
     * Handle incoming voice calls with TwiML
     */
    router.post('/voice/incoming', async (req: Request, res: Response) => {
        try {
            const { From, To, CallSid } = req.body;

            logger.info('Incoming call received', { From, To, CallSid });

            // Return TwiML for IVR menu
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, you've reached RE Engine Real Estate Services.</Say>
  <Gather numDigits="1" action="/api/webhooks/voice/menu" method="POST">
    <Say voice="alice">Press 1 to speak with an agent. Press 2 to leave a voicemail.</Say>
  </Gather>
  <Say voice="alice">We didn't receive any input. Goodbye.</Say>
</Response>`;

            res.type('text/xml').send(twiml);
        } catch (error) {
            logger.error('Incoming call webhook error', error);
            res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
        }
    });

    /**
     * POST /api/webhooks/voice/menu
     * Handle IVR menu selection
     */
    router.post('/voice/menu', async (req: Request, res: Response) => {
        try {
            const { Digits, CallSid } = req.body;

            logger.info('IVR menu selection', { Digits, CallSid });

            let twiml: string;

            switch (Digits) {
                case '1':
                    // Connect to agent (would dial agent's number or use queue)
                    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we connect you to an agent.</Say>
  <Dial timeout="30">
    <Queue>agent-queue</Queue>
  </Dial>
  <Say voice="alice">Sorry, no agents are available. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/api/webhooks/voice/recording" transcribe="true" />
</Response>`;
                    break;
                case '2':
                    // Leave voicemail
                    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please leave your message after the beep. Press pound when finished.</Say>
  <Record maxLength="120" finishOnKey="#" action="/api/webhooks/voice/recording" transcribe="true" />
</Response>`;
                    break;
                default:
                    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Invalid selection. Goodbye.</Say>
</Response>`;
            }

            res.type('text/xml').send(twiml);
        } catch (error) {
            logger.error('IVR menu webhook error', error);
            res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
        }
    });

    /**
     * POST /api/webhooks/voice/recording
     * Handle completed recordings (voicemails)
     */
    router.post('/voice/recording', async (req: Request, res: Response) => {
        try {
            const {
                RecordingUrl,
                RecordingSid,
                RecordingDuration,
                CallSid,
                From,
                TranscriptionText
            } = req.body;

            logger.info('Recording received', { RecordingSid, RecordingDuration, From });

            // Process the voicemail - this would typically:
            // 1. Download the recording
            // 2. Store in our storage
            // 3. Create an event/approval for agent review

            // Acknowledge and thank the caller
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for your message. An agent will get back to you soon. Goodbye.</Say>
</Response>`;

            res.type('text/xml').send(twiml);
        } catch (error) {
            logger.error('Recording webhook error', error);
            res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
        }
    });

    /**
     * POST /api/webhooks/video/status
     * Twilio Video room status callback
     */
    router.post('/video/status', async (req: Request, res: Response) => {
        try {
            const {
                RoomSid,
                RoomName,
                RoomStatus,
                RoomType,
                ParticipantSid,
                ParticipantIdentity,
                StatusCallbackEvent
            } = req.body;

            logger.info('Video status webhook received', { RoomSid, RoomName, StatusCallbackEvent });

            switch (StatusCallbackEvent) {
                case 'room-created':
                    logger.info(`Video room ${RoomName} created`);
                    break;
                case 'room-ended':
                    logger.info(`Video room ${RoomName} ended`);
                    break;
                case 'participant-connected':
                    logger.info(`Participant ${ParticipantIdentity} joined room ${RoomName}`);
                    break;
                case 'participant-disconnected':
                    logger.info(`Participant ${ParticipantIdentity} left room ${RoomName}`);
                    break;
                case 'recording-started':
                    logger.info(`Recording started for room ${RoomName}`);
                    break;
                case 'recording-completed':
                    logger.info(`Recording completed for room ${RoomName}`);
                    break;
                default:
                    logger.info(`Video event ${StatusCallbackEvent} for room ${RoomName}`);
            }

            res.status(200).json({ success: true });
        } catch (error) {
            logger.error('Video status webhook error', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    });

    /**
     * POST /api/webhooks/video/composition
     * Handle video composition (recording) completion
     */
    router.post('/video/composition', async (req: Request, res: Response) => {
        try {
            const {
                CompositionSid,
                RoomSid,
                StatusCallbackEvent,
                MediaUri,
                Duration
            } = req.body;

            logger.info('Video composition webhook received', { CompositionSid, StatusCallbackEvent, Duration });

            if (StatusCallbackEvent === 'composition-available') {
                // Recording is ready for download
                logger.info(`Video composition ${CompositionSid} is ready: ${MediaUri}`);
                // Store the recording URL and notify relevant parties
            }

            res.status(200).json({ success: true });
        } catch (error) {
            logger.error('Video composition webhook error', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    });

    return router;
}
