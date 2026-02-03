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
exports.ArtifactManager = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var logger_js_1 = require("../observability/logger.js");
var ArtifactManager = /** @class */ (function () {
    function ArtifactManager() {
        this.baseDir = "./artifacts";
        this.ensureBaseDir();
    }
    ArtifactManager.prototype.ensureBaseDir = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fs_1.promises.mkdir(this.baseDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        logger_js_1.logger.warn({ error: error_1 instanceof Error ? error_1.message : String(error_1) }, "Failed to create artifacts directory");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ArtifactManager.prototype.getArtifactDir = function (jobId) {
        var dir = path_1.default.join(this.baseDir, jobId);
        fs_1.promises.mkdir(dir, { recursive: true }).catch(function () { }); // Async but fire-and-forget
        return dir;
    };
    ArtifactManager.prototype.getHarPath = function (jobId) {
        return path_1.default.join(this.getArtifactDir(jobId), "".concat(jobId, ".har"));
    };
    ArtifactManager.prototype.captureScreenshot = function (page, jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var screenshotPath, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        screenshotPath = path_1.default.join(this.getArtifactDir(jobId), "".concat(jobId, "-screenshot.png"));
                        return [4 /*yield*/, page.screenshot({ path: screenshotPath, fullPage: true })];
                    case 1:
                        _a.sent();
                        logger_js_1.logger.info({ jobId: jobId, screenshotPath: screenshotPath }, "Screenshot captured");
                        return [2 /*return*/, screenshotPath];
                    case 2:
                        error_2 = _a.sent();
                        logger_js_1.logger.warn({ jobId: jobId, error: error_2 instanceof Error ? error_2.message : String(error_2) }, "Failed to capture screenshot");
                        return [2 /*return*/, ""];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ArtifactManager.prototype.finalizeTrace = function (ctx, jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var tracePath, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        tracePath = path_1.default.join(this.getArtifactDir(jobId), "".concat(jobId, ".zip"));
                        return [4 /*yield*/, ctx.tracing.stop({ path: tracePath })];
                    case 1:
                        _a.sent();
                        logger_js_1.logger.info({ jobId: jobId, tracePath: tracePath }, "Trace finalized");
                        return [2 /*return*/, tracePath];
                    case 2:
                        error_3 = _a.sent();
                        logger_js_1.logger.warn({ jobId: jobId, error: error_3 instanceof Error ? error_3.message : String(error_3) }, "Failed to finalize trace");
                        return [2 /*return*/, ""];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ArtifactManager.prototype.cleanupArtifacts = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var dir, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        dir = this.getArtifactDir(jobId);
                        return [4 /*yield*/, fs_1.promises.rmdir(dir, { recursive: true })];
                    case 1:
                        _a.sent();
                        logger_js_1.logger.info({ jobId: jobId }, "Artifacts cleaned up");
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _a.sent();
                        logger_js_1.logger.warn({ jobId: jobId, error: error_4 instanceof Error ? error_4.message : String(error_4) }, "Failed to cleanup artifacts");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ArtifactManager.prototype.listArtifacts = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var dir_1, files, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        dir_1 = this.getArtifactDir(jobId);
                        return [4 /*yield*/, fs_1.promises.readdir(dir_1)];
                    case 1:
                        files = _a.sent();
                        return [2 /*return*/, files.map(function (file) { return path_1.default.join(dir_1, file); })];
                    case 2:
                        error_5 = _a.sent();
                        logger_js_1.logger.warn({ jobId: jobId, error: error_5 instanceof Error ? error_5.message : String(error_5) }, "Failed to list artifacts");
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ArtifactManager;
}());
exports.ArtifactManager = ArtifactManager;
