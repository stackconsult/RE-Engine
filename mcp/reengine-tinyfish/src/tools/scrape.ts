import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const scrape = {
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
      },
      selector: {
        type: "string",
        description: "CSS selector for specific content",
      },
    },
    required: ["url"],
  },
  tool: {
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
        },
        selector: {
          type: "string",
          description: "CSS selector for specific content",
        },
      },
      required: ["url"],
    },
  },
  handler: async (args: any) => {
    // Basic validation
    if (!args.url || typeof args.url !== 'string') {
      throw new Error('URL is required and must be a string');
    }
    
    const extract = args.extract || 'text';
    const validExtractTypes = ['text', 'links', 'images', 'metadata'];
    if (!validExtractTypes.includes(extract)) {
      throw new Error(`extract must be one of: ${validExtractTypes.join(', ')}`);
    }
    
    // Mock TinyFish API implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
  },
};
