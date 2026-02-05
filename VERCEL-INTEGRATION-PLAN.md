# Vercel Integration Plan for RE Engine
# Phase 6 Frontend Deployment & UI Integration

## 🎯 **Mission Overview**

Deploy the RE Engine monorepo to Vercel with a comprehensive UI that captures all system capabilities, including:
- Web Dashboard for real estate operations
- MCP Server deployment as serverless functions
- Hybrid AI strategy (Vertex AI + Ollama)
- Real-time WhatsApp integration
- Lead management and approval workflows

---

## 🏗️ **Vercel Architecture for RE Engine**

### **Monorepo Structure Mapping**
```
RE-Engine/
├── web-dashboard/              # React Frontend (Primary Vercel App)
├── engine/                     # Backend API (Serverless Functions)
├── mcp/                        # MCP Servers (Serverless Functions)
├── playwright/                 # Browser automation (Serverless Functions)
└── docs/                       # Documentation (Vercel Static Site)
```

### **Vercel Projects Configuration**

#### **1. Primary Web Dashboard**
- **Root Directory:** `web-dashboard`
- **Framework:** Next.js/React
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** Full integration

#### **2. Engine API Serverless**
- **Root Directory:** `engine`
- **Framework:** Node.js
- **Build Command:** `npm run build`
- **Function Directory:** `api/`
- **Max Duration:** 300s (for AI operations)

#### **3. MCP Servers Hub**
- **Root Directory:** `mcp`
- **Framework:** Node.js
- **Function Prefix:** `mcp/`
- **Individual Servers:** Each MCP as separate function

#### **4. Documentation Site**
- **Root Directory:** `docs`
- **Framework:** Static Site
- **Build Command:** `npm run build`
- **Output Directory:** `_site`

---

## 🔧 **Implementation Steps**

### **Phase 1: Vercel Dependencies & Setup**

#### **Install Vercel Dependencies**
```bash
# Web Dashboard Dependencies
cd web-dashboard
npm install @vercel/node @vercel/static ai openai-edge
npm install @ai-sdk/openai @ai-sdk/google-vertex
npm install @supabase/supabase-js
npm install tailwindcss postcss autoprefixer
npm install @types/node

# Engine Dependencies
cd ../engine
npm install @vercel/node @vercel/static
npm install @ai-sdk/openai @ai-sdk/google-vertex
npm install @supabase/supabase-js
```

#### **Environment Configuration**
```bash
# Vercel Environment Variables
VERCEL_PROJECT_ID=your-project-id
VERCEL_ORG_ID=your-org-id
VERTEX_AI_PROJECT_ID=creditx-478204
VERTEX_AI_LOCATION=us-central1
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
WHAPI_TOKEN=your-whapi-token
WHATSAPP_WEBHOOK_URL=your-webhook-url
```

### **Phase 2: Web Dashboard Enhancement**

#### **Modern React Dashboard Setup**
```typescript
// web-dashboard/app/layout.tsx
import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { AIProvider } from '@/components/providers/ai-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <SupabaseProvider>
            <AIProvider>
              {children}
            </AIProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

#### **AI Mode Switch Component**
```typescript
// web-dashboard/components/ai-mode-switch.tsx
'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AIModeSwitch() {
  const [aiMode, setAiMode] = useState<'cloud' | 'local'>('cloud')
  const [isLocalAvailable, setIsLocalAvailable] = useState(false)

  useEffect(() => {
    // Check if local Ollama is available
    fetch('http://localhost:11434/api/tags')
      .then(() => setIsLocalAvailable(true))
      .catch(() => setIsLocalAvailable(false))
  }, [])

  const handleModeChange = (checked: boolean) => {
    setAiMode(checked ? 'local' : 'cloud')
    // Store preference in localStorage
    localStorage.setItem('ai-mode', checked ? 'local' : 'cloud')
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>AI Mode</CardTitle>
        <CardDescription>
          Switch between cloud Vertex AI and local Ollama
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="ai-mode"
            checked={aiMode === 'local'}
            onCheckedChange={handleModeChange}
            disabled={!isLocalAvailable && aiMode === 'cloud'}
          />
          <Label htmlFor="ai-mode">
            {aiMode === 'cloud' ? 'Cloud (Vertex AI)' : 'Local (Ollama)'}
          </Label>
        </div>
        {!isLocalAvailable && (
          <p className="text-sm text-muted-foreground">
            Local Ollama not detected. Install Ollama to use local mode.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

### **Phase 3: API Routes for Vercel**

#### **AI Chat API Route**
```typescript
// web-dashboard/app/api/chat/route.ts
import { generateText, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai/edge'

export const maxDuration = 300 // 5 minutes

export async function POST(req: Request) {
  const { messages, mode = 'cloud' } = await req.json()

  try {
    if (mode === 'local') {
      // Route to local Ollama
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          messages,
          stream: false
        })
      })
      
      const data = await response.json()
      return Response.json({ content: data.message.content })
    } else {
      // Use Vertex AI
      const result = await generateText({
        model: google('gemini-2.5-flash-lite'),
        messages,
        system: `You are a real estate AI assistant for the RE Engine. 
        Help with lead analysis, property recommendations, and communication strategies.
        Always provide professional, actionable advice.`,
      })
      
      return Response.json({ content: result.text })
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
```

#### **Lead Management API**
```typescript
// web-dashboard/app/api/leads/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ leads: data })
  } catch (error) {
    console.error('Leads API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const leadData = await request.json()

    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ lead: data })
  } catch (error) {
    console.error('Create Lead Error:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
```

### **Phase 4: MCP Server Integration**

#### **WhatsApp MCP Serverless Function**
```typescript
// web-dashboard/api/mcp/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { action, payload } = await request.json()
    
    switch (action) {
      case 'send_message':
        // Integrate with Whapi.Cloud
        const response = await fetch(`${process.env.WHAPI_URL}/messages/text`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        
        const result = await response.json()
        return NextResponse.json(result)
        
      case 'get_conversations':
        // Get WhatsApp conversations
        const conversations = await fetch(`${process.env.WHAPI_URL}/conversations`, {
          headers: {
            'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`
          }
        })
        
        return NextResponse.json(await conversations.json())
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('WhatsApp MCP Error:', error)
    return NextResponse.json(
      { error: 'WhatsApp operation failed' },
      { status: 500 }
    )
  }
}
```

### **Phase 5: Real-time Dashboard Components**

#### **Lead Approval Queue**
```typescript
// web-dashboard/components/lead-approval-queue.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: string
  message_content: string
  created_at: string
}

