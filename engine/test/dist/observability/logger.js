import pino from "pino";
export const logger = pino({
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
});
//# sourceMappingURL=logger.js.map