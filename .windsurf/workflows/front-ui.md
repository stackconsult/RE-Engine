---
auto_execution_mode: 3
---
You're absolutely right - I apologize for that error. Let me rewrite the skill properly without any pricing information, focused purely on the technical deployment for real estate agents.

***

## Skill Structure

Create this in your repo: `.windsurf/skills/deploy-reengine-vercel/`

### SKILL.md

```markdown
---
name: deploy-reengine-vercel
description: Deploy the RE Engine monorepo to Vercel from GitHub with full MCP server integration, hybrid AI routing (Vertex AI + Ollama), Supabase + Neon database connections, WhatsApp webhook handling, and production-ready configuration for real estate automation.
version: 1.0.0
tags: [deployment, vercel, production, mcp, ai-agents]
---

# Deploy RE Engine to Vercel

This skill automates the complete deployment of the RE Engine real estate automation platform to Vercel, ensuring all agentic systems, MCP servers, and database integrations work flawlessly in production.

## What This Skill Does

1. **Vercel Project Configuration**: Sets up monorepo deployment with correct root directory and build settings
2. **MCP Server Deployment**: Deploys all 5 MCP servers as Vercel Serverless Functions with optimal performance
3. **Environment Variable Management**: Secures all API keys (Whapi, Vertex AI, SpaceEmail, etc.) in Vercel
4. **Database Integration**: Connects Supabase (CRM/Auth/Realtime) and Neon (Postgres scaling) with connection pooling
5. **Hybrid AI Routing**: Configures Vercel AI SDK 6 for seamless switching between Cloud (Vertex AI) and Local (Ollama)
6. **WhatsApp Webhook Setup**: Deploys Edge Functions for sub-100ms WhatsApp message processing
7. **GitHub Actions CI/CD**: Automates testing, migration, and deployment pipeline
8. **Production UX Optimization**: Implements real-time approvals, lead scoring UI, and agentic design patterns

## Prerequisites Checklist

Before running this skill, ensure you have:

- [ ] GitHub repository for RE Engine with push access
- [ ] Vercel account connected to your GitHub account
- [ ] Supabase project created with connection string
- [ ] Neon database created with connection string
- [ ] Google Cloud Project (creditx-478204) with Vertex AI enabled
- [ ] Whapi.Cloud API key and channel ID
- [ ] All environment variables from your `.env` file documented

## Deployment Architecture

```
GitHub Repo (RE-Engine)
    ↓
Vercel Build System (Node.js 22)
    ↓
├── Frontend: web-dashboard (Next.js)
├── MCP Servers: 5x Serverless Functions
│   ├── /api/mcp/vertexai
│   ├── /api/mcp/outreach
│   ├── /api/mcp/llama
│   ├── /api/mcp/tinyfish
│   └── /api/mcp/whapi
├── Webhooks: Edge Functions
│   └── /api/webhooks/whatsapp
└── Database Connections
    ├── Supabase (Auth, Realtime, CRM)
    └── Neon (High-performance Postgres)
```

## Step-by-Step Deployment Process

### Phase 1: Vercel Project Setup

1. **Create vercel.json in repo root**

```json
{
  "version": 2,
  "buildCommand": "npm run build && cd mcp && npm run build:all",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs22.x",
      "maxDuration": 300
    },
    "app/api/webhooks/**/*.ts": {
      "runtime": "edge",
      "maxDuration": 60
    }
  },
  "env": {
    "NODE_VERSION": "22"
  },
  "rewrites": [
    {
      "source": "/api/mcp/:path*",
      "destination": "/api/mcp/:path*"
    }
  ]
}
```

2. **Configure Vercel Project Settings**
   - Navigate to Vercel Dashboard → New Project
   - Import your GitHub RE-Engine repository
   - Framework Preset: **Next.js**
   - Root Directory: **`web-dashboard`**
   - Node.js Version: **22.x**
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Enable Monorepo Support**

In `web-dashboard/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@reengine/engine', '@reengine/mcp'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig;
```

### Phase 2: MCP Server Deployment

Create API route handlers for each MCP server in `web-dashboard/app/api/mcp/`:

**1. VertexAI Server** (`app/api/mcp/vertexai/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google-vertex';

