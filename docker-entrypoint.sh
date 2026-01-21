#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=db/schema.prisma

echo "Starting Next.js application..."
exec "$@"
