import { chromium, type BrowserContext, type Page } from "playwright";
import { SelfHealingManager } from "./heal/selfHealingManager.js";
import { ArtifactManager } from "./artifacts/artifactManager.js";
import { logger } from "./observability/logger.js";

export interface BrowserJob {
  id: string;
  url: string;
  profile?: string;
  maxTabs?: number;
  priority?: number;
  handoffAllowed?: boolean;
  task: {
    type: "navigate" | "extract" | "login" | "message" | "custom";
    selectors?: string[];
    extract?: any;
    data?: any;
  };
  correlationId?: string;
}

export interface BrowserJobResult {
  id: string;
  correlationId?: string;
  status: "QUEUED" | "DISPATCHED" | "RUNNING" | "WAITING_FOR_HUMAN" | "RESUMED" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  progress?: number;
  summary?: string;
  finalUrl?: string;
  artifacts?: {
    trace?: string;
    screenshot?: string;
    video?: string;
    networkLog?: string;
  };
  data?: any;
  error?: string;
}

export class PlaywrightRunner {
  private selfHealing: SelfHealingManager;
  private artifactManager: ArtifactManager;
  private activeJobs = new Map<string, BrowserJob>();

  constructor() {
    this.selfHealing = new SelfHealingManager();
    this.artifactManager = new ArtifactManager();
  }

  async submitJob(job: BrowserJob): Promise<{ jobId: string; status: string }> {
    this.activeJobs.set(job.id, job);
    logger.info({ jobId: job.id, correlationId: job.correlationId }, "Job submitted");
    
    return { jobId: job.id, status: "QUEUED" };
  }

  async getJobStatus(jobId: string): Promise<BrowserJobResult> {
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

  async runJob(job: BrowserJob): Promise<BrowserJobResult> {
    let ctx: BrowserContext | null = null;
    let page: Page | null = null;
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

    } catch (error: any) {
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
    } finally {
      await this.cleanup(ctx, page, artifactId);
      this.activeJobs.delete(job.id);
    }
  }

  private async navigateWithHealing(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    } catch (error) {
      logger.warn({ url, error: error instanceof Error ? error.message : String(error) }, "Initial navigation failed, attempting self-healing");
      
      // Try self-healing approaches
      const healed = await this.selfHealing.healNavigation(page, url);
      if (!healed) {
        throw error;
      }
    }
  }

  private async executeTask(page: Page, job: BrowserJob): Promise<any> {
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

  private async extractData(page: Page, task: any): Promise<any> {
    if (!task.selectors || !task.extract) {
      throw new Error("Extract task requires selectors and extract schema");
    }

    const data: any = {};
    
    for (const [key, selector] of Object.entries(task.extract)) {
      try {
        const element = await page.$(selector as string);
        if (element) {
          data[key] = await element.textContent();
        }
      } catch (error) {
        logger.warn({ key, selector, error: error instanceof Error ? error.message : String(error) }, "Failed to extract data");
        data[key] = null;
      }
    }

    return data;
  }

  private async performLogin(page: Page, task: any): Promise<any> {
    // Implementation for login tasks
    logger.info({ task: "login" }, "Performing login task");
    return { success: true };
  }

  private async sendMessage(page: Page, task: any): Promise<any> {
    // Implementation for message tasks
    logger.info({ task: "message" }, "Performing message task");
    return { success: true };
  }

  private async executeCustomTask(page: Page, task: any): Promise<any> {
    // Implementation for custom tasks
    logger.info({ task: "custom" }, "Performing custom task");
    return { success: true };
  }

  private async cleanup(ctx: BrowserContext | null, page: Page | null, artifactId: string): Promise<void> {
    try {
      if (ctx) {
        await ctx.tracing.stop();
        await ctx.close();
      }
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Cleanup error");
    }
    
    try {
      if (page) await page.close();
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Page cleanup error");
    }
  }

  async cancelJob(jobId: string, reason?: string): Promise<BrowserJobResult> {
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

  async resumeJob(jobId: string, note?: string): Promise<BrowserJobResult> {
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
export async function runJob(job: BrowserJob): Promise<BrowserJobResult> {
  const runner = new PlaywrightRunner();
  return await runner.runJob(job);
}
