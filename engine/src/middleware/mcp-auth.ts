import express from 'express';
import { serviceAuthMiddleware, AuthenticatedRequest, generateServiceToken } from './service-auth.js';

// Add authentication to MCP server routes
export function addMCPAuthentication(app: express.Application, mcpName: string, requiredPermission: string = 'write') {
  // MCP server authentication endpoint
  app.post(`/mcp/${mcpName}/auth`, serviceAuthMiddleware('admin'), (req: AuthenticatedRequest, res) => {
    const service = req.service!;

    const token = generateServiceToken(service);

    res.json({
      token,
      expiresIn: 3600,
      service: mcpName
    });
  });

  // Protect MCP server routes
  app.use(`/mcp/${mcpName}`, serviceAuthMiddleware(requiredPermission));
}

// Usage in main app:
// addMCPAuthentication(app, 'browser', 'write');
// addMCPAuthentication(app, 'tinyfish', 'write');
// addMCPAuthentication(app, 'llama', 'write');
// addMCPAuthentication(app, 'core', 'admin');
// addMCPAuthentication(app, 'outreach', 'write');
