import { logger } from "../observability/logger.js";
export const DEFAULT_RATE_LIMITS = {
    whatsapp: { per_hour: 20, per_day: 150, min_delay_seconds: 180 },
    telegram: { per_hour: 30, per_day: 200, min_delay_seconds: 120 },
    email: { per_hour: 50, per_day: 500, min_delay_seconds: 30 },
    linkedin: { per_hour: 5, per_day: 25, min_delay_seconds: 600 },
    facebook: { per_hour: 5, per_day: 25, min_delay_seconds: 600 }
};
export class RateLimiter {
    store;
    rateLimits;
    sendWindows = [];
    constructor(store, rateLimits) {
        this.store = store;
        this.rateLimits = { ...DEFAULT_RATE_LIMITS, ...rateLimits };
    }
    async canSend(channel) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Count sends in the last hour and day
        const hourlySends = this.sendWindows.filter(sw => sw.channel === channel && new Date(sw.sent_at) > oneHourAgo).length;
        const dailySends = this.sendWindows.filter(sw => sw.channel === channel && new Date(sw.sent_at) > oneDayAgo).length;
        const limits = this.rateLimits[channel];
        // Check hourly limit
        if (hourlySends >= limits.per_hour) {
            return {
                allowed: false,
                reason: `Hourly limit exceeded (${hourlySends}/${limits.per_hour})`
            };
        }
        // Check daily limit
        if (dailySends >= limits.per_day) {
            return {
                allowed: false,
                reason: `Daily limit exceeded (${dailySends}/${limits.per_day})`
            };
        }
        // Check minimum delay between sends
        if (this.sendWindows.length > 0) {
            const lastSend = this.sendWindows
                .filter(sw => sw.channel === channel)
                .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
            if (lastSend) {
                const timeSinceLastSend = now.getTime() - new Date(lastSend.sent_at).getTime();
                const minDelayMs = limits.min_delay_seconds * 1000;
                if (timeSinceLastSend < minDelayMs) {
                    const waitTime = Math.ceil((minDelayMs - timeSinceLastSend) / 1000);
                    return {
                        allowed: false,
                        reason: `Minimum delay not met. Wait ${waitTime} seconds.`
                    };
                }
            }
        }
        return { allowed: true };
    }
    async recordSend(channel, approvalId) {
        const sendWindow = {
            channel,
            approval_id: approvalId,
            sent_at: new Date().toISOString()
        };
        this.sendWindows.push(sendWindow);
        // In production, this would save to send_window.csv
        logger.info({
            channel,
            approval_id: approvalId,
            sent_at: sendWindow.sent_at
        }, "Send recorded for rate limiting");
        // Clean up old entries (older than 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.sendWindows = this.sendWindows.filter(sw => new Date(sw.sent_at) > oneDayAgo);
    }
    async getSendStats(channel) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const channels = channel ? [channel] : Object.keys(this.rateLimits);
        return channels.map(ch => {
            const hourlySends = this.sendWindows.filter(sw => sw.channel === ch && new Date(sw.sent_at) > oneHourAgo).length;
            const dailySends = this.sendWindows.filter(sw => sw.channel === ch && new Date(sw.sent_at) > oneDayAgo).length;
            return {
                hourly_sends: hourlySends,
                daily_sends: dailySends,
                limits: this.rateLimits[ch]
            };
        });
    }
    async updateRateLimits(newLimits) {
        this.rateLimits = { ...this.rateLimits, ...newLimits };
        logger.info({ newLimits }, "Rate limits updated");
    }
    getRateLimits() {
        return { ...this.rateLimits };
    }
}
//# sourceMappingURL=rateLimiter.js.map