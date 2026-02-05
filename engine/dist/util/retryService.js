import { logger } from "../observability/logger.js";
import { v4 as uuidv4 } from "uuid";
export class RetryService {
    store;
    constructor(store) {
        this.store = store;
    }
    async logFailedSend(approval, error) {
        const failedSend = {
            id: uuidv4(),
            original_approval_id: approval.approval_id,
            channel: approval.channel,
            target: approval.draft_to,
            message: `${approval.draft_subject}\n\n${approval.draft_text}`,
            error_code: error.name || "UNKNOWN",
            error_msg: error.message,
            retry_count: 0,
            max_retries: 4,
            next_retry_at: this.calculateNextRetry(0),
            failed_at: new Date().toISOString()
        };
        // In a real implementation, this would save to a failed_sends.csv
        // For now, we'll log it and update the approval status
        logger.error({
            approval_id: approval.approval_id,
            channel: approval.channel,
            error: error.message
        }, "Send failed, logged for retry");
        // Update approval status to failed
        const approvals = await this.store.listApprovals();
        const index = approvals.findIndex(a => a.approval_id === approval.approval_id);
        if (index >= 0) {
            approvals[index].status = "failed";
            approvals[index].notes = `${new Date().toISOString()} failed: ${error.message}`;
            await this.store.saveApprovals(approvals);
        }
    }
    async processRetries() {
        // This would read from failed_sends.csv in a real implementation
        // For now, we'll implement the logic structure
        logger.info("Processing failed send retries");
        let processed = 0;
        let retried = 0;
        let dead_lettered = 0;
        // In production:
        // 1. Read failed_sends.csv where next_retry_at <= now
        // 2. For each entry, attempt to resend
        // 3. If successful, remove from failed_sends and log event
        // 4. If failed, increment retry_count and calculate next_retry_at
        // 5. If retry_count >= max_retries, move to dead_letter.csv
        logger.info({ processed, as, any, retried, dead_lettered }, "Retry processing completed");
        return { processed, retried, dead_lettered };
    }
    calculateNextRetry(retryCount) {
        // Exponential backoff: 5min → 15min → 1hr → 4hr → 24hr
        const retryDelays = [5, 15, 60, 240, 1440]; // in minutes
        const delay = retryDelays[Math.min(retryCount, retryDelays.length - 1)];
        const nextRetry = new Date();
        nextRetry.setMinutes(nextRetry.getMinutes() + delay);
        return nextRetry.toISOString();
    }
    async moveToDeadLetter(failedSend, finalError) {
        const deadLetter = {
            id: uuidv4(),
            original_approval_id: failedSend.original_approval_id,
            channel: failedSend.channel,
            target: failedSend.target,
            message: failedSend.message,
            final_error: finalError,
            failed_at: failedSend.failed_at,
            moved_to_dead_letter_at: new Date().toISOString()
        };
        // In production, this would save to dead_letter.csv
        logger.error({
            approval_id: failedSend.original_approval_id,
            channel: failedSend.channel,
            final_error: finalError
        }, "Moved to dead letter after max retries");
    }
    async getRetryStats() {
        // In production, this would query the CSV files
        // For now, return mock stats
        return {
            total_failed: 0,
            pending_retry: 0,
            dead_lettered: 0
        };
    }
}
//# sourceMappingURL=retryService.js.map