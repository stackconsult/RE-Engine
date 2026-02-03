import { logger } from "../observability/logger.js";
export class SelfHealingManager {
    async healNavigation(page, url) {
        logger.info({ url }, "Attempting self-healing navigation");
        try {
            // Strategy 1: Wait for network idle and retry
            await page.waitForLoadState("networkidle", { timeout: 10000 });
            const currentUrl = page.url();
            if (currentUrl && !currentUrl.includes("about:blank")) {
                logger.info({ url: currentUrl }, "Navigation succeeded on retry");
                return true;
            }
            // Strategy 2: Try direct navigation without wait
            await page.goto(url, { timeout: 30000, waitUntil: "commit" });
            await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
            return true;
        }
        catch (error) {
            logger.warn({ url, error: error instanceof Error ? error.message : String(error) }, "Self-healing navigation failed");
            // Strategy 3: Handle common popup scenarios
            if (await this.handlePopups(page)) {
                try {
                    await page.goto(url, { timeout: 30000 });
                    return true;
                }
                catch (retryError) {
                    logger.warn({ error: retryError instanceof Error ? retryError.message : String(retryError) }, "Retry after popup handling failed");
                }
            }
            return false;
        }
    }
    async handlePopups(page) {
        const popupSelectors = [
            '[role="dialog"]',
            '.modal',
            '.popup',
            '.cookie-banner',
            '[data-testid="cookie-banner"]',
            '.cc-banner',
            '#cookie-banner'
        ];
        let handled = false;
        for (const selector of popupSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    await element.click();
                    await page.waitForTimeout(1000);
                    handled = true;
                    logger.info({ selector }, "Closed popup");
                }
            }
            catch (error) {
                // Continue trying other selectors
            }
        }
        return handled;
    }
    async healElementSelector(page, selector) {
        logger.info({ selector }, "Attempting self-healing for element");
        // Strategy 1: Wait for element with extended timeout
        try {
            await page.waitForSelector(selector, { timeout: 30000 });
            return true;
        }
        catch (error) {
            logger.warn({ selector, error: error instanceof Error ? error.message : String(error) }, "Element not found with extended timeout");
        }
        // Strategy 2: Try alternative selectors
        const alternatives = this.generateAlternativeSelectors(selector);
        for (const altSelector of alternatives) {
            try {
                await page.waitForSelector(altSelector, { timeout: 10000 });
                logger.info({ originalSelector: selector, alternative: altSelector }, "Found element with alternative selector");
                return true;
            }
            catch (error) {
                // Continue trying alternatives
            }
        }
        // Strategy 3: Try text-based selection
        if (selector.includes('[data-testid') || selector.includes('#') || selector.includes('.')) {
            const textContent = this.extractTextFromSelector(selector);
            if (textContent) {
                try {
                    await page.waitForSelector(`text=${textContent}`, { timeout: 10000 });
                    logger.info({ selector, textContent }, "Found element by text content");
                    return true;
                }
                catch (error) {
                    // Text-based selection failed
                }
            }
        }
        return false;
    }
    generateAlternativeSelectors(selector) {
        const alternatives = [];
        // Convert ID selectors to attribute selectors
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            alternatives.push(`[id="${id}"]`);
            alternatives.push(`[data-testid="${id}"]`);
            alternatives.push(`[name="${id}"]`);
        }
        // Convert class selectors
        if (selector.startsWith('.')) {
            const className = selector.slice(1).split(' ')[0];
            alternatives.push(`[class*="${className}"]`);
        }
        // Convert data-testid
        if (selector.includes('[data-testid')) {
            const match = selector.match(/data-testid="([^"]+)"/);
            if (match) {
                const testId = match[1];
                alternatives.push(`#${testId}`);
                alternatives.push(`[data-qa="${testId}"]`);
                alternatives.push(`.test-${testId}`);
            }
        }
        return alternatives;
    }
    extractTextFromSelector(selector) {
        // Extract potential text content from common selector patterns
        const patterns = [
            /button\[.*?aria-label="([^"]+)".*?\]/,
            /\[title="([^"]+)"/,
            /data-testid="([^"]+)"/
        ];
        for (const pattern of patterns) {
            const match = selector.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }
    async healClick(page, selector) {
        logger.info({ selector }, "Attempting self-healing for click");
        try {
            // First try to find and click the element
            await page.click(selector, { timeout: 10000 });
            return true;
        }
        catch (error) {
            logger.warn({ selector, error: error instanceof Error ? error.message : String(error) }, "Direct click failed");
            // Try healing the selector first
            if (await this.healElementSelector(page, selector)) {
                try {
                    await page.click(selector, { timeout: 5000 });
                    return true;
                }
                catch (retryError) {
                    logger.warn({ selector, error: retryError instanceof Error ? retryError.message : String(retryError) }, "Click failed after selector healing");
                }
            }
            // Try alternative click methods
            try {
                const element = await page.$(selector);
                if (element) {
                    await element.click();
                    return true;
                }
            }
            catch (elementError) {
                logger.warn({ selector, error: elementError instanceof Error ? elementError.message : String(elementError) }, "Element click failed");
            }
            return false;
        }
    }
    async healType(page, selector, text) {
        logger.info({ selector, text: text.replace(/./g, '*') }, "Attempting self-healing for type");
        try {
            await page.fill(selector, text, { timeout: 10000 });
            return true;
        }
        catch (error) {
            logger.warn({ selector, error: error instanceof Error ? error.message : String(error) }, "Direct fill failed");
            // Try healing the selector first
            if (await this.healElementSelector(page, selector)) {
                try {
                    await page.fill(selector, text, { timeout: 5000 });
                    return true;
                }
                catch (retryError) {
                    logger.warn({ selector, error: retryError instanceof Error ? retryError.message : String(retryError) }, "Fill failed after selector healing");
                }
            }
            return false;
        }
    }
}
//# sourceMappingURL=selfHealingManager.js.map