import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { pino } from "pino";
import { v4 as uuidv4 } from "uuid";

// Logger configuration for audit compliance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'localhost',
    service: 'reengine-tinyfish'
  }
});

// TypeScript interfaces for type safety
interface ScrapeArgs {
  url: string;
  goal?: string;
  browser_profile?: 'lite' | 'stealth';
  proxy_config?: {
    enabled: boolean;
    country_code?: string;
  };
}

interface TinyFishSSEEvent {
  type: 'STARTED' | 'STREAMING_URL' | 'PROGRESS' | 'COMPLETE' | 'HEARTBEAT';
  runId?: string;
  timestamp?: string;
  streamingUrl?: string;
  purpose?: string;
  status?: 'COMPLETED' | 'FAILED';
  resultJson?: any;
  error?: string;
}

interface ScrapeResult {
  content?: string;
  links?: string[];
  images?: string[];
  metadata?: Record<string, any>;
  [key: string]: any;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  url: string;
  goal: string;
  status: 'attempted' | 'success' | 'failed' | 'fallback';
  error?: string;
  duration?: number;
  apiUsed: 'tinyfish' | 'mock';
}

// Helper function for mock data fallback
async function getMockFallback(args: ScrapeArgs, auditEvent: AuditEvent, startTime: number): Promise<any> {
  const fallbackAuditEvent = {
    ...auditEvent,
    status: 'fallback' as const,
    apiUsed: 'mock' as const,
    duration: Date.now() - startTime
  };

  logger.warn(fallbackAuditEvent, 'Using mock data fallback');

  // Simulate API delay for realistic behavior
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const mockData = {
    content: "Sample scraped content from the webpage. This would contain the actual content extracted by TinyFish based on the goal: " + (args.goal || 'Extract the main content'),
    links: [
      "https://example.com/page1",
      "https://example.com/page2", 
      "https://example.com/page3",
    ],
    images: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.png",
    ],
    metadata: {
      title: "Sample Page Title",
      description: "Sample page description",
      author: "Sample Author",
      publishDate: "2024-01-01",
      url: args.url,
      goal: args.goal || 'Extract the main content',
    },
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ...mockData,
          note: "Using mock data - TinyFish API unavailable",
          auditId: fallbackAuditEvent.id
        }, null, 2),
      },
    ],
  };
}

// Helper function to parse SSE response stream
async function parseSSEResponse(response: Response): Promise<any> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body available');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: any = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const event: TinyFishSSEEvent = data;

            logger.debug({ event, line }, 'SSE event received');

            if (event.type === 'COMPLETE') {
              if (event.status === 'COMPLETED' && event.resultJson) {
                finalResult = {
                  success: true,
                  data: event.resultJson,
                  runId: event.runId,
                  timestamp: event.timestamp
                };
              } else if (event.status === 'FAILED') {
                throw new Error(event.error || 'TinyFish automation failed');
              }
            }
          } catch (parseError) {
            logger.warn({ line, error: parseError }, 'Failed to parse SSE event');
          }
        }
      }
    }

    if (!finalResult) {
      throw new Error('No COMPLETE event received from TinyFish API');
    }

    return finalResult;
  } finally {
    reader.releaseLock();
  }
}

export const scrape = {
  name: "scrape_url",
  description: "Scrape data from a URL using TinyFish API",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "Target website URL to automate",
      },
      goal: {
        type: "string",
        description: "Natural language description of what to accomplish on the website",
      },
      browser_profile: {
        type: "string",
        enum: ["lite", "stealth"],
        description: "Browser profile for execution. LITE uses standard browser, STEALTH uses anti-detection browser",
        default: "lite",
      },
      proxy_config: {
        type: "object",
        properties: {
          enabled: {
            type: "boolean",
            description: "Whether to use proxy",
          },
          country_code: {
            type: "string",
            description: "Country code for proxy routing",
          },
        },
        description: "Proxy configuration",
      },
    },
    required: ["url"],
  },
  tool: {
    name: "scrape_url",
    description: "Scrape data from a URL using TinyFish API",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "Target website URL to automate",
        },
        goal: {
          type: "string",
          description: "Natural language description of what to accomplish on the website",
        },
        browser_profile: {
          type: "string",
          enum: ["lite", "stealth"],
          description: "Browser profile for execution. LITE uses standard browser, STEALTH uses anti-detection browser",
          default: "lite",
        },
        proxy_config: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              description: "Whether to use proxy",
            },
            country_code: {
              type: "string",
              description: "Country code for proxy routing",
            },
          },
          description: "Proxy configuration",
        },
      },
      required: ["url"],
    },
  },
  handler: async (args: ScrapeArgs) => {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action: 'scrape_url',
      url: args.url,
      goal: args.goal || 'Extract the main content from the webpage',
      status: 'attempted',
      apiUsed: 'tinyfish'
    };

    const startTime = Date.now();
    logger.info(auditEvent, 'Starting scrape operation');

    try {
      // Input validation
      if (!args.url || typeof args.url !== 'string') {
        throw new Error('URL is required and must be a string');
      }

      // Environment variable validation
      const tinyFishUrl = process.env.TINYFISH_API_URL || 'https://mino.ai/v1/automation/run-sse';
      const tinyFishApiKey = process.env.TINYFISH_API_KEY;

      if (!tinyFishApiKey) {
        logger.warn({ ...auditEvent, status: 'fallback' }, 'API key not found, using mock data');
        return await getMockFallback(args, auditEvent, startTime);
      }

      // Prepare TinyFish API request
      const requestBody = {
        url: args.url,
        goal: args.goal || 'Extract the main content from the webpage',
        browser_profile: args.browser_profile || 'lite',
        ...(args.proxy_config && { proxy_config: args.proxy_config })
      };

      logger.debug({ ...auditEvent, requestBody }, 'Calling TinyFish API');

      // Make request to TinyFish API
      const response = await fetch(tinyFishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': tinyFishApiKey,
          'User-Agent': 'RE-Engine/1.0'
        },
        body: JSON.stringify(requestBody)
      });

      const duration = Date.now() - startTime;
      auditEvent.duration = duration;

      if (!response.ok) {
        const errorText = await response.text();
        const error = `TinyFish API error: ${response.status} ${response.statusText} - ${errorText}`;
        auditEvent.error = error;
        auditEvent.status = 'failed';
        logger.error(auditEvent, 'API request failed');
        
        // Fallback to mock data on API failure
        return await getMockFallback(args, auditEvent, startTime);
      }

      // Handle SSE response stream
      const result = await parseSSEResponse(response);
      
      auditEvent.status = 'success';
      logger.info(auditEvent, 'Scrape operation completed successfully');

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      auditEvent.duration = duration;
      auditEvent.error = error instanceof Error ? error.message : String(error);
      auditEvent.status = 'failed';
      
      logger.error(auditEvent, 'Scrape operation failed');
      
      // Always fallback to mock data on any error
      return await getMockFallback(args, auditEvent, startTime);
    }
  },
};
