// RE Engine Main Entry Point
// Complete Magical AI-Infused Automation System

// 🪄 Magical AI Automation System
export * from "./ai/magical-automation-engine.js";
export * from "./ai/operational-agents.js";
export * from "./ai/fixes-and-optimizations.js";

// 🔄 Core orchestration components
export * from "./orchestration/master-orchestrator.js";
export * from "./orchestration/workflow-execution-engine.js";
export * from "./orchestration/intelligent-model-selector.js";
export * from "./orchestration/component-manager.js";
export * from "./orchestration/fallback-manager.js";
export * from "./orchestration/guardrail-system.js";
export * from "./orchestration/resource-manager.js";
export * from "./orchestration/performance-monitor.js";

// 📋 Types and utilities
export * from "./types/orchestration.types.js";
export * from "./utils/logger.js";

// 🔄 Workflow system
export * from "./workflows/real-estate-workflows.js";
export * from "./services/workflow-service.js";

// 🌐 API layer
export * from "./api/server.js";
export * from "./api/workflow-api.js";

// 🖥️ CLI tool
export * from "./cli.js";

// 📚 Legacy exports for backward compatibility
export * from "./shared/types.js";
export * from "./domain/schemas.js";
export * from "./observability/logger.js";
export * from "./store/store.js";
export * from "./store/csv/csvStore.js";
export * from "./approvals/approvalService.js";
export * from "./router/routerService.js";
export * from "./ingest/index.js";
export * from "./classify/index.js";
export * from "./policy/policy.js";
export { RateLimiter } from "./util/rateLimiter.js";
export { ResponseBuilder } from "./util/response.js";
export { RetryService } from "./util/retryService.js";
export { ErrorHandler } from "./util/error-handler.js";
export * from "./production/production-bootstrap.service.js";
export * from "./production/dependencies.js";
export * from "./security/production-security.service.js";
export * from "./monitoring/production-health.service.js";
export * from "./agents/production-build-agents.js";
export * from "./agents/user-agent-orchestration.js";
