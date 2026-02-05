import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Authentication configuration
const SERVICE_CONFIG = {
  serviceId: process.env.SERVICE_ID || 'reengine-core',
  apiKey: process.env.CORE_API_KEY || process.env.DEFAULT_API_KEY || 'dev-key-placeholder',
  authUrl: process.env.AUTH_URL || 'http://localhost:3001/auth/token'
};

// Get JWT token for service authentication with graceful fallback
async function getServiceToken(): Promise<string | null> {
  // Skip authentication in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔓 Development mode: Skipping JWT authentication');
    return null;
  }

  try {
    const response = await fetch(SERVICE_CONFIG.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERVICE_CONFIG.apiKey
      },
      body: JSON.stringify({ serviceId: SERVICE_CONFIG.serviceId })
    });

    if (!response.ok) {
      console.warn(`⚠️ Auth failed (${response.status}), continuing without token`);
      return null;
    }

    const { token } = await response.json();
    console.log('✅ JWT token obtained successfully');
    return token;
  } catch (error) {
    console.warn('⚠️ Auth service unavailable, continuing without token:', (error as Error).message);
    return null;
  }
}

// Authenticated fetch wrapper with fallback
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getServiceToken();
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

import { LocalMCPIntegration } from "./local-integration.js";

// Initialize local integration
const engine = new LocalMCPIntegration();

const server = new Server(
  {
    name: "reengine-core",
    version: "0.1.0",
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "approvals_list",
        description: "List all approvals, optionally filtered by status",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Filter by approval status (pending, approved, rejected, sent, failed)",
              enum: ["pending", "approved", "rejected", "sent", "failed"]
            }
          }
        }
      },
      {
        name: "approvals_approve",
        description: "Approve a pending approval",
        inputSchema: {
          type: "object",
          properties: {
            approval_id: {
              type: "string",
              description: "The approval ID to approve"
            },
            approved_by: {
              type: "string", 
              description: "Who is approving this",
              default: "windsurf"
            }
          },
          required: ["approval_id"]
        }
      },
      {
        name: "approvals_reject",
        description: "Reject a pending approval",
        inputSchema: {
          type: "object",
          properties: {
            approval_id: {
              type: "string",
              description: "The approval ID to reject"
            },
            reason: {
              type: "string",
              description: "Reason for rejection",
              default: "rejected"
            },
            rejected_by: {
              type: "string",
              description: "Who is rejecting this", 
              default: "windsurf"
            }
          },
          required: ["approval_id"]
        }
      },
      {
        name: "leads_import_csv",
        description: "Import leads from CSV data",
        inputSchema: {
          type: "object",
          properties: {
            csv_data: {
              type: "string",
              description: "CSV data with headers: lead_id,first_name,last_name,email,phone_e164,city,province,source,tags,status,created_at"
            }
          },
          required: ["csv_data"]
        }
      },
      {
        name: "events_query",
        description: "Query events with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            lead_id: {
              type: "string",
              description: "Filter by lead ID"
            },
            channel: {
              type: "string",
              description: "Filter by channel"
            },
            event_type: {
              type: "string", 
              description: "Filter by event type"
            },
            limit: {
              type: "number",
              description: "Maximum number of events to return",
              default: 100
            }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "approvals_list": {
        const status = args?.status as string;
        const approvals = await engine.listApprovals(status);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(approvals, null, 2)
            }
          ]
        };
      }

      case "approvals_approve": {
        const approvalId = args?.approval_id as string;
        const approvedBy = args?.approved_by as string || "windsurf";
        
        const approval = await engine.approveApproval(approvalId, approvedBy);
        if (!approval) {
          throw new McpError(ErrorCode.InvalidRequest, `Approval ${approvalId} not found or cannot be approved`);
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ message: `Approval ${approvalId} approved successfully`, approval }, null, 2)
            }
          ]
        };
      }

      case "approvals_reject": {
        const approvalId = args?.approval_id as string;
        const reason = args?.reason as string || "rejected";
        const rejectedBy = args?.rejected_by as string || "windsurf";
        
        const approval = await engine.rejectApproval(approvalId, reason);
        if (!approval) {
          throw new McpError(ErrorCode.InvalidRequest, `Approval ${approvalId} not found or cannot be rejected`);
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ message: `Approval ${approvalId} rejected successfully`, approval }, null, 2)
            }
          ]
        };
      }

      case "leads_import_csv": {
        const csvData = args?.csv_data as string;
        
        // Basic CSV parsing - in production would use proper CSV library
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',');
        const leads = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const lead: any = {};
          headers.forEach((header, index) => {
            lead[header.trim()] = values[index]?.trim() || '';
          });
          leads.push(lead);
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ message: `Imported ${leads.length} leads`, leads }, null, 2)
            }
          ]
        };
      }

      case "events_query": {
        // Mock events data
        const events = [
          {
            event_id: uuidv4(),
            ts: new Date().toISOString(),
            lead_id: args?.lead_id || "lead_1",
            channel: args?.channel || "email",
            event_type: args?.event_type || "sent",
            campaign: "reengine",
            message_id: "msg_123",
            meta_json: "{}"
          }
        ];
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(events, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, String(error));
  }
});

// Start the server
async function main() {
  try {
    // Initialize RE Engine integration
    await engine.initialize();
    console.error("RE Engine integration initialized");
  } catch (error) {
    console.error("Failed to initialize RE Engine:", error);
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RE Engine Core MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
