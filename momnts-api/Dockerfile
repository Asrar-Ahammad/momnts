# ── Stage 1: Build stage ──────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy source and prisma configuration
COPY . .

# Set placeholder DATABASE_URL to satisfy Prisma schema validation during build
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Build TypeScript to JavaScript and generate Prisma Client
RUN npm run build


# ── Stage 2: Runtime stage ────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Limit V8 heap memory size to prevent OOM on t3.small (2GB RAM)
# 384MB is optimal for running API + 2 Workers + Redis on a single t3.small
ENV NODE_OPTIONS="--max-old-space-size=384"

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies list and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist

# Create temp uploads folder for multer with correct permissions
RUN mkdir -p temp-uploads && chown appuser:appgroup temp-uploads

# Switch to non-root user
USER appuser

EXPOSE 3000

# Default command — API server
CMD ["node", "dist/index.js"]