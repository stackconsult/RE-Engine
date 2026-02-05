// MCP Server Authentication Integration Template
// Add this to each MCP server's index.ts

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Authentication configuration
const SERVICE_CONFIG = {
  serviceId: process.env.SERVICE_ID || 'reengine-browser',
  apiKey: process.env.API_KEY || 'browser-key-dev',
  authUrl: process.env.AUTH_URL || 'http://localhost:3001/auth/token'
};

// Get JWT token for service authentication
async function getServiceToken(): Promise<string> {
  try {
    const response = await fetch(SERVICE_CONFIG.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERVICE_CONFIG.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const { token } = await response.json();
    return token;
  } catch (error) {
    console.error('Failed to get service token:', error);
    throw error;
  }
}

// Authenticated fetch wrapper
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getServiceToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

// Initialize server with authentication
const server = new Server({
  name: SERVICE_CONFIG.serviceId,
  version: "0.1.0",
});

// Example: Tool with authentication
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "browser_automate") {
    try {
      // Use authenticated fetch for any external API calls
      const response = await authenticatedFetch('https://api.example.com/automate', {
        method: 'POST',
        body: JSON.stringify(args)
      });

      const result = await response.json();
      
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}` 
        }],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// Start server with authentication
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVICE_CONFIG.serviceId} MCP server running on stdio`);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
