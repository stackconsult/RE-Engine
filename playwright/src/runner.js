"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightRunner = void 0;
exports.runJob = runJob;
var playwright_1 = require("playwright");
var selfHealingManager_js_1 = require("./heal/selfHealingManager.js");
var artifactManager_js_1 = require("./artifacts/artifactManager.js");
var logger_js_1 = require("./observability/logger.js");
var PlaywrightRunner = /** @class */ (function () {
    function PlaywrightRunner() {
        this.activeJobs = new Map();
        this.selfHealing = new selfHealingManager_js_1.SelfHealingManager();
        this.artifactManager = new artifactManager_js_1.ArtifactManager();
    }
    PlaywrightRunner.prototype.submitJob = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.activeJobs.set(job.id, job);
                logger_js_1.logger.info({ jobId: job.id, correlationId: job.correlationId }, "Job submitted");
                return [2 /*return*/, { jobId: job.id, status: "QUEUED" }];
            });
        });
    };
    PlaywrightRunner.prototype.getJobStatus = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var job;
            return __generator(this, function (_a) {
                job = this.activeJobs.get(jobId);
                if (!job) {
                    throw new Error("Job ".concat(jobId, " not found"));
                }
                return [2 /*return*/, {
                        id: jobId,
                        correlationId: job.correlationId,
                        status: "RUNNING",
                        progress: 0.5,
                        summary: "Job in progress"
                    }];
            });
        });
    };
    PlaywrightRunner.prototype.runJob = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, page, artifactId, result, screenshot, trace, error_1, screenshot, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        ctx = null;
                        page = null;
                        artifactId = job.id;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, 13, 15]);
                        logger_js_1.logger.info({ jobId: job.id, url: job.url }, "Starting browser job");
                        return [4 /*yield*/, playwright_1.chromium.launchPersistentContext("./.pw-user-data-".concat(job.id), {
                                headless: false,
                                recordVideo: { dir: this.artifactManager.getArtifactDir(artifactId) },
                                recordHar: { path: this.artifactManager.getHarPath(artifactId) }
                            })];
                    case 2:
                        // Setup browser context with artifacts
                        ctx = _b.sent();
                        return [4 /*yield*/, ctx.newPage()];
                    case 3:
                        page = _b.sent();
                        // Setup tracing and error handling
                        return [4 /*yield*/, ctx.tracing.start({ screenshots: true, snapshots: true })];
                    case 4:
                        // Setup tracing and error handling
                        _b.sent();
                        // Navigate with self-healing
                        return [4 /*yield*/, this.navigateWithHealing(page, job.url)];
                    case 5:
                        // Navigate with self-healing
                        _b.sent();
                        return [4 /*yield*/, this.executeTask(page, job)];
                    case 6:
                        result = _b.sent();
                        return [4 /*yield*/, this.artifactManager.captureScreenshot(page, artifactId)];
                    case 7:
                        screenshot = _b.sent();
                        return [4 /*yield*/, this.artifactManager.finalizeTrace(ctx, artifactId)];
                    case 8:
                        trace = _b.sent();
                        return [2 /*return*/, {
                                id: job.id,
                                correlationId: job.correlationId,
                                status: "SUCCEEDED",
                                progress: 1.0,
                                summary: "Completed ".concat(job.task.type, " task"),
                                finalUrl: page.url(),
                                artifacts: {
                                    screenshot: screenshot,
                                    trace: trace,
                                    video: "".concat(artifactId, ".webm"),
                                    networkLog: "".concat(artifactId, ".har")
                                },
                                data: result
                            }];
                    case 9:
                        error_1 = _b.sent();
                        logger_js_1.logger.error({ jobId: job.id, error: error_1.message }, "Job failed");
                        if (!page) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.artifactManager.captureScreenshot(page, artifactId)];
                    case 10:
                        _a = _b.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        _a = undefined;
                        _b.label = 12;
                    case 12:
                        screenshot = _a;
                        return [2 /*return*/, {
                                id: job.id,
                                correlationId: job.correlationId,
                                status: "FAILED",
                                progress: 0,
                                summary: "Job failed",
                                error: error_1.message,
                                artifacts: {
                                    screenshot: screenshot
                                }
                            }];
                    case 13: return [4 /*yield*/, this.cleanup(ctx, page, artifactId)];
                    case 14:
                        _b.sent();
                        this.activeJobs.delete(job.id);
                        return [7 /*endfinally*/];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    PlaywrightRunner.prototype.navigateWithHealing = function (page, url) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2, healed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_2 = _a.sent();
                        logger_js_1.logger.warn({ url: url, error: error_2.message }, "Initial navigation failed, attempting self-healing");
                        return [4 /*yield*/, this.selfHealing.healNavigation(page, url)];
                    case 3:
                        healed = _a.sent();
                        if (!healed) {
                            throw error_2;
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PlaywrightRunner.prototype.executeTask = function (page, job) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = job.task.type;
                        switch (_a) {
                            case "navigate": return [3 /*break*/, 1];
                            case "extract": return [3 /*break*/, 3];
                            case "login": return [3 /*break*/, 5];
                            case "message": return [3 /*break*/, 7];
                            case "custom": return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 11];
                    case 1:
                        _b = { url: page.url() };
                        return [4 /*yield*/, page.title()];
                    case 2: return [2 /*return*/, (_b.title = _c.sent(), _b)];
                    case 3: return [4 /*yield*/, this.extractData(page, job.task)];
                    case 4: return [2 /*return*/, _c.sent()];
                    case 5: return [4 /*yield*/, this.performLogin(page, job.task)];
                    case 6: return [2 /*return*/, _c.sent()];
                    case 7: return [4 /*yield*/, this.sendMessage(page, job.task)];
                    case 8: return [2 /*return*/, _c.sent()];
                    case 9: return [4 /*yield*/, this.executeCustomTask(page, job.task)];
                    case 10: return [2 /*return*/, _c.sent()];
                    case 11: throw new Error("Unknown task type: ".concat(job.task.type));
                }
            });
        });
    };
    PlaywrightRunner.prototype.extractData = function (page, task) {
        return __awaiter(this, void 0, void 0, function () {
            var data, _i, _a, _b, key, selector, element, _c, _d, error_3;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!task.selectors || !task.extract) {
                            throw new Error("Extract task requires selectors and extract schema");
                        }
                        data = {};
                        _i = 0, _a = Object.entries(task.extract);
                        _e.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        _b = _a[_i], key = _b[0], selector = _b[1];
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 6, , 7]);
                        return [4 /*yield*/, page.$(selector)];
                    case 3:
                        element = _e.sent();
                        if (!element) return [3 /*break*/, 5];
                        _c = data;
                        _d = key;
                        return [4 /*yield*/, element.textContent()];
                    case 4:
                        _c[_d] = _e.sent();
                        _e.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_3 = _e.sent();
                        logger_js_1.logger.warn({ key: key, selector: selector, error: error_3.message }, "Failed to extract data");
                        data[key] = null;
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/, data];
                }
            });
        });
    };
    PlaywrightRunner.prototype.performLogin = function (page, task) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implementation for login tasks
                logger_js_1.logger.info({ task: "login" }, "Performing login task");
                return [2 /*return*/, { success: true }];
            });
        });
    };
    PlaywrightRunner.prototype.sendMessage = function (page, task) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implementation for message tasks
                logger_js_1.logger.info({ task: "message" }, "Performing message task");
                return [2 /*return*/, { success: true }];
            });
        });
    };
    PlaywrightRunner.prototype.executeCustomTask = function (page, task) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implementation for custom tasks
                logger_js_1.logger.info({ task: "custom" }, "Performing custom task");
                return [2 /*return*/, { success: true }];
            });
        });
    };
    PlaywrightRunner.prototype.cleanup = function (ctx, page, artifactId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_4, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        if (!ctx) return [3 /*break*/, 3];
                        return [4 /*yield*/, ctx.tracing.stop()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, ctx.close()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_4 = _a.sent();
                        logger_js_1.logger.warn({ error: error_4.message }, "Cleanup error");
                        return [3 /*break*/, 5];
                    case 5:
                        _a.trys.push([5, 8, , 9]);
                        if (!page) return [3 /*break*/, 7];
                        return [4 /*yield*/, page.close()];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_5 = _a.sent();
                        logger_js_1.logger.warn({ error: error_5.message }, "Page cleanup error");
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    PlaywrightRunner.prototype.cancelJob = function (jobId, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var job;
            return __generator(this, function (_a) {
                job = this.activeJobs.get(jobId);
                if (!job) {
                    throw new Error("Job ".concat(jobId, " not found"));
                }
                this.activeJobs.delete(jobId);
                logger_js_1.logger.info({ jobId: jobId, reason: reason }, "Job cancelled");
                return [2 /*return*/, {
                        id: jobId,
                        correlationId: job.correlationId,
                        status: "CANCELLED",
                        summary: reason || "Job cancelled"
                    }];
            });
        });
    };
    PlaywrightRunner.prototype.resumeJob = function (jobId, note) {
        return __awaiter(this, void 0, void 0, function () {
            var job;
            return __generator(this, function (_a) {
                job = this.activeJobs.get(jobId);
                if (!job) {
                    throw new Error("Job ".concat(jobId, " not found"));
                }
                logger_js_1.logger.info({ jobId: jobId, note: note }, "Job resumed");
                return [2 /*return*/, {
                        id: jobId,
                        correlationId: job.correlationId,
                        status: "RESUMED",
                        summary: note || "Job resumed"
                    }];
            });
        });
    };
    return PlaywrightRunner;
}());
exports.PlaywrightRunner = PlaywrightRunner;
// Legacy function for backward compatibility
function runJob(job) {
    return __awaiter(this, void 0, void 0, function () {
        var runner;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    runner = new PlaywrightRunner();
                    return [4 /*yield*/, runner.runJob(job)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
