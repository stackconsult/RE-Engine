import { promises as fs } from "fs";
import path from "path";
import { BrowserContext, Page } from "playwright";
import { logger } from "../observability/logger.js";

export class ArtifactManager {
  private baseDir = "./artifacts";

  constructor() {
    this.ensureBaseDir();
  }

  private async ensureBaseDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Failed to create artifacts directory");
    }
  }

  getArtifactDir(jobId: string): string {
    const dir = path.join(this.baseDir, jobId);
    fs.mkdir(dir, { recursive: true }).catch(() => {}); // Async but fire-and-forget
    return dir;
  }

  getHarPath(jobId: string): string {
    return path.join(this.getArtifactDir(jobId), `${jobId}.har`);
  }

  async captureScreenshot(page: Page, jobId: string): Promise<string> {
    try {
      const screenshotPath = path.join(this.getArtifactDir(jobId), `${jobId}-screenshot.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logger.info({ jobId, screenshotPath }, "Screenshot captured");
      return screenshotPath;
    } catch (error) {
      logger.warn({ jobId, error: error instanceof Error ? error.message : String(error) }, "Failed to capture screenshot");
      return "";
    }
  }

  async finalizeTrace(ctx: BrowserContext, jobId: string): Promise<string> {
    try {
      const tracePath = path.join(this.getArtifactDir(jobId), `${jobId}.zip`);
      await ctx.tracing.stop({ path: tracePath });
      logger.info({ jobId, tracePath }, "Trace finalized");
      return tracePath;
    } catch (error) {
      logger.warn({ jobId, error: error instanceof Error ? error.message : String(error) }, "Failed to finalize trace");
      return "";
    }
  }

  async cleanupArtifacts(jobId: string): Promise<void> {
    try {
      const dir = this.getArtifactDir(jobId);
      await fs.rmdir(dir, { recursive: true });
      logger.info({ jobId }, "Artifacts cleaned up");
    } catch (error) {
      logger.warn({ jobId, error: error instanceof Error ? error.message : String(error) }, "Failed to cleanup artifacts");
    }
  }

  async listArtifacts(jobId: string): Promise<string[]> {
    try {
      const dir = this.getArtifactDir(jobId);
      const files = await fs.readdir(dir);
      return files.map(file => path.join(dir, file));
    } catch (error) {
      logger.warn({ jobId, error: error instanceof Error ? error.message : String(error) }, "Failed to list artifacts");
      return [];
    }
  }
}
