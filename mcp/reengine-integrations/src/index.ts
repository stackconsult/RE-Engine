import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createTransport } from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import axios from "axios";

// Platform-specific schemas
const WhatsAppSchema = z.object({
  to: z.string(),
  message: z.string(),
  type: z.enum(["text", "image", "document"]).default("text"),
  mediaUrl: z.string().optional(),
});

const LinkedInSchema = z.object({
  action: z.enum(["send_message", "get_profile", "send_connection", "search_people"]),
  profileId: z.string().optional(),
  message: z.string().optional(),
  searchQuery: z.string().optional(),
  connectionId: z.string().optional(),
});

const FacebookSchema = z.object({
  action: z.enum(["send_message", "get_page_info", "post_to_page", "get_user_profile"]),
  pageId: z.string().optional(),
  message: z.string().optional(),
  userId: z.string().optional(),
  postContent: z.string().optional(),
});

const TelegramSchema = z.object({
  action: z.enum(["send_message", "get_chat_info", "send_document", "create_channel"]),
  chatId: z.string(),
  message: z.string().optional(),
  documentUrl: z.string().optional(),
  channelName: z.string().optional(),
});

const EmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string().optional(),
  from: z.string().email().optional(),
});

const server = new Server(
  {
    name: "reengine-integrations",
    version: "0.1.0",
  }
);

