# ---- Base Stage ----
FROM node:24-alpine AS base
WORKDIR /app

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat python3 make g++

# ---- Dependencies Stage ----
FROM base AS deps

# Copy package files and Prisma config
COPY package*.json ./
COPY prisma.config.ts ./
COPY db/schema.prisma ./db/

# Install dependencies for production (save to /tmp for later)
RUN npm ci --only=production --ignore-scripts && \
    cp -R node_modules /tmp/prod_node_modules

# Install all dependencies (including dev) for build stage
RUN npm ci && \
    npx prisma generate

# ---- Builder Stage ----
FROM base AS builder

# Copy source files first
COPY . .

# Copy dependencies and generated Prisma client from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/db/generated ./db/generated

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=file:./db/app.db

# Create database tables before GTFS import
RUN npx prisma db push

# Generate track.json before build (required by build process)
RUN npx tsx -e "import('./app/lib/gtfs-import.ts').then(m => m.importGtfsData())"

# Build the Next.js application with standalone output
# Increase Node.js heap size to handle builds on low-memory VPS (1GB RAM + 2GB swap)
ENV NODE_OPTIONS="--max-old-space-size=1536"
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

# Copy Next.js build artifacts
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

# Copy Prisma and DB files
COPY --chown=nextjs:nodejs --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=nextjs:nodejs --from=builder /app/db ./db

# Copy runtime data
COPY --chown=nextjs:nodejs --from=builder /app/app/api/stations/amtrak-stations.csv ./app/api/stations/amtrak-stations.csv

# Copy production node_modules
COPY --chown=nextjs:nodejs --from=deps /tmp/prod_node_modules ./node_modules

# Copy Prisma CLI from builder (needed for migrations at runtime)
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs --chmod=755 docker-entrypoint.sh /usr/local/bin/

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
