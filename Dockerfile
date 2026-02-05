# RE Engine Production Dockerfile
# Magical AI-Infused Automation System

# Use Node.js 18 LTS as base image
FROM node:18-alpine AS base

# Install dependencies for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY engine/package*.json ./engine/
COPY mcp/reengine-tinyfish/package*.json ./mcp/reengine-tinyfish/
COPY mcp/reengine-vertexai/package*.json ./mcp/reengine-vertexai/
COPY playwright/package*.json ./playwright/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    musl \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/engine/node_modules ./engine/node_modules
COPY --from=builder /app/mcp ./mcp
COPY --from=builder /app/playwright ./playwright

# Copy production environment file
COPY .env.production .env

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/health-check.js || exit 1

# Start the application
CMD ["node", "dist/index.js"]