// WhatsApp Business API Integration
class WhatsAppIntegration {
  private accessToken: string;
  private phoneNumberId: string;
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    this.baseUrl = "https://graph.facebook.com/v18.0";
  }

  async sendMessage(to: string, message: string, type: string = "text", mediaUrl?: string) {
    try {
      const payload: any = {
        messaging_product: "whatsapp",
        to: to.replace(/[^\d]/g, ""), // Remove non-digits
        type: type,
      };

      if (type === "text") {
        payload.text = { body: message };
      } else if (type === "image" && mediaUrl) {
        payload.image = { link: mediaUrl };
      } else if (type === "document" && mediaUrl) {
        payload.document = { link: mediaUrl };
      }

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: "sent",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}

// LinkedIn API Integration
class LinkedInIntegration {
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN || "";
    this.baseUrl = "https://api.linkedin.com/v2";
  }

  async sendMessage(profileId: string, message: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          recipients: [profileId],
          message: {
            text: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        messageId: response.data.id,
        status: "sent",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getProfile(profileId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/people/${profileId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          params: {
            fields: "id,firstName,lastName,headline,summary,location",
          },
        }
      );

      return {
        success: true,
        profile: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async sendConnection(profileId: string, message: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/relationshipInvitations`,
        {
          invitee: {
            profile: profileId,
          },
          message: message,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        invitationId: response.data.id,
        status: "pending",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async searchPeople(searchQuery: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/peopleSearch`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          params: {
            keywords: searchQuery,
            count: 10,
          },
        }
      );

      return {
        success: true,
        results: response.data.elements,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

// Facebook Graph API Integration
class FacebookIntegration {
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN || "";
    this.baseUrl = "https://graph.facebook.com/v18.0";
  }

  async sendMessage(pageId: string, userId: string, message: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        {
          recipient: { id: userId },
          message: { text: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        messageId: response.data.message_id,
        status: "sent",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getPageInfo(pageId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${pageId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          params: {
            fields: "name,username,about,category,followers_count",
          },
        }
      );

      return {
        success: true,
        pageInfo: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async postToPage(pageId: string, postContent: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${pageId}/feed`,
        {
          message: postContent,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        postId: response.data.id,
        status: "published",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getUserProfile(userId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          params: {
            fields: "name,email,picture",
          },
        }
      );

      return {
        success: true,
        userProfile: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}

// Telegram Bot API Integration
class TelegramIntegration {
  private botToken: string;
  private baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId: string, message: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }
      );

      return {
        success: true,
        messageId: response.data.result.message_id,
        status: "sent",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getChatInfo(chatId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/getChat`,
        {
          params: {
            chat_id: chatId,
          },
        }
      );

      return {
        success: true,
        chatInfo: response.data.result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async sendDocument(chatId: string, documentUrl: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/sendDocument`,
        {
          chat_id: chatId,
          document: documentUrl,
        }
      );

      return {
        success: true,
        messageId: response.data.result.message_id,
        status: "sent",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async createChannel(channelName: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/createChat`,
        {
          title: channelName,
          type: "channel",
        }
      );

      return {
        success: true,
        channelId: response.data.result.id,
        status: "created",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }
}

// Initialize integrations
const whatsapp = new WhatsAppIntegration();
const linkedin = new LinkedInIntegration();
const facebook = new FacebookIntegration();
const telegram = new TelegramIntegration();

const tools: Tool[] = [
  // WhatsApp Tools
  {
    name: "whatsapp_send_message",
    description: "Send a message via WhatsApp Business API",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Phone number with country code",
        },
        message: {
          type: "string",
          description: "Message content",
        },
        type: {
          type: "string",
          enum: ["text", "image", "document"],
          description: "Message type",
          default: "text",
        },
        mediaUrl: {
          type: "string",
          description: "URL for image/document (if type is not text)",
        },
      },
      required: ["to", "message"],
    },
  },
  // LinkedIn Tools
  {
    name: "linkedin_send_message",
    description: "Send a message via LinkedIn API",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "LinkedIn profile ID",
        },
        message: {
          type: "string",
          description: "Message content",
        },
      },
      required: ["profileId", "message"],
    },
  },
  {
    name: "linkedin_get_profile",
    description: "Get LinkedIn profile information",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "LinkedIn profile ID",
        },
      },
      required: ["profileId"],
    },
  },
  {
    name: "linkedin_send_connection",
    description: "Send connection request via LinkedIn",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "LinkedIn profile ID",
        },
        message: {
          type: "string",
          description: "Connection message",
        },
      },
      required: ["profileId", "message"],
    },
  },
  {
    name: "linkedin_search_people",
    description: "Search for people on LinkedIn",
    inputSchema: {
      type: "object",
      properties: {
        searchQuery: {
          type: "string",
          description: "Search query",
        },
      },
      required: ["searchQuery"],
    },
  },
  // Facebook Tools
  {
    name: "facebook_send_message",
    description: "Send a message via Facebook Messenger",
    inputSchema: {
      type: "object",
      properties: {
        pageId: {
          type: "string",
          description: "Facebook Page ID",
        },
        userId: {
          type: "string",
          description: "Facebook User ID",
        },
        message: {
          type: "string",
          description: "Message content",
        },
      },
      required: ["pageId", "userId", "message"],
    },
  },
  {
    name: "facebook_get_page_info",
    description: "Get Facebook page information",
    inputSchema: {
      type: "object",
      properties: {
        pageId: {
          type: "string",
          description: "Facebook Page ID",
        },
      },
      required: ["pageId"],
    },
  },
  {
    name: "facebook_post_to_page",
    description: "Post content to Facebook page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: {
          type: "string",
          description: "Facebook Page ID",
        },
        postContent: {
          type: "string",
          description: "Post content",
        },
      },
      required: ["pageId", "postContent"],
    },
  },
  {
    name: "facebook_get_user_profile",
    description: "Get Facebook user profile",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Facebook User ID",
        },
      },
      required: ["userId"],
    },
  },
  // Telegram Tools
  {
    name: "telegram_send_message",
    description: "Send a message via Telegram Bot",
    inputSchema: {
      type: "object",
      properties: {
        chatId: {
          type: "string",
          description: "Telegram chat ID",
        },
        message: {
          type: "string",
          description: "Message content",
        },
      },
      required: ["chatId", "message"],
    },
  },
  {
    name: "telegram_get_chat_info",
    description: "Get Telegram chat information",
    inputSchema: {
      type: "object",
      properties: {
        chatId: {
          type: "string",
          description: "Telegram chat ID",
        },
      },
      required: ["chatId"],
    },
  },
  {
    name: "telegram_send_document",
    description: "Send a document via Telegram Bot",
    inputSchema: {
      type: "object",
      properties: {
        chatId: {
          type: "string",
          description: "Telegram chat ID",
        },
        documentUrl: {
          type: "string",
          description: "URL of the document",
        },
      },
      required: ["chatId", "documentUrl"],
    },
  },
  {
    name: "telegram_create_channel",
    description: "Create a Telegram channel",
    inputSchema: {
      type: "object",
      properties: {
        channelName: {
          type: "string",
          description: "Channel name",
        },
      },
      required: ["channelName"],
    },
  },
  // Email Tool
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
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // WhatsApp
      case "whatsapp_send_message": {
        const parsed = WhatsAppSchema.parse(args);
        const result = await whatsapp.sendMessage(
          parsed.to,
          parsed.message,
          parsed.type,
          parsed.mediaUrl
        );
        
        return {
          content: [
            {
              type: "text",
              text: `WhatsApp message ${result.success ? "sent successfully" : "failed to send"}. ${result.success ? `Message ID: ${result.messageId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      // LinkedIn
      case "linkedin_send_message": {
        const parsed = LinkedInSchema.parse(args);
        const result = await linkedin.sendMessage(parsed.profileId!, parsed.message!);
        
        return {
          content: [
            {
              type: "text",
              text: `LinkedIn message ${result.success ? "sent successfully" : "failed to send"}. ${result.success ? `Message ID: ${result.messageId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      case "linkedin_get_profile": {
        const parsed = LinkedInSchema.parse(args);
        const result = await linkedin.getProfile(parsed.profileId!);
        
        return {
          content: [
            {
              type: "text",
              text: result.success 
                ? `LinkedIn profile retrieved: ${JSON.stringify(result.profile, null, 2)}`
                : `Failed to get LinkedIn profile: ${result.error}`,
            },
          ],
        };
      }

      case "linkedin_send_connection": {
        const parsed = LinkedInSchema.parse(args);
        const result = await linkedin.sendConnection(parsed.profileId!, parsed.message!);
        
        return {
          content: [
            {
              type: "text",
              text: `LinkedIn connection request ${result.success ? "sent successfully" : "failed to send"}. ${result.success ? `Invitation ID: ${result.invitationId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      case "linkedin_search_people": {
        const parsed = LinkedInSchema.parse(args);
        const result = await linkedin.searchPeople(parsed.searchQuery!);
        
        return {
          content: [
            {
              type: "text",
              text: result.success 
                ? `LinkedIn search completed. Found ${result.results.length} people: ${JSON.stringify(result.results, null, 2)}`
                : `LinkedIn search failed: ${result.error}`,
            },
          ],
        };
      }

      // Facebook
      case "facebook_send_message": {
        const parsed = FacebookSchema.parse(args);
        const result = await facebook.sendMessage(parsed.pageId!, parsed.userId!, parsed.message!);
        
        return {
          content: [
            {
              type: "text",
              text: `Facebook message ${result.success ? "sent successfully" : "failed to send"}. ${result.success ? `Message ID: ${result.messageId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      case "facebook_get_page_info": {
        const parsed = FacebookSchema.parse(args);
        const result = await facebook.getPageInfo(parsed.pageId!);
        
        return {
          content: [
            {
              type: "text",
              text: result.success 
                ? `Facebook page info retrieved: ${JSON.stringify(result.pageInfo, null, 2)}`
                : `Failed to get Facebook page info: ${result.error}`,
            },
          ],
        };
      }

      case "facebook_post_to_page": {
        const parsed = FacebookSchema.parse(args);
        const result = await facebook.postToPage(parsed.pageId!, parsed.postContent!);
        
        return {
          content: [
            {
              type: "text",
              text: `Facebook post ${result.success ? "published successfully" : "failed to publish"}. ${result.success ? `Post ID: ${result.postId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      case "facebook_get_user_profile": {
        const parsed = FacebookSchema.parse(args);
        const result = await facebook.getUserProfile(parsed.userId!);
        
        return {
          content: [
            {
              type: "text",
              text: result.success 
                ? `Facebook user profile retrieved: ${JSON.stringify(result.userProfile, null, 2)}`
                : `Failed to get Facebook user profile: ${result.error}`,
            },
          ],
        };
      }

      // Telegram
      case "telegram_send_message": {
        const parsed = TelegramSchema.parse(args);
        const result = await telegram.sendMessage(parsed.chatId, parsed.message!);
        
        return {
          content: [
            {
              type: "text",
              text: `Telegram message ${result.success ? "sent successfully" : "failed to send"}. ${result.success ? `Message ID: ${result.messageId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      case "telegram_get_chat_info": {
        const parsed = TelegramSchema.parse(args);
        const result = await telegram.getChatInfo(parsed.chatId);
        
        return {
          content: [
            {
              type: "text",
              text: result.success 
                ? `Telegram chat info retrieved: ${JSON.stringify(result.chatInfo, null, 2)}`
                : `Failed to get Telegram chat info: ${result.error}`,
            },
          ],
        };
      }

      case "telegram_send_document": {
        const parsed = TelegramSchema.parse(args);
        const result = await telegram.sendDocument(parsed.chatId, parsed.documentUrl!);
        
        return {
          content: [
            {
              type: "text",
              text: `Telegram document ${result.success ? "sent successfully" : "failed to send"}. ${result.success ? `Message ID: ${result.messageId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      case "telegram_create_channel": {
        const parsed = TelegramSchema.parse(args);
        const result = await telegram.createChannel(parsed.channelName!);
        
        return {
          content: [
            {
              type: "text",
              text: `Telegram channel ${result.success ? "created successfully" : "failed to create"}. ${result.success ? `Channel ID: ${result.channelId}` : `Error: ${result.error}`}`,
            },
          ],
        };
      }

      // Email
      case "send_email": {
        const parsed = EmailSchema.parse(args);
        
        // Get SMTP configuration from environment
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT || "587";
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        
        if (!smtpHost || !smtpUser || !smtpPass) {
          return {
            content: [
              {
                type: "text",
                text: "SMTP configuration not found in environment variables",
              },
            ],
            isError: true,
          };
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
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
