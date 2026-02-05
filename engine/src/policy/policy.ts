import type { Channel } from "../domain/types.js";

export interface SendPolicy {
  approvalRequired: boolean;
  dailySendCap: number;
  allowedSendWindowLocal?: {
    tz: string;
    startHHMM: string;
    endHHMM: string;
  };
  enabledChannels: Record<Channel, boolean>;
}

export const DefaultPolicy: SendPolicy = {
  approvalRequired: true,
  dailySendCap: 150,
  allowedSendWindowLocal: {
    tz: "America/Edmonton",
    startHHMM: "08:00",
    endHHMM: "18:00",
  },
  enabledChannels: {
    email: true,
    whatsapp: true,
    telegram: true,
    linkedin: true,
    facebook: true,
  },
};
