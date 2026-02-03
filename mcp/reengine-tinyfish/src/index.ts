import { McpServer } from "@tinyfish/mcp-server";
import { scrape } from "./tools/scrape.js";

const server = new McpServer({
  tools: {
    "tinyfish.scrape": scrape,
  },
});

server.start();