export const runtime = 'nodejs';
export const maxDuration = 300;

const vertex = createGoogleGenerativeAI({
  project: process.env.VERTEX_AI_PROJECT_ID!,
  location: process.env.VERTEX_AI_REGION!,
});

export async function POST(req: NextRequest) {
  const { tool, params } = await req.json();
  
  // Route to your existing reengine-vertexai MCP server logic
  // Import and execute the appropriate tool
  
  return NextResponse.json({ success: true, data: result });
}

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    server: 'reengine-vertexai',
    version: '2.0'
  });
}
```

**2. WhatsApp Outreach Server** (`app/api/mcp/outreach/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { tool, params } = await req.json();
  
  // Import your 35+ Whapi.Cloud tools from reengine-outreach
  // Execute the requested tool with params
  
  return NextResponse.json({ success: true, data: result });
}

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    server: 'reengine-outreach',
    tools: 35
  });
}
```

**3. Local Ollama Proxy** (`app/api/mcp/llama/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { prompt, mode } = await req.json();
  
  if (mode === 'local') {
    // This is a client-side proxy - return configuration
    return NextResponse.json({
      endpoint: 'http://127.0.0.1:11434/v1',
      model: process.env.OLLAMA_MODEL
    });
  }
  
  // Server-side fallback can use cloud models
  return NextResponse.json({ success: true });
}
```

**4. TinyFish Scraper** (`app/api/mcp/tinyfish/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { url, action } = await req.json();
  
  // Your TinyFish MCP logic
  
  return NextResponse.json({ success: true, data: scrapedData });
}
```

**5. Whapi Optimal** (`app/api/mcp/whapi/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Official Whapi.Cloud MCP backup server
  return NextResponse.json({ success: true });
}
```

### Phase 3: Environment Variables Configuration

Add these to Vercel Dashboard → Settings → Environment Variables:

**AI Services**
```
VERTEX_AI_PROJECT_ID=creditx-478204
VERTEX_AI_REGION=us-central1
VERTEX_AI_MODEL=gemini-2.5-flash-lite
VERTEX_AI_API_KEY=[your-service-account-key]

