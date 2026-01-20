# ---- Base Stage ----
FROM node:24-alpine AS base
WORKDIR /app

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat python3 make g++

# ---- Dependencies Stage ----
FROM base AS deps

# Copy package files
COPY package*.json ./
COPY db/schema.prisma ./db/

# Install dependencies
RUN npm ci --only=production && \
    npx prisma generate --schema=db/schema.prisma && \
    cp -R node_modules /tmp/prod_node_modules

# Install all dependencies (including dev) for build stage
RUN npm ci && \
    npx prisma generate --schema=db/schema.prisma

# ---- Builder Stage ----
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application with standalone output
RUN npm run build

# ---- Runner Stage ----
FROM node:24-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/db/schema.prisma ./db/schema.prisma
COPY --from=builder /app/db/migrations ./db/migrations

# Copy production node_modules (includes Prisma)
COPY --from=deps /tmp/prod_node_modules ./node_modules

# Create db directory and set permissions
RUN mkdir -p /app/db && \
    chown -R nextjs:nodejs /app

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
