import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
const BrowserAutomationSchema = z.object({
    url: z.string().url(),
    action: z.enum(["screenshot", "click", "type", "navigate", "extract"]),
    selector: z.string().optional(),
    text: z.string().optional(),
    waitFor: z.string().optional(),
});
let browser = null;
let page = null;
const server = new Server({
    name: "reengine-browser",
    version: "0.1.0",
});
const tools = [
    {
        name: "browser_automate",
        description: "Automate browser actions with Playwright",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL to navigate to",
                },
                action: {
                    type: "string",
                    enum: ["screenshot", "click", "type", "navigate", "extract"],
                    description: "Action to perform",
                },
                selector: {
                    type: "string",
                    description: "CSS selector for element interaction",
                },
                text: {
                    type: "string",
                    description: "Text to type (for type action)",
                },
                waitFor: {
                    type: "string",
                    description: "Selector to wait for before action",
                },
            },
            required: ["url", "action"],
        },
    },
    {
        name: "browser_screenshot",
        description: "Take a screenshot of the current page",
        inputSchema: {
            type: "object",
            properties: {
                fullPage: {
                    type: "boolean",
                    description: "Capture full page or viewport",
                    default: false,
                },
                quality: {
                    type: "number",
                    description: "Image quality (1-100)",
                    default: 80,
                },
            },
        },
    },
    {
        name: "browser_extract",
        description: "Extract text or data from the page",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector to extract from",
                },
                attribute: {
                    type: "string",
                    description: "Attribute to extract (optional)",
                },
                multiple: {
                    type: "boolean",
                    description: "Extract multiple elements",
                    default: false,
                },
            },
            required: ["selector"],
        },
    },
];
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "browser_automate": {
                const parsed = BrowserAutomationSchema.parse(args);
                if (!browser) {
                    browser = await chromium.launch({ headless: true });
                }
                if (!page) {
                    page = await browser.newPage();
                }
                switch (parsed.action) {
                    case "navigate":
                        await page.goto(parsed.url);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Navigated to ${parsed.url}`,
                                },
                            ],
                        };
                    case "click":
                        if (!parsed.selector) {
                            throw new Error("Selector is required for click action");
                        }
                        if (parsed.waitFor) {
                            await page.waitForSelector(parsed.waitFor);
                        }
                        await page.click(parsed.selector);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Clicked element: ${parsed.selector}`,
                                },
                            ],
                        };
                    case "type":
                        if (!parsed.selector || !parsed.text) {
                            throw new Error("Selector and text are required for type action");
                        }
                        if (parsed.waitFor) {
                            await page.waitForSelector(parsed.waitFor);
                        }
                        await page.type(parsed.selector, parsed.text);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Typed "${parsed.text}" into ${parsed.selector}`,
                                },
                            ],
                        };
                    case "screenshot":
                        const screenshot = await page.screenshot({ fullPage: true });
                        const base64 = screenshot.toString("base64");
                        return {
                            content: [
                                {
                                    type: "image",
                                    data: base64,
                                    mimeType: "image/png",
                                },
                            ],
                        };
                    case "extract":
                        if (!parsed.selector) {
                            throw new Error("Selector is required for extract action");
                        }
                        const element = await page.$(parsed.selector);
                        if (!element) {
                            throw new Error(`Element not found: ${parsed.selector}`);
                        }
                        const text = await element.textContent();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: text || "No text found",
                                },
                            ],
                        };
                    default:
                        throw new Error(`Unknown action: ${parsed.action}`);
                }
            }
            case "browser_screenshot": {
                if (!page) {
                    throw new Error("No active page. Use browser_automate with navigate action first.");
                }
                const { fullPage = false, quality = 80 } = args;
                const screenshot = await page.screenshot({
                    fullPage,
                    quality: fullPage ? undefined : quality,
                    type: fullPage ? "png" : "jpeg"
                });
                const base64 = screenshot.toString("base64");
                return {
                    content: [
                        {
                            type: "image",
                            data: base64,
                            mimeType: fullPage ? "image/png" : "image/jpeg",
                        },
                    ],
                };
            }
            case "browser_extract": {
                if (!page) {
                    throw new Error("No active page. Use browser_automate with navigate action first.");
                }
                const { selector, attribute, multiple = false } = args;
                if (multiple) {
                    const elements = await page.$$(selector);
                    const results = await Promise.all(elements.map(async (el) => {
                        if (attribute) {
                            return await el.getAttribute(attribute);
                        }
                        return await el.textContent();
                    }));
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(results, null, 2),
                            },
                        ],
                    };
                }
                else {
                    const element = await page.$(selector);
                    if (!element) {
                        throw new Error(`Element not found: ${selector}`);
                    }
                    const result = attribute
                        ? await element.getAttribute(attribute)
                        : await element.textContent();
                    return {
                        content: [
                            {
                                type: "text",
                                text: result || "No content found",
                            },
                        ],
                    };
                }
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
async function cleanup() {
    if (page) {
        await page.close();
        page = null;
    }
    if (browser) {
        await browser.close();
        browser = null;
    }
}
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map