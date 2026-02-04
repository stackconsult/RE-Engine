import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({
    name: "reengine-tinyfish",
    version: "0.1.0",
});
const tools = [
    {
        name: "scrape_url",
        description: "Scrape data from a URL using TinyFish API",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL to scrape",
                },
                extract: {
                    type: "string",
                    enum: ["text", "links", "images", "metadata"],
                    description: "Type of data to extract",
                    default: "text",
                },
                selector: {
                    type: "string",
                    description: "CSS selector for targeted extraction",
                },
            },
            required: ["url"],
        },
    },
    {
        name: "extract_links",
        description: "Extract all links from a webpage",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL to extract links from",
                },
                filter: {
                    type: "string",
                    description: "Filter links by pattern (optional)",
                },
            },
            required: ["url"],
        },
    },
    {
        name: "extract_images",
        description: "Extract all images from a webpage",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL to extract images from",
                },
                minSize: {
                    type: "number",
                    description: "Minimum image size filter",
                },
            },
            required: ["url"],
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
            case "scrape_url": {
                // Basic validation without zod dependency
                if (!args.url || typeof args.url !== 'string') {
                    throw new Error('URL is required and must be a string');
                }
                const extract = args.extract || 'text';
                const validExtractTypes = ['text', 'links', 'images', 'metadata'];
                if (!validExtractTypes.includes(extract)) {
                    throw new Error(`extract must be one of: ${validExtractTypes.join(', ')}`);
                }
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
                let result;
                switch (extract) {
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
                const { url, filter } = args;
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
                const { url, minSize } = args;
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
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map