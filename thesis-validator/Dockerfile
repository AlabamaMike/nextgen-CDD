# =============================================================================
# Thesis Validator - Multi-stage Dockerfile
# =============================================================================
# This Dockerfile builds a production-ready container for the Thesis Validator
# service with support for Google Cloud Vertex AI authentication.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 2: Production Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install runtime dependencies
# - ca-certificates: Required for HTTPS connections
# - tini: Proper init system for containers
RUN apk add --no-cache ca-certificates tini

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S thesis-validator -u 1001 -G nodejs

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create data directory for Ruvector with proper permissions
RUN mkdir -p /app/data/ruvector && \
    chown -R thesis-validator:nodejs /app

# Switch to non-root user
USER thesis-validator

# Set environment variables
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000

# Expose the API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]
