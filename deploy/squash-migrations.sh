#!/usr/bin/env bash
# Squash migrations: archive old ones, create a single clean init migration
set -euo pipefail

MIGRATE_DIR="db/migrate"
BACKUP_DIR="db/migrate/archive"

echo "=== Kubera Migration Squasher ==="
echo "Current migrations: $(ls -1 "$MIGRATE_DIR"/*.rb 2>/dev/null | wc -l)"

# 1. Backup old migrations
echo "Backing up to $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
for f in "$MIGRATE_DIR"/[0-9]*_*.rb; do
  [ -f "$f" ] || continue
  mv "$f" "$BACKUP_DIR/"
done

# 2. Generate squashed migration from schema.rb
if [ ! -f "db/schema.rb" ]; then
  echo "Error: db/schema.rb not found. Run migrations first."
  exit 1
fi

echo "Generating squashed migration..."
bundle exec rails db:squash_migrations

echo "Done! New migration created in $MIGRATE_DIR"
echo "Old migrations archived to $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "  1. Verify: rails db:migrate:status"
echo "  2. Test:   RAILS_ENV=test rails db:drop db:create db:migrate"
echo "  3. Commit new migration + schema.rb, remove archive/ later"
