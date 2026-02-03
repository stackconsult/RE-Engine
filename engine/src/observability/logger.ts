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
  transport: {
    target: "pino/file",
    options: { destination: "/Users/kirtissiemens/.gemini/tmp/48988562a6ad217ad9a52dcc8d28f1d5d0edeed18d0b9311e9f17102177477ae/smoke.log" },
  },
});
