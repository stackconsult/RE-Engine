import { Server } from "@tinyfish/mcp-server";
import { scrape } from "./tools/scrape.js";

const server = new Server({
  name: "reengine-tinyfish",
  version: "0.1.0",
});

server.addTool(scrape);

server.start().catch(console.error);
