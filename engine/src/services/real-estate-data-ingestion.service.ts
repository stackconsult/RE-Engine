/**
 * Real Estate Data Ingestion Service
 * Integrates with TinyFish MCP to pull real real estate data
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface ScrapingParams {
  location: string;
  propertyType?: 'single-family' | 'multi-family' | 'condo' | 'townhouse' | 'land';
  priceRange?: { min?: number; max?: number };
  beds?: number;
  baths?: number;
  limit?: number;
}

export interface MarketDataParams {
  location: string;
  dataType?: 'prices' | 'inventory' | 'days-on-market' | 'rental-rates' | 'market-trends';
  timeRange?: '1-month' | '3-months' | '6-months' | '1-year' | '5-years';
}

export interface AgentDataParams {
  location: string;
  specialty?: 'residential' | 'commercial' | 'luxury' | 'investment' | 'property-management';
  limit?: number;
}

export interface PropertyListing {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  propertyType: string;
  url: string;
  images: string[];
  description: string;
  scrapedAt: string;
}

export interface MarketData {
  medianPrice: number;
  pricePerSqft: number;
  daysOnMarket: number;
  inventory: number;
  priceTrend: Record<string, number>;
  inventoryTrend: Record<string, number>;
  scrapedAt: string;
}

export interface AgentData {
  id: string;
  name: string;
  brokerage: string;
  phone: string;
  email: string;
  specialties: string[];
  experience: number;
  salesVolume: number;
  rating: number;
  reviews: number;
  profileUrl: string;
  scrapedAt: string;
}

export interface IngestionResult {
  listings: PropertyListing[];
  marketData?: MarketData;
  agents?: AgentData[];
  totalListings: number;
  totalAgents: number;
  location: string;
  scrapedAt: string;
  errors?: string[];
}

export class RealEstateDataIngestionService extends EventEmitter {
  private mcpProcess: any;
  private isConnected: boolean = false;
  private requestId: number = 1;

  constructor() {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Start TinyFish MCP server
        this.mcpProcess = spawn('node', ['dist/index.ts'], {
          cwd: '/Users/kirtissiemens/Documents/re-engine/RE-Engine/mcp/reengine-tinyfish',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.mcpProcess.stdout.on('data', (data: Buffer) => {
          this.handleServerResponse(data.toString());
        });

        this.mcpProcess.stderr.on('data', (data: Buffer) => {
          console.error('TinyFish MCP Error:', data.toString());
        });

        this.mcpProcess.on('error', (error: Error) => {
          console.error('TinyFish MCP Process Error:', error);
          reject(error);
        });

        this.mcpProcess.on('close', (code: number | null) => {
          console.log(`TinyFish MCP Process exited with code ${code}`);
          this.isConnected = false;
        });

        // Wait for server to be ready
        setTimeout(() => {
          this.isConnected = true;
          console.log('TinyFish MCP Server connected');
          resolve();
        }, 2000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleServerResponse(data: string): void {
    try {
      const lines = data.trim().split('\n');
      for (const line of lines) {
        if (line.startsWith('{') && line.endsWith('}')) {
          const response = JSON.parse(line);
          this.emit('response', response);
        }
      }
    } catch (error) {
      console.error('Failed to parse server response:', error);
    }
  }

  private async sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('TinyFish MCP Server not connected'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id: this.requestId++
      };

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const onResponse = (response: Record<string, unknown>) => {
        if (response.id === request.id) {
          clearTimeout(timeout);
          this.removeListener('response', onResponse);
          
          if (response.error) {
            reject(new Error(String(response.error)));
          } else {
            resolve(response.result);
          }
        }
      };

      this.on('response', onResponse);
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async scrapeListings(params: ScrapingParams): Promise<PropertyListing[]> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'scrape_real_estate_listings',
        arguments: params
      }) as Record<string, unknown>;

      if (result && typeof result === 'object' && 'content' in result) {
        const content = (result as any).content;
        if (content && content[0]) {
          const data = JSON.parse(content[0].text);
          return data.listings || [];
        }
      }

      return [];
    } catch (error) {
      console.error('Failed to scrape listings:', error);
      throw error;
    }
  }

  async scrapeMarketData(params: MarketDataParams): Promise<MarketData> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'scrape_market_data',
        arguments: params
      }) as Record<string, unknown>;

      if (result && typeof result === 'object' && 'content' in result) {
        const content = (result as any).content;
        if (content && content[0]) {
          const data = JSON.parse(content[0].text);
          return data.marketData || {};
        }
      }

      throw new Error('No market data returned');
    } catch (error) {
      console.error('Failed to scrape market data:', error);
      throw error;
    }
  }

  async scrapeAgentData(params: AgentDataParams): Promise<AgentData[]> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'scrape_agent_data',
        arguments: params
      }) as Record<string, unknown>;

      if (result && typeof result === 'object' && 'content' in result) {
        const content = (result as any).content;
        if (content && content[0]) {
          const data = JSON.parse(content[0].text);
          return data.agents || [];
        }
      }

      return [];
    } catch (error) {
      console.error('Failed to scrape agent data:', error);
      throw error;
    }
  }

  async ingestRealEstateData(location: string, options: {
    includeMarketData?: boolean;
    includeAgents?: boolean;
    listingParams?: Partial<ScrapingParams>;
  } = {}): Promise<IngestionResult> {
    const errors: string[] = [];
    const scrapedAt = new Date().toISOString();

    try {
      console.log(`Starting real estate data ingestion for ${location}...`);

      // 1. Scrape property listings
      console.log('Scraping property listings...');
      const listings = await this.scrapeListings({
        location,
        limit: 50,
        ...options.listingParams
      });

      console.log(`Scraped ${listings.length} property listings`);

      // 2. Scrape market data (optional)
      let marketData: MarketData | undefined;
      if (options.includeMarketData) {
        try {
          console.log('Scraping market data...');
          marketData = await this.scrapeMarketData({
            location,
            dataType: 'prices',
            timeRange: '6-months'
          });
          console.log('Market data scraped successfully');
        } catch (error) {
          const errorMsg = `Failed to scrape market data: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 3. Scrape agent data (optional)
      let agents: AgentData[] = [];
      if (options.includeAgents) {
        try {
          console.log('Scraping agent data...');
          agents = await this.scrapeAgentData({
            location,
            specialty: 'residential',
            limit: 25
          });
          console.log(`Scraped ${agents.length} agents`);
        } catch (error) {
          const errorMsg = `Failed to scrape agent data: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const result: IngestionResult = {
        listings,
        marketData,
        agents,
        totalListings: listings.length,
        totalAgents: agents.length,
        location,
        scrapedAt,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log(`Data ingestion completed for ${location}:`);
      console.log(`  - ${result.totalListings} listings`);
      console.log(`  - ${result.totalAgents} agents`);
      console.log(`  - Market data: ${result.marketData ? 'Yes' : 'No'}`);
      if (errors.length > 0) {
        console.log(`  - Errors: ${errors.length}`);
      }

      return result;

    } catch (error) {
      const errorMsg = `Data ingestion failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  async disconnect(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!this.mcpProcess.killed) {
        this.mcpProcess.kill('SIGKILL');
      }
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const realEstateDataIngestion = new RealEstateDataIngestionService();
