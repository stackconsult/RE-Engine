import { Store } from "../store/store.js";
import { Approval } from "../domain/types.js";
import { logger } from "../observability/logger.js";
import { v4 as uuidv4 } from "uuid";

export interface FailedSend {
  id: string;
  original_approval_id: string;
  channel: string;
  target: string;
  message: string;
  error_code: string;
  error_msg: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  failed_at: string;
}

export interface DeadLetter {
  id: string;
  original_approval_id: string;
  channel: string;
  target: string;
  message: string;
  final_error: string;
  failed_at: string;
  moved_to_dead_letter_at: string;
}

export class RetryService {
  constructor(private readonly store: Store) {}

  async logFailedSend(approval: Approval, error: Error): Promise<void> {
    const failedSend: FailedSend = {
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

  async processRetries(): Promise<{ processed: number; retried: number; dead_lettered: number }> {
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

    logger.info({ processed, retried, dead_lettered }, "Retry processing completed");
    return { processed, retried, dead_lettered };
  }

  private calculateNextRetry(retryCount: number): string {
    // Exponential backoff: 5min → 15min → 1hr → 4hr → 24hr
    const retryDelays = [5, 15, 60, 240, 1440]; // in minutes
    const delay = retryDelays[Math.min(retryCount, retryDelays.length - 1)];
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + delay);
    return nextRetry.toISOString();
  }

  async moveToDeadLetter(failedSend: FailedSend, finalError: string): Promise<void> {
    const deadLetter: DeadLetter = {
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

  async getRetryStats(): Promise<{
    total_failed: number;
    pending_retry: number;
    dead_lettered: number;
  }> {
    // In production, this would query the CSV files
    // For now, return mock stats
    return {
      total_failed: 0,
      pending_retry: 0,
      dead_lettered: 0
    };
  }
}
