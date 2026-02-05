import type { Approval } from "../domain/types.ts";

export interface SendResult {
  ok: boolean;
  message_id?: string;
  error?: string;
}

export interface ChannelAdapter {
  send(approval: Approval): Promise<SendResult>;
}

export interface Adapters {
  email: ChannelAdapter;
  whatsapp: ChannelAdapter;
  telegram: ChannelAdapter;
  linkedin: ChannelAdapter; // semi-auto open
  facebook: ChannelAdapter; // semi-auto open
}
