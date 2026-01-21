#!/bin/sh
set -e

echo "Setting up database schema..."

# Try to run migrations
# Note: pipefail not available in sh, so we capture output and check exit code separately
npx prisma migrate deploy > /tmp/migrate-output.txt 2>&1 || migrate_failed=1

if [ -z "$migrate_failed" ]; then
  cat /tmp/migrate-output.txt
  echo "Migrations applied successfully"
else
  cat /tmp/migrate-output.txt
  # Check if the error is P3005 (database not empty, no migration history)
  if grep -q "P3005" /tmp/migrate-output.txt; then
    echo "Existing database detected without migration history"
    echo "Using db push to sync schema (safe for existing data)..."
    npx prisma db push --accept-data-loss
  else
    # Some other error occurred
    echo "Migration failed with unexpected error"
    exit 1
  fi
fi

echo "Starting Next.js application..."
exec "$@"
