import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createTransport } from "nodemailer";
import { z } from "zod";
const EmailSchema = z.object({
    to: z.string().email(),
    subject: z.string(),
    text: z.string(),
    html: z.string().optional(),
    from: z.string().email().optional(),
});
const WebhookSchema = z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
});
const server = new Server({
    name: "reengine-integrations",
    version: "0.1.0",
});
const tools = [
    {
        name: "send_email",
        description: "Send an email using SMTP",
        inputSchema: {
            type: "object",
            properties: {
                to: {
                    type: "string",
                    description: "Recipient email address",
                },
                subject: {
                    type: "string",
                    description: "Email subject",
                },
                text: {
                    type: "string",
                    description: "Plain text email body",
                },
                html: {
                    type: "string",
                    description: "HTML email body (optional)",
                },
                from: {
                    type: "string",
                    description: "Sender email address (optional, uses default if not provided)",
                },
            },
            required: ["to", "subject", "text"],
        },
    },
    {
        name: "send_webhook",
        description: "Send a webhook to external service",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "Webhook URL",
                },
                method: {
                    type: "string",
                    enum: ["GET", "POST", "PUT", "DELETE"],
                    description: "HTTP method",
                    default: "POST",
                },
                headers: {
                    type: "object",
                    description: "HTTP headers",
                },
                body: {
                    type: "any",
                    description: "Request body (JSON)",
                },
            },
            required: ["url"],
        },
    },
    {
        name: "validate_email",
        description: "Validate email address format",
        inputSchema: {
            type: "object",
            properties: {
                email: {
                    type: "string",
                    description: "Email address to validate",
                },
            },
            required: ["email"],
        },
    },
];
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "send_email": {
                const parsed = EmailSchema.parse(args);
                // Get SMTP configuration from environment
                const smtpHost = process.env.SMTP_HOST;
                const smtpPort = process.env.SMTP_PORT || "587";
                const smtpUser = process.env.SMTP_USER;
                const smtpPass = process.env.SMTP_PASS;
                if (!smtpHost || !smtpUser || !smtpPass) {
                    throw new Error("SMTP configuration not found in environment variables");
                }
                const transporter = createTransport({
                    host: smtpHost,
                    port: parseInt(smtpPort),
                    secure: smtpPort === "465",
                    auth: {
                        user: smtpUser,
                        pass: smtpPass,
                    },
                });
                const mailOptions = {
                    from: parsed.from || smtpUser,
                    to: parsed.to,
                    subject: parsed.subject,
                    text: parsed.text,
                    html: parsed.html,
                };
                const result = await transporter.sendMail(mailOptions);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Email sent successfully. Message ID: ${result.messageId}`,
                        },
                    ],
                };
            }
            case "send_webhook": {
                const parsed = WebhookSchema.parse(args);
                const response = await fetch(parsed.url, {
                    method: parsed.method,
                    headers: {
                        "Content-Type": "application/json",
                        ...parsed.headers,
                    },
                    body: parsed.body ? JSON.stringify(parsed.body) : undefined,
                });
                const responseText = await response.text();
                return {
                    content: [
                        {
                            type: "text",
                            text: `Webhook sent. Status: ${response.status}, Response: ${responseText}`,
                        },
                    ],
                };
            }
            case "validate_email": {
                const { email } = args;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const isValid = emailRegex.test(email);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Email ${email} is ${isValid ? "valid" : "invalid"}`,
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map