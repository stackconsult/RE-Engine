# SLO / SLI / Alerting — RE Engine Production

This document defines measurable reliability targets and alert thresholds.

---

## 1) SLI definitions

### 1.1 Approval safety SLI (hard invariant)
- Metric: `unauthorized_send_count`
- Definition: number of sends where approval status was not `approved`
- Target: **0 forever**

### 1.2 Send success rate
- Metric: `send_success_rate = sent / (sent + failed)` per channel
- Targets:
  - email: ≥ 0.98
  - telegram: ≥ 0.99
  - whatsapp: ≥ 0.99

### 1.3 Job latency (browser horde)
- Metric: p95 `browser_job_duration_ms`
- Target: p95 ≤ 120s (tune per task type)

### 1.4 Handoff rate
- Metric: `handoff_rate = waiting_for_human / total_jobs`
- Target: depends on platform; track trend, alert on spikes

### 1.5 Queue depth
- Metric: `queue_depth`
- Target: stays under worker capacity; alert if grows monotonically for 15m

---

## 2) SLOs

### 2.1 Safety SLO
- Unauthorized sends: **0**.

### 2.2 Availability SLO (MCP servers)
- MCP server uptime: 99.9% (prod)
- Error budget: 0.1%

---

## 3) Alert thresholds

### P0 (page immediately)
- unauthorized_send_count > 0
- cron overlap detected with write corruption
- MCP server down for > 5 minutes

### P1
- send_success_rate drops below target for 10 minutes
- queue_depth increasing for 15 minutes

### P2
- handoff_rate increases 2x week baseline

---

## 4) Capacity planning

Given:
- W workers
- T avg seconds/job
Estimated throughput: jobs/min ≈ `W * 60 / T`

Use p95 times for safe planning.

---
