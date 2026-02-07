# Multi-stage Dockerfile for RE Engine Core
FROM node:22-alpine AS builder 

WORKDIR /app

# Copy root and engine package files for dependency installation
COPY package*.json ./
COPY engine/package*.json ./engine/

# Install dependencies (utilizing npm workspaces)
RUN npm install

# Copy engine source code
COPY engine/ ./engine/

# Build the engine
WORKDIR /app/engine
RUN npm run build

# Production Stage
FROM node:22-alpine

WORKDIR /app

# Copy only the necessary files for production
COPY --from=builder /app/engine/dist ./dist
COPY --from=builder /app/engine/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the API port
EXPOSE 3000

# Start the engine
CMD ["node", "dist/index.js"]
