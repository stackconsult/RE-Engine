import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    CallToolResultSchema,
    ListToolsResultSchema
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { Logger } from "../utils/logger.js";

export interface MCPClientConfig {
    name: string;
    command?: string;
    args?: string[];
    workingDirectory?: string;
    env?: Record<string, string>;
}

export class MCPClient {
    private client: Client;
    private transport: StdioClientTransport;
    private logger: Logger;
    private isConnected: boolean = false;
    private config: MCPClientConfig;

    constructor(config: MCPClientConfig) {
        this.config = config;
        this.logger = new Logger(`MCPClient-${config.name}`, true);

        // Default to a generic client info
        this.client = new Client(
            {
                name: "re-engine-orchestrator",
                version: "1.0.0",
            }
        );
    }

    /**
     * Connect to the MCP server
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        this.logger.info(`🔌 Connecting to MCP server: ${this.config.name}`);

        try {
            // Determine command and args
            // If not provided, assume it's a node script in the mcp directory
            const command = this.config.command || "node";
            const args = this.config.args || this.resolveDefaultArgs();

            this.logger.debug(`Spawning: ${command} ${args.join(" ")}`);

            this.transport = new StdioClientTransport({
                command,
                args,
                env: { ...process.env, ...this.config.env } as Record<string, string>
            });

            await this.client.connect(this.transport);
            this.isConnected = true;

            this.logger.info(`✅ Connected to MCP server: ${this.config.name}`);

            // Log available tools
            // const tools = await this.listTools();
            // this.logger.debug(`Available tools for ${this.config.name}:`, tools.map(t => t.name));

        } catch (error) {
            this.logger.error(`❌ Failed to connect to MCP server ${this.config.name}:`, error);
            throw error;
        }
    }

    /**
     * List available tools
     */
    async listTools(): Promise<any[]> {
        if (!this.isConnected) {
            throw new Error("Client not connected");
        }

        const result = await this.client.listTools();
        return result.tools;
    }

    /**
     * Call a tool
     */
    async callTool(toolName: string, args: any): Promise<any> {
        if (!this.isConnected) {
            throw new Error("Client not connected");
        }

        this.logger.debug(`🛠️ Calling tool ${toolName} on ${this.config.name}`);

        try {
            const result = await this.client.callTool({
                name: toolName,
                arguments: args
            });

            // Parse result content
            // MCP returns content array, we successfully return the first text block or the whole thing
            return result;
        } catch (error) {
            this.logger.error(`❌ Tool execution failed: ${toolName}`, error);
            throw error;
        }
    }

    /**
     * Disconnect from the server
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        this.logger.info(`🔌 Disconnecting from ${this.config.name}`);
        await this.client.close();
        this.isConnected = false;
    }

    private resolveDefaultArgs(): string[] {
        // Assumption: we are running from RE-Engine/engine
        // MCP servers are in RE-Engine/mcp/<name>/dist/index.js

        // Map simplified names to directory names
        const dirMap: Record<string, string> = {
            'reengine-tinyfish': 'reengine-tinyfish',
            'reengine-vertexai': 'reengine-vertexai',
            // Add others as needed
        };

        const dirName = dirMap[this.config.name] || this.config.name;

        // Construct path relative to CWD (which should be engine/)
        // We go up one level then into mcp/
        const scriptPath = path.resolve(process.cwd(), `../mcp/${dirName}/dist/index.js`);

        return [scriptPath];
    }
}
