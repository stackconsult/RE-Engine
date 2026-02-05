import { BaseIngestService } from "./baseIngestService.js";
import { IngestMessage, IngestResult } from "./types.js";
import { Store } from "../store/store.js";
import { ApprovalService } from "../approvals/approvalService.js";
import { logger } from "../observability/logger.js";

export class MockIngestService extends BaseIngestService {
  private mockMessages: IngestMessage[] = [];

  constructor(store: Store, approvalService: ApprovalService) {
    super(store, approvalService);
    
    // Add some mock messages for testing
    this.mockMessages = [
      {
        id: "mock-1",
        from: "test@example.com",
        to: "re@example.com",
        subject: "Interested in property",
        body: "Hi, I'm interested in the property you listed. Please contact me.",
        timestamp: new Date().toISOString(),
        channel: "email",
        raw: {}
      },
      {
        id: "mock-2", 
        from: "+1234567890",
        to: "+1987654321",
        subject: "",
        body: "Hello, I saw your listing and want to schedule a viewing.",
        timestamp: new Date().toISOString(),
        channel: "whatsapp",
        raw: {}
      }
    ];
  }

  async connect(): Promise<void> {
    this.connected = true;
    logger.info("Mock ingest service connected");
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    logger.info("Mock ingest service disconnected");
  }

  async ingest(): Promise<IngestResult[]> {
    if (!this.connected) {
      throw new Error("Mock ingest service not connected");
    }

    const results: IngestResult[] = [];

    for (const message of this.mockMessages) {
      try {
        const result = await this.processMessage(message);
        results.push(result);
      } catch (error) {
        logger.error({ 
          messageId: message.id, 
          error: error instanceof Error ? error.message : String(error) 
        }, "Failed to process mock message");
        
        results.push({
          events: [],
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    // Clear mock messages after processing
    this.mockMessages = [];

    return results;
  }

  private async processMessage(message: IngestMessage): Promise<IngestResult> {
    // Find or create lead
    const { lead } = await this.findOrCreateLead(message);

    // Create reply approval
    await this.createReplyApproval(lead, message);

    // Log ingestion event
    const event = this.createEvent(lead.lead_id, message.channel, "ingested", {
      messageId: message.id,
      subject: message.subject
    });

    return {
      lead,
      events: [event]
    };
  }

  // Helper method for testing - add mock messages
  addMockMessage(message: IngestMessage): void {
    this.mockMessages.push(message);
  }
}
