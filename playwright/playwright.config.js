"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: "./test",
    timeout: 60000,
    retries: process.env.CI ? 2 : 1,
    use: {
        headless: false,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
});