OLLAMA_API_KEY=[your-key]
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.1:8b
```

**Database Connections**
```
NEXT_PUBLIC_SUPABASE_URL=[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

DATABASE_URL=postgresql://[user]:[pass]@[host]/[db]
DATABASE_URL_POOLED=postgresql://[user]:[pass]@[host]/[db]?pgbouncer=true
```

**Communication Services**
```
WHATSAPP_API_KEY=[whapi-cloud-key]
WHATSAPP_API_URL=https://gate.whapi.cloud
WHATSAPP_CHANNEL_ID=[your-channel-id]
WHATSAPP_WEBHOOK_URL=[your-vercel-url]/api/webhooks/whatsapp
WHATSAPP_PHONE_NUMBER=+[your-number]

SPACE_EMAIL_API_KEY=[your-key]
SPACE_EMAIL_IMAP_HOST=mail.spacemail.com
SPACE_EMAIL_SMTP_HOST=mail.spacemail.com

TELEGRAM_BOT_TOKEN=[your-bot-token]
```

**System Configuration**
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=[your-vercel-url]
STORAGE_MODE=postgres
```

### Phase 4: WhatsApp Webhook Edge Function

Create `web-dashboard/app/api/webhooks/whatsapp/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const payload = await req.json();
  
  // Verify Whapi.Cloud signature
  const signature = req.headers.get('x-whapi-signature');
  // Implement signature verification
  
  // Route to your reengine-outreach MCP server
  const mcpResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/mcp/outreach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'process_incoming_message',
      params: payload
    })
  });
  
  const result = await mcpResponse.json();
  
  return NextResponse.json({ 
    success: true,
    processed: true,
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  // Webhook verification endpoint
  return NextResponse.json({ 
    status: 'active',
    webhook: 'whatsapp',
    version: '1.0'
  });
}
```

### Phase 5: Hybrid AI Mode Implementation

Create `web-dashboard/lib/ai-provider.ts`:

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google-vertex';
import { useState } from 'react';

export type AIMode = 'cloud' | 'local';

export function getAIProvider(mode: AIMode) {
  if (mode === 'local') {
    // Local Ollama - OpenAI-compatible endpoint
    return createOpenAI({
      baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
      apiKey: process.env.OLLAMA_API_KEY || 'ollama',
    })(process.env.OLLAMA_MODEL || 'llama3.1:8b');
  }
  
  // Cloud Vertex AI (Gemini)
  return createGoogleGenerativeAI({
    project: process.env.VERTEX_AI_PROJECT_ID!,
    location: process.env.VERTEX_AI_REGION!,
  })(process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash-lite');
}

// Hook for React components
export function useAIMode() {
  const [mode, setMode] = useState<AIMode>('cloud');
  const [provider, setProvider] = useState(() => getAIProvider('cloud'));
  
  const toggleMode = () => {
    const newMode = mode === 'cloud' ? 'local' : 'cloud';
    setMode(newMode);
    setProvider(getAIProvider(newMode));
  };
  
  return { mode, provider, toggleMode };
}
```

### Phase 6: GitHub Actions CI/CD Pipeline

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy RE Engine

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '22'

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint code
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test
      
      - name: Build engine
        run: npm run build
      
      - name: Build MCP servers
        run: |
          cd mcp
          npm run build:all
      
      - name: Build web dashboard
        run: |
          cd web-dashboard
          npm run build
  
  migrate-database:
    needs: test-and-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Run CSV to Postgres migration
        run: npm run migrate:postgres
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  
  deploy-vercel:
    needs: [test-and-build, migrate-database]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          
      - name: Post-deployment health check
        run: |
          sleep 10
          curl -f ${{ secrets.VERCEL_URL }}/api/mcp/vertexai || exit 1
          curl -f ${{ secrets.VERCEL_URL }}/api/mcp/outreach || exit 1
```

### Phase 7: Production UX Implementation

**Dashboard Layout** (`web-dashboard/app/dashboard/page.tsx`):

```typescript
'use client';

import { useState } from 'react';
import { useAIMode } from '@/lib/ai-provider';
import { RealtimeLeadQueue } from '@/components/realtime-lead-queue';
import { AIChat } from '@/components/ai-chat';
import { MagicScoreGauge } from '@/components/magic-score-gauge';
import { ModeToggle } from '@/components/mode-toggle';

export default function Dashboard() {
  const { mode, provider, toggleMode } = useAIMode();
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">RE Engine</h1>
          <MagicScoreGauge score={89.5} />
        </div>
        <ModeToggle mode={mode} onToggle={toggleMode} />
      </header>
      
      {/* Dual-Pane Layout */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        {/* Left: AI Chat Interface */}
        <AIChat provider={provider} mode={mode} />
        
        {/* Right: Live Lead Queue */}
        <RealtimeLeadQueue />
      </div>
    </div>
  );
}
```

**Real-time Approval Queue** (`components/realtime-lead-queue.tsx`):

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RealtimeLeadQueue() {
  const [approvals, setApprovals] = useState([]);
  const supabase = createClient();
  
  useEffect(() => {
    // Subscribe to realtime updates
    const channel = supabase
      .channel('approvals')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'approvals' },
        (payload) => {
          setApprovals(prev => [payload.new, ...prev]);
          // Show toast notification
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const handleApprove = async (id: string) => {
    // Call MCP outreach server to send message
    await fetch('/api/mcp/outreach', {
      method: 'POST',
      body: JSON.stringify({
        tool: 'approve_and_send',
        params: { approval_id: id }
      })
    });
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Approval Queue</h2>
      {approvals.map(approval => (
        <ApprovalCard 
          key={approval.id}
          approval={approval}
          onApprove={handleApprove}
        />
      ))}
    </div>
  );
}
```

### Phase 8: Post-Deployment Verification

**Automated Health Check Script** (`scripts/verify-deployment.sh`):
