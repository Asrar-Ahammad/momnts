# Use the official Bun image as the base
FROM oven/bun:1.1-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for prisma)
RUN bun install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bun prisma generate

# Copy the rest of the application source code
COPY . .

# Final stage: build a lean production image
FROM oven/bun:1.1-alpine AS runner

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Copy node_modules, package files, and prisma client from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/generated ./generated
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/index.ts ./index.ts

# Create directory for temporary uploads
RUN mkdir -p temp-uploads && chmod 777 temp-uploads

# Expose HTTP port (configured via environment variable in AWS)
EXPOSE 3000

# Default command to run the API server
CMD ["bun", "index.ts"]
