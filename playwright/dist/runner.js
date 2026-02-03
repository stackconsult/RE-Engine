import { chromium } from "playwright";
import { SelfHealingManager } from "./heal/selfHealingManager.js";
import { ArtifactManager } from "./artifacts/artifactManager.js";
import { logger } from "./observability/logger.js";
export class PlaywrightRunner {
    selfHealing;
    artifactManager;
    activeJobs = new Map();
    constructor() {
        this.selfHealing = new SelfHealingManager();
        this.artifactManager = new ArtifactManager();
    }
    async submitJob(job) {
        this.activeJobs.set(job.id, job);
        logger.info({ jobId: job.id, correlationId: job.correlationId }, "Job submitted");
        return { jobId: job.id, status: "QUEUED" };
    }
    async getJobStatus(jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        return {
            id: jobId,
            correlationId: job.correlationId,
            status: "RUNNING",
            progress: 0.5,
            summary: "Job in progress"
        };
    }
    async runJob(job) {
        let ctx = null;
        let page = null;
        const artifactId = job.id;
        try {
            logger.info({ jobId: job.id, url: job.url }, "Starting browser job");
            // Setup browser context with artifacts
            ctx = await chromium.launchPersistentContext(`./.pw-user-data-${job.id}`, {
                headless: false,
                recordVideo: { dir: this.artifactManager.getArtifactDir(artifactId) },
                recordHar: { path: this.artifactManager.getHarPath(artifactId) }
            });
            page = await ctx.newPage();
            // Setup tracing and error handling
            await ctx.tracing.start({ screenshots: true, snapshots: true });
            // Navigate with self-healing
            await this.navigateWithHealing(page, job.url);
            // Execute task based on type
            const result = await this.executeTask(page, job);
            // Capture final artifacts
            const screenshot = await this.artifactManager.captureScreenshot(page, artifactId);
            const trace = await this.artifactManager.finalizeTrace(ctx, artifactId);
            return {
                id: job.id,
                correlationId: job.correlationId,
                status: "SUCCEEDED",
                progress: 1.0,
                summary: `Completed ${job.task.type} task`,
                finalUrl: page.url(),
                artifacts: {
                    screenshot,
                    trace,
                    video: `${artifactId}.webm`,
                    networkLog: `${artifactId}.har`
                },
                data: result
            };
        }
        catch (error) {
            logger.error({ jobId: job.id, error: error.message }, "Job failed");
            // Capture error artifacts
            const screenshot = page ? await this.artifactManager.captureScreenshot(page, artifactId) : undefined;
            return {
                id: job.id,
                correlationId: job.correlationId,
                status: "FAILED",
                progress: 0,
                summary: "Job failed",
                error: error.message,
                artifacts: {
                    screenshot
                }
            };
        }
        finally {
            await this.cleanup(ctx, page, artifactId);
            this.activeJobs.delete(job.id);
        }
    }
    async navigateWithHealing(page, url) {
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        }
        catch (error) {
            logger.warn({ url, error: error instanceof Error ? error.message : String(error) }, "Initial navigation failed, attempting self-healing");
            // Try self-healing approaches
            const healed = await this.selfHealing.healNavigation(page, url);
            if (!healed) {
                throw error;
            }
        }
    }
    async executeTask(page, job) {
        switch (job.task.type) {
            case "navigate":
                return { url: page.url(), title: await page.title() };
            case "extract":
                return await this.extractData(page, job.task);
            case "login":
                return await this.performLogin(page, job.task);
            case "message":
                return await this.sendMessage(page, job.task);
            case "custom":
                return await this.executeCustomTask(page, job.task);
            default:
                throw new Error(`Unknown task type: ${job.task.type}`);
        }
    }
    async extractData(page, task) {
        if (!task.selectors || !task.extract) {
            throw new Error("Extract task requires selectors and extract schema");
        }
        const data = {};
        for (const [key, selector] of Object.entries(task.extract)) {
            try {
                const element = await page.$(selector);
                if (element) {
                    data[key] = await element.textContent();
                }
            }
            catch (error) {
                logger.warn({ key, selector, error: error instanceof Error ? error.message : String(error) }, "Failed to extract data");
                data[key] = null;
            }
        }
        return data;
    }
    async performLogin(page, task) {
        // Implementation for login tasks
        logger.info({ task: "login" }, "Performing login task");
        return { success: true };
    }
    async sendMessage(page, task) {
        // Implementation for message tasks
        logger.info({ task: "message" }, "Performing message task");
        return { success: true };
    }
    async executeCustomTask(page, task) {
        // Implementation for custom tasks
        logger.info({ task: "custom" }, "Performing custom task");
        return { success: true };
    }
    async cleanup(ctx, page, artifactId) {
        try {
            if (ctx) {
                await ctx.tracing.stop();
                await ctx.close();
            }
        }
        catch (error) {
            logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Cleanup error");
        }
        try {
            if (page)
                await page.close();
        }
        catch (error) {
            logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Page cleanup error");
        }
    }
    async cancelJob(jobId, reason) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        this.activeJobs.delete(jobId);
        logger.info({ jobId, reason }, "Job cancelled");
        return {
            id: jobId,
            correlationId: job.correlationId,
            status: "CANCELLED",
            summary: reason || "Job cancelled"
        };
    }
    async resumeJob(jobId, note) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        logger.info({ jobId, note }, "Job resumed");
        return {
            id: jobId,
            correlationId: job.correlationId,
            status: "RESUMED",
            summary: note || "Job resumed"
        };
    }
}
// Legacy function for backward compatibility
export async function runJob(job) {
    const runner = new PlaywrightRunner();
    return await runner.runJob(job);
}
//# sourceMappingURL=runner.js.map