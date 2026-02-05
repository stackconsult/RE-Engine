import { Lead, Approval, EventRow, Channel } from "../domain/types.js";

export interface IngestMessage {
  id: string;
  from: string;
  to: string;
  subject?: string;
  body: string;
  timestamp: string;
  channel: Channel;
  raw: any; // Raw message data from source
}

export interface IngestResult {
  lead?: Lead;
  approval?: Approval;
  events: EventRow[];
  errors?: string[];
}

export interface IngestService {
  ingest(): Promise<IngestResult[]>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface MessageClassifier {
  classify(message: IngestMessage): Promise<{
    isHotReply: boolean;
    leadId?: string;
    category: "inquiry" | "reply" | "spam" | "unknown";
    confidence: number;
  }>;
}
