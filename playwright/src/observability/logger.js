"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var pino_1 = require("pino");
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || "info",
    redact: {
        paths: [
            "req.headers.authorization",
            "headers.authorization",
            "*.password",
            "*.token",
            "*.apiKey",
        ],
        remove: true,
    },
    transport: {
        target: "pino/file",
        options: { destination: "./logs/playwright.log" },
    },
});
