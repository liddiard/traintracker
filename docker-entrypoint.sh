#!/bin/sh
set -e

echo "Setting up database schema..."

# Try to run migrations
if npx prisma migrate deploy 2>&1 | tee /tmp/migrate-output.txt; then
  echo "Migrations applied successfully"
else
  # Check if the error is P3005 (database not empty, no migration history)
  if grep -q "P3005" /tmp/migrate-output.txt; then
    echo "Existing database detected without migration history"
    echo "Using db push to sync schema (safe for existing data)..."
    npx prisma db push --skip-generate
  else
    # Some other error occurred
    echo "Migration failed with unexpected error"
    cat /tmp/migrate-output.txt
    exit 1
  fi
fi

echo "Starting Next.js application..."
exec "$@"
