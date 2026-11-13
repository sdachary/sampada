#!/bin/sh
# Cloud Run optimized entrypoint
# Handles: DB migrations, asset precompilation (if needed), then starts Puma

set -e

echo "==> Environment: ${RAILS_ENV:-production}"
echo "==> Starting database preparation..."

# Wait for database to be ready (Cloud SQL proxy)
# Extract host from DATABASE_URL if DB_HOST not set
if [ -n "$DB_SOCKET" ] || [ -n "$DATABASE_URL" ]; then
  echo "==> Waiting for database connection..."
  timeout=60
  
  # Parse host from DATABASE_URL if needed
  DB_HOST_PARSED="${DB_HOST}"
  if [ -z "$DB_HOST_PARSED" ] && [ -n "$DATABASE_URL" ]; then
    # Extract host from postgresql://user:pass@host:port/db
    DB_HOST_PARSED=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  fi
  DB_HOST_PARSED="${DB_HOST_PARSED:-localhost}"
  
  while ! pg_isready -h "$DB_HOST_PARSED" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" -q 2>/dev/null; do
    timeout=$((timeout - 1))
    if [ $timeout -eq 0 ]; then
      echo "ERROR: Database connection timeout"
      exit 1
    fi
    sleep 1
  done
  echo "==> Database is ready"
fi

# Run migrations (db:migrate is idempotent, safe for Cloud Run)
echo "==> Running database migrations..."
bundle exec rails db:migrate 2>&1

# Precompile assets if not already done (Rails 8+ uses Propshaft)
if [ "$RAILS_SERVE_STATIC_FILES" = "true" ] && [ ! -d "public/assets" ]; then
  echo "==> Precompiling assets..."
  bundle exec rails assets:precompile 2>&1
fi

echo "==> Starting Puma on port ${PORT:-8080}..."
exec bundle exec puma -C config/puma.rb