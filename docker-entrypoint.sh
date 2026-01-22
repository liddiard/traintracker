#!/bin/sh
set -e

DB_DIR="/app/data"
DB_FILE="$DB_DIR/app.db"
NEXTJS_UID=1001
NEXTJS_GID=1001

echo "=== TrainTracker Startup ==="
echo "Running as: $(whoami) (uid $(id -u))"

# Phase 1: Permission setup (runs as root if available)
echo "Setting up data directory permissions..."

# Ensure the data directory exists
if [ ! -d "$DB_DIR" ]; then
  echo "Creating data directory..."
  mkdir -p "$DB_DIR"
fi

# If running as root, fix permissions on the data directory and any existing database
if [ "$(id -u)" = "0" ]; then
  echo "Fixing ownership of $DB_DIR for nextjs user..."
  chown -R $NEXTJS_UID:$NEXTJS_GID "$DB_DIR"

  # Also ensure the app directory is accessible
  chown $NEXTJS_UID:$NEXTJS_GID /app
fi

# Phase 2: Drop to nextjs user if we're root
if [ "$(id -u)" = "0" ]; then
  echo "Dropping privileges to nextjs user..."
  exec su-exec nextjs "$0" "$@"
fi

# Phase 3: Database setup (runs as nextjs user)
echo "Setting up database as $(whoami)..."

# Check if data directory is writable
if [ ! -w "$DB_DIR" ]; then
  echo "ERROR: Data directory $DB_DIR is not writable by user $(whoami) (uid $(id -u))"
  echo "Directory permissions: $(ls -la $(dirname $DB_DIR) | grep data)"
  echo ""
  echo "To fix this, run on your server:"
  echo "  docker-compose down"
  echo "  docker volume rm traintracker-db"
  echo "  docker-compose up -d"
  exit 1
fi

# If database file exists, check if it's writable
if [ -f "$DB_FILE" ]; then
  if [ ! -w "$DB_FILE" ]; then
    echo "ERROR: Database file $DB_FILE exists but is not writable"
    echo "Current permissions: $(ls -la $DB_FILE)"
    echo ""
    echo "To fix this, run on your server:"
    echo "  docker-compose down"
    echo "  docker volume rm traintracker-db"
    echo "  docker-compose up -d"
    exit 1
  fi
  echo "Found existing database at $DB_FILE"
else
  echo "No existing database found, will create new one"
fi

echo "Running database migrations..."

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

# Verify database is writable after migrations
if [ -f "$DB_FILE" ] && [ ! -w "$DB_FILE" ]; then
  echo "ERROR: Database became read-only after migrations"
  exit 1
fi

echo "Database setup complete"
echo "Starting Next.js application..."
exec "$@"
