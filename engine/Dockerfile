# RE Engine - Production Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Install Google Cloud SDK
RUN curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz && \
    tar -xf google-cloud-cli-linux-x86_64.tar.gz && \
    ./google-cloud-sdk/install.sh --usage-reporting=false --path-completion=false --command-completion=false && \
    rm -rf google-cloud-cli-linux-x86_64.tar.gz

# Add gcloud to PATH
ENV PATH=$PATH:/app/google-cloud-sdk/bin

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/google-cloud-sdk ./google-cloud-sdk
COPY . .

# Build the application
RUN npm run build

# Production image, copy all necessary files
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 reengine

# Copy built application
COPY --from=builder --chown=reengine:nodejs /app/dist ./dist
COPY --from=builder --chown=reengine:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=reengine:nodejs /app/google-cloud-sdk ./google-cloud-sdk
COPY --from=builder --chown=reengine:nodejs /app/package.json ./package.json

# Create logs directory
RUN mkdir -p /app/logs && chown reengine:nodejs /app/logs

# Copy migration scripts
COPY --from=builder --chown=reengine:nodejs /app/src/database/migrations ./src/database/migrations
COPY --from=builder --chown=reengine:nodejs /app/migrate.js ./migrate.js

# Add gcloud to PATH
ENV PATH=$PATH:/app/google-cloud-sdk/bin

USER reengine

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

CMD ["node", "dist/index.js"]
