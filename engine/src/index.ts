// RE Engine Main Entry Point
// Complete Magical AI-Infused Automation System

// 🪄 Magical AI Automation System
export * from "./ai/magical-automation-engine.ts";
export * from "./ai/operational-agents.ts";
export * from "./ai/fixes-and-optimizations.ts";

// 🔄 Core orchestration components
export * from "./orchestration/master-orchestrator.ts";
export * from "./orchestration/workflow-execution-engine.ts";
export * from "./orchestration/intelligent-model-selector.ts";
export * from "./orchestration/component-manager.ts";
export * from "./orchestration/fallback-manager.ts";
export * from "./orchestration/guardrail-system.ts";
export * from "./orchestration/resource-manager.ts";
export * from "./orchestration/performance-monitor.ts";

// 📋 Types and utilities
export * from "./types/orchestration.types.ts";
export * from "./utils/logger.ts";

// 🔄 Workflow system
export * from "./workflows/real-estate-workflows.ts";
export * from "./services/workflow-service.ts";

// 🌐 API layer
export * from "./api/server.ts";
export * from "./api/workflow-api.ts";

// 🖥️ CLI tool
export * from "./cli.ts";

// 📚 Legacy exports for backward compatibility
export * from "./shared/types.ts";
export * from "./domain/schemas.ts";
export * from "./observability/logger.ts";
export * from "./store/store.ts";
export * from "./store/csv/csvStore.ts";
export * from "./approvals/approvalService.ts";
export * from "./router/routerService.ts";
export * from "./ingest/index.ts";
export * from "./classify/index.ts";
export * from "./policy/policy.ts";
export { RateLimiter } from "./util/rateLimiter.ts";
export { ResponseBuilder } from "./util/response.ts";
export { RetryService } from "./util/retryService.ts";
export { ErrorHandler } from "./util/error-handler.ts";
export * from "./production/production-bootstrap.service.ts";
export * from "./production/dependencies.ts";
export * from "./security/production-security.service.ts";
export * from "./monitoring/production-health.service.ts";
export * from "./agents/production-build-agents.ts";
export * from "./agents/user-agent-orchestration.ts";