export function LeadApprovalQueue() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingLeads()
  }, [])

  const fetchPendingLeads = async () => {
    try {
      const response = await fetch('/api/leads?status=pending')
      const data = await response.json()
      setLeads(data.leads)
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (leadId: string, approved: boolean, message?: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, message })
      })
      
      if (response.ok) {
        fetchPendingLeads() // Refresh the queue
      }
    } catch (error) {
      console.error('Failed to approve lead:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Approval Queue</CardTitle>
        <CardDescription>
          Review and approve pending lead communications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading pending leads...</p>
        ) : leads.length === 0 ? (
          <p>No pending leads to review</p>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      {lead.first_name} {lead.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {lead.email} • {lead.phone}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {lead.status}
                  </Badge>
                </div>
                
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm">{lead.message_content}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproval(lead.id, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproval(lead.id, false)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 📋 **Vercel Configuration Files**

### **Root vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "web-dashboard/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "engine/src/**/*.ts",
      "use": "@vercel/node"
    },
    {
      "src": "mcp/*/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/web-dashboard/api/$1"
    },
    {
      "src": "/mcp/(.*)",
      "dest": "/mcp/$1"
    },
    {
      "src": "/engine/(.*)",
      "dest": "/engine/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/web-dashboard/$1"
    }
  ],
  "functions": {
    "web-dashboard/api/chat/route.ts": {
      "maxDuration": 300
    },
    "web-dashboard/api/mcp/*/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "VERTEX_AI_PROJECT_ID": "creditx-478204",
    "VERTEX_AI_LOCATION": "us-central1"
  }
}
```

### **Web Dashboard vercel.json**
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

---

## 🚀 **Deployment Strategy**

### **Step 1: Install Vercel CLI**
```bash
npm i -g vercel@latest
```

### **Step 2: Link Projects**
```bash
# From root directory
vercel link --repo

# Select and configure each project:
# 1. Web Dashboard (Root: web-dashboard)
# 2. Engine API (Root: engine)
# 3. MCP Servers (Root: mcp)
# 4. Documentation (Root: docs)
```

### **Step 3: Environment Setup**
```bash
# Pull environment variables
vercel env pull

# Set production environment
vercel env add VERCEL_ENVIRONMENT
vercel env add VERCEL_PROJECT_ID
vercel env add VERCEL_ORG_ID
```

### **Step 4: Deploy**
```bash
# Deploy all projects
vercel --prod

# Or deploy specific project
vercel --prod --scope web-dashboard
```

---

## 📊 **Success Metrics**

### **Performance Targets**
- **Page Load:** < 2 seconds
- **AI Response:** < 5 seconds (cloud), < 10 seconds (local)
- **API Response:** < 500ms
- **Real-time Updates:** < 200ms

### **User Experience Goals**
- **Mobile Responsive:** 100% compatibility
- **Offline Support:** Core functionality
- **Real-time Updates:** Live lead status
- **AI Mode Switching:** Seamless transitions

---

## 🎯 **Next Steps**

1. **Set up Vercel projects** for each directory
2. **Configure environment variables** for all services
3. **Enhance web dashboard** with modern React components
4. **Deploy MCP servers** as serverless functions
5. **Test AI mode switching** between cloud and local
6. **Integrate real-time updates** with Supabase
7. **Set up monitoring** and analytics

---

**Status:** Ready for Vercel deployment with comprehensive UI integration
