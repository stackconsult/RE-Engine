import { BaseIngestService } from "./baseIngestService.js";
import { logger } from "../observability/logger.js";
import { simpleParser } from "mailparser";
export class ImapIngestService extends BaseIngestService {
    config;
    imap; // Imap client
    constructor(store, approvalService, config) {
        super(store, approvalService);
        this.config = config;
    }
    async connect() {
        try {
            // Dynamic import to avoid bundling issues
            const Imap = (await import("node-imap")).default;
            this.imap = new Imap(this.config);
            this.imap.once("ready", () => {
                this.connected = true;
                logger.info("IMAP connection established");
            });
            this.imap.once("error", (err) => {
                logger.error({ error: err.message }, "IMAP connection error");
                this.connected = false;
            });
            await new Promise((resolve, reject) => {
                this.imap.once("ready", resolve);
                this.imap.once("error", reject);
                this.imap.connect();
            });
        }
        catch (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, "Failed to connect to IMAP");
            throw error;
        }
    }
    async disconnect() {
        if (this.imap && this.connected) {
            this.imap.end();
            this.connected = false;
            logger.info("IMAP connection closed");
        }
    }
    async ingest() {
        if (!this.connected) {
            throw new Error("IMAP not connected");
        }
        const results = [];
        const mailbox = this.config.mailbox || "INBOX";
        try {
            await this.openMailbox(mailbox);
            const messages = await this.fetchUnreadMessages();
            for (const message of messages) {
                try {
                    const result = await this.processMessage(message);
                    results.push(result);
                    // Mark message as read
                    await this.markMessageRead(message.uid);
                }
                catch (error) {
                    logger.error({
                        messageId: message.id,
                        error: error instanceof Error ? error.message : String(error)
                    }, "Failed to process message");
                    results.push({
                        events: [],
                        errors: [error instanceof Error ? error.message : String(error)]
                    });
                }
            }
        }
        catch (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, "IMAP ingest failed");
            throw error;
        }
        return results;
    }
    async openMailbox(mailbox) {
        return new Promise((resolve, reject) => {
            this.imap.openBox(mailbox, false, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async fetchUnreadMessages() {
        return new Promise((resolve, reject) => {
            this.imap.search(["UNSEEN"], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (results.length === 0) {
                    resolve([]);
                    return;
                }
                const messages = [];
                const fetch = this.imap.fetch(results, { bodies: "", struct: true });
                fetch.on("message", (msg, seqno) => {
                    const message = { seqno };
                    msg.on("body", (stream, info) => {
                        let buffer = "";
                        stream.on("data", (chunk) => {
                            buffer += chunk.toString("utf8");
                        });
                        stream.once("end", async () => {
                            try {
                                const parsed = await simpleParser(buffer);
                                message.parsed = parsed;
                                message.uid = results[seqno - 1];
                                message.id = parsed.messageId || `imap-${seqno}`;
                            }
                            catch (error) {
                                logger.error({ error: error instanceof Error ? error.message : String(error) }, "Failed to parse email");
                            }
                        });
                    });
                    msg.once("end", () => {
                        messages.push(message);
                    });
                });
                fetch.once("error", reject);
                fetch.once("end", () => resolve(messages));
            });
        });
    }
    async processMessage(message) {
        const parsed = message.parsed;
        if (!parsed) {
            throw new Error("Failed to parse message");
        }
        const ingestMessage = {
            id: message.id,
            from: parsed.from?.value?.[0]?.address || "",
            to: parsed.to?.value?.[0]?.address || "",
            subject: parsed.subject || "",
            body: parsed.text || parsed.html || "",
            timestamp: parsed.date?.toISOString() || new Date().toISOString(),
            channel: "email",
            raw: parsed
        };
        // Find or create lead
        const { lead } = await this.findOrCreateLead(ingestMessage);
        // Create reply approval
        await this.createReplyApproval(lead, ingestMessage);
        // Log ingestion event
        const event = this.createEvent(lead.lead_id, "email", "ingested", {
            messageId: message.id,
            subject: ingestMessage.subject
        });
        return {
            lead,
            events: [event]
        };
    }
    async markMessageRead(uid) {
        return new Promise((resolve, reject) => {
            this.imap.setFlags(uid, ["\\Seen"], (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
//# sourceMappingURL=imapIngestService.js.map