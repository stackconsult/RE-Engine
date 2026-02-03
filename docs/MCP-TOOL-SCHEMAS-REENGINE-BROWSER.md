# MCP Tool Schemas — reengine-browser (Playwright Horde)

This document defines **exact** MCP tools for the browser-agent horde.

Goal: deterministic orchestration of many tab/browser jobs with optional human handoff.

---

## Conventions
- All tools return structured JSON.
- All tools include:
  - `correlationId` (string)
  - `jobId` (string)
  - `status` (enum)
  - `artifacts` (paths/URLs when available)
- No secrets in outputs.

---

## 1) browser.job.submit
### Input schema
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "url": {"type": "string"},
    "profile": {"type": "string", "description": "profile name, e.g. openclaw"},
    "maxTabs": {"type": "integer", "minimum": 1, "maximum": 50},
    "priority": {"type": "integer", "minimum": 0, "maximum": 10},
    "handoffAllowed": {"type": "boolean"},
    "task": {
      "type": "object",
      "properties": {
        "type": {"type": "string", "description": "navigate|extract|login|message|custom"},
        "selectors": {"type": "array", "items": {"type": "string"}},
        "extract": {"type": "object"}
      },
      "required": ["type"]
    }
  },
  "required": ["correlationId", "url", "task"]
}
```

### Output schema
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "jobId": {"type": "string"},
    "status": {"type": "string", "enum": ["QUEUED"]}
  },
  "required": ["correlationId", "jobId", "status"]
}
```

---

## 2) browser.job.status
### Input
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "jobId": {"type": "string"}
  },
  "required": ["correlationId", "jobId"]
}
```

### Output
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "jobId": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["QUEUED","DISPATCHED","RUNNING","WAITING_FOR_HUMAN","RESUMED","SUCCEEDED","FAILED","CANCELLED"]
    },
    "progress": {"type": "number", "minimum": 0, "maximum": 1},
    "summary": {"type": "string"},
    "finalUrl": {"type": "string"},
    "artifacts": {
      "type": "object",
      "properties": {
        "trace": {"type": "string"},
        "screenshot": {"type": "string"},
        "video": {"type": "string"},
        "networkLog": {"type": "string"}
      }
    },
    "error": {"type": "string"}
  },
  "required": ["correlationId", "jobId", "status"]
}
```

---

## 3) browser.job.cancel
### Input
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "jobId": {"type": "string"},
    "reason": {"type": "string"}
  },
  "required": ["correlationId", "jobId"]
}
```

### Output
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "jobId": {"type": "string"},
    "status": {"type": "string", "enum": ["CANCELLED"]}
  },
  "required": ["correlationId", "jobId", "status"]
}
```

---

## 4) browser.job.resume
For human handoff completion.

### Input
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "jobId": {"type": "string"},
    "note": {"type": "string"}
  },
  "required": ["correlationId", "jobId"]
}
```

### Output
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "jobId": {"type": "string"},
    "status": {"type": "string", "enum": ["RESUMED"]}
  },
  "required": ["correlationId", "jobId", "status"]
}
```

---

## 5) browser.snapshot.extract_structured
### Input
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "url": {"type": "string"},
    "profile": {"type": "string"},
    "schema": {"type": "object", "description": "desired output schema"}
  },
  "required": ["correlationId", "url", "schema"]
}
```

### Output
```json
{
  "type": "object",
  "properties": {
    "correlationId": {"type": "string"},
    "finalUrl": {"type": "string"},
    "data": {"type": "object"},
    "artifacts": {"type": "object"}
  },
  "required": ["correlationId", "data"]
}
```

