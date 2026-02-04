import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { scrape } from "./tools/scrape.js";

const server = new Server(
  {
    name: "reengine-tinyfish",
    version: "0.1.0",
  }
);

// Add modular tool
const tools: Tool[] = [
  scrape.tool,
  {
    name: "scrape_real_estate_listings",
    description: "Scrape real estate listings from Zillow, Realtor.com, or other real estate websites",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location to search (city, state, or zip code)",
        },
        propertyType: {
          type: "string",
          enum: ["single-family", "multi-family", "condo", "townhouse", "land"],
          description: "Type of property to search for",
          default: "single-family",
        },
        priceRange: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
          description: "Price range filter",
        },
        beds: {
          type: "number",
          description: "Minimum number of bedrooms",
        },
        baths: {
          type: "number",
          description: "Minimum number of bathrooms",
        },
        limit: {
          type: "number",
          description: "Maximum number of listings to scrape",
          default: 50,
        },
      },
      required: ["location"],
    },
  },
  {
    name: "scrape_market_data",
    description: "Scrape real estate market data and trends for a specific location",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location to analyze (city, state, or zip code)",
        },
        dataType: {
          type: "string",
          enum: ["prices", "inventory", "days-on-market", "rental-rates", "market-trends"],
          description: "Type of market data to scrape",
          default: "prices",
        },
        timeRange: {
          type: "string",
          enum: ["1-month", "3-months", "6-months", "1-year", "5-years"],
          description: "Time range for historical data",
          default: "6-months",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "scrape_agent_data",
    description: "Scrape real estate agent information and contact details",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location to search for agents",
        },
        specialty: {
          type: "string",
          enum: ["residential", "commercial", "luxury", "investment", "property-management"],
          description: "Agent specialty to filter by",
        },
        limit: {
          type: "number",
          description: "Maximum number of agents to scrape",
          default: 25,
        },
      },
      required: ["location"],
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

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "scrape_url": {
        // Use the modular scrape handler
        return await scrape.handler(args);
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

      case "scrape_real_estate_listings": {
        const { location, propertyType, priceRange, beds, baths, limit = 50 } = args as {
          location: string;
          propertyType?: string;
          priceRange?: { min?: number; max?: number };
          beds?: number;
          baths?: number;
          limit?: number;
        };

        try {
          // Build search URL for Zillow (or other real estate sites)
          const baseUrl = "https://www.zillow.com/homes/";
          const searchParams = [];
          
          if (propertyType && propertyType !== "single-family") {
            searchParams.push(propertyType.replace("-", "_"));
          }
          
          if (priceRange?.min || priceRange?.max) {
            const priceFilter = [];
            if (priceRange.min) priceFilter.push(priceRange.min);
            if (priceRange.max) priceFilter.push(priceRange.max);
            searchParams.push(priceFilter.join("-"));
          }
          
          if (beds) searchParams.push(`${beds}-beds`);
          if (baths) searchParams.push(`${baths}-baths`);
          
          const searchUrl = `${baseUrl}${location.toLowerCase().replace(/\s+/g, "-")}_rb/${searchParams.join("/")}/`;

          // Use TinyFish API to scrape the listings
          const tinyFishUrl = process.env.TINYFISH_API_URL || 'https://api.tinyfish.io/v1/scrape';
          
          const response = await fetch(tinyFishUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.TINYFISH_API_KEY || 'demo-key'}`,
              'User-Agent': 'RE-Engine/1.0'
            },
            body: JSON.stringify({
              url: searchUrl,
              extract: 'listings',
              selector: '.list-card',
              limit: limit
            })
          });

          if (!response.ok) {
            throw new Error(`TinyFish API error: ${response.status}`);
          }

          const data = await response.json();
          
          // Process and format listings data
          const listings = data.data?.listings || [];
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  location,
                  propertyType,
                  listings: listings.slice(0, limit),
                  totalFound: listings.length,
                  scrapedAt: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error('Real estate scraping error:', error);
          
          // Fallback to mock real estate data
          const mockListings = [
            {
              id: "1",
              address: "123 Main St, Austin, TX 78701",
              price: 450000,
              beds: 3,
              baths: 2,
              sqft: 1850,
              yearBuilt: 2010,
              propertyType: propertyType || "single-family",
              url: "https://zillow.com/homedetails/123-main-st",
              images: ["https://photos.zillow.com/1.jpg"],
              description: "Beautiful home in downtown Austin"
            },
            {
              id: "2", 
              address: "456 Oak Ave, Austin, TX 78702",
              price: 375000,
              beds: 2,
              baths: 2,
              sqft: 1450,
              yearBuilt: 2005,
              propertyType: propertyType || "single-family",
              url: "https://zillow.com/homedetails/456-oak-ave",
              images: ["https://photos.zillow.com/2.jpg"],
              description: "Cozy home in East Austin"
            }
          ];

          const filteredListings = mockListings.filter(listing => {
            if (priceRange?.min && listing.price < priceRange.min) return false;
            if (priceRange?.max && listing.price > priceRange.max) return false;
            if (beds && listing.beds < beds) return false;
            if (baths && listing.baths < baths) return false;
            return true;
          }).slice(0, limit);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  location,
                  propertyType,
                  listings: filteredListings,
                  totalFound: filteredListings.length,
                  scrapedAt: new Date().toISOString(),
                  note: "Using mock data - TinyFish API unavailable"
                }, null, 2),
              },
            ],
          };
        }
      }

      case "scrape_market_data": {
        const { location, dataType = "prices", timeRange = "6-months" } = args as {
          location: string;
          dataType?: string;
          timeRange?: string;
        };

        try {
          // Build market data URL
          const marketUrl = `https://www.zillow.com/${location.toLowerCase().replace(/\s+/g, "-")}/home-values/`;

          const tinyFishUrl = process.env.TINYFISH_API_URL || 'https://api.tinyfish.io/v1/scrape';
          
          const response = await fetch(tinyFishUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.TINYFISH_API_KEY || 'demo-key'}`,
              'User-Agent': 'RE-Engine/1.0'
            },
            body: JSON.stringify({
              url: marketUrl,
              extract: 'market-data',
              dataType: dataType,
              timeRange: timeRange
            })
          });

          if (!response.ok) {
            throw new Error(`TinyFish API error: ${response.status}`);
          }

          const data = await response.json();
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  location,
                  dataType,
                  timeRange,
                  marketData: data.data,
                  scrapedAt: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error('Market data scraping error:', error);
          
          // Fallback to mock market data
          const mockMarketData = {
            medianPrice: 425000,
            pricePerSqft: 225,
            daysOnMarket: 45,
            inventory: 1200,
            priceTrend: {
              "1-month": 2.5,
              "3-months": 5.2,
              "6-months": 8.7,
              "1-year": 15.3
            },
            inventoryTrend: {
              "1-month": -5.2,
              "3-months": -8.1,
              "6-months": -12.4,
              "1-year": -18.7
            }
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  location,
                  dataType,
                  timeRange,
                  marketData: mockMarketData,
                  scrapedAt: new Date().toISOString(),
                  note: "Using mock data - TinyFish API unavailable"
                }, null, 2),
              },
            ],
          };
        }
      }

      case "scrape_agent_data": {
        const { location, specialty, limit = 25 } = args as {
          location: string;
          specialty?: string;
          limit?: number;
        };

        try {
          // Build agent search URL
          const agentUrl = `https://www.zillow.com/${location.toLowerCase().replace(/\s+/g, "-")}/real-estate-agents/`;

          const tinyFishUrl = process.env.TINYFISH_API_URL || 'https://api.tinyfish.io/v1/scrape';
          
          const response = await fetch(tinyFishUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.TINYFISH_API_KEY || 'demo-key'}`,
              'User-Agent': 'RE-Engine/1.0'
            },
            body: JSON.stringify({
              url: agentUrl,
              extract: 'agents',
              specialty: specialty,
              limit: limit
            })
          });

          if (!response.ok) {
            throw new Error(`TinyFish API error: ${response.status}`);
          }

          const data = await response.json();
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  location,
                  specialty,
                  agents: data.data?.agents || [],
                  totalFound: data.data?.agents?.length || 0,
                  scrapedAt: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error('Agent data scraping error:', error);
          
          // Fallback to mock agent data
          const mockAgents = [
            {
              id: "1",
              name: "John Smith",
              brokerage: "Austin Real Estate Group",
              phone: "(512) 555-0123",
              email: "john@austinrealestate.com",
              specialties: ["residential", "luxury"],
              experience: 8,
              salesVolume: 12500000,
              rating: 4.8,
              reviews: 127,
              profileUrl: "https://www.zillow.com/profile/john-smith"
            },
            {
              id: "2",
              name: "Sarah Johnson", 
              brokerage: "Capital City Properties",
              phone: "(512) 555-0456",
              email: "sarah@capitalcity.com",
              specialties: ["residential", "investment"],
              experience: 12,
              salesVolume: 18500000,
              rating: 4.9,
              reviews: 203,
              profileUrl: "https://www.zillow.com/profile/sarah-johnson"
            }
          ];

          const filteredAgents = specialty 
            ? mockAgents.filter(agent => agent.specialties.includes(specialty))
            : mockAgents;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  location,
                  specialty,
                  agents: filteredAgents.slice(0, limit),
                  totalFound: filteredAgents.length,
                  scrapedAt: new Date().toISOString(),
                  note: "Using mock data - TinyFish API unavailable"
                }, null, 2),
              },
            ],
          };
        }
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
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
