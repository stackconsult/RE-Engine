<<<<<<< /Users/kirtissiemens/Documents/BrowserOs/mcp/reengine-tinyfish/src/index.ts
import { McpServer } from "@tinyfish/mcp-server";
import { scrape } from "./tools/scrape.js";

const server = new McpServer({
  tools: {
    "tinyfish.scrape": scrape,
  },
=======
import { Server } from "@tinyfish/mcp-server";
import { scrapeTool } from "./tools/scrape.js";

const server = new Server({
  name: "reengine-tinyfish",
  version: "0.1.0",
});

server.addTool(scrapeTool);

server.start().catch(console.error);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: server.getTools() };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "scrape_url": {
        const parsed = TinyFishSchema.parse(args);
        
        // Mock TinyFish API implementation
        // In production, this would call the actual TinyFish API
        const mockData = {
          text: "Sample scraped content from the webpage. This would contain the actual text content extracted by TinyFish.",
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
          },
        };

        let result: any;
        
        switch (parsed.extract) {
          case "text":
            result = { content: mockData.text };
            break;
          case "links":
            result = { links: mockData.links };
            break;
          case "images":
            result = { images: mockData.images };
            break;
          case "metadata":
            result = mockData.metadata;
            break;
          default:
            result = mockData;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "extract_links": {
        const { url, filter } = args as { url: string; filter?: string };
        
        // Mock link extraction
        const mockLinks = [
          "https://example.com/page1",
          "https://example.com/page2",
          "https://example.com/page3",
          "https://example.com/contact",
          "https://example.com/about",
        ];

        const filteredLinks = filter 
          ? mockLinks.filter(link => link.includes(filter))
          : mockLinks;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ links: filteredLinks }, null, 2),
            },
          ],
        };
      }

      case "extract_images": {
        const { url, minSize } = args as { url: string; minSize?: number };
        
        // Mock image extraction
        const mockImages = [
          { src: "https://example.com/image1.jpg", size: 1024, alt: "Image 1" },
          { src: "https://example.com/image2.png", size: 2048, alt: "Image 2" },
          { src: "https://example.com/image3.jpg", size: 512, alt: "Image 3" },
        ];

        const filteredImages = minSize
          ? mockImages.filter(img => img.size >= minSize)
          : mockImages;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ images: filteredImages }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
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
>>>>>>> /Users/kirtissiemens/.windsurf/worktrees/BrowserOs/BrowserOs-9f77a2b9/mcp/reengine-tinyfish/src/index.ts
});

server.start();
