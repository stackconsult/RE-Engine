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
exports.SelfHealingManager = void 0;
var logger_js_1 = require("../observability/logger.js");
var SelfHealingManager = /** @class */ (function () {
    function SelfHealingManager() {
    }
    SelfHealingManager.prototype.healNavigation = function (page, url) {
        return __awaiter(this, void 0, void 0, function () {
            var currentUrl, error_1, retryError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_js_1.logger.info({ url: url }, "Attempting self-healing navigation");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 11]);
                        // Strategy 1: Wait for network idle and retry
                        return [4 /*yield*/, page.waitForLoadState("networkidle", { timeout: 10000 })];
                    case 2:
                        // Strategy 1: Wait for network idle and retry
                        _a.sent();
                        currentUrl = page.url();
                        if (currentUrl && !currentUrl.includes("about:blank")) {
                            logger_js_1.logger.info({ url: currentUrl }, "Navigation succeeded on retry");
                            return [2 /*return*/, true];
                        }
                        // Strategy 2: Try direct navigation without wait
                        return [4 /*yield*/, page.goto(url, { timeout: 30000, waitUntil: "commit" })];
                    case 3:
                        // Strategy 2: Try direct navigation without wait
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState("domcontentloaded", { timeout: 15000 })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 5:
                        error_1 = _a.sent();
                        logger_js_1.logger.warn({ url: url, error: error_1 instanceof Error ? error_1.message : String(error_1) }, "Self-healing navigation failed");
                        return [4 /*yield*/, this.handlePopups(page)];
                    case 6:
                        if (!_a.sent()) return [3 /*break*/, 10];
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, page.goto(url, { timeout: 30000 })];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 9:
                        retryError_1 = _a.sent();
                        logger_js_1.logger.warn({ error: retryError_1 instanceof Error ? retryError_1.message : String(retryError_1) }, "Retry after popup handling failed");
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, false];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    SelfHealingManager.prototype.handlePopups = function (page) {
        return __awaiter(this, void 0, void 0, function () {
            var popupSelectors, handled, _i, popupSelectors_1, selector, element, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        popupSelectors = [
                            '[role="dialog"]',
                            '.modal',
                            '.popup',
                            '.cookie-banner',
                            '[data-testid="cookie-banner"]',
                            '.cc-banner',
                            '#cookie-banner'
                        ];
                        handled = false;
                        _i = 0, popupSelectors_1 = popupSelectors;
                        _a.label = 1;
                    case 1:
                        if (!(_i < popupSelectors_1.length)) return [3 /*break*/, 9];
                        selector = popupSelectors_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 8]);
                        return [4 /*yield*/, page.$(selector)];
                    case 3:
                        element = _a.sent();
                        if (!element) return [3 /*break*/, 6];
                        return [4 /*yield*/, element.click()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, page.waitForTimeout(1000)];
                    case 5:
                        _a.sent();
                        handled = true;
                        logger_js_1.logger.info({ selector: selector }, "Closed popup");
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 1];
                    case 9: return [2 /*return*/, handled];
                }
            });
        });
    };
    SelfHealingManager.prototype.healElementSelector = function (page, selector) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3, alternatives, _i, alternatives_1, altSelector, error_4, textContent, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_js_1.logger.info({ selector: selector }, "Attempting self-healing for element");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, page.waitForSelector(selector, { timeout: 30000 })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_3 = _a.sent();
                        logger_js_1.logger.warn({ selector: selector, error: error_3 instanceof Error ? error_3.message : String(error_3) }, "Element not found with extended timeout");
                        return [3 /*break*/, 4];
                    case 4:
                        alternatives = this.generateAlternativeSelectors(selector);
                        _i = 0, alternatives_1 = alternatives;
                        _a.label = 5;
                    case 5:
                        if (!(_i < alternatives_1.length)) return [3 /*break*/, 10];
                        altSelector = alternatives_1[_i];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, page.waitForSelector(altSelector, { timeout: 10000 })];
                    case 7:
                        _a.sent();
                        logger_js_1.logger.info({ originalSelector: selector, alternative: altSelector }, "Found element with alternative selector");
                        return [2 /*return*/, true];
                    case 8:
                        error_4 = _a.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 5];
                    case 10:
                        if (!(selector.includes('[data-testid') || selector.includes('#') || selector.includes('.'))) return [3 /*break*/, 14];
                        textContent = this.extractTextFromSelector(selector);
                        if (!textContent) return [3 /*break*/, 14];
                        _a.label = 11;
                    case 11:
                        _a.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, page.waitForSelector("text=".concat(textContent), { timeout: 10000 })];
                    case 12:
                        _a.sent();
                        logger_js_1.logger.info({ selector: selector, textContent: textContent }, "Found element by text content");
                        return [2 /*return*/, true];
                    case 13:
                        error_5 = _a.sent();
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/, false];
                }
            });
        });
    };
    SelfHealingManager.prototype.generateAlternativeSelectors = function (selector) {
        var alternatives = [];
        // Convert ID selectors to attribute selectors
        if (selector.startsWith('#')) {
            var id = selector.slice(1);
            alternatives.push("[id=\"".concat(id, "\"]"));
            alternatives.push("[data-testid=\"".concat(id, "\"]"));
            alternatives.push("[name=\"".concat(id, "\"]"));
        }
        // Convert class selectors
        if (selector.startsWith('.')) {
            var className = selector.slice(1).split(' ')[0];
            alternatives.push("[class*=\"".concat(className, "\"]"));
        }
        // Convert data-testid
        if (selector.includes('[data-testid')) {
            var match = selector.match(/data-testid="([^"]+)"/);
            if (match) {
                var testId = match[1];
                alternatives.push("#".concat(testId));
                alternatives.push("[data-qa=\"".concat(testId, "\"]"));
                alternatives.push(".test-".concat(testId));
            }
        }
        return alternatives;
    };
    SelfHealingManager.prototype.extractTextFromSelector = function (selector) {
        // Extract potential text content from common selector patterns
        var patterns = [
            /button\[.*?aria-label="([^"]+)".*?\]/,
            /\[title="([^"]+)"/,
            /data-testid="([^"]+)"/
        ];
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var pattern = patterns_1[_i];
            var match = selector.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    };
    SelfHealingManager.prototype.healClick = function (page, selector) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6, retryError_2, element, elementError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_js_1.logger.info({ selector: selector }, "Attempting self-healing for click");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 14]);
                        // First try to find and click the element
                        return [4 /*yield*/, page.click(selector, { timeout: 10000 })];
                    case 2:
                        // First try to find and click the element
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_6 = _a.sent();
                        logger_js_1.logger.warn({ selector: selector, error: error_6 instanceof Error ? error_6.message : String(error_6) }, "Direct click failed");
                        return [4 /*yield*/, this.healElementSelector(page, selector)];
                    case 4:
                        if (!_a.sent()) return [3 /*break*/, 8];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, page.click(selector, { timeout: 5000 })];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 7:
                        retryError_2 = _a.sent();
                        logger_js_1.logger.warn({ selector: selector, error: retryError_2 instanceof Error ? retryError_2.message : String(retryError_2) }, "Click failed after selector healing");
                        return [3 /*break*/, 8];
                    case 8:
                        _a.trys.push([8, 12, , 13]);
                        return [4 /*yield*/, page.$(selector)];
                    case 9:
                        element = _a.sent();
                        if (!element) return [3 /*break*/, 11];
                        return [4 /*yield*/, element.click()];
                    case 10:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        elementError_1 = _a.sent();
                        logger_js_1.logger.warn({ selector: selector, error: elementError_1 instanceof Error ? elementError_1.message : String(elementError_1) }, "Element click failed");
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/, false];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    SelfHealingManager.prototype.healType = function (page, selector, text) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7, retryError_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_js_1.logger.info({ selector: selector, text: text.replace(/./g, '*') }, "Attempting self-healing for type");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 9]);
                        return [4 /*yield*/, page.fill(selector, text, { timeout: 10000 })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_7 = _a.sent();
                        logger_js_1.logger.warn({ selector: selector, error: error_7 instanceof Error ? error_7.message : String(error_7) }, "Direct fill failed");
                        return [4 /*yield*/, this.healElementSelector(page, selector)];
                    case 4:
                        if (!_a.sent()) return [3 /*break*/, 8];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, page.fill(selector, text, { timeout: 5000 })];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 7:
                        retryError_3 = _a.sent();
                        logger_js_1.logger.warn({ selector: selector, error: retryError_3 instanceof Error ? retryError_3.message : String(retryError_3) }, "Fill failed after selector healing");
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/, false];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return SelfHealingManager;
}());
exports.SelfHealingManager = SelfHealingManager;
