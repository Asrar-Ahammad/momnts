# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps (including devDeps for tsc + prisma generate)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Prisma generate needs a DATABASE_URL at schema-validation time (not used at runtime)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Build: prisma generate → tsc → copy generated client
RUN npm run build

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# t3.small = 2GB RAM shared across API + 2 workers + Redis
# 512MB per Node process is safe (3 × 512 = 1.5GB, leaves ~500MB for Redis + OS)
ENV NODE_OPTIONS="--max-old-space-size=512"

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Compiled JS output
COPY --from=builder /app/dist ./dist

# Prisma Client needs these at runtime for the pg adapter
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Multer temp dir
RUN mkdir -p temp-uploads && chown appuser:appgroup temp-uploads

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Default: API server (workers override via docker-compose command)
CMD ["node", "dist/index.js"]